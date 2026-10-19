from typing import Dict, List

from ..static_menu_scraper import StaticMenuScraper
from ..silvis_weekly import fetch_posts, weekly_row


class SilvisScraper(StaticMenuScraper):
    """Stående rätter och ett separat daterat tillägg från lunchsidans widget."""

    allow_previous_menu = False
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
            items: List[str] = [
                'INFO:Måndag - Restaurant Info: Menybesked: '
                'Ingen lunchservering på måndagar. Silvis serverar lunch tisdag–fredag 11.00–14.00.'
            ]
            for day in self.DAYS:
                for dish in self.menu_data['items']:
                    items.append(self.format_static_item(
                        day,
                        'Stående rätt',
                        dish['name'],
                        dish.get('description', ''),
                        dish.get('price', ''),
                    ))

            if not self.menu_data['items']:
                return {self.name: ['Ingen lunchmeny tillgänglig']}

            try:
                weekly = weekly_row(fetch_posts())
                if weekly:
                    items.append(weekly)
            except Exception as error:
                # Fel i veckoflödet får inte frysa förra veckans rätter eller
                # dölja den separat verifierade stående menyn.
                self.log_warning(f'Veckoflödet kunde inte läsas ({type(error).__name__})')

            self.log_info(f'Hittade {len(self.menu_data["items"])} stående rätter')
            return {self.name: items}

        except Exception as error:
            self.log_error(f'Kunde inte läsa den sparade menyn: {error}')
            return {self.name: ['Ett fel uppstod vid hämtning av menyn']}
