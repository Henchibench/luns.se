from ..menydags_scraper import MenydagsScraper


class SevenSeasonsScraper(MenydagsScraper):
    """Seven Seasons, Planetgatan 8 — Lindholmen.

    Compass Group-restaurang som publicerar sin lunch via menydags.
    """

    def __init__(self):
        super().__init__(
            name='Seven Seasons',
            slug='seven-seasons',
            website='https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/seven-seasons/',
        )
