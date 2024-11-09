from datetime import datetime
import requests
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper

class LilleGrisenScraper(BaseScraper):
    def __init__(self):
        super().__init__({
            'name': 'Lille Grisen',
            'url': 'https://lillegrisen.se/jonsered/'
        })
        self.day_names = {
            0: "MÅNDAG",
            1: "TISDAG",
            2: "ONSDAG",
            3: "TORSDAG",
            4: "FREDAG"
        }

    def scrape(self) -> dict:
        response = requests.get(self.url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Get current weekday (0-6, where 0 is Monday)
        current_day = datetime.now().weekday()
        
        # Check if it's weekend
        if current_day >= 5:
            return {self.name: ["No lunch menu on weekends"]}

        current_day_name = self.day_names[current_day]
        self.log_info(f"Looking for day: {current_day_name}")
        
        # Initialize menu items list
        todays_menu = []
        dish_types = ["Kött", "Fisk", "Vegetarisk"]
        
        # Find today's menu items
        for day in soup.select('p span'):
            if current_day_name in day.text.strip().upper():
                menu_list = day.find_next('ul')
                if menu_list:
                    items = menu_list.find_all('li')
                    # Pair each dish with its type
                    for dish_type, item in zip(dish_types, items):
                        if item.text.strip():
                            dish_text = item.text.strip()
                            dish_parts = dish_text.split(',', 1)  # Split at first comma
                            main_dish = dish_parts[0].strip()
                            extras = f", {dish_parts[1].strip()}" if len(dish_parts) > 1 else ""
                            todays_menu.append(
                                f"<strong>{dish_type}</strong>: <span class='dish-description'>{main_dish}</span>{extras}"
                            )
                break
        
        return {self.name: todays_menu if todays_menu else ["No menu available for today"]}
