# Restaurant name modifications
restaurant_name_modifications = {
    "Rollin Bistros": "Piren"
}

# Location metadata.
#
# Which restaurants belong to a location is NOT listed here — it is derived
# from each restaurant's "area" field in restaurant_locations below, so the
# two can never drift apart. This dict only carries what cannot be derived:
# where to centre the weather lookup and how to phrase the Google Maps query.
#
# A location only reaches the frontend once at least one scraped restaurant
# has that area, so entries can be prepared before their scrapers exist.
LOCATIONS = {
    "Lindholmen": {
        "label": "Lindholmen",
        "city": "Göteborg",
        "map_query": "lindholmen göteborg",
        "latitude": 57.7059,
        "longitude": 11.9359,
    },
    "Tannefors": {
        "label": "Tannefors",
        "city": "Linköping",
        "map_query": "tannefors linköping",
        "latitude": 58.4108,
        "longitude": 15.6470,
    },
}

# Restaurant locations dictionary
restaurant_locations = {
    "Bar Schiacciate": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Bar%20Schiacciate%2C%20Lindholmsall%C3%A9n%2022C%2C%20G%C3%B6teborg",
        "latitude": 57.7096229,
        "longitude": 11.9416225,
        "website": "https://www.barschiacciate.se",
        "instagram": "https://www.instagram.com/barschiacciate/",
        "area": "Lindholmen",
        "lunch_hours": "Mån–fre 08–20"
    },
    "Benne Pastabar": {
        "maps": "https://maps.app.goo.gl/7sGxXMU8q4wW3LBWA",
        "latitude": 57.7082797,
        "longitude": 11.9430027,
        "website": "https://bennepastabar.se/",
        "instagram": "https://www.instagram.com/bennepastabar/",
        "area": "Lindholmen"
    },
    "Bistro 3": {
        "maps": "https://maps.app.goo.gl/vdJa9Hiq8Jx5KzaF6",
        "latitude": 57.7101793,
        "longitude": 11.9477941,
        "website": "https://bistro3.se",
        "area": "Lindholmen"
    },
    "Bistrot": {
        "maps": "https://maps.app.goo.gl/avRsfzoVuwcrawUK7",
        "latitude": 57.7061134,
        "longitude": 11.9387859,
        "website": "https://www.bistrot.se/",
        "instagram": "https://www.instagram.com/bistrotlindholmen/",
        "area": "Lindholmen"
    },
    "Bombay Bistro": {
        "maps": "https://maps.app.goo.gl/XS7Lj6ZrKdRQYJem7",
        "latitude": 57.708413,
        "longitude": 11.937699,
        "website": "https://www.bombaybistro.se/",
        "instagram": "https://www.instagram.com/bombaybistrogbg/",
        "area": "Lindholmen"
    },
    "Encounter Asian": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Encounter%20Asian%2C%20Lindholmen%2C%20G%C3%B6teborg",
        "latitude": 57.709112,
        "longitude": 11.937264,
        "website": "https://encounterasian.se",
        "area": "Lindholmen"
    },
    "District One": {
        "maps": "https://maps.app.goo.gl/RwHPDeykZvKpaTL26",
        "latitude": 57.7096404,
        "longitude": 11.9429148,
        "website": "https://www.districtone.se/",
        "instagram": "https://www.instagram.com/districtone.se/",
        "area": "Lindholmen"
    },
    "Gansu Köket": {
        "maps": "https://www.google.com/maps/place/Gansu+K%C3%B6ket/@57.7116918,11.9451355,17z/",
        "latitude": 57.7116918,
        "longitude": 11.9451355,
        "website": "https://www.google.com/maps/place/Gansu+K%C3%B6ket/",
        "area": "Lindholmen"
    },
    "Kooperativet": {
        "maps": "https://maps.app.goo.gl/my6t4v54DmjTEBpt6",
        "latitude": 57.7085322,
        "longitude": 11.9446582,
        "website": "https://www.kooperativet.se/",
        "instagram": "https://www.instagram.com/kooperativetlindholmen/",
        "area": "Lindholmen"
    },
    "Masala Kitchen": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Masala%20Kitchen%2C%20Lindholmen%2C%20G%C3%B6teborg",
        "latitude": 57.7065735,
        "longitude": 11.9453508,
        "website": "https://masalakitchen.se/lunch/",
        "area": "Lindholmen"
    },
    "L's Resto": {
        "maps": "https://maps.app.goo.gl/RtVkeYh96g2zebqd7",
        "latitude": 57.7069994,
        "longitude": 11.9401762,
        "website": "https://www.lsresto.se/",
        "instagram": "https://www.instagram.com/lsrestogbg/",
        "area": "Lindholmen"
    },
    "Matminnen": {
        "maps": "https://maps.app.goo.gl/qobKmdY8mWpKQxvCA",
        "latitude": 57.7132789,
        "longitude": 11.948823,
        "website": "https://matminnen.se/",
        "instagram": "https://www.instagram.com/matminnen/",
        "area": "Lindholmen"
    },
    "Mimolett": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Mimolett%2C%20Lindholmen%2C%20G%C3%B6teborg",
        "latitude": 57.7080059,
        "longitude": 11.9353462,
        "website": "https://restaurangmimolett.se/",
        "instagram": "https://www.instagram.com/restaurangmimolett/",
        "area": "Lindholmen"
    },
    "Miss F": {
        "maps": "https://maps.app.goo.gl/bQFos82i7oNAazfv5",
        "latitude": 57.708312,
        "longitude": 11.944489,
        "website": "https://www.facebook.com/missfgbg/",
        "instagram": "https://www.instagram.com/missfgbg/",
        "area": "Lindholmen"
    },
    "Oishii": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Oishii%2C%20Lindholmen%2C%20G%C3%B6teborg",
        "latitude": 57.7055045,
        "longitude": 11.9336158,
        "website": "https://oishii.se/",
        "instagram": "https://www.instagram.com/oishii_gbg/",
        "area": "Lindholmen"
    },
    "Restaurant Pier 11": {
        "maps": "https://maps.app.goo.gl/VMJKfEYDJ6QFrtfn6",
        "latitude": 57.704871,
        "longitude": 11.9416524,
        "website": "https://ericssonbynordrest.se/restaurang/restaurant-pier-11/",
        "instagram": "https://www.instagram.com/pier11lindholmen/",
        "area": "Lindholmen"
    },
    "Piren": {
        "maps": "https://maps.app.goo.gl/25UAJZWyC2wp5myh8",
        "latitude": 57.7059689,
        "longitude": 11.9399868,
        "website": "https://www.pirengbg.se/",
        "instagram": "https://www.instagram.com/pirenlindholmen/",
        "area": "Lindholmen"
    },
    "Uni3 – World of Food": {
        "maps": "https://maps.app.goo.gl/4Ec1qUTYguYDXSwz7",
        "latitude": 57.7112876,
        "longitude": 11.9460612,
        "website": "https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/uni3-world-of-food/",
        "instagram": "https://www.instagram.com/uni3worldoffood/",
        "area": "Lindholmen"
    },
    "Seven Seasons": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Seven%20Seasons%2C%20Planetgatan%208%2C%20G%C3%B6teborg",
        "latitude": 57.7102849,
        "longitude": 11.9472573,
        "website": "https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/seven-seasons/",
        "area": "Lindholmen",
        "lunch_hours": "Mån–fre 07.30–16.00"
    },
    "Terrassen": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Ensbov%C3%A4gen+3%2C+582+54+Link%C3%B6ping",
        "latitude": 58.4024082,
        "longitude": 15.6613493,
        "website": "https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/terrassen/",
        "area": "Tannefors",
        "lunch_hours": "Mån–fre 11.00–13.30"
    },
    "Krubbstugan": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Gelbgjutaregatan+2%2C+581+87+Link%C3%B6ping",
        "latitude": 58.4064633,
        "longitude": 15.6509863,
        "website": "https://krubbstugan.se",
        "area": "Tannefors",
        "lunch_hours": "Mån–fre 11.00–14.00"
    },
    "Skyline": {
        "maps": "https://www.google.com/maps/search/?api=1&query=Link%C3%B6pings+flygplats%2C+582+54+Link%C3%B6ping",
        "latitude": 58.4075379,
        "longitude": 15.6580456,
        "website": "http://restaurangskyline.se",
        "area": "Tannefors",
        "lunch_hours": "Vardagar 11.00–13.00"
    },
}
