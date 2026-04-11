from ..playwright_scraper import PlaywrightScraper
from typing import Dict, List


class LsKitchenScraper(PlaywrightScraper):
    PRICE = "122 kr"

    SWEDISH_TO_DAY = {
        'Måndag': 'Måndag',
        'Tisdag': 'Tisdag',
        'Onsdag': 'Onsdag',
        'Torsdag': 'Torsdag',
        'Fredag': 'Fredag',
    }

    def __init__(self):
        restaurant_info = {
            'name': "L's Kitchen",
            'website': 'https://www.lskitchen.se/',
            'menu_url': 'https://plateimpact-screen.azurewebsites.net/menu/week/ls-kitchen/c74da2cf-aa1a-4d3a-9ba6-08d5569587a1',
        }
        super().__init__(restaurant_info)

    def scrape(self) -> Dict[str, List[str]]:
        # PlateImpact uses custom elements that require JS rendering
        soup = self.get_page_content_js(wait_ms=5000)
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            items = []

            for day_div in soup.select('div.day'):
                heading = day_div.find('h2')
                if not heading:
                    continue

                swe_day = heading.get_text(strip=True)
                if swe_day not in self.SWEDISH_TO_DAY:
                    continue
                day_name = self.SWEDISH_TO_DAY[swe_day]

                for dish in day_div.select('crbn-week-menu-ls-kitchen-dish'):
                    h3 = dish.find('h3')
                    if not h3:
                        continue
                    name = h3.get_text(strip=True)
                    if not name:
                        continue

                    formatted = f"<strong>Lunch</strong> - {self.clean_text(name)} ({self.PRICE})"
                    items.append(f"{day_name}|{formatted}")

            if not items:
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
