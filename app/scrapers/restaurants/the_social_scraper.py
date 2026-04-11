from ..static_menu_scraper import StaticMenuScraper
from typing import Dict, List


class TheSocialScraper(StaticMenuScraper):
    CATEGORIES = {
        'snacks': 'Snacks',
        'appetizers': 'Förrätter',
        'main_courses': 'Varmrätter',
        'desserts': 'Efterrätter',
        'deals': 'Erbjudanden',
        'sides': 'Sides',
    }

    def __init__(self):
        restaurant_info = {
            'name': 'The Social',
            'website': 'https://www.strawberryhotels.com/restaurant/sweden/gothenburg/the-social-eriksberg/',
        }
        super().__init__(restaurant_info, 'the_social.json')

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
