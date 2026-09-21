import re
from datetime import date, datetime
from typing import Dict, List
from zoneinfo import ZoneInfo

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

    @staticmethod
    def _today() -> date:
        return datetime.now(ZoneInfo("Europe/Stockholm")).date()

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
            price = next((match for tag in tags
                          if (match := re.fullmatch(r"(\d+)\s*(?::?-|kr)", tag, re.I))), None)
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
        current_week = self._today().isocalendar()[:2]
        for block in soup.select("div[id]"):
            if not self.DATE_ID.match(block.get("id", "")):
                continue
            try:
                menu_date = date.fromisoformat(block["id"])
            except ValueError:
                continue
            if menu_date.isocalendar()[:2] != current_week or menu_date.weekday() > 4:
                continue
            heading = block.find("h3")
            heading_text = heading.get_text(" ", strip=True) if heading else ""
            day = self.DAYS[menu_date.weekday()]
            if heading_text.startswith(day):
                rows.extend(self._dishes(block, day))
        self.log_info(f"Found {len(rows)} dishes via reserve source Menydags")
        available_days = {row.split("|", 1)[0] for row in rows}
        for day in self.DAYS:
            if day not in available_days:
                rows.append(
                    f"INFO:{day} - Restaurant Info: Menybesked: "
                    f"Ingen verifierad lunchmeny för {day.lower()} hos reservkällan Menydags. "
                    "Vi kan inte läsa restaurangens egen lunchsida. Prova MENY eller fråga restaurangen."
                )
        return {self.name: rows}
