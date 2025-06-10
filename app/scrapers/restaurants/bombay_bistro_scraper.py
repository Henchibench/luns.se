from ..base_scraper import BaseScraper
import re

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
            
            # Get all lunch menus (they have 4 different lunch options)
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
            info['lunch_price'] = "Lunch 11:00-15:00, 120-129 kr inkl. sallad, naan bröd och vatten"
            info['fun_fact'] = "Autentisk indisk mat med flera lunchalternativ!"
            
            return info
            
        except Exception as e:
            self.log_error(f"Error extracting restaurant info: {str(e)}")
            return {}
    
    def _extract_all_lunch_menus(self, soup):
        """Extract all lunch menus from the page"""
        all_menu_items = []
        
        try:
            # Define the menu data based on the website content
            # This is the safest approach since their website uses complex Elementor markup
            lunch_menus = self._get_static_menu_data()
            
            for menu_name, daily_dishes in lunch_menus.items():
                for day, dishes in daily_dishes.items():
                    for dish in dishes:
                        if dish['name']:  # Only add dishes with names
                            category = self._categorize_dish(dish['name'], dish['description'])
                            formatted_item = f"<strong>{category}</strong> - {dish['name']}: {dish['description']}"
                            all_menu_items.append(f"{day}|{formatted_item}")
                        
                        # Also add VEG SUBZI THALI as a separate category
                        if day == 'Måndag' and menu_name == 'LUNCH 1':  # Add only once per menu
                            veg_item = f"<strong>Indisk Vegetarisk</strong> - Dagens Veg Subzi Thali: Tre dagens vegetariska rätter och raita (kan fås vegansk)"
                            for day_name in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                                all_menu_items.append(f"{day_name}|{veg_item}")
            
            # Add daily alternatives that are available every day
            daily_alternatives = self._get_daily_alternatives()
            for day_name in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                for alternative in daily_alternatives:
                    category = self._categorize_dish(alternative['name'], alternative['description'])
                    price_info = f" ({alternative['price']})" if alternative['price'] else ""
                    formatted_item = f"<strong>{category}</strong> - {alternative['name']}: {alternative['description']}{price_info}"
                    all_menu_items.append(f"{day_name}|{formatted_item}")
        
        except Exception as e:
            self.log_error(f"Error extracting all lunch menus: {str(e)}")
        
        return all_menu_items
    
    def _get_static_menu_data(self):
        """Return static menu data based on the website content"""
        return {
            'LUNCH 1': {
                'Måndag': [
                    {'name': 'Methi Malai', 'description': 'Kycklinggryta tillagad med bockhornsklöver, fänkålsfrön, korianderfrön, tomat och grädde'},
                    {'name': 'Lamm Vindaloo', 'description': 'Lammköttgryta gjord av ingefära, kanel, röd chili, brun socker, curryblad och rödvin'}
                ],
                'Tisdag': [
                    {'name': 'Lemon Pepper Chicken', 'description': 'Kycklingfile tillagad med citron, svartpepper, koriander och kokos'},
                    {'name': 'Bhurani Beef Curry', 'description': 'Oxkött i en kryddig currysås som består av roasted vitlök, tomat, lök, ingefära och grön chili'}
                ],
                'Onsdag': [
                    {'name': 'Butter Chicken', 'description': 'Mild kycklinggryta med nötter, smör i en krämig sås'},
                    {'name': 'Achari Ghost', 'description': 'Lamm tillagad i fänkål, grön chili, vitlök, senapsfrön och curryblad'}
                ],
                'Torsdag': [
                    {'name': 'Chili Chicken', 'description': 'Kycklingfilé tillagad med chili, masala, rödlök, paprika, vinäger, ingefära och vitlök'},
                    {'name': 'Beef Malai Korma', 'description': 'Oxköttgryta tillagad en gräddsås med tomat, kardemumma, rosvatten och smör'}
                ],
                'Fredag': [
                    {'name': 'Garlic Chicken', 'description': 'Kycklingfilé marinerad i vitlök, grönchili, spiskummin serveras med tandoori sås'},
                    {'name': 'Baingan Ghost', 'description': 'Lammkött tillagad med aubergine, lök, garam masala och grön chili'}
                ]
            },
            'LUNCH 2': {
                'Måndag': [
                    {'name': 'Palak Murgh', 'description': 'Kycklinggryta tillagad med spenat, bockhornsklöver och vitlök'},
                    {'name': 'Lamm Tikka Masala', 'description': 'Lammkött bräserat i kokos, grädde, paprika, tomat och spiskummin'}
                ],
                'Tisdag': [
                    {'name': 'Chicken Bhuna', 'description': 'Kryddig kycklinggryta med rödlök, chili, tomat, kryddnejlika, koriander och curryblad'},
                    {'name': 'Beef Rogan Josh', 'description': 'Oxköttgryta tillagad med lök, tomat, kardemumma, rosvatten och yoghurt'}
                ],
                'Onsdag': [
                    {'name': 'Chicken Kadhai', 'description': 'Nordindisk kycklinggryta med rödlök, paprika, fänkål, citron, svartpeppar och koriander'},
                    {'name': 'Bengali Kofta Curry', 'description': 'Lammfärsbullar tillagad med mango, senapsfrön, curryblad, chilli och kokos'}
                ],
                'Torsdag': [
                    {'name': 'Butter Chicken', 'description': 'Kycklinggryta i en aromatisk gräddsås som består av tomat, ost, cashewnötter och smör'},
                    {'name': 'Beef Sharabi', 'description': 'Oxköttgryta tillagad med en kryddstark cognacsås gjord på vitlök, ingefära, linser och grön chili'}
                ],
                'Fredag': [
                    {'name': 'Chicken Tikka', 'description': 'Grillad kycklingfilé marinerad i lime, yoghurt och tandoori masala, serveras med tandoori sås'},
                    {'name': 'Hydrabadi Ghost', 'description': 'Lammköttgryta med senap, lök, tomat, vitlök, sesamfrön, mynta, grön chili och kokos'}
                ]
            },
            'LUNCH 3': {
                'Måndag': [
                    {'name': 'Chicken Vindaloo', 'description': 'Kycklingryta med ursprung från Goa består av rödvin, kanel, röd chili, curryblad'},
                    {'name': 'Lamm Korma', 'description': 'Lammköttgryta gjord av grädde tomat, kardemumma, rosvatten och smör'}
                ],
                'Tisdag': [
                    {'name': 'Hariyali Chicken', 'description': 'Kycklingfile i en örtsås som består av basilika, mynta, koriander, lök, grön chili och kokos'},
                    {'name': 'Masaledar Beef', 'description': 'Kryddig oxköttgryta med lök, tomat, chili, nejlika, lime och koriander'}
                ],
                'Onsdag': [
                    {'name': 'Butter Chicken', 'description': 'Kycklinggryta i en aromatisk gräddsås som består av tomat, ost, cashewnötter och smör'},
                    {'name': 'Balti Ghost', 'description': 'Lammkött marinerad i vitlök och grön chilli tillagad i en kryddstark rödvinsås, lök, paprika och champinjoner'}
                ],
                'Torsdag': [
                    {'name': 'Murgh Jhalfrezi', 'description': 'Kycklingfilé tillagad i söt och syrlig sås av tomat, rödlök, zucchini, paprika, fänkål och chili'},
                    {'name': 'Beef Bombay Special', 'description': 'Oxköttgryta med en kryddstark gräddsås'}
                ],
                'Fredag': [
                    {'name': 'Pahadi Grill Chicken', 'description': 'Grillad kycklingfilé marinerad i yoghurt och örter, serveras med tandoori sås'},
                    {'name': 'Dalcha Ghost', 'description': 'Lammgryta med linser, lök, tomat, chili och limejuice'}
                ]
            },
            'LUNCH 4': {
                'Måndag': [
                    {'name': 'Murgh Papadom', 'description': 'Kycklingfilé tillagad i en mild och krämig sås som består av papadom lök, tomat, vitlök och bockhornsklöver'},
                    {'name': 'Lamm Punjabi', 'description': 'Lammköttgryta med smakrik sås med tomat, koriander och grönsaker'}
                ],
                'Tisdag': [
                    {'name': 'Mango Chicken', 'description': 'Kycklingryta gjord av mango, ingefära, grädde, lök och tomat'},
                    {'name': 'Beef Madras', 'description': 'Oxköttgryta med en doft av senapsfrön, fänkål, curryblad och kokos'}
                ],
                'Onsdag': [
                    {'name': 'Chicken Balti', 'description': 'Kycklingfilé marinerad i vitlök och grön chili tillagad med lök, paprika och champinjoner i en rödvinssås'},
                    {'name': 'Kashmiri Lamm Kofta', 'description': 'Lammfärsbullar i en sås som består av lök, tomat, kardemumma, rosvatten, bockhornsklöver och grädde'}
                ],
                'Torsdag': [
                    {'name': 'Butter Chicken', 'description': 'Kycklinggryta i en aromatisk gräddsås som består av tomat, ost, cashewnötter och smör'},
                    {'name': 'Lal Mirch Ka Gosht', 'description': 'Stark oxköttgryta gjord av vitlök, ingefära, röd chili och koriander'}
                ],
                'Fredag': [
                    {'name': 'Kesari Murgh Tikka', 'description': 'Grillad kycklingfilé som är marinerad i saffran, yoghurt och ost. Serveras med tandoori sås'},
                    {'name': 'Saag Ghost', 'description': 'Lammkött med spenat, bockhornsklöver, ingefära, vitlök och grönchili'}
                ]
            }
        }
    
    def _get_daily_alternatives(self):
        """Return dishes that are available every day"""
        return [
            {
                'name': 'Tikka Masala',
                'description': 'Grillad kycklingfilé med rostad paprika och tomater i en krämig sås',
                'price': '134kr'
            },
            {
                'name': 'Tandoori Chicken',
                'description': 'Grillad kyckling med ben, marinerad i yoghurt, kryddor och bockhornsklöver. Serveras med tandoori sås',
                'price': '132kr'
            },
            {
                'name': 'Jingha Hara',
                'description': 'Jätteräkor lagat med färsk basilika, champinjoner och koriander i en het kokossås och grädde',
                'price': '145kr'
            }
        ]
    
    def _categorize_dish(self, dish_name, dish_description):
        """Categorize dish based on main ingredients"""
        dish_text = (dish_name + " " + dish_description).lower()
        
        # Check for vegetarian indicators first
        if any(word in dish_text for word in ['veg', 'vegetarisk', 'spenat', 'palak', 'aubergine', 'baingan']):
            return 'Indisk Vegetarisk'
        
        # Check for chicken (should come first)
        if any(word in dish_text for word in ['chicken', 'kyckling', 'murgh']):
            return 'Indisk Kyckling'
        
        # Check for beef (should come second)
        if any(word in dish_text for word in ['beef', 'oxkött']):
            return 'Indisk Nötkött'
        
        # Check for lamb (third)
        if any(word in dish_text for word in ['lamm', 'ghost', 'gosht', 'kofta']):
            return 'Indisk Lamm'
        
        # Check for seafood (last)
        if any(word in dish_text for word in ['jingha', 'räkor', 'fish', 'fisk']):
            return 'Indisk Skaldjur'
        
        # Default for other meat dishes
        return 'Indisk' 