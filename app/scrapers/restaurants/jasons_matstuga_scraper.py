import re
from typing import Dict, List

from ..base_scraper import BaseScraper


class JasonsMatstugaScraper(BaseScraper):
    """Jasons Matstuga, Torvingegatan 16 — Tannefors, Linköping.

    En enkelsidig sajt byggd i one.com:s verktyg. Menyn ligger i textblock som
    växlar rubrik och innehåll: ett block med bara "Måndag", nästa med den
    dagens rätter, och så vidare genom veckan. Sist ett block med "Varje dag"
    följt av rätterna som alltid står på menyn.

    Blocken plockas på data-kind="TEXT" och inte på klassnamnet. Byggaren
    hashar sina CSS-moduler — klassen heter styles_contentContainer__lrPIa
    just nu — så ett klassval hade slutat fungera vid nästa gång de bygger om
    sajten. Attributet kommer från verktygets datamodell och står stilla.

    Varje rätt inleds med en siffra: "1-", "2- ", "3 -". Formen varierar mellan
    dagarna eftersom någon skrivit in dem för hand, så prefixet matchas löst.
    Rader utan siffra är prosa — "Nyhet !!" står mitt bland de stående
    rätterna — och hoppas över.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # "1-Plommonspäckad…", "2- Stekt strömming…", "3 -Wokad grönsaker…"
    DISH_PREFIX = re.compile(r'^\s*\d+\s*[-–—]\s*')

    STANDING_HEADING = re.compile(r'^\s*varje\s+dag\s*$', re.IGNORECASE)

    # Raderna under de stående rätterna som handlar om pris och vad som ingår.
    # De hör hemma i infofältet, inte bland rätterna.
    INFO_PATTERNS = [r'\d+\s*kr', r'\d+\s*%', r'ingår']

    # "Pris äta här 139 kr avh 129 kr" är samma besked som de två raderna om
    # servering och avhämtning längre ner, fast hopklämt. Att ta med båda gör
    # infofältet längre utan att säga något nytt.
    REDUNDANT_PATTERNS = [r'pris\s+äta\s+här']

    def __init__(self):
        restaurant_info = {
            'name': 'Jasons Matstuga',
            'website': 'https://www.jasonmatstuga.com',
            'menu_url': 'https://www.jasonmatstuga.com',
        }
        super().__init__(restaurant_info)

    @staticmethod
    def _matches(text: str, patterns: List[str]) -> bool:
        lowered = text.lower()
        return any(re.search(p, lowered) for p in patterns)

    def _lines(self, block) -> List[str]:
        """Textblockets rader. <br> är radbrytning här, inte blockgräns."""
        for br in block.find_all('br'):
            br.replace_with('\n')
        rows = [self.clean_text(row) for row in block.get_text('\n').split('\n')]
        return [row for row in rows if row]

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            by_day: List[tuple] = []      # (dag, rätt)
            standing: List[str] = []
            info_lines: List[str] = []

            current_day = ''
            in_standing = False

            for block in soup.select('div[data-kind="TEXT"]'):
                lines = self._lines(block)
                if not lines:
                    continue

                # Ett block med enbart en veckodag är en rubrik.
                if len(lines) == 1:
                    heading = lines[0]
                    day = next(
                        (d for d in self.SWEDISH_DAYS if heading.lower() == d.lower()), ''
                    )
                    if day:
                        current_day, in_standing = day, False
                        continue
                    if self.STANDING_HEADING.match(heading):
                        current_day, in_standing = '', True
                        continue

                if not current_day and not in_standing:
                    continue

                for line in lines:
                    if not self.DISH_PREFIX.match(line):
                        # Prosa som "Nyhet !!" står mitt bland rätterna och
                        # ska varken bli rätt eller info.
                        if (
                            self._matches(line, self.INFO_PATTERNS)
                            and not self._matches(line, self.REDUNDANT_PATTERNS)
                            and line not in info_lines
                        ):
                            info_lines.append(line)
                        continue

                    dish = self.DISH_PREFIX.sub('', line).strip(' .,')
                    if not dish:
                        continue

                    if in_standing:
                        if dish not in standing:
                            standing.append(dish)
                    else:
                        by_day.append((current_day, dish))

            if not by_day:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            items: List[str] = []
            days_seen = sorted({day for day, _ in by_day}, key=self.SWEDISH_DAYS.index)

            for day, dish in by_day:
                # Buffén står på varje dag men skrivs in per dag av
                # restaurangen. Den är dagens rätt hos dem, inte en stående.
                items.append(f"{day}|<strong>Dagens</strong> - {dish}")

            # De stående rätterna gäller alla dagar och upprepas därför per dag,
            # annars syns de bara för den som råkar titta på rätt veckodag.
            for day in days_seen:
                for dish in standing:
                    items.append(f"{day}|<strong>Varje dag</strong> - {dish}")

            # En rad, inte fem. Frontenden sätter 💰 framför varje inforad och
            # separerar dem med punkt — fem stycken blev en prickig vägg.
            if info_lines:
                summary = ' · '.join(info_lines)
                for day in days_seen:
                    items.append(f"INFO:{day} - Restaurant Info: 💰 {summary}")

            self.log_info(f"Found {len(items)} menu items for {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
