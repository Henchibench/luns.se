from ..base_scraper import BaseScraper
from typing import Dict, List


class CuckoosNestScraper(BaseScraper):
    CATEGORIES = {
        'FISK': ('Fisk', '195 kr'),
        'KÖTT': ('Kött', '195 kr'),
        'VEG': ('Veg', '195 kr'),
        'CAESARSALLAD': ('Caesarsallad', '215 kr'),
        'RÄKMACKA': ('Räkmacka', '295 kr'),
        'DOUBLE SMASHED CHEESEBURGER': ('Double Smashed Cheeseburger', '235 kr'),
    }

    def __init__(self):
        restaurant_info = {
            'name': "Cuckoo's Nest",
            'website': 'https://www.cuckoosnest.se/',
            'menu_url': 'https://www.cuckoosnest.se/menyer/lunch',
        }
        super().__init__(restaurant_info)

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            left_column = soup.select_one('div.content-region')
            if not left_column:
                self.log_warning("Could not find content region")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            items = []
            current_category = None
            current_price = None

            for tag in left_column.find_all(['h3', 'h4', 'p']):
                text = tag.get_text(strip=True)
                if not text:
                    continue

                tag_upper = text.upper()

                # Check if this is a category header
                matched = False
                for key, (display_name, price) in self.CATEGORIES.items():
                    if key in tag_upper:
                        current_category = display_name
                        current_price = price
                        matched = True
                        break

                if matched:
                    continue

                # Menu item description
                if tag.name == 'p' and current_category:
                    formatted = f"<strong>{current_category}</strong> - {self.clean_text(text)}"
                    if current_price:
                        formatted += f" ({current_price})"
                    for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                        items.append(f"{day}|{formatted}")

            if not items:
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
