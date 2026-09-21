from typing import Dict, List

from ..weekly_pdf_scraper import WeeklyPdfScraper


class FulaHummernScraper(WeeklyPdfScraper):
    def __init__(self):
        super().__init__({
            "name": "Fula Hummern",
            "website": "https://fulahummern.se/",
            "menu_url": "https://fulahummern.se/meny/",
        })

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content(self.url)
        if not soup:
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
        text = self.clean_text(soup.get_text(" ", strip=True)).casefold()
        if "sommarstängt" in text:
            message = "Restaurangen uppger sommarstängt på sin officiella sida"
        else:
            message = "Aktuell lunchmeny finns inte som text · öppna MENY ovan"
        return {self.name: self.info_for_all_days(message)}
