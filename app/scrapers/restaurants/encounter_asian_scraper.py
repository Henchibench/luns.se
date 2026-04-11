from ..playwright_scraper import PlaywrightScraper
from typing import Dict, List


class EncounterAsianScraper(PlaywrightScraper):
    def __init__(self):
        restaurant_info = {
            'name': 'Encounter Asian',
            'website': 'https://tamed.se/take-away-meny/encounter-sushi',
        }
        super().__init__(restaurant_info)

    def scrape(self) -> Dict[str, List[str]]:
        # Material-UI rendered page, wait for the menu list to load
        soup = self.get_page_content_js(wait_selector="ul[class*='MuiList-root']")
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            items = []

            menu_list = soup.select_one("ul[class*='MuiList-root']")
            if not menu_list:
                self.log_warning("Menu list container not found")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            for container in menu_list.select("div[class*='MuiGrid-container']"):
                children = container.select("div[class*='MuiGrid-item']")
                if len(children) < 2:
                    continue

                text_block = children[0]
                price_block = children[1]

                title_elem = text_block.select_one("span[class*='MuiListItemText-primary']")
                desc_elem = text_block.select_one("p[class*='MuiListItemText-secondary']")
                price_elem = price_block.select_one('p')

                if not title_elem:
                    continue

                full_name = title_elem.get_text(strip=True)
                description = desc_elem.get_text(strip=True) if desc_elem else ''
                price = price_elem.get_text(strip=True) if price_elem else ''

                # Extract category from prefix (e.g., "SUSHI - Mix 12 bitar")
                if ' - ' in full_name:
                    category, name = full_name.split(' - ', 1)
                else:
                    category = full_name
                    name = full_name

                dish_text = self.clean_text(name)
                if description:
                    dish_text += f": {self.clean_text(description)}"

                formatted = f"<strong>{category.strip()}</strong> - {dish_text}"
                if price:
                    formatted += f" ({price})"

                for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                    items.append(f"{day}|{formatted}")

            if not items:
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self.log_info(f"Found {len(items)} menu items")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
