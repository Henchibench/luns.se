import re
from typing import Dict, List

from ..weekly_pdf_scraper import WeeklyPdfScraper


class BongoScraper(WeeklyPdfScraper):
    def __init__(self):
        super().__init__({
            "name": "Bongo",
            "website": "https://goteborg.bongobar.se/",
            "menu_url": "https://goteborg.bongobar.se/lunch",
        })

    @staticmethod
    def _between(lines: List[str], start: str, ends: List[str]) -> List[str]:
        index = lines.index(start) + 1
        end = min((lines.index(value, index) for value in ends if value in lines[index:]), default=len(lines))
        return lines[index:end]

    @staticmethod
    def _dish(parts: List[str]) -> str:
        cleaned = [value for value in parts if value != ":-"
                   and not re.fullmatch(r"\d+\s*:?-?", value)
                   and not re.fullmatch(r"[-—]+", value)]
        if not cleaned:
            raise ValueError("tom rätt")
        return " ".join(cleaned)

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content(self.menu_url)
        if not soup:
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
        link = next((a.get("href") for a in soup.find_all("a", href=True)
                     if ".pdf" in a.get("href", "").lower()), None)
        if not link:
            return {self.name: ["Ingen lunchmeny tillgänglig"]}
        try:
            text, _ = self.fetch_pdf_text(link)
            lines = [self.compact(line) for line in text.splitlines() if self.compact(line)]
            compact = " ".join(lines)
            week_match = re.search(r"LUNCHMENY\s+V\.?\s*(\d{1,2})", compact, re.I)
            if not week_match or int(week_match.group(1)) != self.current_week():
                message = f"Vecka {self.current_week()} är inte publicerad än · öppna MENY ovan"
                return {self.name: self.info_for_all_days(message)}

            items: List[str] = []
            day_names = [day.upper() for day in self.DAYS]
            for index, day in enumerate(self.DAYS):
                end_markers = day_names[index + 1:] + ["FAKTURALUNCH"]
                section = self._between(lines, day.upper(), end_markers)
                price = next((price_match.group(1) for value in section
                              if (price_match := re.fullmatch(r"(\d+)\s*:?-?", value))), "")
                dish = self._dish(section)
                if price:
                    dish += f" ({price} kr)"
                items.append(f"{day}|<strong>Dagens</strong> - {dish}")

            fish = self._between(lines, "FISK", ["VECKANS"])
            veg_start = lines.index("VEG") + 1
            veg_end = lines.index("MÅNDAG", veg_start)
            veg = lines[veg_start:veg_end]
            fish_price = next((price_match.group(1) for value in fish
                               if (price_match := re.fullmatch(r"(\d+)\s*:?-?", value))), "")
            veg_price = next((price_match.group(1) for value in veg
                              if (price_match := re.fullmatch(r"(\d+)\s*:?-?", value))), "")
            fish_text = self._dish(fish) + (f" ({fish_price} kr)" if fish_price else "")
            veg_text = self._dish(veg) + (f" ({veg_price} kr)" if veg_price else "")
            for day in self.DAYS:
                items.append(f"{day}|<strong>Veckans fisk</strong> - {fish_text}")
                items.append(f"{day}|<strong>Veckans veg</strong> - {veg_text}")
            self.log_info(f"Found menu for week {week_match.group(1)}")
            return {self.name: items}
        except Exception as error:
            self.log_error(f"Error parsing PDF menu: {error}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
