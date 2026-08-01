import re
from typing import Dict, List

from ..base_scraper import BaseScraper


class KrubbstuganScraper(BaseScraper):
    """Krubbstugan, Gelbgjutaregatan 2 — Tannefors, Linköping.

    A WordPress page with no menu markup to speak of: the week is a flat run of
    sibling <p> blocks where a day is a paragraph whose only content is a bolded
    weekday, and every paragraph after it is a dish until the next day or the
    trailing shop talk. So we walk the paragraphs in document order and switch
    day as we pass each heading.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # Paragraphs after the last day that are prose, not food. Matching any of
    # these ends the menu — everything below is opening hours and pricing.
    STOP_PATTERNS = [
        r'vi bjuder',
        r'välkommen',
        r'varje\s*$',
        r'dag kan du njuta',
        r'som veckans special',
        r'servering',
        r'avhämtning',
        r'häfte',
        r'valfri dricka',
        r'@',
    ]

    # Paragraphs worth surfacing as restaurant info rather than dropping.
    INFO_PATTERNS = [r'^\s*servering\b', r'^\s*avhämtning\b']

    def __init__(self):
        restaurant_info = {
            'name': 'Krubbstugan',
            'website': 'https://krubbstugan.se',
            'menu_url': 'https://krubbstugan.se/veckans-meny/',
        }
        super().__init__(restaurant_info)

    def _is_day_heading(self, paragraph) -> str:
        """Return the weekday if this paragraph is a day heading, else ''."""
        emphasis = paragraph.find(['strong', 'b'])
        if not emphasis:
            return ''
        text = self.clean_text(emphasis.get_text(strip=True))
        return next((d for d in self.SWEDISH_DAYS if text.lower() == d.lower()), '')

    def _is_stop(self, text: str) -> bool:
        lowered = text.lower()
        return any(re.search(p, lowered) for p in self.STOP_PATTERNS)

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            items: List[str] = []
            info_lines: List[str] = []
            current_day = ''
            menu_done = False

            for paragraph in soup.find_all('p'):
                text = self.clean_text(paragraph.get_text(' ', strip=True))
                if not text:
                    continue

                day = self._is_day_heading(paragraph)
                if day:
                    current_day = day
                    continue

                if not current_day:
                    continue

                if self._is_stop(text):
                    menu_done = True
                    if any(re.search(p, text.lower()) for p in self.INFO_PATTERNS):
                        info_lines.append(text)
                    continue

                if menu_done:
                    continue

                # "*** tacobuffé ***" is a real Friday dish, just shouted
                dish = text.strip('* ').strip()
                if not dish:
                    continue

                category = 'Vegetarisk' if re.search(r'(?i)\b(vegetarisk|vegansk|vegan)\b', dish) else 'Dagens'
                items.append(f"{current_day}|<strong>{category}</strong> - {dish}")

            if not items:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            for line in info_lines:
                for day in self.SWEDISH_DAYS:
                    items.append(f"INFO:{day} - Restaurant Info: 💰 {line}")

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
