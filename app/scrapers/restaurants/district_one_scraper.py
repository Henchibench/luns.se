import requests
from bs4 import BeautifulSoup
import logging
from ..base_scraper import BaseScraper

class DistrictOneScraper(BaseScraper):
    def __init__(self):
        # Initialize with restaurant info dictionary to match base scraper interface
        restaurant_info = {
            'name': 'District One',
            'website': 'https://www.districtone.se/lunch.html'
        }
        super().__init__(restaurant_info)
        self.location = {
            'address': 'Götaverksgatan 4, 414 55 Göteborg',
            'coordinates': {'lat': 57.7062, 'lng': 11.9365}
        }

    def scrape(self):
        """Scrape the menu from District One website"""
        try:
            soup = self.get_page_content()
            if not soup:
                return {self.name: ["Kunde inte hitta menyn just nu"]}

            menu_items = []

            # Add info box with opening hours, price, and inclusions
            info_box = self._create_info_box()
            menu_items.extend(info_box)

            # Parse the menu content
            menu_items.extend(self._parse_daily_menus(soup))

            if not menu_items:
                self.log_warning("No menu items found")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(menu_items)} menu items")
            return {self.name: menu_items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {str(e)}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

    def _create_info_box(self):
        """Create info box with restaurant details"""
        info_items = []
        
        # Add info items for all days (following the pattern from other scrapers)
        for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
            info_items.extend([
                f"INFO:{day} - Restaurant Info: 🕐 Öppettider: Mån-Fre 11-14",
                f"INFO:{day} - Restaurant Info: 🍽️ Ingår: Hembakt bröd, salladsbuffé, kaffe och kaka",
                f"INFO:{day} - Restaurant Info: 💰 Pris: 129 kr"
            ])
        
        return info_items

    def _parse_daily_menus(self, soup):
        """Parse daily menus from the content"""
        menu_items = []
        
        try:
            # Make a direct request to get proper encoding
            response = requests.get(self.menu_url, headers={'User-Agent': 'Mozilla/5.0'})
            response.encoding = 'utf-8'  # Force UTF-8 encoding
            fresh_soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all text content and process it
            content_container = fresh_soup.find('div', class_='styles_contentContainer__lrPIa')
            if not content_container:
                # Fallback to body content
                content_container = fresh_soup.find('body')
            
            if content_container:
                # Get all paragraphs to preserve structure better
                all_paragraphs = content_container.find_all('p')
                lines = []
                for p in all_paragraphs:
                    text = p.get_text(strip=True)
                    if text:
                        lines.append(text)
                
                menu_items.extend(self._process_menu_lines(lines))
        
        except Exception as e:
            self.log_error(f"Error parsing daily menus: {str(e)}")
        
        return menu_items

    def _process_menu_lines(self, lines):
        """Process menu lines and categorize by day"""
        menu_items = []
        current_day = None
        i = 0
        
        # Debug: Print all lines to understand structure
        self.log_info(f"Processing {len(lines)} lines")
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines, headers, and separators
            if (not line or 
                '...' in line or 
                'LUNCH MENY' in line or 
                'Serveras Mån-Fre' in line or
                'Lunch kostar' in line or
                line.startswith('Vecka')):
                i += 1
                continue
            
            # Check for day names (exact match)
            if line in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                current_day = line
                self.log_info(f"Found day: {current_day}")
                i += 1
                continue
            
            # Handle Friday closure
            if current_day == 'Fredag' and line == 'STÄNGT':
                menu_items.append(f"{current_day}| <strong>Stängt</strong>")
                i += 1
                continue
            
            # Process menu categories when we have a current day
            if current_day and line:
                category_found = False
                
                # Check if this line is a category header
                # Map specific dish types to broader categories for consistent filtering
                categories = {
                    'Ramen': 'Asiatisk',           # Ramen is Asian cuisine
                    'Pho': 'Asiatisk',             # Pho is Asian cuisine  
                    'Poke bowl': 'Asiatisk',       # Poke is Asian cuisine
                    'Vegetarisk Poke bowl': 'Vegetarisk',  # Vegetarian category takes priority
                    'Fisk': 'Fisk', 
                    'Kött': 'Kött',
                    'Sallad': 'Sallad',
                    'Asiatisk': 'Asiatisk',
                    'Vegetarisk': 'Vegetarisk'
                }
                
                for cat_key, cat_display in categories.items():
                    if line == cat_key or (cat_key in line and len(line) <= len(cat_key) + 5):
                        category_found = True
                        # Look for the description in the next line(s)
                        j = i + 1
                        description_parts = []
                        
                        while j < len(lines):
                            next_line = lines[j].strip()
                            
                            # Stop if we hit another category or day
                            if (next_line in categories or 
                                next_line in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'] or
                                not next_line or 
                                '...' in next_line):
                                break
                            
                            # Collect description lines
                            if len(next_line) > 10:  # Meaningful content
                                description_parts.append(next_line)
                            
                            j += 1
                        
                        # Create menu item if we found a description
                        if description_parts:
                            description = ' '.join(description_parts)
                            # If we're mapping to a broader category, include the specific dish type
                            if cat_key != cat_display and cat_key in ['Ramen', 'Pho', 'Poke bowl']:
                                description = f"{cat_key}: {description}"
                            formatted_item = self.format_menu_item(cat_display, description)
                            menu_items.append(f"{current_day}|{formatted_item}")
                        
                        i = j - 1  # Move to last processed line
                        break
                
                if not category_found:
                    # Skip non-category lines
                    pass
            
            i += 1
        
        return menu_items

    def format_menu_item(self, category, description):
        """Format menu items with consistent styling"""
        # Clean up the description
        description = self.clean_text(description)
        
        # Format like Kooperativet with HTML bold tags, space, dash, then description
        return f"<strong>{category}</strong> - {description}"

    def clean_text(self, text):
        """Clean and normalize text content"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Fix common formatting issues
        text = text.replace('ELLER', ' eller ')
        text = text.replace('  ', ' ')
        
        # Fix Swedish character encoding issues
        text = text.replace('Ã¥', 'å').replace('Ã¤', 'ä').replace('Ã¶', 'ö')
        text = text.replace('Ã', 'å')  # Common substitution
        
        # Ensure proper punctuation
        if text and not text.endswith('.') and not text.endswith('!') and not text.endswith('?'):
            text += '.'
        
        return text 