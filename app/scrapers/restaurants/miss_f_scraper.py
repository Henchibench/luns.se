from ..base_scraper import BaseScraper
from typing import Dict, List


class MissFScraper(BaseScraper):
    def __init__(self):
        restaurant_info = {
            'name': 'Miss F',
            'website': 'https://www.missf.se/',
        }
        super().__init__(restaurant_info)

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            items = []

            for heading_div in soup.find_all('div', class_='seasidetms_heading_wrap'):
                h3 = heading_div.find('h3', class_='seasidetms_heading')
                if not h3:
                    continue
                category = h3.get_text(strip=True)

                menu_block = heading_div.find_next_sibling('div', class_='seasidetms_menu')
                if not menu_block:
                    continue

                for item_div in menu_block.find_all('div', class_='seasidetms_menu_item'):
                    title_tag = item_div.find('h5', class_='menu_title')
                    if not title_tag:
                        continue
                    title = title_tag.get_text(strip=True)

                    desc_tag = item_div.find('ul', class_='menu_feature_list')
                    description = ''
                    if desc_tag and desc_tag.find('li'):
                        description = desc_tag.find('li').get_text(strip=True)

                    price_tag = item_div.find('span', class_='seasidetms_menu_price')
                    price = f"{price_tag.get_text(strip=True)} kr" if price_tag else ''

                    dish_text = title
                    if description:
                        dish_text += f" - {description}"

                    formatted = f"<strong>{category}</strong> - {self.clean_text(dish_text)}"
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
