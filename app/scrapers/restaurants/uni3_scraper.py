from ..compass_group_scraper import CompassGroupScraper


class Uni3Scraper(CompassGroupScraper):
    """UNI3 – World of Food, Lindholmen.

    Läste tidigare en RSS-feed som slutat svara — restaurangen har visat
    "Kunde inte hitta menyn just nu" på luns.se. Compass egna meny-API har
    hela veckan.

    Uni3 delar in menyn i stationer och skriver ofta flera rätter i samma
    stycke: "Fire: Tacobowl ... Water: Uer ...". Stationsnamnen får därför
    både avgränsa rätterna och bli deras kategori.
    """

    STATIONS = ['Water', 'Fire', 'Metal', 'Wood', 'Earth']

    def __init__(self):
        super().__init__(
            {
                'name': 'Uni3 – World of Food',
                'website': 'https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/uni3-world-of-food/',
            },
            stations=self.STATIONS,
        )
