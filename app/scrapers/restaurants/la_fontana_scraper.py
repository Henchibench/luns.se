import re
from typing import Dict, List

from ..base_scraper import BaseScraper


class LaFontanaScraper(BaseScraper):
    """La Fontana, Teknikringen 7 — Mjärdevi, Linköping.

    Menyn ligger i en Elementor-prislista där varje dag är en post: veckodagen
    som rubrik och hela dagens meny nerpressad i ett enda beskrivningsfält.
    Rätterna skiljs bara åt av `<br>`, vilket är det enda vi har att gå på.

    Två dagar i veckan tänder de grillen, och då står buffén över flera rader
    där den första bara är en rubrik som slutar på kolon. En rad som slutar så
    slås ihop med nästa, annars blir rubriken en egen tom rätt och innehållet
    en rätt utan sammanhang.

    Kategorier plockas bara ur korta prefix — "Veckans sallad:", "Dagens
    pizza:", "Såser:". Längre inledningar som "Vi tänder grillen:" är prosa
    och får stå kvar i rätten.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # Så många ord ett kategoriprefix får ha före kolon.
    MAX_CATEGORY_WORDS = 2

    PRICE_HINT = re.compile(r'\d{2,4}\s*(kr|:-)', re.IGNORECASE)

    def __init__(self):
        restaurant_info = {
            'name': 'La Fontana',
            'website': 'http://lafontanamjardevi.se',
            'menu_url': 'http://lafontanamjardevi.se/dagens-lunch/',
        }
        super().__init__(restaurant_info)

    def _lines(self, description) -> List[str]:
        for br in description.find_all('br'):
            br.replace_with('\n')
        rows = [self.clean_text(row) for row in description.get_text('\n').split('\n')]
        rows = [row for row in rows if row]

        merged: List[str] = []
        for row in rows:
            if merged and merged[-1].endswith(':'):
                merged[-1] = f'{merged[-1]} {row}'
            else:
                merged.append(row)
        return merged

    def _split_category(self, line: str) -> tuple:
        head, sep, rest = line.partition(':')
        if sep and rest.strip() and len(head.split()) <= self.MAX_CATEGORY_WORDS:
            return head.strip().capitalize(), rest.strip()
        return 'Dagens', line

    def _price_lines(self, soup) -> List[str]:
        """Prisuppgifterna står i löptext ovanför menyn.

        Priset är utspritt över flera stycken — "…för 149 kr," på ett, "Utan
        dryck 139:-." på nästa — så det räcker inte att leta efter ett stycke
        som bär hela beskedet. I stället tas hela textrutan och de stycken i
        den som nämner ett pris plockas ut i ordning.
        """
        for container in soup.select('div.elementor-widget-container'):
            text = container.get_text(' ', strip=True)
            if 'lunchbuffé serveras' not in text.lower():
                continue
            found = []
            for paragraph in container.find_all('p'):
                line = self.clean_text(paragraph.get_text(' ', strip=True))
                if line and self.PRICE_HINT.search(line) and line not in found:
                    found.append(line)
            if found:
                return found
        self.log_error("No price text found — page layout may have changed")
        return []

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            items: List[str] = []
            days_seen: List[str] = []

            for item in soup.select('li.elementor-price-list-item'):
                title = item.select_one('.elementor-price-list-title')
                description = item.select_one('.elementor-price-list-description')
                if title is None or description is None:
                    continue

                name = self.clean_text(title.get_text(' ', strip=True))
                day = next((d for d in self.SWEDISH_DAYS if d.lower() == name.lower()), '')
                if not day:
                    continue

                for line in self._lines(description):
                    category, dish = self._split_category(line)
                    dish = dish[:1].upper() + dish[1:]
                    items.append(f"{day}|<strong>{category}</strong> - {dish}")

                if day not in days_seen:
                    days_seen.append(day)

            if not items:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            prices = self._price_lines(soup)
            if prices:
                summary = ' · '.join(prices)
                for day in days_seen:
                    items.append(f"INFO:{day} - Restaurant Info: 💰 {summary}")

            self.log_info(f"Found {len(items)} menu items for {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
