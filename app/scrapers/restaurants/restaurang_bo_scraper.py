"""BO:s daterade textmeny hämtas varje körning, utan veckovis avskrift."""
from datetime import date
import re

from ..base_scraper import BaseScraper
from ..menu_week import DAYS, menu_monday, validity_row


class RestaurangBOScraper(BaseScraper):
    allow_previous_menu = False
    DAYS = DAYS

    def __init__(self):
        super().__init__({
            'name': 'Restaurang BO',
            'website': 'https://www.restaurangbo.se/',
            'menu_url': 'https://www.menydags.se/restaurang/restaurang-bo/lunch',
        })

    def scrape(self):
        monday = menu_monday()
        soup = self.get_page_content()
        rows = []
        if soup is not None:
            for block in soup.select('div[id]'):
                try:
                    stamp = date.fromisoformat(block['id'])
                except ValueError:
                    continue
                if not 0 <= (stamp - monday).days < 5:
                    continue
                day = self.DAYS[stamp.weekday()]
                heading = block.find('h3')
                if not heading or not heading.get_text(' ', strip=True).startswith(day + ' '):
                    continue
                for entry in block.select('li'):
                    paragraphs = [self.clean_text(p.get_text(' ', strip=True)) for p in entry.select('p')]
                    if not paragraphs or not paragraphs[0]:
                        continue
                    tags = [self.clean_text(s.get_text(' ', strip=True)) for s in entry.select('span')]
                    price = next((m.group(1) for tag in tags
                                  if (m := re.fullmatch(r'(\d+)\s*(?::?-|kr)', tag, re.I))), None)
                    # Utan eget prisfält kan listan ha bytt form; publicera inte knappar som mat.
                    if price is None:
                        self.log_warning(f'Ofullständig texträtt för {day}: pris saknas')
                        continue
                    category = 'Dagens'
                    if any(t.casefold() in ('vegan', 'vegansk') for t in tags):
                        category = 'Vegansk'
                    elif any(t.casefold() == 'vegetarisk' for t in tags):
                        category = 'Vegetarisk'
                    text = ' - '.join(p for p in paragraphs if p)
                    # Desserten står i huvudrättens beskrivning men är ingen egen lunchrätt.
                    dessert = re.search(r'\s*FREDAGSDESSERT\s*=\s*(.+)$', text, re.I)
                    if dessert:
                        rows.append(f'INFO:{day} - Restaurant Info: Fredagsdessert: {dessert.group(1)}')
                        text = text[:dessert.start()]
                    rows.append(f'{day}|<strong>{category}</strong> - {text} ({price} kr)')
        available = {r.split('|', 1)[0] for r in rows if '|' in r}
        for day in self.DAYS:
            if day not in available:
                rows.append(f'INFO:{day} - Restaurant Info: Menybesked: '
                            'Ingen aktuell textmeny hos Menydags. Se MENY för BO:s original.')
        if not available:
            self.log_warning('Ingen daterad textmeny för veckan; gammal text och menybild återanvänds inte')
        return {self.name: rows + [validity_row(monday)]}
