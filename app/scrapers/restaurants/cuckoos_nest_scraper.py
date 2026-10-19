import re
import unicodedata
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from bs4 import Tag

from ..base_scraper import BaseScraper


class CuckoosNestScraper(BaseScraper):
    """Cuckoo's Nest, Lindholmspiren 4 på Lindholmen.

    Den officiella Drupal-sidan har menyn i rå HTML. Den vänstra
    ``content-region`` är svenska och den högra ``sidebar-region`` är en
    engelsk kopia; bara den svenska läses för att inte dubblera rätterna.

    Dagsrätterna saknar kategorirubrik och får därför den neutrala etiketten
    ``Dagens``. "Veckans vegetariska" och de tre lunchklassikerna använder
    däremot restaurangens egna rubriker. Klassikernas priser står i samma
    rubrik som namnet och följer med respektive rätt.

    Menyn byts varje vecka och sidan anger veckonummer. Fel vecka får aldrig
    falla tillbaka till gamla rätter, därför kontrolleras numret och
    ``allow_previous_menu`` är avstängt.
    """

    allow_previous_menu = False
    DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"]
    WEEK_LABEL = re.compile(r"^Vecka\s+(\d{1,2})$", re.IGNORECASE)
    PRICED_HEADING = re.compile(r"^(.+?)\s+(\d+)\s*kr$", re.IGNORECASE)
    PRICE_ONLY = re.compile(r"^\d+\s*(?:kr|:-|\.-)$", re.IGNORECASE)

    def __init__(self):
        super().__init__({
            "name": "Cuckoo's Nest",
            "website": "https://www.cuckoosnest.se/",
            "menu_url": "https://www.cuckoosnest.se/menyer/lunch",
        })

    @staticmethod
    def _current_week() -> int:
        return datetime.now(ZoneInfo("Europe/Stockholm")).isocalendar().week

    def _text(self, element: Tag) -> str:
        text = self.clean_text(element.get_text(" ", strip=True))
        return unicodedata.normalize("NFC", text)

    def _day(self, text: str) -> Optional[str]:
        return next((day for day in self.DAYS if text.casefold() == day.casefold()), None)

    def _week(self, content: Tag) -> Optional[int]:
        for heading in content.find_all("h2"):
            match = self.WEEK_LABEL.fullmatch(self._text(heading))
            if match:
                return int(match.group(1))
        return None

    def _menu_block(self, content: Tag) -> Optional[Tag]:
        """Välj menyblocket efter innehåll, inte efter skiftande klassnummer."""
        best: Optional[Tag] = None
        best_count = 0
        for block in content.select("div.block.menu-text"):
            count = sum(
                self._day(self._text(heading)) is not None
                for heading in block.find_all(["h3", "h4"])
            )
            if count > best_count:
                best, best_count = block, count
        return best if best_count == len(self.DAYS) else None

    def _daily_and_weekly(self, block: Tag) -> Tuple[Dict[str, List[str]], List[Tuple[str, str]]]:
        daily = {day: [] for day in self.DAYS}
        weekly: List[Tuple[str, str]] = []
        current_day: Optional[str] = None
        weekly_category: Optional[str] = None

        for element in block.find_all(["h3", "h4", "p"]):
            text = self._text(element)
            if not text:
                continue
            if element.name in ("h3", "h4"):
                day = self._day(text)
                if day:
                    current_day, weekly_category = day, None
                elif current_day:
                    weekly_category = text
                continue
            if current_day is None:
                continue
            if weekly_category:
                weekly.append((weekly_category, text))
            else:
                daily[current_day].append(text)

        return daily, weekly

    def _classics(self, content: Tag, menu_block: Tag) -> List[Tuple[str, str, str]]:
        classics: List[Tuple[str, str, str]] = []
        for block in content.select("div.block.menu-text"):
            if block is menu_block:
                continue
            pending: Optional[Tuple[str, str]] = None
            for element in block.find_all(["h3", "h4", "p"]):
                text = self._text(element)
                if element.name in ("h3", "h4"):
                    match = self.PRICED_HEADING.fullmatch(text)
                    pending = (match.group(1), match.group(2)) if match else None
                elif pending and text:
                    name, price = pending
                    classics.append((name, text, price))
                    pending = None
        return classics

    def _info(self, content: Tag, menu_block: Tag) -> str:
        for block in content.select("div.block.menu-text"):
            if block is menu_block:
                continue
            lines = [self._text(heading) for heading in block.find_all(["h3", "h4"])]
            if (any("11.30" in line for line in lines)
                    and any(self.PRICE_ONLY.fullmatch(line) for line in lines)):
                return " · ".join(line for line in lines if line)
        return ""

    def _week_message(self, week: int) -> List[str]:
        message = f"Vecka {week} är inte publicerad än · öppna MENY ovan"
        return [
            f"INFO:{day} - Restaurant Info: Menybesked: {message}"
            for day in self.DAYS
        ]

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            content = soup.select_one("div.content-region")
            if content is None:
                self.log_error("Hittade inte den svenska innehållskolumnen")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            published_week = self._week(content)
            current_week = self._current_week()
            if published_week != current_week:
                self.log_warning(
                    f"Menyn är märkt vecka {published_week}, vi är i vecka {current_week}"
                )
                return {self.name: self._week_message(current_week)}

            menu_block = self._menu_block(content)
            if menu_block is None:
                self.log_error("Hittade inte ett menyblock med alla fem vardagar")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            daily, weekly = self._daily_and_weekly(menu_block)
            if any(not daily[day] for day in self.DAYS):
                self.log_error("Minst en vardag saknar dagsrätt")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            classics = self._classics(content, menu_block)
            items: List[str] = []
            for day in self.DAYS:
                items.extend(
                    f"{day}|<strong>Dagens</strong> - {dish}"
                    for dish in daily[day]
                )
                items.extend(
                    f"{day}|<strong>{category}</strong> - {dish}"
                    for category, dish in weekly
                )
                items.extend(
                    f"{day}|<strong>{name}</strong> - {dish} ({price} kr)"
                    for name, dish, price in classics
                )

            info = self._info(content, menu_block)
            if info:
                items.extend(
                    f"INFO:{day} - Restaurant Info: {info}"
                    for day in self.DAYS
                )

            self.log_info(
                f"Hittade vecka {published_week}: "
                f"{len(weekly)} veckorätter och {len(classics)} klassiker"
            )
            return {self.name: items}
        except Exception as error:
            self.log_error(f"Error scraping menu: {error}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
