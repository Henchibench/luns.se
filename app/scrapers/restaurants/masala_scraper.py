from ..static_menu_scraper import StaticMenuScraper
from typing import Dict, List
from datetime import datetime


class MasalaScraper(StaticMenuScraper):
    DAY_MAP = {
        'Monday': 'Måndag',
        'Tuesday': 'Tisdag',
        'Wednesday': 'Onsdag',
        'Thursday': 'Torsdag',
        'Friday': 'Fredag',
    }

    def __init__(self):
        restaurant_info = {
            'name': 'Masala Kitchen',
            'website': 'https://masalakitchen.se/lunch/',
        }
        super().__init__(restaurant_info, 'masala_lunch_all_weeks.json')

    def scrape(self) -> Dict[str, List[str]]:
        try:
            items = []

            # 4-week rotation based on current week number
            current_week = datetime.today().isocalendar().week
            week_key = f"week{((current_week - 1) % 4) + 1}"
            daily_menus = self.menu_data.get('weeks', {}).get(week_key, {})

            # Standing menu items (same every day)
            standing_items = self.menu_data.get('standing', [])

            for eng_day, swe_day in self.DAY_MAP.items():
                # Daily rotating dishes
                day_dishes = daily_menus.get(eng_day, [])
                for dish in day_dishes:
                    items.append(self.format_static_item(
                        swe_day, 'Dagens', dish['name'], dish.get('description', ''), dish.get('price', '')
                    ))

                # Standing menu
                for dish in standing_items:
                    items.append(self.format_static_item(
                        swe_day, 'Stående meny', dish['name'], dish.get('description', ''), dish.get('price', '')
                    ))

            if not items:
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error loading menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
