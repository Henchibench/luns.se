import re
from typing import Dict, List, Tuple

from ..weekly_pdf_scraper import WeeklyPdfScraper


class BynsTrattoriaScraper(WeeklyPdfScraper):
    PDF_URL = "https://www.bynstrattoria.se/lunch/lunch.pdf"

    def __init__(self):
        super().__init__({
            "name": "Byns Trattoria",
            "website": "https://www.bynstrattoria.se/",
            "menu_url": "https://www.bynstrattoria.se/food/lunch",
        })

    @staticmethod
    def _is_title(lines: List[str], index: int) -> bool:
        value = lines[index]
        return value == "SALLAD" or value.endswith("-") or (
            index + 1 < len(lines) and lines[index + 1].startswith("-")
        )

    def _entries(self, lines: List[str]) -> List[Tuple[str, str]]:
        entries: List[Tuple[str, str]] = []
        title = ""
        details: List[str] = []
        for index, value in enumerate(lines):
            if self._is_title(lines, index):
                if title:
                    entries.append((title.rstrip(" -"), " ".join(details).lstrip("- ")))
                title, details = value, []
            elif title:
                details.append(value)
        if title:
            entries.append((title.rstrip(" -"), " ".join(details).lstrip("- ")))
        return entries

    def scrape(self) -> Dict[str, List[str]]:
        try:
            text, _ = self.fetch_pdf_text(self.PDF_URL)
            lines = [self.compact(line) for line in text.splitlines() if self.compact(line)]
            compact = " ".join(lines)
            match = re.search(r"VECKA\s+(\d{1,2})", compact, re.I)
            if not match or int(match.group(1)) != self.current_week():
                message = (
                    f"Menybesked: Den länkade lunchmenyn gäller vecka {match.group(1)}. "
                    f"Ingen verifierad meny för vecka {self.current_week()}. Se MENY eller fråga restaurangen."
                    if match else
                    "Menybesked: Lunchmenyn saknar läsbart veckonummer. Se MENY eller fråga restaurangen."
                )
                return {self.name: self.info_for_all_days(message)}

            monday_heading = lines.index("MÅNDAG & TISDAG")
            friday_heading = lines.index("FREDAGSGÖTT!!!")
            footer = next((i for i, value in enumerate(lines) if re.fullmatch(r"\d{2}:\d{2} - \d{2}:\d{2}", value)), len(lines))
            all_entries = self._entries(lines[2:monday_heading] + lines[friday_heading + 1:footer])
            groups: List[List[Tuple[str, str]]] = []
            group: List[Tuple[str, str]] = []
            for entry in all_entries:
                group.append(entry)
                if entry[0] == "SALLAD":
                    groups.append(group)
                    group = []
            if len(groups) != 3:
                raise ValueError(f"förväntade tre dagsgrupper, fick {len(groups)}")

            rows: List[str] = []
            schedules = [(["Måndag", "Tisdag"], groups[0]), (["Onsdag", "Torsdag"], groups[1]), (["Fredag"], groups[2])]
            for days, entries in schedules:
                for title, description in entries:
                    category = title if title in ("PIZZA", "PASTA", "SALLAD") else "Lunch"
                    text_value = title + (f" - {description}" if description else "")
                    for day in days:
                        rows.append(f"{day}|<strong>{category.title()}</strong> - {text_value}")
                for day in days:
                    rows.append(f"INFO:{day} - Restaurant Info: 💰 Lunch 145 kr")
            return {self.name: rows}
        except Exception as error:
            self.log_error(f"Error parsing PDF menu: {error}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
