from ..base_scraper import BaseScraper
import copy
import re

class KooperativetScraper(BaseScraper):
    """Kooperativet publicerar veckans lunch i WordPress (Enfold-temat).

    Varje veckodag är en <div id="monday">…"friday"> med ett avia_textblock.
    Inuti det står en rätt per <p>, på formen

        <p><strong>KÖTT</strong><br/>Rätten och dess beskrivning</p>

    Fällan är att de skriver rubrikerna för hand och gör det slarvigt med jämna
    mellanrum. 2026-08-10 stod måndagens KÖTT-rubrik mitt inne i det stycke som
    innehöll den vegetariska rätten:

        <p>”VEG Taco Bowl” –…tortilla<br/><strong><br/>KÖTT</strong><br/>
           Kooperativets klassiska Köttbullemåndag…</p>

    En igenkänning som kräver att stycket BÖRJAR med sin rubrik missar då både
    rubriken och rätten: köttbullarna klistrades fast i slutet av den
    vegetariska raden och blev osynliga för den som läser sajten. Därför delas
    stycket numera vid varje rubrik, var den än står — se
    _split_by_categories().

    Två saker till som mätningen av sidan visade, och som styr designen:

    - Rubriken kan sakna <strong> lika gärna som den kan sakna styckebrytning,
      så den kända kategorilistan måste kunna hitta den på egen hand.
    - Men listan räcker inte: fredagen hade EAST ASIA, en kategori som inte
      står i listan och bara går att se på att den är fetstilt. Kandidaterna är
      därför BÅDE den kända listan och sidans egna versala <strong>-rubriker.

    Matchningen är versalkänslig och kräver hela ord. Det är inte kosmetika:
    ingen kategori förekommer någonsin i versaler inne i en rättsbeskrivning
    (mätt över alla fem dagarna), medan gemena "kött" och "fisk" gör det stup i
    kvarten. Kravet på helt ord är det som hindrar "VEG Taco Bowl" från att
    läsas som rubriken VEGETARISK.
    """

    # Kategorier vi vet att de använder. Matchas även utan <strong>.
    # EAST ASIA observerades på fredagen 2026-08-10 och står med här för att
    # den annars bara känns igen så länge de kommer ihåg att fetstila den.
    KNOWN_CATEGORIES = [
        'SALLADER', 'VECKANS SPECIAL', 'KÖTT', 'FISK', 'THAI', 'INDISK',
        'VÄRLDEN', 'VEGETARISKT', 'VEGETARISK', 'EAST ASIA',
    ]

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
            # Rubrikkandidaterna samlas för hela dagen, inte per stycke: hamnar
            # en fetstilt rubrik i fel stycke ska den ändå kännas igen där.
            headings = self._collect_headings(day_section)

            # Find all textblocks in this day section
            textblocks = day_section.find_all('div', class_='avia_textblock')

            for textblock in textblocks:
                paragraphs = textblock.find_all('p')
                current_category = None

                for p in paragraphs:
                    # Skip empty paragraphs
                    if not p.get_text().strip():
                        continue

                    # Ett stycke kan innehålla flera rätter om de glömt
                    # styckebrytningen. Texten före en rubrik hör till
                    # föregående kategori, texten efter till den nya.
                    for category, segment in self._split_by_categories(self._paragraph_text(p), headings):
                        if category:
                            current_category = category

                        item_text = segment.strip().lstrip('–').lstrip(':').strip()
                        if not item_text or item_text in ['–', '..', '.']:
                            continue

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

    def _paragraph_text(self, p):
        """Styckets text med <br> som radbrytning.

        get_text() klistrar annars ihop raderna, och det är just på en <br> som
        en felplacerad rubrik brukar sitta.
        """
        clone = copy.copy(p)
        for br in clone.find_all('br'):
            br.replace_with('\n')
        return clone.get_text()

    def _collect_headings(self, day_section):
        """Rubrikkandidater: kända kategorier plus dagens versala <strong>."""
        headings = list(self.KNOWN_CATEGORIES)

        for strong in day_section.find_all('strong'):
            text = self.clean_text(strong.get_text())
            # En rubrik är kort och skriven i versaler. Fetstilar de en hel
            # rätt ska den inte börja dela stycken.
            if not text or len(text) > 30:
                continue
            letters = [c for c in text if c.isalpha()]
            if letters and all(c.isupper() for c in letters) and text not in headings:
                headings.append(text)

        return headings

    def _split_by_categories(self, text, headings):
        """Dela styckets text vid varje kategorirubrik, var den än står.

        Returnerar (kategori, text)-par i tur och ordning. Kategorin är None
        för texten före den första rubriken — den hör till föregående kategori,
        som anroparen håller reda på.
        """
        if not headings:
            return [(None, text)]

        # Längsta först, annars äter VEGETARISK upp VEGETARISKT. Blanksteg i en
        # rubrik matchar även radbrytning, för de skriver "<strong><br/>KÖTT"
        # och "FISK        " med släpande blanksteg.
        alternatives = '|'.join(
            r'\s+'.join(re.escape(word) for word in heading.split())
            for heading in sorted(set(headings), key=len, reverse=True)
        )
        # (?<!\w)/(?!\w) kräver hela ord: "VEG Taco Bowl" är inte VEGETARISK.
        pattern = re.compile(r'(?<!\w)(' + alternatives + r')(?!\w)')

        segments = []
        position = 0
        category = None

        for match in pattern.finditer(text):
            segments.append((category, text[position:match.start()]))
            category = self.clean_text(match.group(1))
            position = match.end()

        segments.append((category, text[position:]))
        return segments
    
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