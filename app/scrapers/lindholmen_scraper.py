import requests
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper
from ..restaurant_data import restaurant_name_modifications

class LindholmenScraper(BaseScraper):
    def __init__(self):
        super().__init__({
            'name': 'Lindholmen',
            'url': 'https://lindholmen.uit.se/omradet/dagens-lunch?embed-mode=iframe'
        })
        self.restaurant_name_modifications = restaurant_name_modifications

    def scrape(self) -> dict:
        response = requests.get(self.url)
        if response.status_code != 200:
            self.log_error(f"Failed to retrieve menu. Status code: {response.status_code}")
            return {"Error": "Failed to retrieve menu"}

        self.log_info("Successfully retrieved menu data")
        soup = BeautifulSoup(response.text, 'html.parser')
        lunch_menus = {}
        
        # Find the main content div containing all menus
        view_content = soup.find('div', class_='view-content')
        if view_content:
            # Find all restaurant titles
            restaurants = view_content.find_all('h3', class_='title')
            
            # Process each restaurant's menu
            for restaurant in restaurants:
                restaurant_name = restaurant.text.strip()
                
                # Apply name modification if it exists
                display_name = self.restaurant_name_modifications.get(restaurant_name, restaurant_name)
                
                lunch_menus[display_name] = []
                
                # Get all menu items for this restaurant
                menu_items = restaurant.find_next_sibling('div', class_='table-list__row')
                while menu_items and menu_items.find_previous_sibling('h3', class_='title') == restaurant:
                    # Extract dish details
                    dish_name = menu_items.find('span', class_='dish-name').text.strip()
                    food_type_div = menu_items.find('div', class_='icon-dish')
                    food_type = food_type_div.text.strip() if food_type_div else "Unknown"
                    price_div = menu_items.find('div', class_='table-list__column table-list__column--price')
                    price = price_div.text.strip() if price_div else "Unknown"
                    
                    # Format the menu item
                    dish_parts = dish_name.split(',', 1)  # Split at first comma
                    main_dish = dish_parts[0].strip()
                    extras = f", {dish_parts[1].strip()}" if len(dish_parts) > 1 else ""
                    lunch_menus[display_name].append(
                        f"<strong>{food_type}</strong>: <span class='dish-description'>{main_dish}</span>{extras} - {price}"
                    )
                    menu_items = menu_items.find_next_sibling('div', class_='table-list__row')
        
        if not lunch_menus:
            self.log_error("No menus found")
            return {self.name: ["No menus available"]}
            
        self.log_info(f"Found menus for {len(lunch_menus)} restaurants")
        return lunch_menus
