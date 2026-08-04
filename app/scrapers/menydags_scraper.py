import re
from typing import Dict, List, Optional

from bs4 import Tag

from .base_scraper import BaseScraper


class MenydagsScraper(BaseScraper):
    """Restauranger som publicerar sin lunch via menydags.se.

    Plattformen lägger hela veckan på /restaurang/<slug>/lunch, ett block per
    dag med id satt till datumet:

        <div id="2026-08-03">
          <h3>Måndag 3 augusti</h3>
          ... Lunchbuffé  122 kr
          <ul><li>
            <p>Kebabkryddade sojastrimlor</p>
            <p>Klyftpotatis, tzatziki och naanbröd</p>
            <span>Innehåller: Gluten, Laktos, Soja</span>
          </li>...</ul>
        </div>

    Datum-id:t är ankaret vi går på. Klassnamnen är Tailwind-genererade och
    byts vid nästa omdesign, men blocket måste behålla sitt datum för att
    dagväljarens länkar ska fungera.

    Menydags kör flera av restaurangerna på Lindholmen, så klassen tar en
    slug och kan återanvändas rakt av.
    """

    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    ISO_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    PRICE = re.compile(r'(\d+)\s*kr')
    ALLERGENS = re.compile(r'^\s*innehåller\s*:', re.IGNORECASE)

    # Köttsubstitut avgör ensamma. De prövas före allt annat eftersom rätten
    # ofta lånar namn av köttvarianten: "Kebabkryddade sojastrimlor" är inte
    # kött bara för att den smakar kebab.
    SUBSTITUTES = ['sojastrimlor', 'sojafärs', 'sojaprotein', 'vegofärs', 'vegostrimlor',
                   'quorn', 'tofu', 'seitan', 'oumph', 'ärtprotein', 'vegokorv',
                   'vegobiff', 'vegonugget']

    # Kött och fisk går före det vegetariska: en kycklingsallad med halloumi
    # är inte vegetarisk, men innehåller ordet.
    MEAT = ['kyckling', 'fläsk', 'oxfilé', 'oxkött', 'biff', 'kalv', 'lamm', 'bacon',
            'korv', 'köttbull', 'entrecote', 'högrev', 'anka', 'kalkon', 'skinka',
            'pulled', 'kebab', 'karré', 'nötkött', 'wallenbergare']
    FISH = ['torsk', 'lax', 'kolja', 'sill', 'räk', 'skaldjur', 'fisk', 'spätta',
            'flundra', 'sej', 'hoki', 'tonfisk', 'musslor', 'krabb']
    VEG = ['halloumi', 'tofu', 'quorn', 'lins', 'kikärt', 'soja', 'falafel',
           'vegetarisk', 'vegansk', 'grönsak', 'svamp', 'bönor']

    def __init__(self, name: str, slug: str, website: Optional[str] = None):
        base = f'https://www.menydags.se/restaurang/{slug}'
        super().__init__({
            'name': name,
            'website': website or base,
            'menu_url': f'{base}/lunch',
        })

    def _categorize(self, name: str, description: str, tags: List[str]) -> str:
        """Kategorin restaurangen själv anger, annars gissad ur rätten."""
        for tag in tags:
            lowered = tag.lower()
            if 'vegan' in lowered:
                return 'Vegansk'
            if 'vegetarisk' in lowered or 'vegetariskt' in lowered:
                return 'Vegetarisk'
            if self.ALLERGENS.match(tag) and re.search(r'\bfisk|skaldjur', lowered):
                return 'Fisk'

        haystack = f'{name} {description}'.lower()
        if any(word in haystack for word in self.SUBSTITUTES):
            return 'Vegetarisk'
        if any(word in haystack for word in self.MEAT):
            return 'Kött'
        if any(word in haystack for word in self.FISH):
            return 'Fisk'
        if any(word in haystack for word in self.VEG):
            return 'Vegetarisk'
        return 'Dagens'

    def _dishes_for_day(self, block: Tag) -> List[Dict[str, object]]:
        dishes = []
        for entry in block.select('li'):
            paragraphs = [
                self.clean_text(p.get_text(' ', strip=True))
                for p in entry.select('p')
            ]
            paragraphs = [p for p in paragraphs if p]
            if not paragraphs:
                continue

            name = paragraphs[0]
            description = paragraphs[1] if len(paragraphs) > 1 else ''
            tags = [
                self.clean_text(span.get_text(' ', strip=True))
                for span in entry.select('span')
                if span.get_text(strip=True)
            ]
            dishes.append({
                'name': name,
                'description': description,
                'category': self._categorize(name, description, tags),
                'allergens': next((t for t in tags if self.ALLERGENS.match(t)), ''),
            })
        return dishes

    def scrape(self) -> Dict[str, List[str]]:
        soup = self.get_page_content()
        if not soup:
            return {self.name: ["Kunde inte hitta menyn just nu"]}

        try:
            blocks = [
                div for div in soup.select('div[id]')
                if self.ISO_DATE.match(div.get('id', ''))
            ]
            if not blocks:
                self.log_warning('No dated day blocks on the menu page')
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            items: List[str] = []
            for block in blocks:
                heading = block.find('h3')
                if heading is None:
                    continue
                heading_text = heading.get_text(' ', strip=True)
                day = next((d for d in self.SWEDISH_DAYS if heading_text.startswith(d)), None)
                if day is None:
                    continue  # helgen, som restaurangen har stängt

                dishes = self._dishes_for_day(block)
                if not dishes:
                    continue

                # Priset gäller hela buffén, inte varje rätt. Det hör hemma på
                # inforaden — satt på varje rätt hade det sett ut som att man
                # betalar per tallrik.
                price = self.PRICE.search(block.get_text(' ', strip=True))
                if price:
                    items.append(
                        f"INFO:{day} - Restaurant Info: 💰 Lunch {price.group(1)} kr"
                    )

                for dish in dishes:
                    parts = [dish['description']] if dish['description'] else []
                    if dish['allergens']:
                        parts.append(str(dish['allergens']))
                    text = f"{dish['name']} - {'. '.join(parts)}" if parts else dish['name']
                    items.append(f"{day}|<strong>{dish['category']}</strong> - {text}")

            if not items:
                self.log_warning('Day blocks contained no dishes')
                return {self.name: ["Ingen lunchmeny tillgänglig"]}

            days_found = len({i.split('|')[0] for i in items if '|' in i})
            self.log_info(f"Found dishes for {days_found} days")
            return {self.name: items}

        except Exception as e:
            self.log_error(f"Error scraping menu: {e}")
            return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}
