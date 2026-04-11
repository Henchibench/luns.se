from ..base_scraper import BaseScraper
from typing import Dict, List


class BennePastabarScraper(BaseScraper):
    def __init__(self):
        restaurant_info = {
            'name': 'Benne Pastabar',
            'website': 'https://bennepastabar.se/',
            'menu_url': 'https://bennepastabar.se/#menu',
        }
        super().__init__(restaurant_info)

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            items = []

            # Parse pasta dishes and visitor specials from <article> elements
            for article in soup.find_all('article'):
                name_tag = article.find('h4')
                desc_tag = article.find('p')
                price_tag = article.find('p', class_='price')

                if not name_tag or not desc_tag:
                    continue

                name = name_tag.get_text(strip=True)
                desc = desc_tag.get_text(strip=True)
                price = price_tag.get_text(strip=True) if price_tag else ''

                # Detect category from label class
                if article.find(class_='thevisitor-lable'):
                    category = 'The Visitor'
                else:
                    category = 'Benne Pasta'

                formatted = f"<strong>{category}</strong> - {self.clean_text(name)}: {self.clean_text(desc)}"
                if price:
                    formatted += f" ({price})"

                for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                    items.append(f"{day}|{formatted}")

            # Parse Benne Bites from the bites section
            for figure in soup.select('div.bites-wrapper .figure'):
                name_tag = figure.find('h4')
                desc_tag = figure.find('p')
                price_tag = figure.find('p', class_='price')

                if not name_tag or not desc_tag:
                    continue

                name = name_tag.get_text(strip=True)
                desc = desc_tag.get_text(strip=True)
                price = price_tag.get_text(strip=True) if price_tag else ''

                formatted = f"<strong>Benne Bites</strong> - {self.clean_text(name)}: {self.clean_text(desc)}"
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
