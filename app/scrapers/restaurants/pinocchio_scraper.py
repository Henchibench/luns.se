import re
from typing import Dict, List

from ..base_scraper import BaseScraper


class PinocchioScraper(BaseScraper):
    """Pinocchio Restaurang & Pizzeria — Mjärdevi, Linköping.

    Menysidan är ovanligt välordnad: varje dag är en `div.productGroup` med
    veckodagen i `div.summary > h2`, och rätterna som `div.product` där h3
    bär namn och pris i varsin span och stycket under är beskrivningen.

    Rätterna står i versaler och skrivs om till vanlig skrift. Två av dem
    slutar på "FILE`" — en bakåtfnutt där det ska stå akut accent — vilket
    rättas, annars ser rätten ut som ett kodfel i listan.

    Priserna avser avhämtning, vilket sidan själv påpekar. Det står i
    inforaden så att ingen tror att det är priset i matsalen.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    ALLERGEN_CODES = {'G', 'L', 'N', 'V'}

    def __init__(self):
        restaurant_info = {
            'name': 'Pinocchio',
            'website': 'https://pinoccio.se',
            'menu_url': 'https://pinoccio.se/lunch',
        }
        super().__init__(restaurant_info)

    @classmethod
    def _sentence_case(cls, text: str) -> str:
        # Bakåtfnutt direkt efter e är en felskriven akut accent: FILE` → filé.
        text = re.sub(r'([Ee])`', 'é', text)
        words = [
            word.upper() if word.strip('.,()').upper() in cls.ALLERGEN_CODES else word.lower()
            for word in text.split()
        ]
        joined = ' '.join(words)
        return joined[:1].upper() + joined[1:]

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            items: List[str] = []
            days_seen: List[str] = []

            for group in soup.select('div.productGroup'):
                heading = group.select_one('.summary h2')
                if heading is None:
                    continue
                name = self.clean_text(heading.get_text(strip=True))
                day = next((d for d in self.SWEDISH_DAYS if d.lower() == name.lower()), '')
                if not day:
                    continue

                for product in group.select('div.product'):
                    title = product.select_one('h3 span')
                    if title is None:
                        continue
                    dish = self._sentence_case(self.clean_text(title.get_text(strip=True)))
                    if not dish:
                        continue

                    price_el = product.select_one('.price')
                    price = self.clean_text(price_el.get_text(strip=True)) if price_el else ''

                    description_el = product.select_one('p')
                    description = (
                        self.clean_text(description_el.get_text(' ', strip=True))
                        if description_el else ''
                    )
                    if description:
                        dish = f'{dish}: {description}'

                    line = f"{day}|<strong>Dagens</strong> - {dish}"
                    if price:
                        line += f" ({price})"
                    items.append(line)

                if day not in days_seen:
                    days_seen.append(day)

            if not items:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            for day in days_seen:
                items.append(
                    f"INFO:{day} - Restaurant Info: 💰 Priserna avser avhämtning"
                )

            self.log_info(f"Found {len(items)} menu items for {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
