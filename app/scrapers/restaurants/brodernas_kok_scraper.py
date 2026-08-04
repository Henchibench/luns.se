import re
from typing import Dict, List, Optional

from ..base_scraper import BaseScraper


class BrodernasKokScraper(BaseScraper):
    """Brödernas kök, Teknikringen 10 — Mjärdevi, Linköping.

    En Squarespace-sida där hela menyn ligger i ett enda textblock. Rubrikerna
    delar in den i avsnitt — "Dagens Bowl", "Säsongens meny", "Plocksallad" —
    och under varje rubrik står rätterna som stycken i trippel: namn,
    beskrivning, pris.

    Ingenting i markupen skiljer de tre styckena åt, så de läses i ordning och
    prisraden får avsluta rätten. Saknas en beskrivning märks det inte; rätten
    blir bara kortare.

    Dagsrätterna heter "Måndag l Shawarma Bowl" — avgränsaren är ett gement L,
    inte ett lodstreck, eftersom någon tyckt att det såg bättre ut. Båda
    accepteras.

    Säsongsmenyn gäller hela veckan och upprepas per dag, annars syns den bara
    för den som råkar titta på rätt veckodag.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    PRICE_LINE = re.compile(r'^(\d{2,4})\s*kr\.?$', re.IGNORECASE)
    PRICE_IN_TEXT = re.compile(r'(\d{2,4})\s*kr', re.IGNORECASE)

    # "Måndag l Shawarma Bowl" — gement L eller lodstreck som avgränsare.
    DAY_PREFIX = re.compile(
        r'^\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag)\s*[l|]\s*(.+)$', re.IGNORECASE
    )

    DAILY_HEADING = re.compile(r'dagens', re.IGNORECASE)
    STANDING_HEADING = re.compile(r'säsongens|veckans', re.IGNORECASE)

    def __init__(self):
        restaurant_info = {
            'name': 'Brödernas kök',
            'website': 'https://www.brodernaskok.se',
            'menu_url': 'https://www.brodernaskok.se/meny',
        }
        super().__init__(restaurant_info)

    def _dishes(self, lines: List[str]) -> List[dict]:
        """Styckena i ett avsnitt till rätter. Prisraden avslutar en rätt."""
        dishes: List[dict] = []
        current: Optional[dict] = None

        for line in lines:
            price = self.PRICE_LINE.match(line)
            if price:
                if current:
                    current['price'] = f"{price.group(1)} kr"
                    dishes.append(current)
                    current = None
                continue

            if current is None:
                current = {'name': line, 'description': ''}
            elif not current['description']:
                current['description'] = line
            else:
                current['description'] += f' {line}'

        if current:
            dishes.append(current)
        return dishes

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            daily: List[tuple] = []     # (dag, rätt)
            standing: List[dict] = []

            for block in soup.select('div.sqs-html-content'):
                section = ''
                buffer: List[str] = []

                def flush():
                    if not section or not buffer:
                        return
                    for dish in self._dishes(buffer):
                        if self.DAILY_HEADING.search(section):
                            match = self.DAY_PREFIX.match(dish['name'])
                            if not match:
                                continue
                            day = match.group(1).capitalize()
                            daily.append((day, {**dish, 'name': match.group(2).strip()}))
                        elif self.STANDING_HEADING.search(section):
                            standing.append(dish)

                for element in block.find_all(['h1', 'h2', 'h3', 'p']):
                    text = self.clean_text(element.get_text(' ', strip=True))
                    if not text:
                        continue

                    if element.name != 'p':
                        flush()
                        buffer = []
                        section = text
                        # En rubrik som bär pris är i sig en rätt, till exempel
                        # "Plocksallad fr. 138kr". Den har ingen egen namnrad.
                        price = self.PRICE_IN_TEXT.search(text)
                        if price and not self.DAILY_HEADING.search(text):
                            standing.append({
                                'name': self.PRICE_IN_TEXT.sub('', text).strip(' .,-fr'),
                                'description': '',
                                'price': f"{price.group(1)} kr",
                            })
                            section = ''
                        continue

                    buffer.append(text)

                flush()

            if not daily and not standing:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            def line_for(day: str, category: str, dish: dict) -> str:
                text = dish['name']
                if dish.get('description'):
                    text += f" — {dish['description']}"
                line = f"{day}|<strong>{category}</strong> - {text}"
                if dish.get('price'):
                    line += f" ({dish['price']})"
                return line

            items: List[str] = []
            days_seen = sorted({d for d, _ in daily}, key=self.SWEDISH_DAYS.index) or self.SWEDISH_DAYS

            for day, dish in daily:
                items.append(line_for(day, 'Dagens bowl', dish))
            for day in days_seen:
                for dish in standing:
                    items.append(line_for(day, 'Säsongens meny', dish))

            self.log_info(f"Found {len(items)} menu items for {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
