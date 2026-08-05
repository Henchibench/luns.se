import re
from typing import Dict, List, Optional

from bs4 import Tag

from ..base_scraper import BaseScraper


class Bistro3Scraper(BaseScraper):
    """Bistro 3, Lindholmen.

    Sidan är statisk HTML med menyn i kategoriblock:

        <div class="tab-category-wrapper">
          <div class="tab-heading">PINSA</div>
          <div class="tab-item">
            <p class="small-title">KEBAB PINSA <span class="price">129:-</span></p>
            <p class="description">Tomato sauce, mozzarella, ...</p>
          </div>
          ...
        </div>

    Menyn är fast, inte veckovis, så samma rätter läggs på alla vardagar.
    Beskrivningarna är på engelska — det är så restaurangen skriver dem.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    PRICE = re.compile(r'(\d+)\s*:-')

    def __init__(self):
        super().__init__({
            'name': 'Bistro 3',
            'website': 'https://bistro3.se',
        })

    def _dish(self, item: Tag, category: str) -> Optional[str]:
        title = item.select_one('.small-title')
        if title is None:
            return None

        # Priset ligger inuti rubriken. Det plockas ut först, annars hamnar
        # "129:-" mitt i rättens namn.
        price_tag = title.select_one('.price')
        price = None
        if price_tag is not None:
            match = self.PRICE.search(price_tag.get_text(strip=True))
            price = f'{match.group(1)} kr' if match else None
            price_tag.extract()

        # Prickraden mellan namn och pris är ren dekoration.
        dots = title.select_one('.dots')
        if dots is not None:
            dots.extract()

        name = self.clean_text(title.get_text(' ', strip=True))
        if not name:
            return None

        description_tag = item.select_one('.description')
        description = self.clean_text(description_tag.get_text(' ', strip=True)) if description_tag else ''

        dish = f'{name} - {description}' if description else name
        dish = f'{dish} ({price})' if price else dish
        return f'<strong>{category}</strong> - {dish}'

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            dishes: List[str] = []
            for wrapper in soup.select('.tab-category-wrapper'):
                heading = wrapper.select_one('.tab-heading')
                category = self.clean_text(heading.get_text(' ', strip=True)) if heading else 'Meny'
                for item in wrapper.select('.tab-item'):
                    dish = self._dish(item, category or 'Meny')
                    if dish:
                        dishes.append(dish)

            if not dishes:
                self.log_warning('No menu items found')
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            items = [f'{day}|{dish}' for day in self.SWEDISH_DAYS for dish in dishes]
            self.log_info(f'Found {len(dishes)} dishes across {len(self.SWEDISH_DAYS)} days')
            return {self.name: items}

        except Exception as e:
            self.log_error(f'Error scraping menu: {e}')
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
