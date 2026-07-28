from ..base_scraper import BaseScraper
from typing import Dict, List
import re


class MimolettScraper(BaseScraper):
    BACKUP_URL = "https://www.kvartersmenyn.se/index.php/rest/13278/"
    DEFAULT_PRICE = "129 kr"

    def __init__(self):
        restaurant_info = {
            'name': 'Mimolett',
            'website': 'https://restaurangmimolett.se/',
            'menu_url': 'https://restaurangmimolett.se/lunch/',
        }
        super().__init__(restaurant_info)

    def scrape(self) -> Dict[str, List[str]]:
        # Try primary site first
        items = self._scrape_primary()

        # Fallback to kvartersmenyn
        if not items:
            items = self._scrape_backup()

        if not items:
            return {self.name: ["Ingen lunchmeny tillgänglig"]}

        self.log_info(f"Found {len(items)} menu items")
        return {self.name: items}

    def _scrape_primary(self) -> List[str]:
        try:
            soup = self.get_page_content()
            if not soup:
                return []

            items = []
            for container in soup.select('div.menu-list'):
                cat_elem = container.select_one('h2.menu-list__title')
                if not cat_elem:
                    continue
                category = cat_elem.get_text(strip=True)

                for li in container.select('li.menu-list__item'):
                    name_el = li.select_one('.item_title')
                    desc_el = li.select_one('.desc__content')
                    price_el = li.select_one('.menu-list__item-price')

                    if not name_el:
                        continue

                    name = name_el.get_text(strip=True)
                    description = desc_el.get_text(strip=True) if desc_el else ''

                    if price_el:
                        price = price_el.get_text(strip=True).replace(':-', ' kr')
                    else:
                        price = self.DEFAULT_PRICE

                    dish_text = self.clean_text(name)
                    if description:
                        dish_text += f": {self.clean_text(description)}"

                    formatted = f"<strong>{category}</strong> - {dish_text} ({price})"

                    for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                        items.append(f"{day}|{formatted}")

            return items

        except Exception as e:
            self.log_warning(f"Primary site failed: {e}")
            return []

    def _scrape_backup(self) -> List[str]:
        try:
            soup = self.get_page_content(self.BACKUP_URL)
            if not soup:
                return []

            items = []
            category_names = {'KÖTT & FISK', 'RISOTTO', 'PASTARÄTTER'}

            for meny in soup.select('div.meny'):
                full_text_upper = meny.get_text(' ', strip=True).upper()
                if 'PRIS:' in full_text_upper:
                    continue

                bold_texts = [b.get_text(' ', strip=True) for b in meny.find_all(['b', 'strong'])]
                bold_set = set(bold_texts)

                inner_html = ''.join(str(child) for child in meny.children)
                inner_html = inner_html.replace('<br/>', '\n').replace('<br>', '\n')
                from bs4 import BeautifulSoup
                text_block = BeautifulSoup(inner_html, 'html.parser').get_text('\n')
                lines = [line.strip() for line in text_block.split('\n') if line.strip()]

                current_category = 'Lunchmeny'
                i = 0
                while i < len(lines):
                    line = lines[i]
                    if 'PRIS:' in line.upper():
                        break

                    if line.upper() in category_names:
                        current_category = line
                        i += 1
                        continue

                    if line in bold_set and line.upper() not in category_names:
                        name = line
                        desc_parts = []
                        j = i + 1
                        marker_codes = {'pogre', 'bii', 'bei', 'cbf', 'ca'}
                        while j < len(lines):
                            nxt = lines[j]
                            if nxt.upper() in category_names or nxt in bold_set or nxt.upper() == 'SMAKLIG MÅLTID!':
                                break
                            if nxt.lower() not in marker_codes:
                                desc_parts.append(nxt)
                            j += 1

                        raw_desc = ' '.join(desc_parts).strip()
                        # Clean description
                        raw_desc = re.split(r'SMAKLIG MÅLTID!\s*', raw_desc, flags=re.IGNORECASE)[0]
                        raw_desc = re.sub(r'\b(pogre|bii|bei|cbf|ca)\b', '', raw_desc, flags=re.IGNORECASE)
                        raw_desc = re.sub(r'\s{2,}', ' ', raw_desc).strip(' ,')

                        dish_text = self.clean_text(name)
                        if raw_desc:
                            dish_text += f": {self.clean_text(raw_desc)}"

                        formatted = f"<strong>{current_category}</strong> - {dish_text} ({self.DEFAULT_PRICE})"
                        for day in ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']:
                            items.append(f"{day}|{formatted}")

                        i = j
                        continue

                    i += 1

            return items

        except Exception as e:
            self.log_warning(f"Backup site failed: {e}")
            return []
