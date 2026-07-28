from ..static_menu_scraper import StaticMenuScraper
from typing import Dict, List


class AlkemistenScraper(StaticMenuScraper):
    def __init__(self):
        restaurant_info = {
            'name': 'Alkemisten Kaffebar & Kafé',
            'website': 'https://www.alkemistenkaffebar.se/',
        }
        super().__init__(restaurant_info, 'alkemisten.json')

    def scrape(self) -> Dict[str, List[str]]:
        try:
            items = []

            for item in self.menu_data.get('vegetarian', []):
                for day in self.SWEDISH_DAYS:
                    items.append(self.format_static_item(
                        day, 'Vegetariskt', item['name'], item.get('description', ''), item.get('price', '')
                    ))

            for item in self.menu_data.get('vegan', []):
                for day in self.SWEDISH_DAYS:
                    items.append(self.format_static_item(
                        day, 'Veganskt', item['name'], item.get('description', ''), item.get('price', '')
                    ))

            if not items:
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error loading menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
