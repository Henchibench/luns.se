from ..base_scraper import BaseScraper
import re
from datetime import datetime

class BombayBistroScraper(BaseScraper):
    def __init__(self):
        # Initialize with restaurant info dictionary to match base scraper interface
        restaurant_info = {
            'name': 'Bombay Bistro',
            'website': 'https://www.bombaybistro.se/lunch/'
        }
        super().__init__(restaurant_info)
    
    def scrape(self):
        """Scrape menu from Bombay Bistro website"""
        try:
            soup = self.get_page_content()
            if not soup:
                return {self.name: ["Kunde inte hitta menyn just nu"]}
                
            # Get restaurant info
            restaurant_info = self._extract_restaurant_info()
            
            # Get all lunch menus by scraping the actual content
            all_menus = self._extract_all_lunch_menus(soup)
            
            if not all_menus:
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
            menu_items.extend(all_menus)
            
            return {self.name: menu_items}
            
        except Exception as e:
            self.log_error(f"Error scraping menu: {str(e)}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
    
    def _extract_restaurant_info(self):
        """Extract restaurant information"""
        try:
            info = {}
            
            # From the website, we know the basic info
            info['opening_hours'] = "Måndag-Fredag 11:00-22:00, Lördag-Söndag 13:00-22:00"
            info['lunch_price'] = "Lunch 11:00-15:00, 129 kr inkl. sallad, naan bröd och vatten"
            info['fun_fact'] = "Autentisk indisk mat med flera lunchalternativ!"
            
            return info
            
        except Exception as e:
            self.log_error(f"Error extracting restaurant info: {str(e)}")
            return {}
    
    def _extract_all_lunch_menus(self, soup):
        """Extract all lunch menus from the Elementor-based page"""
        all_menu_items = []
        
        try:
            # First, try to detect which lunch menu is currently active
            active_lunch = self._detect_active_lunch_menu(soup)
            
            page_text = soup.get_text(separator='\n', strip=True)
            
            if active_lunch:
                self.log_info(f"Detected active lunch menu: {active_lunch}")
                # Extract only the active menu
                menu_data = self._parse_specific_lunch_section(page_text, active_lunch)
                self.log_info(f"Active menu extracted: {len(menu_data)} days with {sum(len(dishes) for dishes in menu_data.values())} total dishes")
            else:
                self.log_warning("Could not detect active lunch menu, using fallback method")
                # Fall back to parsing all menus and choosing one
                menu_data = self._parse_menu_from_text(page_text)
                self.log_info(f"Fallback menu extracted: {len(menu_data)} days with {sum(len(dishes) for dishes in menu_data.values())} total dishes")
            
            # Extract standing weekly dishes (available every day)
            standing_dishes = self._extract_standing_dishes(page_text)
            
            # Combine active menu with standing dishes
            if menu_data or standing_dishes:
                self.log_info(f"Combining menus: active_menu has {len(menu_data)} days, standing has {len(standing_dishes)} dishes")
                
                # Get all weekdays that have dishes (either from active menu or just add all weekdays)
                all_days = set(menu_data.keys()) if menu_data else set()
                if standing_dishes:
                    # Add all weekdays since standing dishes are available every day
                    all_days.update(['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'])
                
                self.log_info(f"Processing {len(all_days)} days: {sorted(all_days)}")
                
                for day in all_days:
                    day_dishes_added = 0
                    
                    # Add active menu dishes for this day
                    if menu_data and day in menu_data:
                        for dish in menu_data[day]:
                            category = self._categorize_dish(dish['name'], dish['description'])
                            formatted_name = self._format_dish_name(dish['name'])
                            formatted_item = f"<strong>{category}</strong> - {formatted_name}: {dish['description']}"
                            all_menu_items.append(f"{day}|{formatted_item}")
                            day_dishes_added += 1
                        self.log_info(f"Added {len(menu_data[day])} active menu dishes for {day}")
                    
                    # Add standing dishes for this day (available every day)
                    for dish in standing_dishes:
                        category = self._categorize_dish(dish['name'], dish['description'])
                        formatted_name = self._format_dish_name(dish['name'])
                        formatted_item = f"<strong>{category}</strong> - {formatted_name}: {dish['description']}"
                        all_menu_items.append(f"{day}|{formatted_item}")
                        day_dishes_added += 1
                    
                    self.log_info(f"Total dishes added for {day}: {day_dishes_added}")
            
            # Strategy 2: If strategy 1 fails, try extracting from specific elements
            if not all_menu_items:
                self.log_info("Primary extraction failed, trying alternative method...")
                all_menu_items = self._extract_from_elements(soup)
            
            # Strategy 3: If both fail, add the daily alternatives that are always available
            if not all_menu_items:
                self.log_warning("Could not extract dynamic menu, adding static alternatives")
                all_menu_items = self._get_fallback_items()
        
        except Exception as e:
            self.log_error(f"Error extracting all lunch menus: {str(e)}")
            # Return fallback items in case of error
            all_menu_items = self._get_fallback_items()
        
        return all_menu_items
    
    def _detect_active_lunch_menu(self, soup):
        """Detect which lunch menu is currently active by looking for the highlighted h2 element"""
        try:
            # Look for h2 elements with the specific classes that indicate active menu
            lunch_headers = soup.find_all('h2', class_='elementor-heading-title elementor-size-default')
            
            for header in lunch_headers:
                header_text = header.get_text(strip=True)
                if re.match(r'^LUNCH\s+\d+$', header_text, re.IGNORECASE):
                    self.log_info(f"Found active lunch menu header: {header_text}")
                    return header_text.strip()
            
            # Fallback: look for any element containing LUNCH X pattern that might be emphasized
            all_lunch_headers = soup.find_all(string=re.compile(r'LUNCH\s+\d+', re.IGNORECASE))
            
            for header in all_lunch_headers:
                parent = header.parent
                # Check if this header has any emphasis (could be different classes)
                if parent and parent.name in ['h1', 'h2', 'h3'] and 'elementor-heading-title' in parent.get('class', []):
                    lunch_text = header.strip()
                    self.log_info(f"Found emphasized lunch header: {lunch_text}")
                    return lunch_text
            
            self.log_warning("Could not detect active lunch menu from HTML structure")
            return None
            
        except Exception as e:
            self.log_error(f"Error detecting active lunch menu: {str(e)}")
            return None
    
    def _parse_specific_lunch_section(self, text, target_lunch):
        """Parse menu data for a specific lunch section only"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        days = ['MÅNDAG', 'TISDAG', 'ONSDAG', 'TORSDAG', 'FREDAG']
        
        # Find the target lunch section
        section_start = None
        section_end = None
        
        for i, line in enumerate(lines):
            if re.match(rf'^{re.escape(target_lunch)}$', line, re.IGNORECASE):
                section_start = i + 1
                break
        
        if section_start is None:
            self.log_warning(f"Could not find {target_lunch} in page content")
            return {}
        
        # Find where this section ends (next LUNCH section or end of content)
        for i in range(section_start, len(lines)):
            if re.match(r'^LUNCH\s+\d+$', lines[i], re.IGNORECASE):
                section_end = i
                break
        
        if section_end is None:
            section_end = len(lines)
        
        # Parse just this section
        section_lines = lines[section_start:section_end]
        section_dishes = {}
        current_day = None
        
        for i, line in enumerate(section_lines):
            # Check for day headers
            if line.upper() in days:
                day_mapping = {
                    'MÅNDAG': 'Måndag', 'TISDAG': 'Tisdag', 'ONSDAG': 'Onsdag',
                    'TORSDAG': 'Torsdag', 'FREDAG': 'Fredag'
                }
                current_day = day_mapping.get(line.upper())
                if current_day and current_day not in section_dishes:
                    section_dishes[current_day] = []
                continue
            
            # Check for dish names
            elif (current_day and 
                  re.match(r'^[A-Z][A-Z\s&\-\']+[A-Z]$', line) and 
                  2 <= len(line.split()) <= 6 and
                  any(keyword in line.upper() for keyword in ['CHICKEN', 'BEEF', 'LAMB', 'CURRY', 'MASALA', 'TIKKA', 'BUTTER', 'PALAK', 'LAMM', 'GHOST', 'MALAI', 'VINDALOO', 'ACHARI', 'CHILI', 'GARLIC', 'BAINGAN', 'METHI'])):
                
                dish_name = line.strip()
                dish_description = ""
                
                self.log_info(f"Found dish candidate: '{dish_name}' for day {current_day}")
                
                # Look for description on the next line(s)
                desc_lines = []
                for j in range(i + 1, min(i + 4, len(section_lines))):  # Check up to 3 lines ahead
                    next_line = section_lines[j].strip()
                    # Stop if we hit another day or dish name
                    if (next_line.upper() in days or
                        re.match(r'^[A-Z][A-Z\s&\-\']+[A-Z]$', next_line) and 
                        any(keyword in next_line.upper() for keyword in ['CHICKEN', 'BEEF', 'LAMB', 'CURRY', 'MASALA', 'TIKKA', 'BUTTER', 'PALAK', 'LAMM', 'GHOST', 'MALAI', 'VINDALOO', 'ACHARI', 'CHILI', 'GARLIC', 'BAINGAN', 'METHI'])):
                        break
                    # Check if this line looks like a description
                    if (len(next_line) > 10 and
                        any(keyword in next_line.lower() for keyword in ['tillagad', 'gjord', 'marinerad', 'gryta', 'curry', 'sås', 'med', 'av', 'kött', 'serveras', 'består'])):
                        desc_lines.append(next_line)
                
                dish_description = ' '.join(desc_lines) if desc_lines else ""
                
                section_dishes[current_day].append({
                    'name': dish_name,
                    'description': dish_description,
                    'section': target_lunch
                })
        
        # Remove empty days
        section_dishes = {day: dishes for day, dishes in section_dishes.items() if dishes}
        
        self.log_info(f"Parsed {target_lunch} with {sum(len(dishes) for dishes in section_dishes.values())} dishes across {len(section_dishes)} days")
        return section_dishes
    
    def _parse_menu_from_text(self, text):
        """Parse menu data from the full page text, handling multiple lunch sections"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Find all lunch sections first
        lunch_sections = {}
        days = ['MÅNDAG', 'TISDAG', 'ONSDAG', 'TORSDAG', 'FREDAG']
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Check for lunch section headers
            if re.match(r'^LUNCH\s+\d+$', line, re.IGNORECASE):
                section_name = line.strip()
                section_dishes = {}
                current_day = None
                i += 1
                
                # Process this section until next LUNCH section or end
                while i < len(lines):
                    current_line = lines[i].strip()
                    
                    # Stop if we hit another LUNCH section
                    if re.match(r'^LUNCH\s+\d+$', current_line, re.IGNORECASE):
                        break
                    
                    # Check for day headers
                    if current_line.upper() in days:
                        day_mapping = {
                            'MÅNDAG': 'Måndag', 'TISDAG': 'Tisdag', 'ONSDAG': 'Onsdag',
                            'TORSDAG': 'Torsdag', 'FREDAG': 'Fredag'
                        }
                        current_day = day_mapping.get(current_line.upper())
                        if current_day and current_day not in section_dishes:
                            section_dishes[current_day] = []
                        i += 1
                        continue
                    
                    # Check for dish names
                    elif (current_day and 
                          re.match(r'^[A-Z][A-Z\s&\-\']+[A-Z]$', current_line) and 
                          3 <= len(current_line.split()) <= 6 and
                          any(keyword in current_line.upper() for keyword in ['CHICKEN', 'BEEF', 'LAMB', 'CURRY', 'MASALA', 'TIKKA', 'BUTTER', 'PALAK', 'LAMM', 'GHOST'])):
                        
                        dish_name = current_line.strip()
                        dish_description = ""
                        
                        # Look for description on the next line
                        if i + 1 < len(lines):
                            next_line = lines[i + 1].strip()
                            # Check if next line looks like a description
                            if (not re.match(r'^(MÅNDAG|TISDAG|ONSDAG|TORSDAG|FREDAG|LUNCH\s+\d+)$', next_line, re.IGNORECASE) and
                                not re.match(r'^[A-Z][A-Z\s&\-\']+[A-Z]$', next_line) and
                                len(next_line) > 20 and
                                any(keyword in next_line.lower() for keyword in ['tillagad', 'gjord', 'marinerad', 'gryta', 'curry', 'sås', 'med', 'av', 'kött'])):
                                
                                dish_description = next_line
                                i += 1  # Skip the description line in next iteration
                        
                        section_dishes[current_day].append({
                            'name': dish_name,
                            'description': dish_description,
                            'section': section_name
                        })
                    
                    i += 1
                
                # Only add section if it has dishes
                if any(section_dishes.values()):
                    lunch_sections[section_name] = section_dishes
                continue
            
            i += 1
        
        # Choose which lunch section to use
        chosen_section = self._choose_lunch_section(lunch_sections)
        
        if chosen_section:
            self.log_info(f"Using {chosen_section} with {sum(len(dishes) for dishes in lunch_sections[chosen_section].values())} dishes")
            return lunch_sections[chosen_section]
        else:
            self.log_warning("No suitable lunch section found")
            return {}
    
    def _choose_lunch_section(self, lunch_sections):
        """Choose which lunch section to use from available sections"""
        if not lunch_sections:
            return None
        
        # Get current week number for rotation
        current_week = datetime.now().isocalendar()[1]
        
        # Strategy 1: Use week-based rotation (most likely to be accurate)
        # Many restaurants rotate menus weekly: Week 1->LUNCH 1, Week 2->LUNCH 2, etc.
        rotation_mapping = {
            0: 'LUNCH 4',  # Week % 4 == 0
            1: 'LUNCH 1',  # Week % 4 == 1  
            2: 'LUNCH 2',  # Week % 4 == 2
            3: 'LUNCH 3'   # Week % 4 == 3
        }
        
        week_rotation = current_week % 4
        suggested_lunch = rotation_mapping[week_rotation]
        
        # Check if the suggested lunch section exists and has dishes
        if suggested_lunch in lunch_sections:
            suggested_dishes = sum(len(dishes) for dishes in lunch_sections[suggested_lunch].values())
            if suggested_dishes >= 1:  # Any dishes is sufficient
                self.log_info(f"Using {suggested_lunch} based on week rotation (Week {current_week}, rotation {week_rotation}) - {suggested_dishes} dishes")
                return suggested_lunch
            else:
                self.log_warning(f"Week rotation suggests {suggested_lunch} but it has no dishes")
        else:
            self.log_warning(f"Week rotation suggests {suggested_lunch} but it doesn't exist")
        
        # Strategy 2: Use the section with the most dishes as fallback
        best_section = None
        max_dishes = 0
        
        for section_name, section_data in lunch_sections.items():
            dish_count = sum(len(dishes) for dishes in section_data.values())
            if dish_count > max_dishes:
                max_dishes = dish_count
                best_section = section_name
        
        if best_section and max_dishes >= 1:
            self.log_info(f"Using {best_section} as most complete menu fallback ({max_dishes} dishes)")
            return best_section
        
        # Strategy 3: Use LUNCH 1 as last resort (traditional default)
        if 'LUNCH 1' in lunch_sections:
            lunch1_dishes = sum(len(dishes) for dishes in lunch_sections['LUNCH 1'].values())
            self.log_info(f"Using LUNCH 1 as final fallback ({lunch1_dishes} dishes)")
            return 'LUNCH 1'
        
        # Strategy 4: Use first available section
        first_section = list(lunch_sections.keys())[0]
        self.log_info(f"Using {first_section} as absolute last resort")
        return first_section
    
    def _extract_from_elements(self, soup):
        """Alternative extraction method using element traversal"""
        menu_items = []
        
        try:
            # Look for all text editor widgets that might contain menu data
            text_widgets = soup.find_all('div', class_=lambda x: x and 'elementor-widget-text-editor' in str(x) if x else False)
            
            for widget in text_widgets:
                content = widget.get_text(separator='\n', strip=True)
                
                # Check if this widget contains significant menu data
                has_days = len(re.findall(r'(MÅNDAG|TISDAG|ONSDAG|TORSDAG|FREDAG)', content, re.IGNORECASE))
                dish_patterns = len(re.findall(r'(CHICKEN|BEEF|LAMM|CURRY|MASALA|TIKKA)', content, re.IGNORECASE))
                
                if has_days >= 1 and dish_patterns >= 2:
                    # Parse this widget's content
                    widget_menu = self._parse_menu_from_text(content)
                    for day, dishes in widget_menu.items():
                        for dish in dishes:
                            category = self._categorize_dish(dish['name'], dish['description'])
                            formatted_name = self._format_dish_name(dish['name'])
                            formatted_item = f"<strong>{category}</strong> - {formatted_name}: {dish['description']}"
                            menu_items.append(f"{day}|{formatted_item}")
        
        except Exception as e:
            self.log_error(f"Error in element extraction: {str(e)}")
        
        return menu_items
    
    def _get_fallback_items(self):
        """Return fallback menu items when scraping fails"""
        fallback_items = []
        
        # Add some common dishes that are typically available
        common_dishes = [
            {'name': 'Butter Chicken', 'description': 'Mild kycklinggryta med nötter, smör i en krämig sås'},
            {'name': 'Chicken Tikka Masala', 'description': 'Grillad kycklingfilé med rostad paprika och tomater i en krämig sås'},
            {'name': 'Lamb Curry', 'description': 'Lammköttgryta i kryddstark currysås'},
            {'name': 'Veg Thali', 'description': 'Dagens vegetariska rätter med raita (kan fås vegansk)'}
        ]
        
        for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
            for dish in common_dishes:
                category = self._categorize_dish(dish['name'], dish['description'])
                formatted_name = self._format_dish_name(dish['name'])
                formatted_item = f"<strong>{category}</strong> - {formatted_name}: {dish['description']}"
                fallback_items.append(f"{day}|{formatted_item}")
        
        self.log_info(f"Using fallback menu with {len(fallback_items)} items")
        return fallback_items
    
    def _format_dish_name(self, dish_name):
        """Format dish name with proper capitalization and remove prices"""
        if not dish_name:
            return dish_name
        
        import re
        
        # Remove price information in various formats
        # Pattern 1: "(123 kr)" or "(123kr)"
        dish_name = re.sub(r'\s*\(\s*\d+\s*kr\s*\)', '', dish_name, flags=re.IGNORECASE)
        
        # Pattern 2: "DISH NAME 123KR" or "DISH NAME 123 KR"
        dish_name = re.sub(r'\s+\d+\s*kr\s*:?\s*$', '', dish_name, flags=re.IGNORECASE)
        
        # Pattern 3: "DISH NAME: 123KR" or "DISH NAME : 123KR"
        dish_name = re.sub(r'\s*:\s*\d+\s*kr\s*$', '', dish_name, flags=re.IGNORECASE)
        
        # Clean up any extra whitespace
        dish_name = dish_name.strip()
        
        # Standard title case formatting
        formatted = dish_name.title()
        
        # Fix specific words that should have different capitalization
        replacements = {
            ' Kr': ' kr',
            ' Och': ' och',
            ' Med': ' med',
            ' Av': ' av',
            ' I ': ' i ',
            ' Till': ' till',
            ' För': ' för',
            ' På': ' på',
            ' Från': ' från'
        }
        
        for old, new in replacements.items():
            formatted = formatted.replace(old, new)
        
        return formatted
    
    def _categorize_dish(self, dish_name, dish_description):
        """Categorize dish based on main ingredients"""
        dish_text = (dish_name + " " + dish_description).lower()
        
        # Check for vegetarian indicators first
        if any(word in dish_text for word in ['veg', 'vegetarisk']):
            return 'Indisk Vegetarisk'
        
        # Check for chicken (should come first)
        if any(word in dish_text for word in ['chicken', 'kyckling', 'murgh']):
            return 'Indisk Kyckling'
        
        # Check for beef (should come second)
        if any(word in dish_text for word in ['beef', 'oxkött']):
            return 'Indisk Nötkött'
        
        # Check for lamb (third)
        if any(word in dish_text for word in ['lamm', 'lamb', 'ghost', 'gosht', 'kofta']):
            return 'Indisk Lamm'
        
        # Check for seafood (last)
        if any(word in dish_text for word in ['jingha', 'räkor', 'fish', 'fisk']):
            return 'Indisk Skaldjur'
        
        # Default for other meat dishes
        return 'Indisk'
    
    def _extract_standing_dishes(self, text):
        """Extract standing dishes that are available every day (DAGENS VEG and ANDRA ALTERNATIV)"""
        standing_dishes = []
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        try:
            # Look for DAGENS VEG SUBZI THALI as a specific dish (not a section)
            veg_dish = self._extract_dagens_veg_dish(lines)
            if veg_dish:
                standing_dishes.append(veg_dish)
            
            # Look for ANDRA ALTERNATIV section  
            other_dishes = self._extract_section_dishes(lines, "ANDRA ALTERNATIV")
            standing_dishes.extend(other_dishes)
            
            self.log_info(f"Found {len(standing_dishes)} standing dishes (available every day)")
            
        except Exception as e:
            self.log_error(f"Error extracting standing dishes: {str(e)}")
        
        return standing_dishes
    
    def _extract_dagens_veg_dish(self, lines):
        """Extract the DAGENS VEG SUBZI THALI dish specifically"""
        try:
            for i, line in enumerate(lines):
                if 'DAGENS VEG SUBZI THALI' in line.upper():
                    # Look for description on next line
                    dish_description = "Dagens vegetariska thali"
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        if (len(next_line) > 10 and 
                            'vegetarisk' in next_line.lower() and
                            not any(header in next_line.upper() for header in ['LUNCH', 'ANDRA ALTERNATIV', 'KONTAKT'])):
                            dish_description = next_line
                    
                    return {
                        'name': 'Dagens Veg Subzi Thali',
                        'description': dish_description,
                        'section': 'Standing'
                    }
            
            self.log_warning("DAGENS VEG SUBZI THALI not found in content")
            return None
            
        except Exception as e:
            self.log_error(f"Error extracting DAGENS VEG dish: {str(e)}")
            return None
    
    def _extract_section_dishes(self, lines, section_name):
        """Extract dishes from a specific section (like DAGENS VEG or ANDRA ALTERNATIV)"""
        section_dishes = []
        
        try:
            # Find the section start
            section_start = None
            for i, line in enumerate(lines):
                if section_name.upper() in line.upper():
                    section_start = i + 1
                    break
            
            if section_start is None:
                self.log_info(f"Section '{section_name}' not found")
                return section_dishes
            
            # Find section end (next major section or end of content)
            section_end = len(lines)
            section_headers = ["LUNCH", "DAGENS VEG", "ANDRA ALTERNATIV", "ÖPPETTIDER", "KONTAKT", "BESTÄLL"]
            
            for i in range(section_start, len(lines)):
                line_upper = lines[i].upper()
                if any(header in line_upper for header in section_headers if header != section_name.upper()):
                    section_end = i
                    break
            
            # Extract dishes from this section
            for i in range(section_start, section_end):
                line = lines[i].strip()
                
                # Skip empty lines and section headers
                if not line or any(header in line.upper() for header in section_headers):
                    continue
                
                # Look for dish patterns
                dish = self._parse_standing_dish_line(line, lines, i)
                if dish:
                    section_dishes.append(dish)
            
            self.log_info(f"Found {len(section_dishes)} dishes in '{section_name}' section")
            
        except Exception as e:
            self.log_error(f"Error extracting dishes from '{section_name}': {str(e)}")
        
        return section_dishes
    
    def _parse_standing_dish_line(self, line, all_lines, line_index):
        """Parse a line that might contain a standing dish"""
        try:
            # Pattern 1: Dish name with price (like "TIKKA MASALA 134KR" or "JINGHA HARA : 145KR")
            price_pattern = re.match(r'^([A-Z\s]+?)\s*:?\s*(\d+)\s*KR\s*:?\s*$', line.strip(), re.IGNORECASE)
            if price_pattern:
                dish_name = price_pattern.group(1).strip()
                price = price_pattern.group(2)
                
                # Look for description on next line
                dish_description = ""
                if line_index + 1 < len(all_lines):
                    next_line = all_lines[line_index + 1].strip()
                    if (len(next_line) > 20 and 
                        not re.match(r'^[A-Z\s]+\s+\d+\s*KR', next_line, re.IGNORECASE) and
                        not any(header in next_line.upper() for header in ['LUNCH', 'DAGENS VEG', 'ANDRA ALTERNATIV', 'KONTAKT'])):
                        dish_description = next_line
                
                return {
                    'name': f"{dish_name} ({price} kr)",
                    'description': dish_description if dish_description else f"Pris: {price} kr",
                    'section': 'Standing'
                }
            
            # Pattern 1b: Dish name on one line, price on next line (like "JINGHA HARA" then "145KR")
            if (re.match(r'^[A-Z\s]+$', line.strip()) and 
                line_index + 1 < len(all_lines) and
                re.match(r'^\d+\s*KR\s*$', all_lines[line_index + 1].strip(), re.IGNORECASE)):
                
                dish_name = line.strip()
                price_line = all_lines[line_index + 1].strip()
                price = re.search(r'(\d+)', price_line).group(1)
                
                # Look for description on line after price
                dish_description = ""
                if line_index + 2 < len(all_lines):
                    desc_line = all_lines[line_index + 2].strip()
                    if (len(desc_line) > 20 and 
                        not re.match(r'^[A-Z\s]+$', desc_line) and
                        not any(header in desc_line.upper() for header in ['LUNCH', 'DAGENS VEG', 'ANDRA ALTERNATIV', 'KONTAKT'])):
                        dish_description = desc_line
                
                return {
                    'name': f"{dish_name} ({price} kr)",
                    'description': dish_description if dish_description else f"Pris: {price} kr",
                    'section': 'Standing'
                }
            
            # Pattern 2: "DAGENS VEG SUBZI THALI" - vegetarian thali (handled in separate method now)
            # This pattern is kept for backward compatibility but shouldn't be reached
            if 'DAGENS VEG SUBZI THALI' in line.upper():
                return {
                    'name': 'Dagens Veg Subzi Thali',
                    'description': 'Dagens vegetariska thali',
                    'section': 'Standing'
                }
            
            # Pattern 3: Dish name followed by description on same line (separated by - or :)
            separators = [' - ', ': ', ' – ', ' — ']
            for sep in separators:
                if sep in line:
                    parts = line.split(sep, 1)
                    if len(parts) == 2:
                        name = parts[0].strip()
                        description = parts[1].strip()
                        
                        # Validate this looks like a dish
                        if self._is_likely_dish_name(name):
                            return {
                                'name': name,
                                'description': description,
                                'section': 'Standing'
                            }
            
            # Pattern 4: All caps dish name without price, description on next line
            if (re.match(r'^[A-Z][A-Z\s&\-\']+[A-Z]$', line) and 
                3 <= len(line.split()) <= 6 and
                not re.search(r'\d+\s*KR', line, re.IGNORECASE) and
                any(keyword in line.upper() for keyword in ['CHICKEN', 'BEEF', 'LAMM', 'VEG', 'TIKKA', 'MASALA', 'CURRY', 'THALI', 'JINGHA', 'HARA'])):
                
                dish_name = line.strip()
                dish_description = ""
                
                # Look for description on next line
                if line_index + 1 < len(all_lines):
                    next_line = all_lines[line_index + 1].strip()
                    if (len(next_line) > 20 and
                        not re.match(r'^[A-Z][A-Z\s&\-\']+[A-Z]$', next_line) and
                        any(keyword in next_line.lower() for keyword in ['tillagad', 'gjord', 'marinerad', 'gryta', 'curry', 'sås', 'med', 'av', 'räkor', 'kyckling'])):
                        
                        dish_description = next_line
                
                return {
                    'name': dish_name,
                    'description': dish_description,
                    'section': 'Standing'
                }
                
        except Exception as e:
            self.log_error(f"Error parsing standing dish line: {str(e)}")
        
        return None
    
    def _looks_like_standing_dish(self, line):
        """Check if a line looks like it contains a standing dish"""
        if len(line) < 10:
            return False
        
        # Check for dish indicators
        dish_indicators = [
            'chicken', 'kyckling', 'beef', 'oxkött', 'lamm', 'lamb',
            'curry', 'masala', 'tikka', 'korma', 'vindaloo', 'butter',
            'vegetarisk', 'veg', 'thali', 'räkor', 'fisk', 'alternatives',
            'alternativ', 'dagens', 'kr', 'pris'
        ]
        
        line_lower = line.lower()
        return any(indicator in line_lower for indicator in dish_indicators)
    
    def _is_likely_dish_name(self, text):
        """Check if text looks like a dish name"""
        if len(text) < 3 or len(text) > 100:
            return False
        
        # Common dish name patterns
        dish_words = [
            'chicken', 'kyckling', 'beef', 'oxkött', 'lamm', 'lamb', 'ghost', 'gosht',
            'curry', 'masala', 'tikka', 'korma', 'vindaloo', 'butter',
            'palak', 'malai', 'bhuna', 'kadhai', 'jhalfrezi', 'madras',
            'vegetarisk', 'veg', 'thali', 'räkor', 'jingha'
        ]
        
        text_lower = text.lower()
        return any(word in text_lower for word in dish_words) 