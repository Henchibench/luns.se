from ..base_scraper import BaseScraper
from bs4 import BeautifulSoup
from typing import Dict, List
import re
from datetime import datetime

class BistrotScraper(BaseScraper):
    def __init__(self):
        # Initialize with restaurant info dictionary to match base scraper interface
        restaurant_info = {
            'name': 'Bistrot',
            'website': 'https://bistrot.se/'
        }
        super().__init__(restaurant_info)
        # Bistrot's menu is on the main page
        self.menu_url = "https://bistrot.se/"
    
    def is_menu_item(self, text: str) -> bool:
        """Check if text is actually a menu item"""
        # Filter out common non-menu text patterns
        non_menu_patterns = [
            r'lunchserveringen.*öppet',
            r'alla rätter ingår',
            r'^dagens lunch.*\d+.*kr',
            r'^take away.*\d+.*kr',
            r'kontakta oss',
            r'tar inga bordsbokningar',
            r'meny vecka \d+',
            r'^\d+\s*kr',
            r'catering@',
            r'öppettider',
            r'måndag.*fredag.*\d+',
            r'^välkommen$',
        ]
        
        text_lower = text.lower()
        for pattern in non_menu_patterns:
            if re.search(pattern, text_lower):
                return False
        
        # Must have some substance (more than just a few words)
        if len(text.split()) < 3:
            return False
            
        return True
    
    def extract_restaurant_info(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract general restaurant information from the specific HTML structure"""
        info = {}
        
        # Find the specific div with restaurant info
        info_div = soup.find('div', class_='mb32')
        if info_div:
            # Extract each paragraph
            paragraphs = info_div.find_all('p')
            for p in paragraphs:
                text = self.clean_text(p.get_text())
                if not text:
                    continue
                
                text_lower = text.lower()
                
                # Opening hours
                if 'lunchserveringen' in text_lower and 'öppet' in text_lower:
                    info['opening_hours'] = text
                
                # What's included
                elif 'alla rätter ingår' in text_lower:
                    info['included'] = text
                
                # Dagens lunch price - more flexible matching
                elif ('dagens' in text_lower and 'lunch' in text_lower) or ('130' in text and 'dagens' in text_lower):
                    info['lunch_price'] = text
                
                # Take away price - more flexible matching  
                elif ('take' in text_lower and 'away' in text_lower) or ('130' in text and 'take' in text_lower):
                    info['takeaway_price'] = text
        
        # Fallback: look for any paragraphs containing price info if div not found
        if not info_div or ('lunch_price' not in info and 'takeaway_price' not in info):
            all_paragraphs = soup.find_all('p')
            for p in all_paragraphs:
                text = self.clean_text(p.get_text())
                if not text:
                    continue
                    
                text_lower = text.lower()
                
                # Look for lunch price anywhere
                if 'dagens' in text_lower and 'lunch' in text_lower and '130' in text:
                    info['lunch_price'] = text
                
                # Look for takeaway price anywhere
                elif 'take' in text_lower and 'away' in text_lower and '130' in text:
                    info['takeaway_price'] = text
        
        return info
    
    def parse_day_range(self, day_text: str) -> List[str]:
        """Parse day range from text like 'Måndag-Tis' or 'Ons-Tors' or 'Fre'"""
        day_mapping = {
            'måndag': 'Måndag', 'mån': 'Måndag',
            'tisdag': 'Tisdag', 'tis': 'Tisdag', 
            'onsdag': 'Onsdag', 'ons': 'Onsdag',
            'torsdag': 'Torsdag', 'tors': 'Torsdag',
            'fredag': 'Fredag', 'fre': 'Fredag'
        }
        
        day_text_lower = day_text.lower()
        
        # Handle specific patterns
        if 'måndag' in day_text_lower and 'tis' in day_text_lower:
            return ['Måndag', 'Tisdag']
        elif 'ons' in day_text_lower and 'tors' in day_text_lower:
            return ['Onsdag', 'Torsdag']
        elif 'fre' in day_text_lower:
            return ['Fredag']
        
        # Fallback: try to find individual days
        found_days = []
        for key, value in day_mapping.items():
            if key in day_text_lower:
                found_days.append(value)
        
        return found_days if found_days else ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']
    
    def scrape(self) -> Dict[str, List[str]]:
        """Scrape Bistrot's lunch menu from the main page"""
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}
        
        try:
            menu_items = []
            
            # Extract restaurant info from the specific HTML structure
            restaurant_info = self.extract_restaurant_info(soup)
            
            # Create info box content
            info_items = []
            if 'opening_hours' in restaurant_info:
                info_items.append(f"🕐 {restaurant_info['opening_hours']}")
            if 'included' in restaurant_info:
                info_items.append(f"🍽️ {restaurant_info['included']}")
            
            # Combine lunch and takeaway prices on one line
            price_info = []
            if 'lunch_price' in restaurant_info:
                price_info.append(restaurant_info['lunch_price'])
            if 'takeaway_price' in restaurant_info:
                price_info.append(restaurant_info['takeaway_price'])
            
            if price_info:
                combined_price = " | ".join(price_info)
                info_items.append(f"💰 {combined_price}")
            
            # Add restaurant info as special menu items (will be displayed in info box)
            if info_items:
                for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                    for info_item in info_items:
                        menu_items.append(
                            f"INFO:{day} - Restaurant Info: {info_item}"
                        )
            
            # Remove the restaurant info div to avoid processing it as menu content
            info_div = soup.find('div', class_='mb32')
            if info_div:
                info_div.decompose()
            
            # Process weekly dishes from the main menu content div
            menu_content = soup.find('div', class_='fdm-item-content')
            if menu_content:
                self.process_menu_content(menu_content, menu_items)
            
            # Process daily dishes from fdm-item-panel divs
            daily_panels = soup.find_all('div', class_='fdm-item-panel')
            for panel in daily_panels:
                self.process_daily_panel(panel, menu_items)
            
            if not menu_items:
                self.log_warning("No menu items found")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}
            
            self.log_info(f"Found {len(menu_items)} menu items")
            return {self.name: menu_items}
            
        except Exception as e:
            self.log_error(f"Error scraping menu: {str(e)}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
    
    def process_menu_content(self, menu_content, menu_items: List[str]):
        """Process the weekly menu content"""
        # Get all paragraphs in the menu content
        paragraphs = menu_content.find_all('p')
        
        current_dish_name = None
        current_ingredients = None
        
        for p in paragraphs:
            # Skip WordPress comment paragraphs
            if '<!-- wp:' in str(p):
                continue
            
            # Check if this paragraph contains a strong tag (dish name)
            strong_tag = p.find('strong')
            if strong_tag:
                # Save previous dish if we have one
                if current_dish_name and current_ingredients:
                    self.add_dish_to_menu(menu_items, current_dish_name, current_ingredients)
                
                # Start new dish
                current_dish_name = self.clean_text(strong_tag.get_text())
                current_ingredients = None
            else:
                # This should be ingredients for the current dish
                ingredients_text = self.clean_text(p.get_text())
                if ingredients_text and current_dish_name:
                    current_ingredients = ingredients_text
        
        # Don't forget the last dish
        if current_dish_name and current_ingredients:
            self.add_dish_to_menu(menu_items, current_dish_name, current_ingredients)
    
    def process_daily_panel(self, panel, menu_items: List[str]):
        """Process a daily menu panel (meat and fish dishes)"""
        # Get the day name from the title
        title_element = panel.find('p', class_='fdm-item-title')
        if not title_element:
            return
        
        day_name = self.clean_text(title_element.get_text())
        
        # Map day names to our standard format
        day_mapping = {
            'måndag': 'Måndag',
            'tisdag': 'Tisdag', 
            'onsdag': 'Onsdag',
            'torsdag': 'Torsdag',
            'fredag': 'Fredag'
        }
        
        standard_day = day_mapping.get(day_name.lower())
        if not standard_day:
            return
        
        # Process the content in this panel
        content_div = panel.find('div', class_='fdm-item-content')
        if content_div:
            paragraphs = content_div.find_all('p')
            
            current_dish_name = None
            current_ingredients = None
            
            for p in paragraphs:
                # Skip WordPress comment paragraphs
                if '<!-- wp:' in str(p):
                    continue
                
                # Check if this paragraph contains a strong tag (dish name)
                strong_tag = p.find('strong')
                if strong_tag:
                    # Save previous dish if we have one
                    if current_dish_name and current_ingredients:
                        self.add_daily_dish_to_menu(menu_items, standard_day, current_dish_name, current_ingredients)
                    
                    # Start new dish
                    current_dish_name = self.clean_text(strong_tag.get_text())
                    current_ingredients = None
                else:
                    # This should be ingredients for the current dish
                    ingredients_text = self.clean_text(p.get_text())
                    if ingredients_text and current_dish_name:
                        current_ingredients = ingredients_text
            
            # Don't forget the last dish
            if current_dish_name and current_ingredients:
                self.add_daily_dish_to_menu(menu_items, standard_day, current_dish_name, current_ingredients)
    
    def add_dish_to_menu(self, menu_items: List[str], dish_name: str, ingredients: str):
        """Add a dish to the appropriate days in the menu"""
        dish_name_lower = dish_name.lower()
        
        # Determine dish type and days
        if 'veckans:' in dish_name_lower:
            # Weekly special - all days
            dish_type = "Veckans"
            days = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']
            # Extract dish name after "Veckans:"
            display_name = dish_name.split(':', 1)[1].strip() if ':' in dish_name else dish_name
        elif 'vegetarisk' in dish_name_lower:
            # Vegetarian dish - parse day range
            dish_type = "Vegetarisk"
            days = self.parse_day_range(dish_name)
            # Extract dish name after day range
            if ':' in dish_name:
                display_name = dish_name.split(':', 1)[1].strip()
            else:
                display_name = dish_name
        elif 'caesarsallad' in dish_name_lower:
            # Caesar salad - all days
            dish_type = "Sallad"
            days = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']
            display_name = dish_name
        else:
            # Default handling
            dish_type = "Dagens Rätt"
            days = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']
            display_name = dish_name
        
        # Add to appropriate days - format without day prefix and without duplication
        formatted_dish = f"<strong>{dish_type}</strong> - {display_name} {ingredients}"
        for day in days:
            menu_items.append(f"{day}|{formatted_dish}")
    
    def add_daily_dish_to_menu(self, menu_items: List[str], day: str, dish_name: str, ingredients: str):
        """Add a daily dish (meat/fish) to a specific day"""
        # Determine dish type based on content
        dish_name_lower = dish_name.lower()
        
        if any(fish_word in dish_name_lower for fish_word in ['fångst', 'fisk', 'lax', 'torsk', 'kolja']):
            dish_type = "Fisk"
        else:
            dish_type = "Kött"
        
        # Format the dish
        formatted_dish = f"<strong>{dish_type}</strong> - {dish_name} {ingredients}"
        menu_items.append(f"{day}|{formatted_dish}") 