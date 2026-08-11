import re
from typing import Dict, List, Optional, Tuple

from ..base_scraper import BaseScraper


class OstgotaKokScraper(BaseScraper):
    """Östgöta Kök, Artillerigatan 15 — Garnisonen, Linköping.

    Menyn står i WordPress (Divi-temat) inuti en handskriven textruta med
    ett eget id: <div id="menyblock">. Det id:t är det enda stabila fästet på
    sidan — Divis egna klasser är numrerade efter modulordningen
    (`et_pb_text_2_tb_body`) och flyttar sig så fort någon lägger till en
    modul ovanför.

    Innehållet i rutan är en platt räcka rubriker och stycken, utan någon
    inramning per dag:

        <h2>Dagens Lunch 145 kr</h2>      ← pris och villkor, före menyn
        <h3>Efter kl.13:00 …</h3>
        <h4>I våran lunch ingår …</h4>
        <h2>v 33</h2>
        <h2>Måndag</h2>
        <p>rätt<br/>rätt</p>              ← två rätter, skilda av <br>
        …
        <h2>Veckans sallad</h2>           ← gäller hela veckan, inte fredag
        <p>rätt</p>
        <hr/>
        <h2>Lunchcatering</h2>            ← inte mat, och allt efter är prosa

    Tre saker styr designen:

    - **Rubrikerna avgör vem rätten tillhör.** En rubrik som är en veckodag
      binder styckena under sig till den dagen. En rubrik som inte är det —
      "Veckans sallad", "Veckans fisk", "Klassiker på Östgöta kök" — står
      efter fredagen men gäller hela veckan, och rätterna läggs därför på
      varje dag som fått mat. Läser man dem som fredagsrätter blir veckans
      fisk osynlig fyra dagar av fem.

    - **Vi märker aldrig en rätt som vegetarisk.** Restaurangen skriver på
      sin startsida att det är "ny vegetarisk och ny animalisk rätt varje
      dag", och veckan vi mätte stod den vegetariska först varje dag. Men
      ordningen är inget de lovat, och en rätt felmärkt "Vegetariskt" är ett
      fel ingen upptäcker förrän den ligger på tallriken. Dagsrätterna får
      i stället sitt eget namn som kategori: raden delas vid första
      snedstrecket, som är hur de själva skiljer rätt från tillbehör
      ("Wallenbergare / potatispuré / gräddsås"). Blir delningen fel är det
      en kosmetisk gräns, inte en osann uppgift.

    - **Rutan slutar inte där menyn gör.** Efter ett <hr> följer ett stycke
      om lunchcatering med rubriker och löptext som annars hade blivit
      rätter på alla fem dagarna. Vi bryter vid <hr>, och som bälte till
      hängslena också vid en rubrik som nämner catering.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']
    HEADINGS = ('h1', 'h2', 'h3', 'h4', 'h5', 'h6')

    # "v 33", "vecka 33", "V.33" — veckonumret är en tidsstämpel, ingen rubrik.
    WEEK_HEADING = re.compile(r'^v(?:ecka)?\.?\s*\d{1,2}$', re.IGNORECASE)

    # Rubriker som betyder att menyn är slut, ifall <hr> någon gång försvinner.
    STOP_HEADING = re.compile(r'catering', re.IGNORECASE)

    # Hur många ord ett rättnamn får ha före snedstrecket. "Jambalaya med
    # skaldjur" och "Östgöta köks köttbullar" ryms; en hel mening gör inte det
    # och får då stå kvar som rätt utan eget namn.
    MAX_NAME_WORDS = 4

    def __init__(self):
        restaurant_info = {
            'name': 'Östgöta Kök',
            'website': 'https://linkoping.ostgotakok.se',
            'menu_url': 'https://linkoping.ostgotakok.se/lunchmeny',
        }
        super().__init__(restaurant_info)

    def _lines(self, element) -> List[str]:
        """Styckets rader, en per <br>.

        Texten hämtas utan skiljetecken mellan noderna med flit. Rätterna är
        styckade av <strong> mitt i meningen — `<strong>Morot & linsgryta /
        </strong>apelsin<strong> / </strong>ingefära` — så ett mellanslag per
        nodgräns hade lagt till blanksteg som inte står på sidan.
        """
        for br in element.find_all('br'):
            br.replace_with('\n')
        rows = [self.clean_text(row) for row in element.get_text('').split('\n')]
        return [row for row in rows if row]

    def _split_name(self, line: str) -> Tuple[Optional[str], str]:
        """Delar "Rätt / tillbehör / tillbehör" i namn och beskrivning.

        Mellanslag runt snedstrecket prövas först: klassikerraden skriver
        "köttbullar/potatispure´/gräddsås" utan luft, och utan den ordningen
        hade "Östgöta köks köttbullar" delats på fel ställe.
        """
        for separator in (' / ', '/'):
            head, found, rest = line.partition(separator)
            if found and rest.strip() and len(head.split()) <= self.MAX_NAME_WORDS:
                return head.strip(), rest.strip()
        return None, line

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            block = soup.find(id='menyblock')
            if block is None:
                self.log_error("Hittade inte div#menyblock — sidan kan ha byggts om")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            items: List[str] = []
            days_seen: List[str] = []
            # Rätter under en rubrik som inte är en veckodag. De hör till hela
            # veckan och kan därför inte läggas ut förrän alla dagar är kända.
            week_items: List[Tuple[str, str]] = []
            info_lines: List[str] = []

            day: Optional[str] = None
            category: Optional[str] = None

            for element in block.find_all(True, recursive=False):
                if element.name == 'hr':
                    break

                if element.name in self.HEADINGS:
                    heading = self.clean_text(element.get_text(' ', strip=True))
                    if not heading:
                        continue
                    if self.STOP_HEADING.search(heading):
                        break
                    if self.WEEK_HEADING.match(heading):
                        self.log_info(f"Menyn är märkt {heading}")
                        continue

                    match = next(
                        (d for d in self.SWEDISH_DAYS if d.lower() == heading.lower()),
                        None,
                    )
                    if match:
                        day, category = match, None
                        if match not in days_seen:
                            days_seen.append(match)
                    elif day is None:
                        # Före första veckodagen står pris och villkor.
                        info_lines.append(heading)
                    else:
                        category = heading
                    continue

                for line in self._lines(element):
                    if day is None:
                        info_lines.append(line)
                    elif category:
                        week_items.append((category, line))
                    else:
                        name, dish = self._split_name(line)
                        items.append(f"{day}|<strong>{name or 'Dagens'}</strong> - {dish}")

            if not days_seen and week_items:
                self.log_warning("Inga veckodagsrubriker hittades — veckans rätter läggs på alla vardagar")
                days_seen = list(self.SWEDISH_DAYS)

            for each_day in days_seen:
                for category_name, dish in week_items:
                    items.append(f"{each_day}|<strong>{category_name}</strong> - {dish}")

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
