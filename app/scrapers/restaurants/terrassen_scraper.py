from ..mashie_scraper import MashieScraper


class TerrassenScraper(MashieScraper):
    def __init__(self):
        restaurant_info = {
            'name': 'Terrassen',
            'website': 'https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/terrassen/',
        }
        super().__init__(
            restaurant_info,
            'https://compass.mashie.matildaplatform.com/public/app/saab+terassen/1e8c9846?country=se',
        )
