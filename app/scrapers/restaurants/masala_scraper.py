import re
from typing import Dict, List, Optional
from datetime import datetime

import requests
from bs4 import BeautifulSoup

from ..static_menu_scraper import StaticMenuScraper


class MasalaScraper(StaticMenuScraper):
    """Masala Kitchen — Lindholmen, Göteborg.

    Rätterna kan inte skrapas. De publiceras som SVG där texten är omvandlad
    till kurvor — 1235 path-element och inte en enda textnod — så det enda
    sättet att läsa dem är att titta på bilden. Därför ligger de i en
    handskriven fil, som alla andra statiska menyer här.

    Men *vilken* av de fyra menyerna som gäller går att läsa. Restaurangen
    roterar fyra veckomenyer, och filnamnet på bilden i fliken "Veckans Meny"
    avslöjar numret: lunch-menu4-MK-nov2025-1.svg.

    Det är värt att hämta. Alternativet — att räkna ut menyn ur veckonumret —
    stämmer bara så länge deras rotation råkar ligga i fas med vår, och den
    dag de hoppar över en vecka eller lägger om ordningen skulle vi visa fel
    mat utan att märka något. Aritmetiken finns kvar som reserv för det fall
    sidan inte går att läsa.
    """

    MENU_URL = 'https://masalakitchen.se/lunch/'

    # Fliken som visar innevarande vecka. Den andra heter "Nästa Veckas Meny",
    # så matchningen måste utesluta den.
    CURRENT_TAB = re.compile(r'^\s*veckans\s+meny\s*$', re.IGNORECASE)
    MENU_NUMBER = re.compile(r'lunch-menu(\d)')

    DAY_MAP = {
        'Monday': 'Måndag',
        'Tuesday': 'Tisdag',
        'Wednesday': 'Onsdag',
        'Thursday': 'Torsdag',
        'Friday': 'Fredag',
    }

    def __init__(self):
        restaurant_info = {
            'name': 'Masala Kitchen',
            'website': 'https://masalakitchen.se/lunch/',
        }
        super().__init__(restaurant_info, 'masala_lunch_all_weeks.json')

    def _current_menu_number(self) -> Optional[int]:
        """Vilken av de fyra menyerna som hänger uppe den här veckan."""
        try:
            response = requests.get(self.MENU_URL, headers=self.headers, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
        except (requests.RequestException, ValueError) as error:
            self.log_error(f"Could not load the menu page: {error}")
            return None

        for tabs in soup.select('.eael-advance-tabs'):
            navs = tabs.select('.eael-tab-nav-item')
            contents = tabs.select('.eael-tab-content-item')
            for nav, content in zip(navs, contents):
                title = ' '.join(nav.get_text(' ', strip=True).split())
                if not self.CURRENT_TAB.match(title):
                    continue
                for image in content.find_all('img'):
                    match = self.MENU_NUMBER.search(image.get('src', ''))
                    if match:
                        return int(match.group(1))
        return None

    def scrape(self) -> Dict[str, List[str]]:
        try:
            items = []

            number = self._current_menu_number()
            if number is None:
                # Reserv: anta att deras rotation ligger i fas med veckonumret.
                number = ((datetime.today().isocalendar().week - 1) % 4) + 1
                self.log_error(f"Could not read the menu number — falling back to week {number}")

            week_key = f"week{number}"
            daily_menus = self.menu_data.get('weeks', {}).get(week_key, {})

            # Standing menu items (same every day)
            standing_items = self.menu_data.get('standing', [])

            for eng_day, swe_day in self.DAY_MAP.items():
                # Daily rotating dishes
                day_dishes = daily_menus.get(eng_day, [])
                for dish in day_dishes:
                    items.append(self.format_static_item(
                        swe_day, 'Dagens', dish['name'], dish.get('description', ''), dish.get('price', '')
                    ))

                # Standing menu
                for dish in standing_items:
                    items.append(self.format_static_item(
                        swe_day, 'Stående meny', dish['name'], dish.get('description', ''), dish.get('price', '')
                    ))

            if not items:
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error loading menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
