from typing import Dict, List

from ..base_scraper import BaseScraper


class UniversitetsklubbenScraper(BaseScraper):
    """Universitetsklubben, huset Vallfarten — Campus Linköping.

    Nordrests restaurangsidor renderas på servern, så hela veckan finns i
    HTML:en. Varje dag är en `section.castit-day` med `h3.castit-day__title`
    och rätterna i `div.castit-dish`.

    Texten hämtas ur data-sv-attributen och inte ur elementets innehåll.
    Sidan växlar språk i webbläsaren genom att skriva om samma element, och
    attributet är det som håller den svenska versionen oavsett vilket språk
    som råkade vara valt när sidan renderades.

    Veckoväxlaren är JavaScript utan länkar, så vi får den vecka servern
    väljer — vilket är innevarande, alltså samma som en besökare ser.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    def __init__(self):
        restaurant_info = {
            'name': 'Universitetsklubben',
            'website': 'https://www.nordrest.se/restaurang/universitetsklubben/',
            'menu_url': 'https://www.nordrest.se/restaurang/universitetsklubben/',
        }
        super().__init__(restaurant_info)

    def _swedish(self, element) -> str:
        """data-sv om det finns, annars den renderade texten."""
        if element is None:
            return ''
        text = element.get('data-sv') or element.get_text(' ', strip=True)
        return self.clean_text(text)

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            items: List[str] = []
            days_seen: List[str] = []

            for section in soup.select('section.castit-day'):
                title = section.select_one('.castit-day__title')
                heading = self._swedish(title) or self._swedish(
                    title.select_one('.castit-i18n') if title else None
                )
                day = next(
                    (d for d in self.SWEDISH_DAYS if d.lower() == heading.lower()), ''
                )
                if not day:
                    continue

                for dish_el in section.select('div.castit-dish'):
                    name = self._swedish(dish_el.select_one('.castit-dish__title'))
                    if not name:
                        continue
                    description = self._swedish(dish_el.select_one('.castit-dish__desc'))

                    # Rättnamnen slutar ofta mitt i en mening — "Falafelbiff
                    # serveras" följt av "med rostad sötpotatissallad". De hör
                    # ihop och sätts därför ihop till en rad.
                    dish = f'{name} {description}'.strip() if description else name

                    items.append(f"{day}|<strong>Dagens</strong> - {dish}")

                if day not in days_seen:
                    days_seen.append(day)

            if not items:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(items)} menu items for {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
