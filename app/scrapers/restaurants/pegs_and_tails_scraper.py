import re
from typing import Dict, List, Optional

from ..base_scraper import BaseScraper


class PegsAndTailsScraper(BaseScraper):
    """Pegs & Tails, Universitetsvägen — Campus Valla, Linköping.

    Sidan har två delar. Överst en räcka rätter med pris, längre ner "Se hela
    veckans meny" med en rubrik per veckodag och rätterna under, den gången
    utan pris.

    **Den övre delen har inga rubriker.** I markupen ligger fem stycken kvar —
    "Dagens drive", "Veckans fisk", "Serveras från tisdag!", "Veckans green",
    "Eller prova någon av dessa!" — men alla bär hela raden
    elementor-hidden-desktop/-laptop/-tablet/-mobile och kan alltså aldrig
    visas för någon. De är avställda rubriker restaurangen glömt radera.
    BaseScraper rensar bort dem innan vi ser sidan, så de rätterna får sitt
    eget namn som kategori i stället; att sätta "Veckans" vore att påstå något
    ingen besökare kan läsa på sidan. Rätterna är däremot äkta och synliga.

    Rätterna byggs av shortcodes som märker delarna med egna klasser:
    meny-titel, meny-pris, meny-innehall och meny-allergi. De två sista står
    dubbelt i sidan, en gång per skärmstorlek, så bara den första av varje
    sort behålls. Den dubbleringen är responsiv — några av
    elementor-hidden-klasserna, inte alla — och överlever rensningen.

    De två första rätterna i den övre delen är samma mån- och tisdagsrätt som
    veckolistan har, upprepade med pris. De läggs därför inte ut som
    veckorätter: veckolistan säger vilken dag de serveras, och att samtidigt
    lägga köttbullarna på fredag vore ett påstående sidan själv motsäger.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    WEEK_HEADING = re.compile(r'se hela veckans meny', re.IGNORECASE)
    SKIP_SECTIONS = [r'dagens drive']

    def __init__(self):
        restaurant_info = {
            'name': 'Pegs & Tails',
            'website': 'https://www.pegsandtails.se',
            'menu_url': 'https://www.pegsandtails.se/lunch/meny/',
        }
        super().__init__(restaurant_info)

    @staticmethod
    def _class_of(element) -> str:
        for name in element.get('class', []):
            if name.startswith('meny-'):
                return name
        return ''

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            weekly: List[dict] = []      # gäller hela veckan
            by_day: List[tuple] = []     # (dag, rätt)
            days_seen: List[str] = []

            in_week_list = False
            section = ''
            current_day = ''
            dish: Optional[dict] = None

            def store():
                if not dish or not dish['name']:
                    return
                if in_week_list:
                    if current_day:
                        by_day.append((current_day, dict(dish)))
                elif not any(re.search(p, section, re.I) for p in self.SKIP_SECTIONS):
                    weekly.append(dict(dish))

            for element in soup.select('h2, h3, h5, [class*=meny-]'):
                kind = self._class_of(element)
                text = self.clean_text(element.get_text(' ', strip=True))
                if not text:
                    continue

                if not kind:
                    store()
                    dish = None
                    if self.WEEK_HEADING.search(text):
                        in_week_list = True
                        section = ''
                        continue
                    day = next(
                        (d for d in self.SWEDISH_DAYS if d.lower() == text.lower()), ''
                    )
                    if day:
                        current_day = day
                        if day not in days_seen:
                            days_seen.append(day)
                    else:
                        section = text
                    continue

                if kind == 'meny-titel':
                    store()
                    dish = {'name': text, 'price': '', 'description': '', 'allergens': ''}
                    continue

                if dish is None:
                    continue

                # Beskrivning och allergi står dubbelt — först vinner.
                if kind == 'meny-pris' and not dish['price']:
                    dish['price'] = text
                elif kind == 'meny-innehall' and not dish['description']:
                    dish['description'] = text
                elif kind == 'meny-allergi' and not dish['allergens']:
                    dish['allergens'] = text

            store()

            if not by_day and not weekly:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            def line_for(day: str, category: str, body: str, entry: dict) -> str:
                if entry['allergens']:
                    body += f" ({entry['allergens']})"
                line = f"{day}|<strong>{category}</strong> - {body}"
                if entry['price']:
                    line += f" ({entry['price'].rstrip(':-')} kr)"
                return line

            items: List[str] = []
            for day, entry in by_day:
                body = entry['name']
                if entry['description']:
                    body += f": {entry['description']}"
                items.append(line_for(day, 'Dagens', body, entry))

            # En rätt som veckolistan lägger på en bestämd dag gäller inte hela
            # veckan, hur den än upprepas högre upp på sidan.
            dagsratter = {entry['name'].casefold() for _, entry in by_day}

            # Rätterna här står utan rubrik — se klassdocstringen. Rättens eget
            # namn är kategorin, beskrivningen texten.
            for day in days_seen or self.SWEDISH_DAYS:
                for entry in weekly:
                    if entry['name'].casefold() in dagsratter:
                        continue
                    items.append(
                        line_for(day, entry['name'], entry['description'], entry)
                    )

            self.log_info(f"Found {len(items)} menu items for {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
