from ..base_scraper import BaseScraper
import re

class KooperativetScraper(BaseScraper):
    def __init__(self):
        # Initialize with restaurant info dictionary to match base scraper interface
        restaurant_info = {
            'name': 'Kooperativet',
            'website': 'https://www.kooperativet.se/'
        }
        super().__init__(restaurant_info)
        
    def scrape(self):
        """Scrape menu from Kooperativet website"""
        try:
            soup = self.get_page_content()
            if not soup:
                return {self.name: ["Kunde inte hitta menyn just nu"]}
                
            # Get restaurant info
            restaurant_info = self._extract_restaurant_info(soup)
            
            # Get weekly menu
            weekly_menu = self._extract_weekly_menu(soup)
            
            if not weekly_menu:
                return {self.name: ["Ingen lunchmeny tillgänglig"]}
            
            # Add restaurant info to the menu items (similar to Bistrot scraper)
            menu_items = []
            
            # Add restaurant info as special menu items for info box
            if restaurant_info:
                info_items = []
                
                # Opening hours (first)
                if 'opening_hours' in restaurant_info:
                    info_items.append(f"🕐 {restaurant_info['opening_hours']}")

                # Booking information (second)
                if 'booking' in restaurant_info:
                    info_items.append(f"📧 {restaurant_info['booking']}")

                # What's included (second)
                if 'included' in restaurant_info:
                    info_items.append(f"🍽️ {restaurant_info['included']}")
                
                # Price (third)
                if 'lunch_price' in restaurant_info:
                    info_items.append(f"💰 {restaurant_info['lunch_price']}")
                
                
                
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
        """Extract restaurant information from the info section"""
        try:
            info_div = soup.find('div', class_='avia_textblock')
            if not info_div:
                return {}
            
            # Extract opening hours, price, and included items
            text = info_div.get_text()
            info = {}
            
            # Opening hours
            if '11–13:30' in text:
                info['opening_hours'] = "Lunchserveringen har öppet måndag – fredag 11–13:30"
            
            # What's included
            if 'salladsbuffé' in text:
                info['included'] = "I alla rätter ingår salladsbuffé, hembakt surdegsbröd, kaffe och kaka"
            
            # Price
            if '130:-' in text:
                info['lunch_price'] = "Priset för lunch är 130:-"
            
            # Booking information (always add this)
            info['booking'] = "Lunchbokning (mellan 11-00-11.30) info@kooperativet.se"
            
            return info
            
        except Exception as e:
            self.log_error(f"Error extracting restaurant info: {str(e)}")
            return {}
    
    def _extract_weekly_menu(self, soup):
        """Extract weekly menu from daily sections"""
        weekly_menu = []
        
        # Days mapping
        days_mapping = {
            'monday': 'Måndag',
            'tuesday': 'Tisdag', 
            'wednesday': 'Onsdag',
            'thursday': 'Torsdag',
            'friday': 'Fredag'
        }
        
        for day_id, swedish_day in days_mapping.items():
            day_section = soup.find('div', id=day_id)
            if not day_section:
                continue
                
            daily_items = self._extract_daily_menu(day_section, swedish_day)
            weekly_menu.extend(daily_items)
        
        return weekly_menu
    
    def _extract_daily_menu(self, day_section, day_name):
        """Extract menu items for a specific day"""
        daily_items = []
        
        try:
            # Find all textblocks in this day section
            textblocks = day_section.find_all('div', class_='avia_textblock')
            
            for textblock in textblocks:
                paragraphs = textblock.find_all('p')
                current_category = None
                
                for p in paragraphs:
                    # Skip empty paragraphs
                    if not p.get_text().strip():
                        continue
                    
                    # Check if this paragraph contains a category
                    strong_tag = p.find('strong')
                    if strong_tag:
                        category_text = strong_tag.get_text().strip()
                        
                        # If the strong tag is at the beginning, it's a category header
                        if p.get_text().strip().startswith(category_text):
                            current_category = category_text
                            
                            # Check if there's menu text after the category
                            remaining_text = p.get_text().replace(category_text, '').strip()
                            if remaining_text and remaining_text not in ['–', ':', '']:
                                # Clean up the text
                                remaining_text = remaining_text.lstrip('–').lstrip(':').strip()
                                if remaining_text:
                                    formatted_item = self.format_menu_item(current_category, remaining_text)
                                    daily_items.append(f"{day_name}|{formatted_item}")
                            continue
                    
                    # Regular menu item text
                    item_text = p.get_text().strip()
                    if item_text and item_text not in ['–', '..', '.']:
                        # Handle special cases
                        if 'stängt' in item_text.lower() or 'closed' in item_text.lower():
                            daily_items.append(f"{day_name}|<strong>Stängt</strong> - {item_text}")
                        elif current_category:
                            formatted_item = self.format_menu_item(current_category, item_text)
                            daily_items.append(f"{day_name}|{formatted_item}")
                        else:
                            # No category, treat as general item
                            daily_items.append(f"{day_name}|{self.clean_text(item_text)}")
        
        except Exception as e:
            self.log_error(f"Error extracting daily menu for {day_name}: {str(e)}")
        
        return daily_items
    
    def format_menu_item(self, category, description):
        """Format menu item with category and description"""
        # Clean up the description
        clean_desc = self.clean_text(description)
        
        # Format with category as strong text
        if category in ['SALLADER', 'VECKANS SPECIAL', 'KÖTT', 'FISK', 'THAI', 'INDISK', 'VÄRLDEN', 'VEGETARISK', 'VEGETARISKT']:
            # Map categories to display names
            category_map = {
                'SALLADER': 'Sallad',
                'VECKANS SPECIAL': 'Veckans Special',
                'KÖTT': 'Kött',
                'FISK': 'Fisk', 
                'THAI': 'Thai',
                'INDISK': 'Indisk',
                'VÄRLDEN': 'Världen',
                'VEGETARISK': 'Vegetarisk',
                'VEGETARISKT': 'Vegetarisk'
            }
            
            display_category = category_map.get(category, category)
            return f"<strong>{display_category}</strong> - {clean_desc}"
        
        return f"<strong>{category}</strong> - {clean_desc}" 