from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup

from ..base_scraper import BaseScraper
from .stangs_mjardevi_scraper import StangsMjardeviScraper


class StangsMatladorScraper(BaseScraper):
    """Stångs Matlådor — Stångs Express-kylarna på kontoren i Mjärdevi.

    Det här är inte en restaurang med en adress, utan en obemannad varukyl
    som Stångs Mjärdevi installerar hos företag i området ("Stångs Express" i
    deras egna ord). Man tar en matlåda ur kylen och betalar med QR-kod, kort
    eller Swish. Kylarna står bland annat hos Qualcomm, Saab Mjärdevi, Sectra
    på Teknikringen och Datalinjen, GOTO 10, Actia, Dospace i Nova och på
    Diskettgatan — det syns på produktgruppernas namn i deras kassasystem,
    men var varje enskild kyl står publiceras ingenstans.

    Källan är samma bokad.se-system som `stangs_mjardevi_scraper.py`, men en
    annan endpoint. `/webdata` ger hela kassaregistret på en gång — kategorier,
    produkter och priser — vilket är det enda stället kylarnas sortiment finns:

        POST https://db20.bokad.se/webdata   {"system": "stangs-mjardevi"}

    Varje kyl har sina egna kategorier ("QUALCOMM MATLÅDOR", "SAAB MATLÅDOR",
    "Sectra Teknikringen Lunchlåda", …) med i stort sett samma rätter i.
    Sortimentet läggs därför ihop till en lista och dedupliceras på rättens
    namn, precis som lunchaimjardevi.com gör — och med samma brasklapp, som
    ligger på INFO-raden: **alla alternativ finns inte i alla kylar.** Att i
    stället gissa vilken kyl som är "din" hade krävt en hårdkodad lista över
    vilka hus som har en, och den listan ruttnar tyst när Stångs sätter upp
    nästa.

    Två fällor i namnen:

    - Restaurangens egen avhämtningskategori skriver "MATLÅDA" framför rätten
      ("MATLÅDA HJORTWALLENBERGARE …") medan kontorskylarna inte gör det. Utan
      normalisering står samma rätt två gånger.
    - Namnen ligger i VERSALER i kassasystemet. Skrivningen om till normal
      text delas med `StangsMjardeviScraper` — det är samma kök, samma
      allergenkoder och samma egennamn, och två kopior av den listan hade
      glidit isär. Beskrivningarna rörs däremot inte mer än till första
      versalen: de är redan skrivna som meningar, och en sentence-case över
      dem hade gjort "Basunda gård" till "basunda gård".

    Sortimentet byts sällan och gäller alla dagar kylen är påfylld, så samma
    rätter läggs på alla vardagar. Det är ingen stående meny i repots mening
    (steg 3) — hela listan läses ur API:et vid varje körning, så en ny matlåda
    kommer med av sig själv.

    Känd svaghet: GOTO 10-kylen har en produkt som heter "DAGENS RÄTT" vars
    beskrivning senast rördes i juni 2025. Den skrivs ut som den står, för det
    är vad Stångs eget system säger — men den är den enda posten här som kan
    vara inaktuell utan att något ser trasigt ut.
    """

    API = 'https://db20.bokad.se'
    SYSTEM = 'stangs-mjardevi'

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # Kylarnas kategorier heter antingen "… MATLÅDOR" eller "… LUNCHLÅDA"
    # beroende på när de sattes upp. Båda betyder samma sak, och matchningen
    # görs på delsträng så att en ny kyl kommer med utan kodändring.
    CATEGORY_MARKERS = ('MATLÅD', 'LUNCHLÅD')

    # Skrivs framför rätten i restaurangens egen avhämtningskategori.
    NAME_PREFIX = 'MATLÅDA '

    def __init__(self):
        super().__init__({
            'name': 'Stångs Matlådor',
            'website': 'https://stangsmjardevi.se/stangs-express/',
            'menu_url': 'https://stangsmjardevi.se/stangs-express/',
        })

    def _post(self, endpoint: str, payload: dict):
        response = requests.post(
            f'{self.API}/{endpoint}',
            json={'system': self.SYSTEM, **payload},
            headers={**self.headers, 'Accept': 'application/json'},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def _default_price_list(self) -> Optional[str]:
        """Id:t på standardprislistan, eller None om frågan inte går fram.

        Priset är en trevlighet och inte menyn. Går prislistan inte att hämta
        ska rätterna ändå ut, så felet stannar här i stället för att fälla
        hela skrapan.
        """
        try:
            price_list = self._post('findone', {
                'table': 'pricelists',
                'condition': {'default': True},
            })
        except Exception as e:
            self.log_warning(f"Could not read the default price list: {e}")
            return None
        return price_list.get('id') if isinstance(price_list, dict) else None

    def _html_to_text(self, value: str) -> str:
        """Beskrivningarna innehåller <br> och radbrytningar från kassasystemet."""
        if not value:
            return ''
        return self.clean_text(BeautifulSoup(value, 'html.parser').get_text(' '))

    @staticmethod
    def _capitalise(text: str) -> str:
        return text[:1].upper() + text[1:] if text else text

    def _dish_name(self, raw: str) -> str:
        name = self.clean_text(raw)
        if name.upper().startswith(self.NAME_PREFIX):
            name = name[len(self.NAME_PREFIX):]
        return StangsMjardeviScraper._sentence_case(name)

    def scrape(self) -> Dict[str, List[str]]:
        try:
            data = self._post('webdata', {})
            products = {p['id']: p for p in data.get('products', []) if p.get('id')}
            price_list_id = self._default_price_list()

            # Namn → rad, i stället för en lista, eftersom samma rätt ligger i
            # var och en av kylarnas kategorier.
            dishes: Dict[str, str] = {}

            for category in data.get('categories', []):
                heading = (category.get('name') or '').upper()
                if not any(marker in heading for marker in self.CATEGORY_MARKERS):
                    continue

                for entry in category.get('products', []) or []:
                    product = products.get(entry.get('idProduct'))
                    if product is None or not product.get('active'):
                        continue

                    name = self._dish_name(product.get('name', ''))
                    if not name or name in dishes:
                        continue

                    description = self._capitalise(
                        self._html_to_text(product.get('description', ''))
                    )
                    line = f"<strong>{name}</strong> - {description}" if description \
                        else f"<strong>{name}</strong>"

                    price = self._price(product, price_list_id)
                    if price:
                        line += f" ({price} kr)"
                    dishes[name] = line

            if not dishes:
                self.log_error("No lunch boxes found — the bokad.se categories may have been renamed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            items: List[str] = []
            for day in self.SWEDISH_DAYS:
                for name in sorted(dishes):
                    items.append(f"{day}|{dishes[name]}")
                items.append(
                    f"INFO:{day} - Restaurant Info: 🧊 Ur Stångs Express-kylarna "
                    f"på kontoren — alla alternativ finns inte i alla kylar"
                )
                items.append(
                    f"INFO:{day} - Restaurant Info: 💳 Betalas på plats med "
                    f"QR-kod, kort eller Swish"
                )

            self.log_info(f"Found {len(dishes)} lunch boxes, listed on all weekdays")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

    @staticmethod
    def _price(product: dict, price_list_id: Optional[str]) -> Optional[int]:
        if not price_list_id:
            return None
        for entry in product.get('prices', []) or []:
            if entry.get('idPriceList') == price_list_id and entry.get('priceIncl'):
                return entry['priceIncl']
        return None
