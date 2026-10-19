import re
from typing import Dict, List, Optional

from ..base_scraper import BaseScraper


class TajMahalScraper(BaseScraper):
    """Taj Mahal på Första Långgatan i Göteborg.

    Lunchsidan är en stående veckomeny i rå HTML. Varje veckodag har ett
    handskrivet id (``Måndag`` osv.) och rätterna ligger som Elementor-
    bildboxar under dagen. Vi fäster i de mänskligt valda dags-id:na och i
    Elementors semantiska widgetklass, aldrig i ``elementor-element-…`` vars
    genererade suffix ändras när sidan byggs om.

    Sidan ger inga egna kategorier för rätterna. Därför används den neutrala
    kategorin "Lunch" och rättens rubrik får ligga kvar i själva rättstexten.
    Priser som avviker från dagens grundpris står uttryckligen i rättens
    beskrivning och bevaras där.
    """

    DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']
    PRICE_HEADING = re.compile(r'^dagens\s+lunch\b', re.IGNORECASE)

    def __init__(self):
        super().__init__({
            'name': 'Taj Mahal',
            'website': 'https://www.tajmahalgbg.se/',
            'menu_url': 'https://www.tajmahalgbg.se/lunch/',
        })

    def _info(self, soup) -> Optional[str]:
        price = ''
        included = ''
        for heading in soup.select('.elementor-heading-title'):
            text = self.clean_text(heading.get_text(' ', strip=True))
            if self.PRICE_HEADING.search(text):
                price = text
            elif 'ingår' in text.lower():
                included = text

        parts = [part for part in (price, included) if part]
        return ' · '.join(parts) if parts else None

    def _dishes_for_day(self, section) -> List[str]:
        dishes: List[str] = []
        seen = set()

        for title in section.select('h4.elementor-image-box-title'):
            name = self.clean_text(title.get_text(' ', strip=True))
            if not name or name.casefold() in seen:
                continue

            content = title.find_parent('div', class_='elementor-image-box-content')
            descriptions = []
            if content:
                for paragraph in content.find_all('p', recursive=False):
                    text = self.clean_text(paragraph.get_text(' ', strip=True))
                    if text:
                        descriptions.append(text)

            body = name
            if descriptions:
                body += f": {' '.join(descriptions)}"
            dishes.append(f'<strong>Lunch</strong> - {body}')
            seen.add(name.casefold())

        return dishes

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ['Kunde inte hitta menyn just nu']}

        try:
            items: List[str] = []
            days_seen: List[str] = []
            info = self._info(soup)

            for day in self.DAYS:
                section = soup.find(id=day)
                if section is None:
                    continue
                dishes = self._dishes_for_day(section)
                if not dishes:
                    continue

                days_seen.append(day)
                items.extend(f'{day}|{dish}' for dish in dishes)
                if info:
                    items.append(f'INFO:{day} - Restaurant Info: 💰 {info}')

            if len(days_seen) < 3 or not items:
                self.log_error('Hittade inte minst tre dagssektioner med rätter')
                return {self.name: ['Ingen lunchmeny tillgänglig']}

            self.log_info(f'Hittade meny för {", ".join(days_seen)}')
            return {self.name: items}

        except Exception as error:
            self.log_error(f'Kunde inte tolka lunchmenyn: {error}')
            return {self.name: ['Ett fel uppstod vid hämtning av menyn']}
