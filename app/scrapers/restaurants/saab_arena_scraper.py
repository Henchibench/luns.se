import re
from datetime import date
from typing import Dict, List, Optional

from ..base_scraper import BaseScraper


class SaabArenaScraper(BaseScraper):
    """SAAB Arena, Linköping (lhc.eu/lunch).

    Restaurangen heter egentligen RP – Restaurang & Bar, men i Linköping säger
    man SAAB Arena, och sajten listar den under det namnet. Söker någon på det
    riktiga namnet står det i beskrivningen i `restaurant_data.py`.

    Sidan är en Nuxt-app, men den serverrenderas: hela menyn ligger i den
    HTML `requests` får, så ingen webbläsare behövs.

    **Rör aldrig `data-v-…`-attributen.** Varje element på sidan bär ett
    sådant — det är Vues scopade CSS, och hashen byts när de bygger om
    frontenden. En selektor på dem hade fungerat idag och tystnat vid nästa
    driftsättning. Fästet är i stället `div.html-render-container`, som är
    komponentens eget klassnamn.

    Den klassen finns på flera ställen på sidan: ett block är
    presentationstexten om restaurangen, ett annat är menyn. Vi väljer det
    block som innehåller flest veckodagar i stället för att räkna block eller
    lita på rubriktexten, som byter veckonummer varje måndag.

    Inuti blocket är allt platt — ingen struktur alls, bara stycken i rad:

        <h3>Pris dagens lunch 130:- (Grillbuffé 169:-)</h3>
        <p>Måndag</p>                       ← dagen är ett eget stycke
        <p>rätt</p>
        <p>rätt</p>
        <p>*******************</p>          ← skiljelinje mellan dagarna
        …
        <p>Fredag</p>
        <p>Grillbuffé</p>
        <p>Kött | Kyckling | Vegetariskt …</p>   ← vad buffén består av
        <p><strong>Veckans Vegetariska</strong></p>  ← gäller hela veckan
        <p>rätt</p>
        <p><strong>Alla medlemmar i LHC har 25% rabatt …</strong></p>

    Tre mönster måste hållas isär, och alla tre är sådana att ett misstag
    hade gömt mat i stället för att larma:

    - **Veckans Vegetariska står efter fredagen men gäller hela veckan.** Den
      känns igen på att hela stycket är fetstilt och kort. Läses den som en
      fredagsrätt saknas den vegetariska rätten fyra dagar av fem.

    - **Medlemsrabatten är också helt fetstild** — men lång. Ordräkningen är
      det som skiljer en rubrik från ett meddelande, och meddelandet hamnar
      på inforaden i stället för bland maten.

    - **Pipe-raden är innehållet i grillbuffén, inte en egen rätt.** Ett
      stycke med flera lodstreck är en uppräkning och slås ihop med stycket
      före, som då blir dess rubrik: "Grillbuffé – Kött | Kyckling | …".
      Den regeln är med flit smal. Att i stället slå ihop varje enordsstycke
      med nästa hade svalt en rätt hel den dag menyn råkar säga bara
      "Pyttipanna".
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # Skiljelinjen mellan dagarna är en rad asterisker. Ingen text, ingen mat.
    SEPARATOR = re.compile(r'^[\*\-–—_=~•\.\s]+$')

    # Så många ord ett fetstilt stycke får ha för att räknas som rubrik i
    # stället för meddelande. "Veckans Vegetariska" är två.
    MAX_HEADING_WORDS = 4

    # Så många ord raden före en pipe-uppräkning får ha för att bli dess
    # rubrik. "Grillbuffé" är ett.
    MAX_BUFFET_TITLE_WORDS = 3

    WEEK_LABEL = re.compile(r'vecka\s*(\d{1,2})', re.IGNORECASE)

    def __init__(self):
        restaurant_info = {
            'name': 'SAAB Arena',
            'website': 'https://www.lhc.eu',
            'menu_url': 'https://www.lhc.eu/lunch',
        }
        super().__init__(restaurant_info)

    def _day_of(self, text: str) -> Optional[str]:
        return next((d for d in self.SWEDISH_DAYS if d.lower() == text.lower()), None)

    def _menu_block(self, soup):
        """Blocket med flest veckodagar. Se klassdocstringen."""
        best, best_days = None, 0
        for block in soup.select('div.html-render-container'):
            text = block.get_text(' ', strip=True).lower()
            days = sum(1 for d in self.SWEDISH_DAYS if d.lower() in text)
            if days > best_days:
                best, best_days = block, days
        return best if best_days >= 3 else None

    def _check_week(self, soup) -> None:
        """Loggar om menyn är märkt med en annan vecka än den vi är i.

        Ingen åtgärd, bara en anteckning. Restaurangen kan lika gärna ha
        glömt att räkna upp rubriken som att ha glömt att byta menyn, och en
        tom sajt är sämre än en meny med fel veckonummer på.
        """
        match = self.WEEK_LABEL.search(soup.get_text(' ', strip=True))
        if not match:
            return
        published, current = int(match.group(1)), date.today().isocalendar()[1]
        if published != current:
            self.log_warning(f"Menyn är märkt vecka {published}, vi är i vecka {current}")
        else:
            self.log_info(f"Menyn är märkt vecka {published}")

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            block = self._menu_block(soup)
            if block is None:
                self.log_error("Hittade inget menyblock med veckodagar — sidan kan ha byggts om")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            self._check_week(soup)

            items: List[str] = []
            days_seen: List[str] = []
            # Rätter under en rubrik som inte är en veckodag gäller hela
            # veckan och kan inte läggas ut förrän alla dagar är kända.
            week_items: List[str] = []
            info_lines: List[str] = []

            day: Optional[str] = None
            category: Optional[str] = None

            for element in block.find_all(True, recursive=False):
                text = self.clean_text(element.get_text(' ', strip=True))
                if not text or self.SEPARATOR.match(text):
                    continue

                match = self._day_of(text)
                if match:
                    day, category = match, None
                    if match not in days_seen:
                        days_seen.append(match)
                    continue

                if day is None:
                    # Före första veckodagen står priset.
                    info_lines.append(text)
                    continue

                if text.count('|') >= 2 and (items or week_items):
                    self._attach_buffet(items if category is None else week_items, text)
                    continue

                strong = element.find(['strong', 'b'])
                is_bold = strong is not None and self.clean_text(strong.get_text(' ', strip=True)) == text
                if is_bold:
                    if len(text.split()) <= self.MAX_HEADING_WORDS:
                        category = text
                    else:
                        info_lines.append(text)
                    continue

                if category:
                    week_items.append(f"<strong>{category}</strong> - {text}")
                else:
                    items.append(f"{day}|<strong>Dagens</strong> - {text}")

            for each_day in days_seen:
                for item in week_items:
                    items.append(f"{each_day}|{item}")

            if not items:
                self.log_error("Inga rätter i menyblocket — sidan kan ha byggts om")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            if info_lines:
                summary = ' · '.join(info_lines)
                for each_day in days_seen:
                    items.append(f"INFO:{each_day} - Restaurant Info: 💰 {summary}")

            self.log_info(f"Hittade {len(items)} rader för {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

    def _attach_buffet(self, rows: List[str], text: str) -> None:
        """Gör föregående rad till rubrik för en pipe-uppräkning.

        "Grillbuffé" följt av "Kött | Kyckling | …" är en rätt, inte två.
        Är rubriken för lång för att vara en rubrik läggs uppräkningen bara
        till på slutet, så att inget innehåll försvinner.
        """
        previous = rows.pop()
        prefix, _, body = previous.partition('|<strong>Dagens</strong> - ')
        if body and len(body.split()) <= self.MAX_BUFFET_TITLE_WORDS:
            rows.append(f"{prefix}|<strong>{body}</strong> - {text}")
        else:
            rows.append(f"{previous} {text}")
