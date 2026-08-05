import re
from typing import Dict, List, Optional, Tuple

from bs4 import Tag

from ..base_scraper import BaseScraper


class BarSchiacciateScraper(BaseScraper):
    """Bar Schiacciate, Lindholmsallén 22C.

    En Squarespace-sida där menyn ligger i markdown-block. Varje rätt är ett
    stycke med formen

        <p><strong>CAPRESE</strong> — 179 / 129<br/>Pesto, mozzarella, ...</p>

    och kategorin är en <h3> före styckena.

    Menyn är fast och delas av hela kedjan — Lindholmsallén är en av åtta
    barer. Samma rätter läggs därför på alla vardagar.

    Vad de två priserna står för säger sajten inte. De skrivs ut precis som
    restaurangen skriver dem i stället för att vi hittar på en etikett.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # Dryck och tillval är inte luncher. Rubrikerna fångar dem tydligast, men
    # styckena saknar också <strong>-namnet som varje rätt har, så de faller
    # bort även om kedjan döper om en rubrik.
    SKIP_HEADINGS = {'alcohol', 'coffee & drinks', 'add a little extra?'}

    PRICES = re.compile(r'\d+(?:\s*/\s*\d+)*')

    def __init__(self):
        super().__init__({
            'name': 'Bar Schiacciate',
            'website': 'https://www.barschiacciate.se',
            'menu_url': 'https://www.barschiacciate.se/menu2026',
        })

    def _split_paragraph(self, paragraph: Tag) -> Optional[Tuple[str, str, str]]:
        """(namn, prisdel, beskrivning) ur ett rättstycke, annars None."""
        name_tag = paragraph.find('strong')
        if name_tag is None:
            return None

        name = self.clean_text(name_tag.get_text(' ', strip=True))
        if not name:
            return None

        # Radbrytningen skiljer prisraden från beskrivningen. Allt före den
        # första <br> hör till priset, allt efter är innehållet i mackan.
        before, after = [], []
        seen_break = False
        for node in name_tag.next_siblings:
            if getattr(node, 'name', None) == 'br':
                seen_break = True
                continue
            text = node.get_text(' ', strip=True) if isinstance(node, Tag) else str(node)
            (after if seen_break else before).append(text)

        return name, self.clean_text(' '.join(before)), self.clean_text(' '.join(after))

    def _build_dish(self, name: str, price_part: str, description: str) -> str:
        prices = self.PRICES.search(price_part)
        parts = [description] if description else []
        price = None

        if prices:
            raw = self.clean_text(prices.group(0))
            if '/' in raw:
                # Två priser utan förklaring. Priskolumnen lämnas tom hellre än
                # att vi väljer ett av dem och påstår att det är priset.
                parts.append(f'{raw} kr')
            else:
                price = f'{raw} kr'

        dish = f"{name} - {'. '.join(parts)}" if parts else name
        return f'{dish} ({price})' if price else dish

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            dishes: List[str] = []
            category = 'Schiacciata'

            for block in soup.select('.sqs-block-markdown .sqs-block-content'):
                # Rubriker och stycken ligger som syskon, så dokumentordningen
                # är det enda som binder en rätt till sin kategori.
                for node in block.find_all(['h3', 'p'], recursive=False):
                    if node.name == 'h3':
                        category = self.clean_text(node.get_text(' ', strip=True)) or category
                        continue
                    if category.lower() in self.SKIP_HEADINGS:
                        continue
                    parsed = self._split_paragraph(node)
                    if parsed is None:
                        continue
                    dish = self._build_dish(*parsed)
                    dishes.append(f"<strong>{category}</strong> - {dish}")

            if not dishes:
                self.log_warning('Menu page contained no dishes')
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            items: List[str] = []
            for day in self.SWEDISH_DAYS:
                items.extend(f"{day}|{dish}" for dish in dishes)

            self.log_info(f"Found {len(dishes)} dishes across {len(self.SWEDISH_DAYS)} days")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
