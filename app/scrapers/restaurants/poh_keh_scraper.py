import re
from typing import Dict, List

from ..base_scraper import BaseScraper


class PohKehScraper(BaseScraper):
    DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]

    def __init__(self):
        super().__init__({
            "name": "Poh-Keh Masthugget",
            "website": "https://www.poh-keh.se/",
            "menu_url": "https://www.foodora.se/restaurant/ejtq/poh-keh-masthugget-ejtq",
        })

    def scrape(self) -> Dict[str, List[str]]:
        # Den officiella sidan visar plats och tider men hänvisar beställningen
        # vidare. Foodora-sidan är restaurangens aktuella externa menykanal.
        soup = self.get_page_content(self.menu_url)
        if not soup:
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

        items: List[str] = []
        try:
            sections = soup.select('[data-testid="menu-category-section"]')
            for section in sections:
                heading = section.find("h2")
                category = self.clean_text(heading.get_text(" ", strip=True)) if heading else ""
                if not category or category.casefold() == "drycker":
                    continue
                for product in section.select('li[data-testid="menu-product"]'):
                    title = product.find("h3")
                    if title is None:
                        continue
                    name = self.clean_text(title.get_text(" ", strip=True))
                    strings = [self.clean_text(value) for value in product.stripped_strings]
                    strings = [value for value in strings if value and value not in (name, "Populärt")]
                    price = next((value for value in strings if re.fullmatch(r"(?:från\s+)?\d+\s*kr", value, re.I)), "")
                    description = next((value for value in strings if value != price), "")
                    text = name
                    if description:
                        text += f" - {description.lstrip('? ').strip()}"
                    if price:
                        amount = re.search(r"\d+", price)
                        if amount:
                            text += f" ({amount.group()} kr)"
                    for day in self.DAYS:
                        items.append(f"{day}|<strong>{category}</strong> - {text}")
            if not items:
                raise ValueError("inga menyprodukter hittades")
            self.log_info(f"Found {len(items) // len(self.DAYS)} standing dishes")
            return {self.name: items}
        except Exception as error:
            self.log_error(f"Error parsing Foodora menu: {error}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
