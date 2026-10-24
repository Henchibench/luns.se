"""Källstyrda lunchmenyer för Vita, Schnitzelplatz, Tai Shanghai och Gillestugan."""
import base64
from datetime import date, timedelta
import json
import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from ..base_scraper import BaseScraper
from .. import gillestugan_menu
from ..menu_week import DAYS, menu_monday, validity_row


def notice(text, days=DAYS):
    return [f'INFO:{day} - Restaurant Info: Menybesked: {text}' for day in days]


def dish(day, category, text):
    # Frontendens priskolumn använder kontraktet (NN kr). Texten renderas som
    # React-text, så HTML-entiteter skulle synas bokstavligt för besökaren.
    text = re.sub(r'\s+(\d+):-$', r' (\1 kr)', text)
    return f'{day}|<strong>{category}</strong> - {text}'


class VitaScraper(BaseScraper):
    """Läs samma daterade lunchdata som den officiella sidans Lunch-flik.

    Sidans publika anon-nyckel upptäcks vid körning, sparas/loggas aldrig.
    Endast lunch_menu läses; boknings- och personuppgifter berörs inte.
    """
    allow_previous_menu = False
    API_ORIGIN = 'https://qobimmhbtklvvjmxjyau.supabase.co'

    def __init__(self):
        super().__init__({'name': 'Vita', 'website': 'https://vitarestaurang.se/',
                          'menu_url': 'https://vitarestaurang.se/meny'})

    def fetch_lunch(self, soup, monday):
        scripts = [urljoin(self.menu_url, tag['src'])
                   for tag in soup.select('script[type="module"][src]')]
        for url in scripts:
            if urlparse(url).netloc != 'vitarestaurang.se':
                continue
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            source = response.text
            if self.API_ORIGIN not in source:
                continue
            keys = []
            for token in re.findall(r'"(eyJ[A-Za-z0-9_.-]+)"', source):
                try:
                    payload = token.split('.')[1]
                    claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
                    if claims.get('role') == 'anon' and claims.get('ref') == urlparse(self.API_ORIGIN).hostname.split('.')[0]:
                        keys.append(token)
                except (ValueError, IndexError):
                    continue
            if len(set(keys)) != 1:
                raise ValueError('Publik menyanslutning saknas eller är tvetydig')
            response = requests.get(self.API_ORIGIN + '/rest/v1/lunch_menu',
                headers={'apikey': keys[0]}, timeout=30, params=[
                    ('select', 'menu_date,name,description,price_cents,allergens,sort_order'),
                    ('menu_date', 'gte.' + monday.isoformat()),
                    ('menu_date', 'lte.' + (monday + timedelta(days=4)).isoformat()),
                    ('order', 'sort_order'),
                ])
            response.raise_for_status()
            return response.json()
        raise ValueError('Lunchsidans datakälla saknas')

    @staticmethod
    def parse_lunch(items, monday):
        if not isinstance(items, list):
            raise ValueError('Okänt menyformat')
        by_day = {day: [] for day in DAYS}
        for item in items:
            served = date.fromisoformat(item['menu_date'])
            offset = (served - monday).days
            if not 0 <= offset <= 4:
                raise ValueError('Meny utanför beställd vecka')
            name = item['name'].strip()
            if not name:
                raise ValueError('Rättnamn saknas')
            text = name
            if item.get('description'):
                text += ' – ' + item['description'].strip()
            allergens = item.get('allergens', [])
            if not isinstance(allergens, list) or any(not isinstance(a, str) for a in allergens):
                raise ValueError('Okänt allergenformat')
            if allergens:
                text += ' (' + ', '.join(allergens) + ')'
            price = item.get('price_cents')
            if price is not None:
                if type(price) is not int or price < 0:
                    raise ValueError('Ogiltigt pris')
                text += f' ({price / 100:g} kr)'
            by_day[DAYS[offset]].append(dish(DAYS[offset], 'Lunch', text))
        rows = [validity_row(monday)]
        for day, dishes in by_day.items():
            rows.extend(dishes or notice('Lunchmenyn är inte publicerad för denna dag – öppna MENY ovan.', [day]))
        return rows

    def scrape(self):
        try:
            soup = self.get_page_content()
            if soup is None:
                raise ValueError('Lunchsidan kunde inte hämtas')
            monday = menu_monday()
            return {self.name: self.parse_lunch(self.fetch_lunch(soup, monday), monday)}
        except Exception as error:
            # Undvik råa HTTP-fel/anslutningsdata i loggen.
            self.log_error(f'Kunde inte läsa lunchdata ({type(error).__name__})')
            return {self.name: notice('Lunchmenyn kunde inte hämtas – öppna MENY ovan.')}


class SchnitzelplatzScraper(BaseScraper):
    allow_previous_menu = False

    def __init__(self):
        super().__init__({'name': 'Schnitzelplatz Lagerhuset', 'website': 'https://schnitzelplatz.se/',
                          'menu_url': 'https://schnitzelplatz.se/lunch/'})

    def parse_menu(self, soup, monday):
        blocks = [b for b in soup.select('.introbox__container')
                  if b.find('h1', string=re.compile(r'^Lunch vecka \d+', re.I))]
        if len(blocks) != 1:
            raise ValueError('Lunchblocket saknas eller är tvetydigt')
        block = blocks[0]
        label = re.fullmatch(r'Lunch vecka (\d{1,2})', block.h1.get_text(' ', strip=True), re.I)
        if not label:
            raise ValueError('Veckonummer saknas')
        week = int(label[1])
        if week != monday.isocalendar().week:
            self.log_warning(f'Källan visar vecka {week}, visningsveckan är {monday.isocalendar().week}')
            return notice(f'Källan visar vecka {week}. Menyn för vecka {monday.isocalendar().week} är inte tillgänglig – öppna MENY ovan.')
        daily, weekly = {}, []
        for heading in block.find_all('h2', recursive=False):
            category = self.clean_text(heading.get_text(' ', strip=True))
            paragraphs = []
            for sibling in heading.next_siblings:
                if getattr(sibling, 'name', None) in ('h1', 'h2'):
                    break
                if getattr(sibling, 'name', None) == 'p':
                    paragraphs.append(self.clean_text(sibling.get_text(' ', strip=True)))
            if len(paragraphs) != 1 or not re.search(r'\d+:-$', paragraphs[0]):
                raise ValueError('Ofullständigt rättblock')
            text = paragraphs[0]
            if category in DAYS:
                if category in daily:
                    raise ValueError('Dubblerad dag')
                daily[category] = text
            elif category == 'Alltid på Platz' or category.startswith('Veckans '):
                weekly.append((category, text))
            else:
                raise ValueError('Okänd lunchrubrik')
        if set(daily) != set(DAYS) or not weekly:
            raise ValueError('Ofullständig vecka')
        return [validity_row(monday)] + [row for day in DAYS for row in (
            [dish(day, 'Dagens', daily[day])] + [dish(day, cat, text) for cat, text in weekly])]

    def scrape(self):
        try:
            soup = self.get_page_content()
            if soup is None:
                raise ValueError('Lunchsidan kunde inte hämtas')
            return {self.name: self.parse_menu(soup, menu_monday())}
        except Exception as error:
            self.log_error(f'Kunde inte läsa lunchmenyn: {error}')
            return {self.name: notice('Lunchmenyn kunde inte hämtas – öppna MENY ovan.')}


class TaiShanghaiScraper(BaseScraper):
    allow_previous_menu = False
    SOURCE = 'https://www.kvartersmenyn.se/index.php/rest/14533/4'

    def __init__(self):
        super().__init__({'name': 'Tai Shanghai', 'website': self.SOURCE, 'menu_url': self.SOURCE})

    def parse_menu(self, soup, monday):
        candidates = [b for b in soup.select('div.meny')
                      if set(DAYS).issubset({h.get_text(' ', strip=True) for h in b.select('strong')})]
        if len(candidates) != 1:
            raise ValueError('Dagsmenyn saknas eller är tvetydig')
        block = candidates[0]
        section = block.find_parent(class_='divider-full')
        weeks = re.findall(r'VECKA\s+(\d{1,2}),\s*(\d{4})', section.get_text(' ', strip=True) if section else '')
        if len(weeks) != 1:
            raise ValueError('Veckodatum saknas')
        week, year = map(int, weeks[0])
        if (year, week) != monday.isocalendar()[:2]:
            self.log_warning(f'Källmenyn gäller {year} vecka {week}')
            return notice(f'Lunchmenyn för vecka {monday.isocalendar().week} är inte publicerad – öppna MENY ovan.')
        # Källans osynliga bokstavsmarkörer är inte mat. Övriga i-taggar bevaras.
        block = BeautifulSoup(str(block), 'html.parser').select_one('div.meny')
        for marker in block.select('i[style]'):
            if 'opacity: 0.1' in marker['style'] and re.fullmatch(r'[a-z]{2,5}', marker.get_text(strip=True)):
                marker.decompose()
        for br in block.find_all('br'):
            br.replace_with('\n')
        lines = [self.clean_text(line) for line in block.get_text().splitlines() if self.clean_text(line)]
        rows = [validity_row(monday)]
        day, pending = None, ''
        counts = {d: 0 for d in DAYS}
        closed = set()
        for line in lines:
            if line in DAYS:
                if pending:
                    raise ValueError('Rätt utan pris vid dagsbyte')
                day = line
            elif line.startswith('(En stor dryck'):
                break  # Menyn slutar här; dryckes-/avhämtningspriser är inte rätter.
            elif day:
                if line == 'Stängt':
                    closed.add(day)
                    rows.extend(notice('Ingen lunchservering enligt restaurangens meny.', [day]))
                elif line.startswith('Vegetariska rätter:'):
                    if pending:
                        raise ValueError('Ofullständig rätt före lunchhänvisning')
                    rows.append(f'INFO:{day} - Restaurant Info: {line}')
                else:
                    starts_dish = re.match(r'^\d+[.]?\s+', line)
                    if starts_dish and pending:
                        raise ValueError('Ny rätt innan föregående pris')
                    if not pending and not starts_dish:
                        raise ValueError('Oväntad menyrad')
                    pending = (pending + ' ' + line).strip()
                    if re.search(r'\d+:-$', line):
                        rows.append(dish(day, 'Lunch', re.sub(r'^\d+[.]?\s+', '', pending)))
                        counts[day] += 1
                        pending = ''
        if pending or any(not counts[d] and d not in closed for d in DAYS) or any(counts[d] for d in closed):
            raise ValueError('Ofullständig eller motstridig dagsmeny')
        return rows

    def scrape(self):
        try:
            soup = self.get_page_content()
            if soup is None:
                raise ValueError('Kvartersmenyn kunde inte hämtas')
            return {self.name: self.parse_menu(soup, menu_monday())}
        except Exception as error:
            self.log_error(f'Kunde inte läsa lunchmenyn: {error}')
            return {self.name: notice('Lunchmenyn kunde inte hämtas från Kvartersmenyn – öppna MENY ovan.')}


class GillestuganScraper(BaseScraper):
    """Läs originalbilden från lunchsidans eget inbäddade flöde med lokal OCR."""
    allow_previous_menu = False

    def __init__(self):
        super().__init__({'name': 'Gillestugan Jerntorget',
                          'website': 'https://gillestuganjerntorget.se/',
                          'menu_url': 'https://gillestuganjerntorget.se/lunch-jarntorget/'})
        # Sajten svarar 520 på basens gamla Chrome-identitet, 200 på denna.
        self.headers['User-Agent'] = 'Mozilla/5.0'

    def scrape(self):
        monday = menu_monday()
        try:
            soup = self.get_page_content()
            if soup is None:
                raise ValueError('Lunchsidan kunde inte hämtas')
            url = gillestugan_menu.select_image(gillestugan_menu.fetch_posts(soup), monday)
            if url is None:
                self.log_warning(f'Ingen menybild publicerad för vecka {monday.isocalendar().week}')
                rows = notice(f'Ingen verifierad lunchmeny för vecka {monday.isocalendar().week} finns ännu – öppna MENY ovan.')
            else:
                columns = gillestugan_menu.read_image(gillestugan_menu.download_image(url))
                rows = gillestugan_menu.parse_columns(columns, monday)
        except Exception as error:
            # HTTP-fel kan innehålla signerade bildadresser; logga bara feltypen.
            self.log_error(f'Kunde inte verifiera lunchbilden ({type(error).__name__})')
            rows = notice('Lunchmenyn kunde inte läsas säkert – öppna MENY ovan.')
        return {self.name: rows + [validity_row(monday)]}
