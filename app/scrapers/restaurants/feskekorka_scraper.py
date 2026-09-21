import re
from typing import Dict, List, Optional, Tuple

from bs4 import BeautifulSoup, Tag

from ..base_scraper import BaseScraper


class FeskekorkaScraper(BaseScraper):
    allow_previous_menu = False

    def __init__(self):
        super().__init__({
            "name": "Feskekörka",
            "website": "https://www.feskekorka.se/",
            "menu_url": "https://www.feskekorka.se/lunchmeny",
        })

    @staticmethod
    def _section(soup: BeautifulSoup, phrase: str) -> Optional[Tag]:
        heading = next((h for h in soup.find_all(["h1", "h2", "h3"])
                        if phrase in " ".join(h.stripped_strings)), None)
        return heading.find_parent("section") if heading else None

    @staticmethod
    def _price_and_description(value: str) -> Tuple[str, str]:
        match = re.match(r"(från\s+)?(\d+(?:/\d+)?)\s*kr\s*(.*)", value, re.I)
        if not match:
            return "", value
        prefix = "från " if match.group(1) else ""
        return f"{prefix}{match.group(2)} kr", match.group(3).strip()

    def _menu_rows(
        self, section: Tag, start_heading: str, stop_heading: str, days: List[str], category: str
    ) -> List[str]:
        values = [self.clean_text(el.get_text(" ", strip=True))
                  for el in section.select('[data-testid="richTextElement"]')]
        values = [value for value in values if value and value != "\u200b"]
        start = values.index(start_heading) + 1
        stop = values.index(stop_heading) if stop_heading in values else len(values)
        body = values[start:stop]
        rows: List[str] = []
        for index in range(0, len(body) - 1, 2):
            name = body[index]
            price, description = self._price_and_description(body[index + 1])
            text = name + (f" - {description}" if description else "")
            if price:
                text += f" ({price})"
            for day in days:
                rows.append(f"{day}|<strong>{category}</strong> - {text}")
        return rows

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
        try:
            first = self._section(soup, "Lunchmeny serveras tisdag - torsdag")
            second = self._section(soup, "Lunchmeny serveras onsdag - torsdag")
            if first is None or second is None:
                raise ValueError("de stående lunchsektionerna saknas")
            rows = self._menu_rows(
                first, "VARMRÄTTER", "DESSERT",
                ["Tisdag", "Onsdag", "Torsdag"], "Tis–tor",
            )
            rows += self._menu_rows(
                second, "MAT", "EFTER MATEN",
                ["Onsdag", "Torsdag"], "Ons–tor",
            )
            if not rows:
                raise ValueError("inga rätter hittades")
            for day in ["Måndag", "Fredag"]:
                rows.append(
                    f"INFO:{day} - Restaurant Info: Menybesked: "
                    f"Ingen verifierad lunchmeny för {day.lower()}. De odaterade lunchmenyerna "
                    "på restaurangens sida gäller tisdag–torsdag. Se MENY för övriga serveringar."
                )
            self.log_info(f"Found {len(rows)} day/dish rows")
            return {self.name: rows}
        except Exception as error:
            self.log_error(f"Error parsing menu: {error}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
