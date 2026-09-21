import re
from typing import Dict, List

from ..weekly_pdf_scraper import WeeklyPdfScraper


class RestaurangBOScraper(WeeklyPdfScraper):
    def __init__(self):
        super().__init__({
            "name": "Restaurang BO",
            "website": "https://www.restaurangbo.se/",
            "menu_url": "https://www.restaurangbo.se/lunchmat",
        })

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
        image = next((img.get("src", "") for img in soup.find_all("img")
                      if re.search(r"/v[.]?\s*\d{1,2}[.]", img.get("src", ""), re.I)), "")
        week = re.search(r"/v[.]?\s*(\d{1,2})[.]", image, re.I)
        if week and int(week.group(1)) == self.current_week():
            message = f"Meny vecka {week.group(1)} finns som bild · öppna MENY ovan"
        else:
            message = f"Vecka {self.current_week()} är inte publicerad än · öppna MENY ovan"
        return {self.name: self.info_for_all_days(message)}
