"""Ophelias svenska lunchflikar från sidans publika Next-data, utan JavaScript."""
import json
import re

from ..base_scraper import BaseScraper
from ..menu_week import DAYS, menu_monday, validity_row


class OpheliaScraper(BaseScraper):
    allow_previous_menu = False

    def __init__(self):
        super().__init__({'name': 'Restaurang Ophelia',
                          'website': 'https://www.restaurangophelia.se/sv',
                          'menu_url': 'https://www.restaurangophelia.se/sv#lunch'})

    @staticmethod
    def extract_week(soup):
        # HTML visar bara vald flik. Alla dagar finns i lunchsektionens props.
        frames = []
        for script in soup.find_all('script'):
            match = re.fullmatch(r'self\.__next_f\.push\((.*)\)\s*;?', script.string or '', re.S)
            if not match:
                continue
            try:
                frame = json.loads(match[1])
                if frame[0] == 1 and isinstance(frame[1], str):
                    frames.append(frame[1])
            except (ValueError, IndexError, TypeError):
                continue

        def objects(value):
            if isinstance(value, dict):
                yield value
                for child in value.values():
                    yield from objects(child)
            elif isinstance(value, list):
                for child in value:
                    yield from objects(child)

        sections = []
        for line in ''.join(frames).splitlines():
            payload = line.partition(':')[2]
            if not payload.startswith(('[', '{')):
                continue
            try:
                sections.extend(obj for obj in objects(json.loads(payload)) if obj.get('id') == 'lunch')
            except ValueError:
                continue
        if len(sections) != 1 or soup.select_one('section#lunch') is None:
            raise ValueError('Ingen entydig lunchsektion')
        weeks = [obj['week'] for obj in objects(sections[0]) if 'week' in obj]
        if len(weeks) != 1:
            raise ValueError('Ingen entydig lunchvecka')
        return weeks[0]

    @staticmethod
    def notice(text, days=DAYS):
        return [f'INFO:{day} - Restaurant Info: Menybesked: {text}' for day in days]

    def menu_rows(self, week, monday):
        validity = [validity_row(monday)]
        if week is None:
            return self.notice('Lunchmenyn är inte publicerad ännu – öppna MENY ovan.') + validity
        if (week['year'], week['isoWeek']) != monday.isocalendar()[:2]:
            self.log_warning(f'Källan visar {week["year"]} vecka {week["isoWeek"]}')
            return self.notice(f'Lunchmenyn för vecka {monday.isocalendar().week} är inte publicerad – öppna MENY ovan.') + validity

        def price(value):
            if type(value) not in (int, float) or not 0 < value <= 1000:
                raise ValueError('Ogiltigt lunchpris')
            return f'{value:g}'

        shared_price = week['promoPriceSek'] if week.get('promoPriceSek') is not None else week['priceSek']
        price(shared_price)
        by_day = {day: [] for day in DAYS}
        seen = set()
        for item in week['dishes']:
            if type(item['weekday']) is not int or not 1 <= item['weekday'] <= 5:
                raise ValueError('Okänd veckodag')
            if item['id'] in seen:
                raise ValueError('Dubblerad lunchrätt')
            seen.add(item['id'])
            by_day[DAYS[item['weekday'] - 1]].append(item)

        def row(day, item, category, default_price):
            name = self.clean_text(item['name'])
            if not name or type(item['isTemporarilyOut']) is not bool:
                raise ValueError('Ofullständig rätt')
            if item['isTemporarilyOut']:
                return f'INFO:{day} - Restaurant Info: Tillfälligt slut: {name}.'
            text = name
            if item.get('description'):
                text += ' – ' + self.clean_text(item['description'])
            amount = item.get('priceSek')
            if amount is None:
                amount = default_price
            if amount is not None:
                text += f' ({price(amount)} kr)'
            return f'{day}|<strong>{category}</strong> - {text}'

        rows = validity
        for day, dishes in by_day.items():
            rows.extend(row(day, item, 'Lunch', shared_price) for item in sorted(dishes, key=lambda d: d['sortOrder']))
            if not dishes:
                rows.extend(self.notice('Dagens lunchrätter är inte publicerade ännu.', [day]))
            # Alternativen har inget eget prisfält i källan. Inget pris gissas.
            rows.extend(row(day, item, 'Alternativ meny', None) for item in week['alternativeDishes'])
            info = 'Lunch mån–fre 11.00–14.00.'
            if week.get('extras'):
                info += ' ' + self.clean_text(week['extras'])
            if week['alternativeDishes']:
                info += ' Alternativ meny beställs i baren.'
            rows.append(f'INFO:{day} - Restaurant Info: {info}')
        return rows

    def scrape(self):
        monday = menu_monday()
        try:
            soup = self.get_page_content()
            if soup is None:
                raise ValueError('Lunchsidan kunde inte hämtas')
            return {self.name: self.menu_rows(self.extract_week(soup), monday)}
        except Exception as error:
            self.log_error(f'Kunde inte läsa lunchmenyn ({type(error).__name__})')
            return {self.name: self.notice('Lunchmenyn kunde inte hämtas – öppna MENY ovan.') + [validity_row(monday)]}
