import re
from typing import Dict, List

from ..base_scraper import BaseScraper


class SkylineScraper(BaseScraper):
    """Restaurang Skyline, Linköping City Airport — Tannefors.

    Same shape as Krubbstugan: a WordPress page that is one flat run of <p>
    blocks, where a day heading reads "Måndag 3 augusti" and every paragraph
    after it is a dish until the allergen key and the fine print.

    Unlike every other restaurant here, Skyline publishes a single day at a
    time rather than a week. The walk handles any number of day headings, so
    if they ever post a full week it is picked up without changes — but expect
    one day per run.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # A heading is the weekday followed by a date: "Måndag 3 augusti"
    DAY_HEADING = re.compile(
        r'^\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag)\b\s*\d*\s*\w*\s*$', re.IGNORECASE
    )

    # The fine print below the dishes: allergen key, sourcing, opening hours.
    STOP_PATTERNS = [
        r'i priserna ingår',
        r'\(g\)\s*=',
        r'prata med oss',
        r'vi använder',
        r'medlemmar i',
        r'öppet\b',
        r'semesterstängt',
        r'^\*',
    ]

    # Worth surfacing on the card rather than dropping.
    INFO_PATTERNS = [r'i priserna ingår']

    # Trailing price, e.g. "140: –" or "150:-"
    PRICE = re.compile(r'(\d{2,4})\s*:\s*[–\-—]?\s*$')

    def __init__(self):
        restaurant_info = {
            'name': 'Skyline',
            'website': 'http://restaurangskyline.se',
            'menu_url': 'http://restaurangskyline.se/lunchmeny/',
        }
        super().__init__(restaurant_info)

    def _matches(self, text: str, patterns: List[str]) -> bool:
        lowered = text.lower()
        return any(re.search(p, lowered) for p in patterns)

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            items: List[str] = []
            info_lines: List[str] = []
            current_day = ''
            days_seen = set()

            for paragraph in soup.find_all('p'):
                text = self.clean_text(paragraph.get_text(' ', strip=True))
                if not text:
                    continue

                heading = self.DAY_HEADING.match(text)
                if heading:
                    current_day = heading.group(1).capitalize()
                    days_seen.add(current_day)
                    continue

                if not current_day:
                    continue

                if self._matches(text, self.STOP_PATTERNS):
                    if self._matches(text, self.INFO_PATTERNS) and text not in info_lines:
                        info_lines.append(text)
                    current_day = ''
                    continue

                dish = text
                price = None
                price_match = self.PRICE.search(dish)
                if price_match:
                    price = f"{price_match.group(1)} kr"
                    dish = dish[:price_match.start()].strip(' ,')

                if not dish:
                    continue

                # (V) marks a vegan dish; the site has no other categories
                category = 'Vegetarisk' if re.search(r'\(\s*V\s*\)', text) else 'Dagens'
                line = f"{current_day}|<strong>{category}</strong> - {dish}"
                if price:
                    line += f" ({price})"
                items.append(line)

            if not items:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            for line in info_lines:
                for day in sorted(days_seen):
                    items.append(f"INFO:{day} - Restaurant Info: 💰 {line}")

            self.log_info(f"Found {len(items)} menu items for {', '.join(sorted(days_seen))}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
