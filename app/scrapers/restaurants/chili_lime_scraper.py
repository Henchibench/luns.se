import re
from typing import Dict, List, Optional

from ..base_scraper import BaseScraper


class ChiliLimeScraper(BaseScraper):
    """Chili & Lime, Teknikringen 10 — Mjärdevi, Linköping.

    En ASP-sida från tidigt 2000-tal. Förstasidan visar bara dagens meny, men
    helaveckan.asp har hela veckan — samma innehåll, alla fem dagar. Det är
    den vi läser; aggregatorn på mjardevi.se har bara dagen.

    Varje dag är ett `<p>` som inleds av `span.underRubrik` med veckodagen och
    sedan tio numrerade platser åtskilda av `<br>`. Plats 7–10 står tomma.
    Numret säger ingenting om rätten, så det kastas — men en plats kan rymma
    två varianter, "A." och "B.", och de blir varsin rätt.

    Några platser är kategorier snarare än rätter. "VEGETARISKT:" står ensam
    med sina alternativ på raderna under, medan "GRILL: kycklingspett …" bär
    både kategori och rätt på samma rad.

    Sidan deklarerar iso-8859-1 i en meta-tagg men inte i HTTP-huvudet.
    BaseScraper låter BeautifulSoup avgöra kodningen i det läget, vilket
    plockar upp meta-taggen — utan det blir varje å och ä sönderskrivet.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    WEEK_URL = 'http://www.chili-lime.se/helaveckan.asp'
    PRICE_URL = 'http://www.chili-lime.se'

    # "1." eller "10." i början av en plats.
    SLOT = re.compile(r'^\s*\d{1,2}\.\s*')
    # Variantmarkören inuti en plats: "A. raggmunk …"
    VARIANT = re.compile(r'^\s*[AB]\.\s*')
    # Underalternativ till en kategori: "1: wokade grönsaker …"
    SUB_ITEM = re.compile(r'^\s*\d+\s*:\s*(.+)$')
    # "GRILL: kycklingspett …" — versaler följt av kolon.
    INLINE_CATEGORY = re.compile(r'^([A-ZÅÄÖ][A-ZÅÄÖ\s&-]{2,20}):\s*(.*)$')

    def __init__(self):
        restaurant_info = {
            'name': 'Chili & Lime',
            'website': 'http://www.chili-lime.se',
            'menu_url': self.WEEK_URL,
        }
        super().__init__(restaurant_info)

    def _price_line(self) -> Optional[str]:
        """Prisstycket ligger på förstasidan, inte på veckomenyn."""
        soup = self.get_page_content(self.PRICE_URL)
        if soup is None:
            return None
        for paragraph in soup.find_all('p'):
            text = self.clean_text(paragraph.get_text(' ', strip=True))
            match = re.search(r'(dagens rätt\s*\d.*?kaffe/te)', text, re.IGNORECASE)
            if match:
                return match.group(1)
        self.log_error("No price line found — the front page may have changed")
        return None

    def _dishes_for_day(self, paragraph) -> List[tuple]:
        """(kategori, rätt) för en dag."""
        for br in paragraph.find_all('br'):
            br.replace_with('\n')
        text = paragraph.get_text('\n')

        dishes: List[tuple] = []
        category = 'Dagens'
        pending_category = ''

        for raw_line in text.split('\n'):
            line = self.clean_text(raw_line)
            if not line or line in self.SWEDISH_DAYS:
                continue

            had_slot = bool(self.SLOT.match(line))
            line = self.SLOT.sub('', line).strip()
            if not line:
                # Tom plats — sidan har alltid tio, sällan tio rätter.
                continue

            sub = self.SUB_ITEM.match(line)
            if sub and pending_category:
                dishes.append((pending_category, sub.group(1).strip()))
                continue

            line = self.VARIANT.sub('', line).strip()
            if not line:
                continue

            inline = self.INLINE_CATEGORY.match(line)
            if inline:
                name = inline.group(1).strip().capitalize()
                rest = inline.group(2).strip()
                if rest:
                    dishes.append((name, rest))
                    category = 'Dagens'
                else:
                    # Kategorin står ensam, alternativen kommer under.
                    pending_category = name
                continue

            if had_slot:
                pending_category = ''
            dishes.append((category, line))

        return dishes

    def scrape(self) -> Dict[str, List[str]]:
        try:
            soup = self.get_page_content(self.WEEK_URL)
            if soup is None:
                return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}

            items: List[str] = []
            days_seen: List[str] = []

            for heading in soup.select('span.underRubrik'):
                name = self.clean_text(heading.get_text(strip=True))
                day = next((d for d in self.SWEDISH_DAYS if d.lower() == name.lower()), '')
                if not day:
                    continue
                paragraph = heading.find_parent('p')
                if paragraph is None:
                    continue

                for category, dish in self._dishes_for_day(paragraph):
                    # Sidan skriver rätterna med gemen begynnelsebokstav.
                    # Resten av listan gör inte det, så meningen får en versal.
                    dish = dish[:1].upper() + dish[1:]
                    items.append(f"{day}|<strong>{category}</strong> - {dish}")
                if day not in days_seen:
                    days_seen.append(day)

            if not items:
                self.log_error("No dishes found — page layout may have changed")
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            price = self._price_line()
            if price:
                for day in days_seen:
                    items.append(f"INFO:{day} - Restaurant Info: 💰 {price}")

            self.log_info(f"Found {len(items)} menu items for {', '.join(days_seen)}")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
