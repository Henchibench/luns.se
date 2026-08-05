import re
from datetime import date
from html import unescape
from typing import Dict, List

from bs4 import BeautifulSoup

from ..static_menu_scraper import StaticMenuScraper

# Osynliga tecken som markerar var fetstilen började och slutade.
BOLD_OPEN = '\x01'
BOLD_CLOSE = '\x02'


class MimolettScraper(StaticMenuScraper):
    """Mimolett, med sparad meny som botten.

    Restaurangens egen domän finns inte längre. restaurangmimolett.se ligger
    kvar i DNS men skickar vidare till helt andra sajter: en fransk
    WordPress-installation vid ett tillfälle, en nederländsk vid nästa. Den går
    alltså varken att skrapa eller att länka till.

    Kvartersmenyn har menyn kvar, men ligger bakom Cloudflare som svarar 403 på
    GitHub Actions adresser. Från en vanlig uppkoppling går samma anrop igenom,
    så anropet är kvar: det ger uppdaterad meny när skrapan körs lokalt, och
    börjar fungera av sig självt om blocket släpper.

    I bygget är det därför den sparade menyn som gäller. Den går att göra just
    för Mimolett eftersom menyn är stående, samma rätter vecka efter vecka.
    Priset och innehållet kommer från kvartersmenyn den dag som står i
    data/mimolett.json, och behöver läsas om för hand när restaurangen byter
    meny. Alternativet vore att visa "ingen meny idag" varje dag, vilket är
    sämre och dessutom osant.
    """

    KVARTERSMENYN = 'https://mimolett.kvartersmenyn.se/'
    DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']
    CATEGORY_NAMES = {'KÖTT & FISK', 'RISOTTO', 'PASTARÄTTER'}
    # Kvartersmenyn strör in korta bokstavskoder som egna rader, uppenbarligen
    # interna markörer: "pogre", "ccj", "ja". De hör inte till rätten.
    MARKER = re.compile(r'^[a-zåäö]{2,5}$')
    # Efter ett kvartal är en stående meny inte längre trovärdig av sig själv.
    STALE_AFTER_DAYS = 90

    def __init__(self):
        super().__init__(
            {
                'name': 'Mimolett',
                # Båda pekar på kvartersmenyn. Restaurangens egen adress går
                # inte att använda ens som identitet längre, och den länk
                # besökaren ser kommer från restaurant_data.py, inte härifrån.
                'website': self.KVARTERSMENYN,
                'menu_url': self.KVARTERSMENYN,
            },
            'mimolett.json',
        )

    def scrape(self) -> Dict[str, List[str]]:
        categories, note = self._scrape_kvartersmenyn()

        if categories:
            self.log_info(f'Kvartersmenyn svarade, {sum(len(c["dishes"]) for c in categories)} rätter')
        else:
            categories = self.menu_data['categories']
            note = self.menu_data.get('note', '')
            captured = self.menu_data['captured']
            self.log_warning(f'Kvartersmenyn gav ingen meny, använder sparad från {captured}')

            # En sparad meny är det enda i skrapan som inte märker att den blivit
            # gammal. Restaurangen byter meny någon gång, och då står fel rätter
            # kvar utan att något går sönder. Loggen får skrika i stället.
            age = (date.today() - date.fromisoformat(captured)).days
            if age > self.STALE_AFTER_DAYS:
                self.log_error(
                    f'Sparad meny är {age} dagar gammal. Läs om den från '
                    f'{self.KVARTERSMENYN} och uppdatera data/mimolett.json.'
                )

        return {self.name: self._format(categories, note)}

    def _format(self, categories: List[dict], note: str) -> List[str]:
        """Samma väg ut för hämtad och sparad meny, så de inte kan glida isär."""
        price = self.menu_data['price']
        items: List[str] = []

        for day in self.DAYS:
            for category in categories:
                for dish in category['dishes']:
                    text = dish['name']
                    if dish.get('description'):
                        text += f": {dish['description']}"
                    items.append(
                        f"{day}|<strong>{category['category']}</strong> - {text} ({price})"
                    )
            if note:
                items.append(f'INFO:{day} - Restaurant Info: {note}')

        return items

    def _scrape_kvartersmenyn(self):
        """Menyn som den ser ut just nu, eller tomt när sidan inte svarar."""
        try:
            soup = self.get_page_content()
            if not soup:
                return [], ''
            return self._parse(soup)
        except Exception as error:
            self.log_warning(f'Kvartersmenyn misslyckades: {error}')
            return [], ''

    def _parse(self, soup):
        """Rätterna ligger som fet text med beskrivningen på raden under.

        Sidan har ingen struktur att hänga upp sig på utöver div.meny, så
        radbrytningarna får bära betydelsen. Den enda skillnaden mellan en
        beskrivning och sidans avslutande notis om glutenfri pasta är att
        beskrivningen står direkt under sitt namn medan notisen har en tomrad
        före sig. Utan den hamnade notisen som beskrivning på lasagnen, alltså
        på en rätt den inte handlar om.

        Därför tas taggarna bort med regex i stället för med get_text(). Det
        senare lägger till egna radbrytningar mellan elementen, och då ser
        varje rätt ut att ha en tomrad före sin beskrivning.
        """
        categories: List[dict] = []
        current = None
        note = ''

        for block in soup.select('div.meny'):
            # Rutan med pris och öppettider är ingen meny.
            if 'PRIS:' in block.get_text(' ', strip=True).upper():
                continue

            raw = ''.join(str(child) for child in block.children)
            raw = re.sub(r'<br\s*/?>', '\n', raw)
            # De grå kodorden ligger i egna i-taggar och hör inte till rätten.
            raw = re.sub(r'<i\b[^>]*>.*?</i>', '', raw, flags=re.S)
            # Fetstilen märks ut innan resten av taggarna faller, så namnen
            # går att känna igen när bara text är kvar.
            # Sidan använder både <b> och <strong>, och blandar dem: två av
            # tre kategorirubriker är <b>, den tredje <strong>. Bara den ena
            # kände parsern igen, så pastan hamnade under RISOTTO.
            raw = re.sub(r'<(?:b|strong)\b[^>]*>', BOLD_OPEN, raw)
            raw = re.sub(r'</(?:b|strong)>', BOLD_CLOSE, raw)
            raw = re.sub(r'<[^>]+>', '', raw)
            lines = [unescape(line).strip() for line in raw.split('\n')]

            i = 0
            while i < len(lines):
                name, suffix = self._split_bold(lines[i])

                if name is None:
                    i += 1
                    continue

                if name.upper() in self.CATEGORY_NAMES:
                    current = {'category': name, 'dishes': []}
                    categories.append(current)
                    i += 1
                    continue

                if current is None:
                    i += 1
                    continue

                # Suffixet står på samma rad som namnet, t.ex. vilka dagar
                # rätten serveras, och hör till rätten och inte till texten
                # under.
                parts = [suffix] if suffix else []
                trailing, j, gap = [], i + 1, False
                while j < len(lines):
                    nxt = lines[j]
                    if not nxt:
                        gap = True
                        j += 1
                        continue
                    next_name, _ = self._split_bold(nxt)
                    if next_name is not None or nxt.upper() == 'SMAKLIG MÅLTID!':
                        break
                    if not self.MARKER.match(nxt):
                        (trailing if gap else parts).append(nxt)
                    j += 1

                current['dishes'].append(
                    {'name': name, 'description': ' '.join(parts).strip(' ,')}
                )
                if trailing:
                    note = ' '.join(trailing).strip(' ,')
                i = j

        return categories, note

    @staticmethod
    def _split_bold(line: str):
        """Namnet inuti fetstilsmarkörerna, och det som står efter på raden."""
        if BOLD_OPEN not in line:
            return None, ''
        after = line.split(BOLD_OPEN, 1)[1]
        name, _, rest = after.partition(BOLD_CLOSE)
        return name.strip(), rest.strip()
