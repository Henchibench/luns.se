from ..static_menu_scraper import StaticMenuScraper
from typing import Dict, List


class GansuScraper(StaticMenuScraper):
    CATEGORIES = {
        'soursoup': 'Dumplings med surstark biffsoppa',
        'beefnoodlesoup': 'Biffnudelsoppor',
        'zhajiang': 'Zhajiang nudlar',
        'xiaolongbao': 'Xiaolong Bao',
        'misc': 'Övrigt',
    }

    def __init__(self):
        restaurant_info = {
            'name': 'Gansu Köket',
            'website': 'https://www.google.com/maps/place/Gansu+K%C3%B6ket/',
        }
        super().__init__(restaurant_info, 'gansu.json')

    def scrape(self) -> Dict[str, List[str]]:
        try:
            items = []

            for json_key, category in self.CATEGORIES.items():
                for dish in self.menu_data.get(json_key, []):
                    for day in self.SWEDISH_DAYS:
                        items.append(self.format_static_item(
                            day, category, dish['name'], dish.get('description', ''), dish.get('price', '')
                        ))

            if not items:
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error loading menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
