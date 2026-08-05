import re
from datetime import date, timedelta
from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup

from .base_scraper import BaseScraper


class CompassGroupScraper(BaseScraper):
    """Compass Groups egna restaurangsidor, via deras meny-API.

    Sidorna är en JavaScript-app, men menyn hämtas från en öppen endpoint som
    varken kräver nyckel eller webbläsare:

        /menuapi/week-menus?costCenter=<nummer>&date=<ÅÅÅÅ-MM-DD>&language=sv

    Svaret är veckans sju dagar, var och en med rätterna som en HTML-sträng.

    Numret hämtas ur restaurangens egen sida i stället för att hårdkodas. Byter
    Compass nummer på en restaurang följer skrapan med, och en trasig sida
    märks direkt i stället för att tyst ge en tom meny.

    OBS: alla Compass-restauranger publicerar inte hit. Terrassen och Seven
    Seasons svarar med noll dagar trots att de har menyer — deras går via
    Mashie respektive menydags. Kontrollera att API:et faktiskt har data innan
    du flyttar över en restaurang.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    DAY_NAMES = {
        'Monday': 'Måndag', 'Tuesday': 'Tisdag', 'Wednesday': 'Onsdag',
        'Thursday': 'Torsdag', 'Friday': 'Fredag',
    }

    COST_CENTRE = re.compile(r'costCenter"\s*:\s*"(\d+)"')

    API = 'https://www.compass-group.se/menuapi/week-menus'

    def __init__(self, restaurant_info: dict, stations: Optional[List[str]] = None):
        super().__init__(restaurant_info)
        # Vissa restauranger klämmer in flera rätter i samma stycke och
        # skiljer dem bara åt med stationsnamnet: "Fire: ... Water: ...".
        # Namnen blir då både kategori och avgränsare.
        self.stations = stations or []

    def _cost_centre(self) -> Optional[str]:
        soup = self.get_page_content(self.url)
        if soup is None:
            return None
        match = self.COST_CENTRE.search(str(soup))
        return match.group(1) if match else None

    def _fetch_week(self, cost_centre: str, when: date) -> List[dict]:
        response = requests.get(
            self.API,
            params={'costCenter': cost_centre, 'date': when.isoformat(), 'language': 'sv'},
            headers={**self.headers, 'Accept': 'application/json'},
            timeout=30,
        )
        response.raise_for_status()
        return response.json().get('menus', [])

    def _split_dishes(self, text: str) -> List[tuple]:
        """(kategori, rätt) ur en dagstext."""
        text = self.clean_text(text)
        if not text:
            return []

        if self.stations:
            pattern = '|'.join(re.escape(s) for s in self.stations)
            parts = re.split(rf'\b({pattern})\s*:\s*', text)
            # split() ger [före, station, text, station, text, ...]
            dishes = []
            for i in range(1, len(parts) - 1, 2):
                dish = self.clean_text(parts[i + 1])
                if dish:
                    dishes.append((parts[i], dish))
            if dishes:
                return dishes

        # Utan stationer: "Kategori: rätt" om kolon finns, annars hela raden.
        head, _, rest = text.partition(':')
        if rest and len(head) <= 24:
            return [(self.clean_text(head), self.clean_text(rest))]
        return [('Dagens', text)]

    def scrape(self) -> Dict[str, List[str]]:
        try:
            cost_centre = self._cost_centre()
            if not cost_centre:
                self.log_error('Could not find the cost centre on the restaurant page')
                return {self.name: ["Kunde inte hitta menyn just nu"]}

            today = date.today()
            monday = today - timedelta(days=today.weekday())
            menus = self._fetch_week(cost_centre, monday)

            items: List[str] = []
            for day_menu in menus:
                day = self.DAY_NAMES.get(day_menu.get('dayOfWeek', ''))
                if day is None:
                    continue  # helgen
                markup = day_menu.get('html') or ''
                if not markup:
                    continue
                text = BeautifulSoup(markup, 'html.parser').get_text(' ', strip=True)
                for category, dish in self._split_dishes(text):
                    items.append(f'{day}|<strong>{category}</strong> - {dish}')

            if not items:
                self.log_warning(f'API returned no dishes for cost centre {cost_centre}')
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            days = len({i.split('|')[0] for i in items})
            self.log_info(f'Found {len(items)} dishes across {days} days')
            return {self.name: items}

        except requests.RequestException as e:
            self.log_error(f'Menu API request failed: {e}')
            return {self.name: ["Kunde inte hitta menyn just nu"]}
        except Exception as e:
            self.log_error(f'Error scraping menu: {e}')
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
