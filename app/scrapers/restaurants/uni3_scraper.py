#!/usr/bin/env python3
"""
Uni3 – World of Food Menu Scraper
Scrapes menu data from Compass Group's Uni3 restaurant RSS feed
"""

from ..base_scraper import BaseScraper
import requests
import xml.etree.ElementTree as ET
import re
from typing import List, Dict, Optional

class Uni3Scraper(BaseScraper):
    def __init__(self):
        # Initialize with restaurant info dictionary to match base scraper interface
        restaurant_info = {
            'name': 'Uni3 – World of Food',
            'website': 'https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/uni3-world-of-food/'
        }
        super().__init__(restaurant_info)
        self.rss_feed_url = "https://www.compass-group.se/menuapi/feed/rss/current-week?costNumber=448305&language=sv"

    def scrape(self) -> Dict[str, List[str]]:
        """Main scraping method using RSS feed"""
        try:
            self.log_info("Scraping Uni3 – World of Food menu from RSS feed...")
            
            # Get RSS feed
            response = requests.get(self.rss_feed_url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            # Parse RSS XML
            menu_items = self.parse_rss_feed(response.text)
            
            if menu_items:
                # Add restaurant info
                info_items = self._get_restaurant_info()
                all_items = menu_items + info_items
                return {self.name: all_items}
            else:
                return {self.name: ["Kunde inte hitta menyn just nu"]}
                
        except Exception as e:
            self.log_error(f"Error scraping menu: {str(e)}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

    def parse_rss_feed(self, rss_content: str) -> List[str]:
        """Parse menu from RSS XML feed"""
        menu_items = []
        
        try:
            # Parse XML
            root = ET.fromstring(rss_content)
            
            # Find all items in the RSS feed
            for item in root.findall('.//item'):
                title_elem = item.find('title')
                description_elem = item.find('description')
                
                if title_elem is not None and description_elem is not None:
                    title = title_elem.text
                    description = description_elem.text
                    
                    # Extract day from title (e.g., "Måndag, 09-06-2025")
                    day = self.extract_day_from_title(title)
                    
                    # Parse menu items from description HTML
                    day_menu_items = self.parse_menu_description(description, day)
                    menu_items.extend(day_menu_items)
            
        except ET.ParseError as e:
            self.log_error(f"Failed to parse RSS XML: {e}")
        except Exception as e:
            self.log_error(f"Error parsing RSS feed: {e}")
        
        return menu_items

    def extract_day_from_title(self, title: str) -> str:
        """Extract Swedish day name from title like 'Måndag, 09-06-2025'"""
        if not title:
            return 'Okänd'
            
        # Extract the day part before the comma
        day_part = title.split(',')[0].strip()
        
        # Map to standard day names
        day_mapping = {
            'Måndag': 'Måndag',
            'Tisdag': 'Tisdag',
            'Onsdag': 'Onsdag', 
            'Torsdag': 'Torsdag',
            'Fredag': 'Fredag',
            'Lördag': 'Lördag',
            'Söndag': 'Söndag'
        }
        
        return day_mapping.get(day_part, day_part)

    def parse_menu_description(self, description: str, day: str) -> List[str]:
        """Parse menu items from HTML description"""
        if not description:
            return []
            
        menu_items = []
        
        # Parse HTML content
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(description, 'html.parser')
        
        # Find all paragraphs
        paragraphs = soup.find_all('p')
        
        for p in paragraphs:
            # Skip empty paragraphs
            if not p.get_text().strip():
                continue
            
            # Find the strong tag that contains the category
            category_tag = p.find('strong')
            if not category_tag:
                continue
                
            # Extract category and clean it
            category_text = category_tag.get_text().strip()
            category_match = re.match(r'(Water|Fire|Wood|Metal)\s*:', category_text, re.IGNORECASE)
            
            if category_match:
                raw_category = category_match.group(1).title()
                
                # Get the text after the strong tag, but before the em tag (Swedish description)
                dish_text = ''
                next_elem = category_tag.next_sibling
                while next_elem and not (hasattr(next_elem, 'name') and next_elem.name == 'em'):
                    if isinstance(next_elem, str):
                        dish_text += next_elem
                    next_elem = next_elem.next_sibling if hasattr(next_elem, 'next_sibling') else None
                
                # Clean up the dish text
                dish_text = dish_text.strip()
                dish_text = re.sub(r'\s*[-–]\s*$', '', dish_text)  # Remove trailing dashes
                dish_text = re.sub(r'\s+', ' ', dish_text)  # Normalize whitespace
                dish_text = dish_text.strip(' -–')  # Remove leading/trailing dashes and spaces
                
                # Map category and create menu item
                category = self.map_uni3_category(raw_category)
                
                if dish_text:
                    formatted_item = f"{day}|<strong>{category}</strong> - {dish_text}"
                    menu_items.append(formatted_item)
                    self.log_info(f"Found {category} dish for {day}: {dish_text}")
        
        return menu_items

    def map_uni3_category(self, uni3_category: str) -> str:
        """Map Uni3's unique categories to standard ones"""
        mapping = {
            'Water': 'Fisk',      # Water = Fish dishes
            'Fire': 'Kött',       # Fire = Meat dishes  
            'Wood': 'Vegetarisk', # Wood = Vegetarian dishes
            'Metal': 'Husmanskost' # Metal = Traditional Swedish food
        }
        return mapping.get(uni3_category, uni3_category)

    def _get_restaurant_info(self) -> List[str]:
        """Get restaurant information for all days"""
        info_items = []
        
        # Create info box content with emojis
        restaurant_info = [
            "🕐 Café/Bar: 07:00–18:30 | Lunch: 11:00–13:30",
            "🍽️ Inkl. salladsbuffé, bröd, vatten, kaffe/te och kaka",
            "💰 Lunchbuffé 132 kr",
            
        ]
        
        # Add restaurant info as special menu items (will be displayed in info box)
        for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
            for info_item in restaurant_info:
                info_items.append(
                    f"INFO:{day} - Restaurant Info: {info_item}"
                )
        
        return info_items

# Keep the standalone functionality for testing
def main():
    scraper = Uni3Scraper()
    result = scraper.scrape()
    
    if result and scraper.name in result:
        menu_items = result[scraper.name]
        print(f"\nFound {len(menu_items)} menu items:")
        for item in menu_items[:10]:  # Show first 10 items
            print(f"  {item}")
        
        if len(menu_items) > 10:
            print(f"  ... and {len(menu_items) - 10} more")
    else:
        print("No menu items found!")

if __name__ == "__main__":
    main() 