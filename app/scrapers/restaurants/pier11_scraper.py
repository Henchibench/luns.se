from ..base_scraper import BaseScraper
from ...utils.translation import FoodTranslator
import re

class Pier11Scraper(BaseScraper):
    def __init__(self):
        # Initialize with restaurant info dictionary to match base scraper interface
        restaurant_info = {
            'name': 'Restaurant Pier 11',
            'website': 'https://ericssonbynordrest.se/restaurang/restaurant-pier-11/'
        }
        super().__init__(restaurant_info)
    
    def translate_text(self, text):
        """Translate English food terms to Swedish using global translator"""
        return FoodTranslator.translate(text)
    
    def scrape(self):
        """Scrape menu from Restaurant Pier 11 website"""
        try:
            soup = self.get_page_content()
            if not soup:
                return {self.name: ["Kunde inte hitta menyn just nu"]}
                
            # Get restaurant info
            restaurant_info = self._extract_restaurant_info(soup)
            
            # Get weekly menu
            weekly_menu = self._extract_weekly_menu(soup)
            
            if not weekly_menu:
                return {self.name: ["<strong>Ingen lunchmeny tillgänglig</strong>"]}
            
            # Add restaurant info to the menu items
            menu_items = []
            
            # Add restaurant info as special menu items for info box
            if restaurant_info:
                info_items = []
                
                # Opening hours (first)
                if 'opening_hours' in restaurant_info:
                    info_items.append(f"🕐 {restaurant_info['opening_hours']}")
                
                # Price (second)
                if 'lunch_price' in restaurant_info:
                    info_items.append(f"💰 {restaurant_info['lunch_price']}")
                
                # Fun fact (third)
                if 'fun_fact' in restaurant_info:
                    info_items.append(f"💡 {restaurant_info['fun_fact']}")
                
                # Add each info item for each day
                for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                    for info_item in info_items:
                        menu_items.append(f"INFO:{day} - Restaurant Info: {info_item}")
            
            # Add the actual menu items
            menu_items.extend(weekly_menu)
            
            return {self.name: menu_items}
            
        except Exception as e:
            self.log_error(f"Error scraping menu: {str(e)}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
    
    def _extract_restaurant_info(self, soup):
        """Extract restaurant information"""
        try:
            info = {}
            
            # Find opening hours in elementor button
            opening_hours_element = soup.find('span', class_='elementor-button-text', string=re.compile(r'Open Monday.*Friday.*10:45.*1:30'))
            if opening_hours_element:
                hours_text = opening_hours_element.get_text()
                # Translate to Swedish
                swedish_hours = self.translate_text(hours_text)
                info['opening_hours'] = f"Öppet måndag-fredag 10:45-13:30"
            
            # Find price in elementor button
            price_element = soup.find('span', class_='elementor-button-text', string=re.compile(r'Lunch buffet.*110.*SEK'))
            if price_element:
                price_text = price_element.get_text()
                # Translate to Swedish
                info['lunch_price'] = "Lunchbuffé 110 kr"
            
            # Add fun fact about the soft serve ice cream machine
            info['fun_fact'] = "Mjukglass ingår i priset!"
            
            return info
            
        except Exception as e:
            self.log_error(f"Error extracting restaurant info: {str(e)}")
            return {}
    
    def _extract_weekly_menu(self, soup):
        """Extract weekly menu from the page"""
        weekly_menu = []
        
        try:
            # Find the lunch menu section
            # Look for headings like "Monday", "Tuesday", etc.
            day_headings = soup.find_all(['h3', 'h4'], string=re.compile(r'^(Monday|Tuesday|Wednesday|Thursday|Friday)$'))
            
            for heading in day_headings:
                english_day = heading.get_text().strip()
                swedish_day = self.translate_text(english_day)
                
                # Handle closed days
                if 'closed' in heading.get_text().lower():
                    weekly_menu.append(f"{swedish_day}|<strong>Stängt</strong>")
                    continue
                
                # Find menu items after this heading
                current_element = heading.find_next_sibling()
                dish_count = 0
                
                while current_element and dish_count < 5:  # Limit to reasonable number of dishes
                    # Look for text elements that contain dish descriptions
                    if current_element.name in ['p', 'div'] and current_element.get_text().strip():
                        text = current_element.get_text().strip()
                        
                        # Skip empty text, "English" headers, or very short text
                        if text and text != "English" and len(text) > 10:
                            # Translate the dish description
                            translated_dish = self.translate_text(text)
                            
                            # Determine dish category based on ingredients
                            category = self._categorize_dish(text)
                            
                            formatted_item = f"<strong>{category}</strong> - {translated_dish}"
                            weekly_menu.append(f"{swedish_day}|{formatted_item}")
                            dish_count += 1
                    
                    current_element = current_element.find_next_sibling()
                    
                    # Stop if we hit the next day heading
                    if current_element and current_element.name in ['h3', 'h4'] and current_element.get_text().strip() in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
                        break
        
        except Exception as e:
            self.log_error(f"Error extracting weekly menu: {str(e)}")
        
        return weekly_menu
    
    def _categorize_dish(self, dish_text):
        """Categorize dish based on main ingredients"""
        dish_lower = dish_text.lower()
        
        # Check for vegetarian/vegan indicators
        if any(word in dish_lower for word in ['vegan', 'halloumi', 'lentil', 'chickpeas', 'cabbage', 'asparagus']):
            return 'Vegetarisk'
        
        # Check for fish
        if any(word in dish_lower for word in ['cod', 'haddock', 'fish']):
            return 'Fisk'
        
        # Check for meat
        if any(word in dish_lower for word in ['chicken', 'pork', 'beef', 'veal', 'bacon', 'meatloaf', 'kebab']):
            return 'Kött'
        
        # Default category
        return 'Dagens' 