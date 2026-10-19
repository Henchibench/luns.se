import re
from typing import Dict, List, Tuple

from ..base_scraper import BaseScraper
from ..menu_week import DAYS


class FeskekorkaScraper(BaseScraper):
    allow_previous_menu = False
    WEEKDAYS = DAYS + ['Lördag', 'Söndag']
    SERVICE = re.compile(r'Lunchmeny serveras (\w+)\s*[-–]\s*(\w+)', re.I)

    def __init__(self):
        super().__init__({
            'name': 'Feskekörka',
            'website': 'https://www.feskekorka.se/',
            'menu_url': 'https://www.feskekorka.se/lunchmeny',
        })

    @staticmethod
    def _price_and_description(value: str) -> Tuple[str, str]:
        match = re.fullmatch(r'(från\s+)?(\d+(?:/\d+)?)\s*kr\s*(.+)', value, re.I)
        if not match:
            raise ValueError('rättens pris eller beskrivning saknas')
        prefix = 'från ' if match[1] else ''
        return f'{prefix}{match[2]} kr', match[3].strip()

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if soup is None:
            return {self.name: ['Ett fel uppstod vid hämtning av menyn']}
        try:
            rows = []
            sections = set()
            for heading in soup.find_all(['h1', 'h2', 'h3']):
                match = self.SERVICE.search(self.clean_text(heading.get_text(' ', strip=True)))
                if not match:
                    continue
                section = heading.find_parent('section')
                if section is None or id(section) in sections:
                    continue
                sections.add(id(section))
                first, last = (self.WEEKDAYS.index(part.capitalize()) for part in match.groups())
                if first > last:
                    raise ValueError('oklart dagintervall')
                days = [d for d in self.WEEKDAYS[first:last + 1] if d in DAYS]
                values = [self.clean_text(el.get_text(' ', strip=True))
                          for el in section.select('[data-testid="richTextElement"]')]
                # Läs huvudrätterna inom sin egen servering. Veckomärkta äldre
                # block och förrätter/desserter får inte blandas in i lunchlistan.
                if 'VARMRÄTTER' in values:
                    start, stop = 'VARMRÄTTER', 'DESSERT'
                else:
                    start, stop = 'MAT', 'EFTER MATEN'
                body = values[values.index(start) + 1:values.index(stop)]
                if not body or len(body) % 2:
                    raise ValueError('rättnamn och prisbeskrivningar bildar inte par')
                category = f'{match[1].capitalize()}–{match[2].lower()}'
                for index in range(0, len(body), 2):
                    price, description = self._price_and_description(body[index + 1])
                    for day in days:
                        rows.append(f'{day}|<strong>{category}</strong> - {body[index]} - {description} ({price})')
            if not rows:
                raise ValueError('inga läsbara lunchsektioner hittades')
            for day in DAYS:
                if not any(row.startswith(day + '|') for row in rows):
                    rows.append(f'INFO:{day} - Restaurant Info: Menybesked: '
                                f'Ingen verifierad lunchmeny för {day.lower()}. '
                                'De odaterade menyerna gäller andra dagar; se MENY för övriga serveringar.')
            return {self.name: rows}
        except Exception as error:
            self.log_error(f'Kunde inte läsa lunchmenyn: {error}')
            return {self.name: ['Ett fel uppstod vid hämtning av menyn']}
