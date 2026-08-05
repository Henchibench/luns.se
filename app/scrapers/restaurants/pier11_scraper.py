from ..menydags_scraper import MenydagsScraper


class Pier11Scraper(MenydagsScraper):
    """Restaurant Pier 11, Lindholmspiren.

    Den tidigare skrapan läste Ericssons egen sida och letade efter engelska
    dagrubriker i Elementor-markup. Den sidan publicerar inte längre någon
    veckomeny, så restaurangen stod tom på luns.se. Menyn finns i stället hos
    menydags.se, med hela veckan och allergener.
    """

    def __init__(self):
        super().__init__(
            name='Restaurant Pier 11',
            slug='pier-11',
            website='https://ericssonbynordrest.se/restaurang/restaurant-pier-11/',
        )
