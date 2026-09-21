import re
from typing import Dict, List

from ..weekly_pdf_scraper import WeeklyPdfScraper


class HeurlinsScraper(WeeklyPdfScraper):
    def __init__(self):
        super().__init__({
            "name": "Heurlins",
            "website": "https://heurlinsgbg.se/",
            "menu_url": "https://heurlinsgbg.se/lunch",
        })

    @staticmethod
    def _block(lines: List[str], start: int, end: int) -> str:
        parts = lines[start:end]
        if parts and re.fullmatch(r"VECKANS .+ \d+:-", parts[0], re.I):
            heading = parts.pop(0)
        else:
            heading = ""
        text = " ".join(parts)
        text = re.sub(r"\b([A-ZÅÄÖ])\s+([a-zåäö])", r"\1\2", text)
        return f"{heading} - {text}" if heading and text else heading or text

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content(self.menu_url)
        if not soup:
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
        link = next((a.get("href") for a in soup.find_all("a", href=True)
                     if ".pdf" in a.get("href", "").lower()), None)
        if not link:
            return {self.name: ["Ingen lunchmeny tillgänglig"]}
        try:
            text, modified = self.fetch_pdf_text(link)
            if not self.is_recent(modified):
                message = f"Vecka {self.current_week()} är inte publicerad än · öppna MENY ovan"
                return {self.name: self.info_for_all_days(message)}

            lines = [self.compact(line) for line in text.splitlines() if self.compact(line)]
            labels = [index for index, value in enumerate(lines)
                      if re.fullmatch(r"VECKANS (?:sandwich|LUNCHGÄST) \d+:-", value, re.I)]
            if len(labels) != 4:
                raise ValueError(f"förväntade fyra veckoblock, fick {len(labels)}")
            monday_heading = lines.index("Måndag & tisdag")
            blocks = [
                self._block(lines, labels[i], labels[i + 1] if i + 1 < len(labels) else monday_heading)
                for i in range(4)
            ]
            assignments = {
                "Måndag": [blocks[0], blocks[2]],
                "Tisdag": [blocks[0], blocks[2]],
                "Onsdag": [blocks[1], blocks[3]],
                "Torsdag": [blocks[1], blocks[3]],
                "Fredag": [blocks[1], blocks[3]],
            }
            rows: List[str] = []
            for day, dishes in assignments.items():
                for dish in dishes:
                    category = "Veckans sandwich" if "sandwich" in dish.casefold() else "Veckans lunchgäst"
                    rows.append(f"{day}|<strong>{category}</strong> - {dish}")

            fish_index = lines.index(next(value for value in lines if value.startswith("Fish and chips")))
            fish = " ".join(lines[fish_index:])
            variants = [value for value in lines if re.fullmatch(r".+ \d+:-", value) and
                        any(word in value.casefold() for word in ("kyckling", "räkor", "tofu"))]
            for day in self.DAYS:
                rows.append(f"{day}|<strong>Fish and chips</strong> - {fish}")
                for variant in variants:
                    rows.append(f"{day}|<strong>Caesarsallad</strong> - Caesarsallad med {variant}")
            return {self.name: rows}
        except Exception as error:
            self.log_error(f"Error parsing PDF menu: {error}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
