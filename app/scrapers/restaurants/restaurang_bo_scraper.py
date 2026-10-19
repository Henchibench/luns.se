"""BO:s aktuella originalbild läses lokalt till sökbara texträtter."""
import re
from urllib.parse import unquote, urlsplit

import requests

from ..base_scraper import BaseScraper
from ..bo_ocr import DISH, read_menu_image
from ..menu_week import DAYS, menu_monday, validity_row


SECTIONS = [d.upper() for d in DAYS] + ['VECKANS GRÖNA', 'SALLAD']


def parse_menu(lines, monday):
    week = monday.isocalendar().week
    if lines and lines[0].text == 'BO':
        lines = lines[1:]
    if not lines or lines[0].confidence < 70 or not re.fullmatch(rf'LUNCHMENY\s+V\.?\s*{week}', lines[0].text, re.I):
        raise ValueError('Bilden saknar rätt veckonummer')
    section = None
    seen = []
    entries = {s: [] for s in SECTIONS}
    dessert = None
    ended = False
    for line in lines[1:]:
        text = line.text.strip()
        # Sidlayouten ger ibland några små tecken före högerställda rubriker.
        heading = next((s for s in SECTIONS if re.fullmatch(r'[a-z |.,]*' + s, text)), None)
        if heading:
            if len(seen) >= len(SECTIONS) or heading != SECTIONS[len(seen)]:
                raise ValueError('Dagrubrikerna är ofullständiga eller i fel ordning')
            section = heading
            seen.append(heading)
            continue
        if text == 'LUNCHDRYCK':
            ended = True
            break
        if re.match(r'["*]?reservation för', text, re.I):
            continue
        if line.confidence < 70:
            raise ValueError('Osäker textavläsning')
        if section is None:
            if not text.startswith('alltid med '):
                raise ValueError('Okänd text före dagarna')
            continue
        if text.startswith('FREDAGSDESSERT'):
            match = re.fullmatch(r'FREDAGSDESSERT\s*=\s*(.+)', text)
            if section != 'FREDAG' or not match or dessert:
                raise ValueError('Otydlig dessert')
            dessert = match[1]
            continue
        dish = DISH.fullmatch(text)
        if dish:
            if not 50 <= int(dish[2]) <= 500:
                raise ValueError('Orimligt lunchpris')
            entries[section].append([dish[1], dish[2], []])
        elif entries[section] and text[0].islower() and not re.search(r'\d', text):
            entries[section][-1][2].append(text)
        else:
            raise ValueError('En menyrad kunde inte kopplas till en rätt')
    if not ended or seen != SECTIONS or any(not entries[s] for s in SECTIONS):
        raise ValueError('Veckomenyn är ofullständig')
    if any(not entry[2] for values in entries.values() for entry in values):
        raise ValueError('En rätt saknar läsbar beskrivning')
    rows = []
    for day in DAYS:
        for section in [day.upper(), 'VECKANS GRÖNA', 'SALLAD']:
            # Källrubriken säger gröna, inte veganskt eller allergenfritt.
            category = {'VECKANS GRÖNA': 'Veckans gröna', 'SALLAD': 'Sallad'}.get(section, 'Dagens')
            for name, price, description in entries[section]:
                text = f'{name} - {" ".join(description)}'
                rows.append(f'{day}|<strong>{category}</strong> - {text} ({price} kr)')
        if day == 'Fredag' and dessert:
            rows.append(f'INFO:{day} - Restaurant Info: Fredagsdessert: {dessert}')
    return rows


class RestaurangBOScraper(BaseScraper):
    allow_previous_menu = False

    def __init__(self):
        super().__init__({
            'name': 'Restaurang BO',
            'website': 'https://www.restaurangbo.se/',
            'menu_url': 'https://www.restaurangbo.se/lunchmat',
        })

    def read_current_image(self, monday):
        soup = self.get_page_content()
        if soup is None:
            raise ValueError('Lunchsidan kunde inte hämtas')
        urls = set()
        for image in soup.select('img[data-image]'):
            url = image['data-image']
            parsed = urlsplit(url)
            match = re.fullmatch(r'v\.(\d{1,2})\.(?:jpg|png|jpeg)', unquote(parsed.path).rsplit('/', 1)[-1], re.I)
            if (parsed.scheme == 'https' and parsed.hostname == 'images.squarespace-cdn.com'
                    and match and int(match[1]) == monday.isocalendar().week):
                urls.add(url)
        if len(urls) != 1:
            raise ValueError('Ingen entydig originalbild för veckan')
        with requests.get(urls.pop(), headers={'Accept': 'image/jpeg'}, timeout=30, stream=True) as response:
            response.raise_for_status()
            chunks = []
            size = 0
            for chunk in response.iter_content(65536):
                size += len(chunk)
                if size > 10_000_000:
                    raise ValueError('Menybilden är för stor')
                chunks.append(chunk)
        return read_menu_image(b''.join(chunks))

    def scrape(self):
        monday = menu_monday()
        try:
            rows = parse_menu(self.read_current_image(monday), monday)
        except Exception as error:
            self.log_warning(f'BO:s originalbild kunde inte läsas: {error}')
            rows = [f'INFO:{day} - Restaurant Info: Menybesked: '
                    'Veckans meny kunde inte läsas. Se MENY för BO:s original.' for day in DAYS]
        return {self.name: rows + [validity_row(monday)]}
