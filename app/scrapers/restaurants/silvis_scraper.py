from typing import Dict, List

from ..static_menu_scraper import StaticMenuScraper


class SilvisScraper(StaticMenuScraper):
    """Silvis stående lunchmeny på Nordhemsgatan.

    Den officiella sidan har dels ett Facebook-flöde med veckans rätter, dels
    ett eget avsnitt märkt "STÅENDE RÄTTER". Facebook-flödet kräver JavaScript
    och en extern widgettjänst och går därför inte att använda i produktion.
    De fem stående rätterna är däremot uttryckligen fasta och sparas ordagrant
    i ``data/silvis.json``. Lunch serveras tisdag–fredag, så ingen meny läggs
    ut på måndagen.
    """

    DAYS = ['Tisdag', 'Onsdag', 'Torsdag', 'Fredag']

    def __init__(self):
        super().__init__(
            {
                'name': 'Silvis',
                'website': 'https://silvis.nu/',
                'menu_url': 'https://silvis.nu/lunchmeny_i_linne_jarntorget/',
            },
            'silvis.json',
        )

    def scrape(self) -> Dict[str, List[str]]:
        try:
            items: List[str] = []
            for day in self.DAYS:
                for dish in self.menu_data['items']:
                    items.append(self.format_static_item(
                        day,
                        'Stående rätt',
                        dish['name'],
                        dish.get('description', ''),
                        dish.get('price', ''),
                    ))

            if not items:
                return {self.name: ['Ingen lunchmeny tillgänglig']}

            self.log_info(f'Hittade {len(self.menu_data["items"])} stående rätter')
            return {self.name: items}

        except Exception as error:
            self.log_error(f'Kunde inte läsa den sparade menyn: {error}')
            return {self.name: ['Ett fel uppstod vid hämtning av menyn']}
