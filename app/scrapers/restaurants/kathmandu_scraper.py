import re
from typing import Dict, List

from bs4 import Tag

from ..base_scraper import BaseScraper


class KathmanduScraper(BaseScraper):
    allow_previous_menu = False
    DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]
    DATE_ID = re.compile(r"^\d{4}-\d{2}-\d{2}$")

    def __init__(self):
        # Officiella sidan kontrolleras först i inventeringen men stoppar
        # requests med Cloudflare. Menydags är därför uttrycklig reservkälla.
        super().__init__({
            "name": "Kathmandu",
            "website": "https://www.kathmandurestaurang.se/sv",
            "menu_url": "https://www.menydags.se/restaurang/kathmandu/lunch",
        })

    @classmethod
    def _info(cls, message: str) -> List[str]:
        return [f"INFO:{day} - Restaurant Info: {message}" for day in cls.DAYS]

    @staticmethod
    def _category(tags: List[str]) -> str:
        lowered = " ".join(tags).casefold()
        if "vegan" in lowered:
            return "Vegansk"
        if "vegetarisk" in lowered:
            return "Vegetarisk"
        return "Dagens"

    def _dishes(self, block: Tag, day: str) -> List[str]:
        rows = []
        for entry in block.select("li"):
            paragraphs = [self.clean_text(p.get_text(" ", strip=True)) for p in entry.select("p")]
            paragraphs = [value for value in paragraphs if value]
            if not paragraphs:
                continue
            tags = [self.clean_text(span.get_text(" ", strip=True)) for span in entry.select("span")]
            name = paragraphs[0]
            details = paragraphs[1:]
            allergen = next((tag for tag in tags if tag.casefold().startswith("innehåller:")), "")
            if allergen:
                details.append(allergen)
            price = re.search(r"(\d+)\s*(?::?-|kr)", entry.get_text(" ", strip=True), re.I)
            text = name + (f" - {'. '.join(details)}" if details else "")
            if price:
                text += f" ({price.group(1)} kr)"
            rows.append(f"{day}|<strong>{self._category(tags)}</strong> - {text}")
        return rows

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
        rows: List[str] = []
        for block in soup.select("div[id]"):
            if not self.DATE_ID.match(block.get("id", "")):
                continue
            heading = block.find("h3")
            heading_text = heading.get_text(" ", strip=True) if heading else ""
            day = next((value for value in self.DAYS if heading_text.startswith(value)), None)
            if day:
                rows.extend(self._dishes(block, day))
        if not rows:
            message = "Ingen meny för veckan publicerad i reservkällan än · öppna MENY ovan"
            return {self.name: self._info(message)}
        self.log_info(f"Found {len(rows)} dishes via reserve source Menydags")
        return {self.name: rows}
