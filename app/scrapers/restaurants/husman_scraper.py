import re
from typing import Dict, List

from ..base_scraper import BaseScraper


class HusmanScraper(BaseScraper):
    """Restaurang Husman, Teknikringen 8 — Mjärdevi, Linköping.

    En Elementor-sida där både dagrubriker och rätter är samma element,
    `span.elementor-heading-title`. Ingenting i markupen säger vilket som är
    vilket, så spannen läses i dokumentordning: en rubrik som ser ut som
    "Måndag 3 augusti" öppnar en dag, och allt efter den är rätter tills nästa
    dag eller tills avslutningsfraserna tar vid.

    Servern svarar 403 på en kortfattad User-Agent. BaseScraper skickar en
    fullständig webbläsarsträng, vilket räcker — men en framtida bantning av
    de headrarna skulle slå ut just den här skrapan.

    Kategorin står i rätten själv: "Veg: Falafel …", "Sallad: Räkor …".
    Rätter utan prefix är dagens.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    # "Måndag 3 augusti"
    DAY_HEADING = re.compile(
        r'^\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag)\s+\d{1,2}\s+[a-zåäö]+\s*$', re.IGNORECASE
    )

    # Prosa som avslutar dagen utan att vara mat.
    STOP_PATTERNS = [
        r'^välkommen',
        r'^trevlig helg',
        r'^vi reserverar',
        r'^priser$',
        r'^öppettider',
        r'^lunch:$',
        r'^lunchkort',
        r'^vecka\s',
    ]

    # "Veg: Falafel …" — kategorinamnet står först i rätten.
    INLINE_CATEGORY = re.compile(r'^([A-ZÅÄÖ][a-zåäöA-ZÅÄÖ\s]{1,18}):\s*(.+)$')

    # "135kr (Dagens + sallad + vatten + kaffe)". Priserna står i en egen
    # ikonlista, inte bland rubrikerna, och hämtas därför separat.
    PRICE_LINE = re.compile(r'^\d{2,4}\s*kr\b', re.IGNORECASE)

    def __init__(self):
        restaurant_info = {
            'name': 'Restaurang Husman',
            'website': 'https://restauranghusman.se',
            'menu_url': 'https://restauranghusman.se/veckans-lunch/',
        }
        super().__init__(restaurant_info)

    def _matches(self, text: str, patterns: List[str]) -> bool:
        lowered = text.lower()
        return any(re.search(p, lowered) for p in patterns)

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content()
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            items: List[str] = []
            days_seen: List[str] = []
            prices: List[str] = []
            current_day = ''

            for span in soup.select('span.elementor-heading-title'):
                text = self.clean_text(span.get_text(' ', strip=True))
                if not text:
                    continue

                heading = self.DAY_HEADING.match(text)
                if heading:
                    current_day = heading.group(1).capitalize()
                    if current_day not in days_seen:
                        days_seen.append(current_day)
                    continue

                if self._matches(text, self.STOP_PATTERNS):
                    current_day = ''
                    continue

                if not current_day:
                    continue

                category = 'Dagens'
                dish = text
                inline = self.INLINE_CATEGORY.match(text)
                if inline:
                    category = inline.group(1).strip().capitalize()
                    dish = inline.group(2).strip()

                # Elementor renderar hela menyn två gånger, en gång per
                # skärmstorlek. Raderna är identiska, så den andra omgången
                # känns igen på att den redan finns.
                line = f"{current_day}|<strong>{category}</strong> - {dish}"
                if line not in items:
                    items.append(line)

            for span in soup.select('span.elementor-icon-list-text'):
                text = self.clean_text(span.get_text(' ', strip=True))
                if self.PRICE_LINE.match(text) and text not in prices:
                    prices.append(text)

            if not items:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            if prices:
                summary = ' · '.join(prices)
                for day in days_seen:
                    items.append(f"INFO:{day} - Restaurant Info: 💰 {summary}")

            self.log_info(f"Found {len(items)} menu items for {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
