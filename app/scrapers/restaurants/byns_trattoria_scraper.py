import re
from typing import List, Tuple
from urllib.parse import urljoin, urldefrag

from ..weekly_pdf_scraper import WeeklyPdfScraper
from ..menu_reference import reference_row
from ..menu_week import menu_monday, validity_row


class BynsTrattoriaScraper(WeeklyPdfScraper):
    def __init__(self):
        super().__init__({
            'name': 'Byns Trattoria',
            'website': 'https://www.bynstrattoria.se/',
            'menu_url': 'https://www.bynstrattoria.se/food/lunch',
        })

    @staticmethod
    def _is_title(lines: List[str], index: int) -> bool:
        value = lines[index]
        if value == '-':
            return False
        return value == 'SALLAD' or value.endswith('-') or (
            index + 1 < len(lines) and lines[index + 1].startswith('-')
        )

    def _entries(self, lines: List[str]) -> List[Tuple[str, str]]:
        entries = []
        title, details = '', []
        for index, value in enumerate(lines):
            if self._is_title(lines, index):
                if title:
                    entries.append((title.rstrip(' -'), ' '.join(details).lstrip('- ')))
                title, details = value, []
            elif title:
                details.append(value)
            else:
                raise ValueError('text före första rättnamnet')
        if title:
            entries.append((title.rstrip(' -'), ' '.join(details).lstrip('- ')))
        return entries

    def parse_week(self, text):
        lines = [self.compact(line) for line in text.splitlines() if self.compact(line)]
        week = re.fullmatch(r'VECKA (\d{1,2})', lines[0])
        if not week or not 1 <= int(week[1]) <= 53:
            raise ValueError('veckonummer saknas')
        title = lines.index('LUNCHMENY')
        monday = lines.index('MÅNDAG & TISDAG')
        if lines[monday:monday+3] != ['MÅNDAG & TISDAG', 'ONSDAG & TORSDAG', 'FREDAGSGÖTT!!!']:
            raise ValueError('okänd ordning på dagsrubriker')
        # I den visuellt kontrollerade oktobermallen skrivs ons–tor och fredag
        # först i PDF-strömmen. Mån–tis ligger efter dokumentrubriken.
        # Den gamla skrapan antog tvärtom och tappade dessutom första rätten.
        early = self._entries(lines[1:title])
        groups, group = [], []
        for entry in early:
            group.append(entry)
            if entry[0] == 'SALLAD':
                groups.append(group)
                group = []
        if group or len(groups) != 2:
            raise ValueError('förväntade två dagsgrupper före dokumentrubriken')
        groups.insert(0, self._entries(lines[title+1:monday]))
        for group in groups:
            if (len(group) != 5 or [entry[0] for entry in group[-3:]] != ['PIZZA','PASTA','SALLAD']
                    or any(not name or not description for name, description in group)):
                raise ValueError('ofullständig dagsgrupp')
        footer = lines[monday+3:]
        if len(footer) < 2 or not re.fullmatch(r'\d{2}:\d{2} - \d{2}:\d{2}', footer[0]):
            raise ValueError('lunchprisets placering har ändrats')
        price = re.fullmatch(r'(\d{2,3})KR', footer[1])
        if not price:
            raise ValueError('lunchpriset saknas efter serveringstiden')
        rows = []
        for days, group in zip([self.DAYS[:2], self.DAYS[2:4], self.DAYS[4:]], groups):
            for name, description in group:
                category = name.title() if name in ('PIZZA','PASTA','SALLAD') else 'Lunch'
                rows.extend(f'{day}|<strong>{category}</strong> - {name} - {description} ({price[1]} kr)' for day in days)
        return int(week[1]), rows

    def scrape(self):
        try:
            soup = self.get_page_content()
            frame = soup.select_one('#lunch-pdf iframe[src]') if soup else None
            if frame is None:
                raise ValueError('lunchsidans PDF-länk saknas')
            url = urldefrag(urljoin(self.menu_url, frame['src']))[0]
            text, modified = self.fetch_pdf_text(url)
            week, rows = self.parse_week(text)
            monday = menu_monday()
            if week == monday.isocalendar().week and self.is_recent(modified):
                return {self.name: rows + [validity_row(monday)]}
            stamp = f' PDF-filen ändrades {modified:%Y-%m-%d}.' if modified else ''
            warning = (f'Menyn är märkt vecka {week} och är inte bekräftad för veckan som visas. '
                       f'Rätter och priser kan vara inaktuella. Kontrollera med restaurangen.{stamp}')
            return {self.name: self.info_for_all_days('Menybesked: Ingen bekräftad meny för den här veckan.') + [
                reference_row(f'Publicerad meny · vecka {week}', warning, url, rows),
            ]}
        except Exception as error:
            self.log_error(f'Kunde inte läsa lunch-PDF: {error}')
            return {self.name: ['Ett fel uppstod vid hämtning av menyn']}
