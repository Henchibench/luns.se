"""Officiell stående lunchrotation för udda respektive jämna ISO-veckor."""
import hashlib
import json
from pathlib import Path
import re

from ..base_scraper import BaseScraper
from ..menu_week import DAYS, menu_monday, validity_row


class KathmanduScraper(BaseScraper):
    allow_previous_menu = False
    DAYS = DAYS
    DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    SNAPSHOT = Path(__file__).parents[1] / 'data' / 'kathmandu.json'

    def __init__(self):
        super().__init__({
            'name': 'Kathmandu',
            'website': 'https://www.kathmandurestaurang.se/sv',
            'menu_url': 'https://www.kathmandurestaurang.se/sv/lunchmeny',
        })

    @staticmethod
    def source_hash(menu):
        return hashlib.sha256(json.dumps(menu, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

    @classmethod
    def extract_menu(cls, soup):
        blocks = []

        def visit(value):
            if isinstance(value, dict):
                if value.get('blockType') == 'weeklyLunchMenu':
                    blocks.append(value)
                else:
                    for child in value.values():
                        visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        # Nexts publika siddata bär båda veckorna; synlig HTML visar bara vald dag.
        # Läs JSON, exekvera aldrig JavaScript från restaurangens sida.
        for script in soup.find_all('script'):
            text = script.string or ''
            match = re.fullmatch(r'self\.__next_f\.push\((.*)\)\s*;?', text, re.S)
            if not match:
                continue
            try:
                frame = json.loads(match.group(1))
                if frame[0] != 1 or not isinstance(frame[1], str):
                    continue
                for line in frame[1].splitlines():
                    _, _, payload = line.partition(':')
                    if payload.startswith(('[', '{')):
                        try:
                            visit(json.loads(payload))
                        except ValueError:
                            continue
            except (ValueError, IndexError, TypeError):
                continue
        if len(blocks) != 1:
            raise ValueError('Ingen entydig officiell lunchrotation')
        block = blocks[0]
        return {key: block[key] for key in (
            'introduction', 'pricingMode', 'sharedPrice', 'sharedPriceSupportingText', 'primaryGroups')}

    def menu_rows(self, menu, monday):
        if (menu['pricingMode'] != 'shared' or type(menu['sharedPrice']) not in (int, float)
                or menu['sharedPrice'] <= 0):
            raise ValueError('Lunchens gemensamma pris saknas')
        groups = menu['primaryGroups']
        if len(groups) != 2 or {g['groupTitle'] for g in groups} != {'Udda veckor', 'Jämna veckor'}:
            raise ValueError('Källan anger inte längre en stående tvåveckorsrotation')
        for group in groups:
            for key in self.DAY_KEYS:
                dishes = group[key]['dishes']
                if not dishes or any(not d.get('name') or not d.get('description') for d in dishes):
                    raise ValueError('Ofullständig lunchrotation')
        title = 'Udda veckor' if monday.isocalendar().week % 2 else 'Jämna veckor'
        group = next(g for g in groups if g['groupTitle'] == title)
        rows = []
        info = self.clean_text(menu['sharedPriceSupportingText'])
        # Ordet lunch gör att frontend känner igen källans tid och inte upprepar reservtiden.
        if info.startswith('Serveras '):
            info = 'Lunch s' + info[1:]
        momo = re.search(r'\bMomo (\d+):- \(([^)]+)\) finns som stående alternativ\.', info)
        for day, key in zip(self.DAYS, self.DAY_KEYS):
            for dish in group[key]['dishes']:
                label = dish.get('dietaryLabel', '')
                category = {'Vegan': 'Vegansk', 'Vegetarisk': 'Vegetarisk'}.get(label, label or 'Dagens')
                rows.append(f"{day}|<strong>{category}</strong> - {dish['name']} - "
                            f"{dish['description']} ({menu['sharedPrice']:g} kr)")
            if momo:
                rows.append(f'{day}|<strong>Dagens</strong> - Momo - {momo.group(2)} ({momo.group(1)} kr)')
            rows.append(f'INFO:{day} - Restaurant Info: {info}')
        return rows

    def scrape(self):
        monday = menu_monday()
        soup = self.get_page_content()
        try:
            if soup is None:
                # Detta är restaurangens stående rotation, aldrig förra veckans skrapresultat.
                saved = json.loads(self.SNAPSHOT.read_text(encoding='utf-8'))
                menu = saved['menu']
                if saved['source'] != self.menu_url or saved['kalla_hash'] != self.source_hash(menu):
                    raise ValueError('Den källkontrollerade rotationen är skadad')
                self.log_warning(f"Officiella sidan otillgänglig; stående rotation verifierad {saved['captured']} används")
            else:
                # En åtkomlig källa som ändrats får inte döljas av den sparade rotationen.
                menu = self.extract_menu(soup)
            rows = self.menu_rows(menu, monday)
        except (OSError, ValueError, KeyError, TypeError) as error:
            self.log_error(str(error))
            rows = [f'INFO:{day} - Restaurant Info: Menybesked: '
                    'Lunchrotationen kunde inte verifieras. Se MENY för restaurangens original.'
                    for day in self.DAYS]
        return {self.name: rows + [validity_row(monday)]}
