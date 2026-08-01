from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
import re

from .base_scraper import BaseScraper


class MashieScraper(BaseScraper):
    """Scraper for menus published through Mashie (matildaplatform.com).

    Compass Group embeds these as an iframe on their own restaurant pages, so
    the menu is invisible both in the page HTML and in Compass Group's own
    /api/restaurants/{id}/service endpoint. The Mashie URL itself, however, is
    plain server-rendered HTML — no JavaScript needed.

    Find a restaurant's Mashie URL by opening its Compass Group page and
    reading the src of the non-cookie iframe.

    Mashie publishes two weeks at a time. Each day is a
    `div.panel.app-default` whose heading reads e.g. "03 aug Måndag", and each
    dish is a `.list-group-item-menu` where — despite the class names —
    `.app-alternative-name` holds the category ("Gröna smaker") and
    `.app-daymenu-name` holds the dish description.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    MONTHS = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'maj': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'okt': 10, 'nov': 11, 'dec': 12,
    }

    def __init__(self, restaurant_info: dict, mashie_url: str, price_url: Optional[str] = None):
        super().__init__(restaurant_info)
        self.mashie_url = mashie_url
        # Mashie carries the dishes but not what they cost. The host page often
        # states the prices in prose; point at it to pick them up.
        self.price_url = price_url

    def _scrape_prices(self) -> List[str]:
        """Pull the price summary off the host page, e.g.
        "Dagens: 124:-, Dagens Soppa 99:-, Snabbt & Gott 149-169 kr".

        Only paragraphs that *mention* a price are taken, not ones that *start*
        with one — those are individual dishes from a side menu that is often
        months out of date, and stale dishes are worse than no prices.
        """
        if not self.price_url:
            return []
        soup = self.get_page_content(self.price_url)
        if soup is None:
            self.log_error("Could not load the price page")
            return []

        for paragraph in soup.find_all(['p', 'h4', 'h5']):
            text = self.clean_text(paragraph.get_text(' ', strip=True))
            if not text or len(text) > 160 or text[0].isdigit():
                continue
            if re.search(r'\d{2,4}\s*(:-|kr)', text):
                return [text]

        self.log_error("No price line found — host page may have changed")
        return []

    def _parse_heading(self, heading: str) -> Tuple[Optional[str], Optional[date]]:
        """Turn "03 aug Måndag" into ("Måndag", date(2026, 8, 3))."""
        day_name = next((d for d in self.SWEDISH_DAYS if d.lower() in heading.lower()), None)

        parsed_date = None
        match = re.search(r'(\d{1,2})\s+([a-zåäö]{3})', heading.lower())
        if match:
            day_num, month_abbr = int(match.group(1)), match.group(2)
            month = self.MONTHS.get(month_abbr)
            if month:
                today = date.today()
                year = today.year
                # A menu published in late December runs into January. If the
                # parsed date lands more than half a year in the past, it
                # belongs to next year.
                candidate = date(year, month, day_num)
                if (today - candidate).days > 182:
                    candidate = date(year + 1, month, day_num)
                parsed_date = candidate

        return day_name, parsed_date

    def _select_current_week(self, days: List[dict]) -> List[dict]:
        """Pick the week to display.

        Mashie serves the current week plus the next one. Prefer the week that
        contains today; during a closure or over a weekend today may not appear
        at all, in which case the first published week is the useful one.
        """
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        this_week = {monday + timedelta(days=i) for i in range(5)}

        current = [d for d in days if d['date'] in this_week]
        if current:
            return current

        seen: List[dict] = []
        for entry in days:
            if any(e['day'] == entry['day'] for e in seen):
                break
            seen.append(entry)
        return seen

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content(self.mashie_url)
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            days: List[dict] = []
            for panel in soup.select('div.panel.app-default'):
                heading_el = panel.select_one('.panel-heading')
                if not heading_el:
                    continue
                heading = ' '.join(heading_el.get_text(' ', strip=True).split())
                day_name, day_date = self._parse_heading(heading)
                if not day_name or not day_date:
                    continue

                dishes = []
                for item in panel.select('.list-group-item-menu'):
                    category_el = item.select_one('.app-alternative-name')
                    dish_el = item.select_one('.app-daymenu-name')
                    if not dish_el:
                        continue
                    dish = self.clean_text(dish_el.get_text(' ', strip=True))
                    if not dish:
                        continue
                    category = self.clean_text(category_el.get_text(strip=True)) if category_el else 'Dagens'

                    # Some dishes carry the price inline, e.g. "... risonisallad 159:-"
                    price = None
                    price_match = re.search(r'(\d{2,4})\s*:-\s*$', dish)
                    if price_match:
                        price = f"{price_match.group(1)} kr"
                        dish = dish[:price_match.start()].strip(' ,')

                    # Deliberately not using BaseScraper.format_menu_item: it wraps
                    # the description in a <span> that the frontend renders as
                    # literal text, since it only strips the <strong> tag. Every
                    # working scraper builds this "<strong>X</strong> - y" shape.
                    line = f"<strong>{category}</strong> - {dish}"
                    if price:
                        line += f" ({price})"
                    dishes.append(line)

                if dishes:
                    days.append({'day': day_name, 'date': day_date, 'dishes': dishes})

            if not days:
                self.log_info("No menu published (restaurant may be closed)")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            items = []
            for entry in self._select_current_week(days):
                for dish in entry['dishes']:
                    items.append(f"{entry['day']}|{dish}")

            for line in self._scrape_prices():
                for day in self.SWEDISH_DAYS:
                    items.append(f"INFO:{day} - Restaurant Info: 💰 {line}")

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
