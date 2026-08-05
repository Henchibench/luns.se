import re
from typing import Dict, List, Optional

from bs4 import Tag

from ..base_scraper import BaseScraper


class EncounterAsianScraper(BaseScraper):
    """Encounter Asian Cuisine, Lindholmen.

    Restaurangens egen sajt är en enda statisk sida med tre sidor i DOM:en —
    lunch, middag och info — där bara en visas åt gången. Ingen JavaScript
    behövs för att komma åt innehållet; allt ligger i HTML:en som serveras.

    Varje textsträng finns i tre språk bredvid varandra:

        <span class="en">Korean Bibimbap</span>
        <span class="sv">Koreansk Bibimbap</span>
        <span class="zh">韩式拌饭</span>

    Vi plockar alltid svenskan. Faller den bort på sajten tas hela elementets
    text i stället, vilket ger engelska snarare än ingenting.

    Menyn är fast, inte veckovis, så samma rätter läggs på alla vardagar.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # Tillbehören är inte luncher. Utan det här hamnar sex rader av typen
    # "Chilimajonnäs 10 kr" på varje dag och dränker de tio varmrätterna.
    SKIP_CATEGORIES = {'styckbitar & tillbehör'}

    PRICE = re.compile(r'(\d+)\s*(?:SEK|kr)', re.IGNORECASE)

    def __init__(self):
        super().__init__({
            'name': 'Encounter Asian',
            'website': 'https://encounterasian.se',
        })

    def _swedish(self, node: Optional[Tag]) -> str:
        """Svenskan ur ett element med språkspans, annars elementets egen text."""
        if node is None:
            return ''
        swedish = node.select_one('span.sv')
        return self.clean_text((swedish or node).get_text(' ', strip=True))

    def _price(self, text: str) -> Optional[str]:
        match = self.PRICE.search(text or '')
        return f"{match.group(1)} kr" if match else None

    def _build_item(self, item: Tag) -> Optional[str]:
        """En rättrad, eller None om elementet saknar namn."""
        main = item.select_one('.item-main')
        if main is None:
            return None

        # Varmrätterna har <span class="item-name">, sushiraderna bara ett
        # namnlöst <span> först i raden. Båda ska fungera.
        name_element = main.select_one('.item-name') or main.find('span', recursive=False)
        if name_element is None:
            return None

        # Stjärnmärkningen ligger inuti namnet och skulle annars klistras in
        # mitt i rätten: "Koreansk BibimbapKockens Val".
        badge = name_element.select_one('.chef-badge')
        chefs_pick = badge is not None
        if badge is not None:
            badge.extract()

        name = self._swedish(name_element)
        if not name:
            return None

        parts: List[str] = []
        description = self._swedish(item.select_one('.item-desc'))
        if description:
            parts.append(description)

        price = self._price(self._swedish(main.select_one('.price-tag')))

        variants = self._variants(item)
        if variants:
            priced = [v for v in variants if v[1]]
            if priced and not price:
                distinct = {v[1] for v in priced}
                if len(distinct) == 1:
                    # Alla varianter kostar lika mycket — då är priset entydigt
                    # och hör hemma i priskolumnen.
                    price = distinct.pop()
                else:
                    # Olika pris per variant. Priskolumnen lämnas tom hellre än
                    # att visa det lägsta och antyda att biffen kostar lika lite.
                    parts.append(' · '.join(f'{label} {value}' for label, value in priced))
            else:
                parts.append(' · '.join(label for label, _ in variants))

        if chefs_pick:
            parts.append('⭐ Kockens val')

        dish = f"{name} - {'. '.join(parts)}" if parts else name
        return f"{dish} ({price})" if price else dish

    def _variants(self, item: Tag) -> List[tuple]:
        variants = []
        for entry in item.select('ul.sub-list li'):
            price_tag = entry.select_one('.price-tag')
            price = self._price(price_tag.get_text(strip=True)) if price_tag else None
            if price_tag is not None:
                price_tag.extract()
            label = self._swedish(entry)
            if label:
                variants.append((label, price))
        return variants

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            lunch = soup.select_one('#lunch-page')
            if lunch is None:
                self.log_warning('Lunch section not found')
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            dishes: List[str] = []
            category = 'Lunch'

            # Kategorirubriker och rätter ligger som syskon, så ordningen i
            # dokumentet är det enda som binder en rätt till sin kategori.
            for node in lunch.select('.category-title, .item'):
                classes = node.get('class', [])
                if 'category-title' in classes:
                    category = self._swedish(node) or category
                    continue
                if category.lower() in self.SKIP_CATEGORIES:
                    continue
                line = self._build_item(node)
                if line:
                    dishes.append(f"<strong>{category}</strong> - {line}")

            if not dishes:
                self.log_warning('Lunch section contained no dishes')
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            hours = self._swedish(lunch.select_one('.section-intro p'))

            items: List[str] = []
            for day in self.SWEDISH_DAYS:
                items.extend(f"{day}|{dish}" for dish in dishes)
                if hours:
                    items.append(f"INFO:{day} - Restaurant Info: 🕐 {hours}")

            self.log_info(f"Found {len(dishes)} dishes across {len(self.SWEDISH_DAYS)} days")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
