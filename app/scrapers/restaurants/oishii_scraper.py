from ..base_scraper import BaseScraper
from typing import Dict, List


class OishiiScraper(BaseScraper):
    def __init__(self):
        restaurant_info = {
            'name': 'Oishii',
            'website': 'https://oishii.se/',
            'menu_url': 'https://oishii.se/lunchmeny/',
        }
        super().__init__(restaurant_info)

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            items = []

            for category_tag in soup.find_all('h1'):
                category = category_tag.get_text(strip=True)
                menu_block = category_tag.find_next('div', class_='pricelist_container')
                if not menu_block:
                    continue

                for row in menu_block.find_all('div', class_='menurow'):
                    dot_line = row.find('div', class_='dotconnected')
                    spans = dot_line.find_all('span', class_='endsofdots') if dot_line else []

                    if len(spans) >= 2:
                        name = spans[0].get_text(strip=True)
                        price = spans[-1].get_text(strip=True)
                    elif len(spans) == 1:
                        name = spans[0].get_text(strip=True)
                        price = ''
                    else:
                        continue

                    desc_tag = row.find('div', class_='description')
                    description = desc_tag.get_text(strip=True) if desc_tag else ''

                    dish_text = self.clean_text(name)
                    if description:
                        dish_text += f": {self.clean_text(description)}"

                    formatted = f"<strong>{category}</strong> - {dish_text}"
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
