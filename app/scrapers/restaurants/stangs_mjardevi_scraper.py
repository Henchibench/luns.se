from datetime import date, timedelta
from typing import Dict, List

import requests

from ..base_scraper import BaseScraper


class StangsMjardeviScraper(BaseScraper):
    """Stångs Mjärdevi, Teknikringen 7 — Mjärdevi, Linköping.

    Menyn står på förstasidan men syns inte i sidans HTML: den ritas av en
    Angular-komponent (bokad.se) som hämtar sitt innehåll efteråt. En vanlig
    hämtning ger därför en sida utan mat.

    Komponentens eget backend är däremot ett rent JSON-API utan inloggning:

        POST https://db20.bokad.se/find
        {"system": "stangs-mjardevi", "table": "...", "condition": {...}}

    Två tabeller används. `mealofthedays` är veckans dagar, `mealoftheweeks`
    är det som står hela veckan — veckans sallad och dessert.

    Priset ligger inte på måltiden utan på produkten den pekar på, och där per
    prislista. Standardprislistan är den som gäller i matsalen.

    Varje rätt finns dubbelt, en gång för att äta här och en gång för
    avhämtning till lägre pris. Avhämtningsvarianternas produkter heter samma
    sak med "TA" på slutet, och de sorteras bort — annars står varje rätt två
    gånger i listan.

    API:et är odokumenterat. Går det sönder ska menyerna för alla andra
    restauranger klara sig, så skrapan svarar med ett fel för sin egen räkning
    i stället för att kasta vidare.
    """

    API = 'https://db20.bokad.se'
    SYSTEM = 'stangs-mjardevi'

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    def __init__(self):
        restaurant_info = {
            'name': 'Stångs Mjärdevi',
            'website': 'https://stangsmjardevi.se',
            'menu_url': 'https://stangsmjardevi.se',
        }
        super().__init__(restaurant_info)

    def _query(self, endpoint: str, table: str, condition: dict):
        response = requests.post(
            f'{self.API}/{endpoint}',
            json={'system': self.SYSTEM, 'table': table, 'condition': condition},
            headers={**self.headers, 'Accept': 'application/json'},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    # Allergenkoder står som fristående versaler efter rätten: "... parmesansås L".
    ALLERGEN_CODES = {'G', 'L', 'N', 'GF', 'LF', 'V'}

    # Egennamn som annars förlorar sin versal. API:et skriver hela namnet i
    # versaler, så det finns inget i källan som avslöjar vad som är egennamn —
    # listan får växa när vi ser fler.
    PROPER_NOUNS = {'östergötland', 'sverige'}

    @classmethod
    def _sentence_case(cls, text: str) -> str:
        """VERSALER → normal skrift, utan att tappa allergenkoder och egennamn."""
        words = []
        for word in text.split():
            stripped = word.strip('.,()')
            if stripped.upper() in cls.ALLERGEN_CODES:
                words.append(word.upper())
            elif stripped.lower() in cls.PROPER_NOUNS:
                words.append(word.lower().capitalize())
            else:
                words.append(word.lower())
        joined = ' '.join(words)
        return joined[:1].upper() + joined[1:]

    @classmethod
    def _split_name(cls, name: str) -> tuple:
        """"DAGENS RÄTT: KYCKLINGGRYTA" → ("Dagens rätt", "Kycklinggryta")."""
        if ':' in name:
            category, _, dish = name.partition(':')
            return cls._sentence_case(category.strip()), cls._sentence_case(dish.strip())
        return 'Dagens', cls._sentence_case(name.strip())

    def _prices(self, product_ids: List[str]) -> Dict[str, int]:
        """Produkt-id → pris i standardprislistan."""
        if not product_ids:
            return {}
        price_list = self._query('findone', 'pricelists', {'default': True})
        default_id = price_list.get('id') if isinstance(price_list, dict) else None

        products = self._query('find', 'products', {'id': {'$in': product_ids}})
        prices = {}
        for product in products:
            for entry in product.get('prices', []):
                if entry.get('idPriceList') == default_id and entry.get('priceIncl'):
                    prices[product['id']] = entry['priceIncl']
                    break
        return prices

    def _takeaway_products(self, product_ids: List[str]) -> set:
        products = self._query('find', 'products', {'id': {'$in': product_ids}})
        return {p['id'] for p in products if p.get('name', '').strip().upper().endswith('TA')}

    def scrape(self) -> Dict[str, List[str]]:
        try:
            today = date.today()
            monday = today - timedelta(days=today.weekday())
            sunday = monday + timedelta(days=6)
            year, week, _ = monday.isocalendar()

            meals = self._query('find', 'mealofthedays', {
                'workday': {'$gte': monday.isoformat(), '$lte': sunday.isoformat()}
            })
            weekly = self._query('find', 'mealoftheweeks', {
                'year': year, 'weekNumber': week
            })

            product_ids = sorted({
                m['idProduct'] for m in meals + weekly if m.get('idProduct')
            })
            prices = self._prices(product_ids)
            takeaway = self._takeaway_products(product_ids)

            items: List[str] = []
            days_seen = set()

            for meal in sorted(meals, key=lambda m: (m.get('workday', ''), m.get('sortorder', 0))):
                if meal.get('idProduct') in takeaway:
                    continue
                try:
                    day_date = date.fromisoformat(meal['workday'])
                except (KeyError, ValueError):
                    continue
                if day_date.weekday() > 4:
                    continue
                day = self.SWEDISH_DAYS[day_date.weekday()]
                days_seen.add(day)

                category, dish = self._split_name(self.clean_text(meal.get('name', '')))
                if not dish:
                    continue
                description = self.clean_text(meal.get('description', ''))
                if description:
                    dish = f'{dish}: {description}'

                line = f"{day}|<strong>{category}</strong> - {dish}"
                price = prices.get(meal.get('idProduct'))
                if price:
                    line += f" ({price} kr)"
                items.append(line)

            if not items:
                self.log_error("No dishes found — the bokad.se API may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            # Veckans sallad och dessert gäller alla dagar och upprepas därför
            # per dag, annars syns de bara för den som tittar på rätt veckodag.
            for meal in weekly:
                if meal.get('idProduct') in takeaway:
                    continue
                category, dish = self._split_name(self.clean_text(meal.get('name', '')))
                if not dish:
                    continue
                price = prices.get(meal.get('idProduct'))
                suffix = f" ({price} kr)" if price else ''
                for day in sorted(days_seen, key=self.SWEDISH_DAYS.index):
                    items.append(f"{day}|<strong>{category}</strong> - {dish}{suffix}")

            self.log_info(f"Found {len(items)} menu items for {', '.join(sorted(days_seen, key=self.SWEDISH_DAYS.index))}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
