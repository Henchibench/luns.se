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
    # Mjärdevi sträcker sig här längre än stadsdelsgränsen. Pegs & Tails och
    # Universitetsklubben ligger på Campus Valla, Pinocchio i Lambohov — men
    # alla tre räknas som Mjärdevis lunchutbud av mjardevi.se själva, och det
    # är den indelning folk som jobbar där använder. Geografin får ge vika för
    # hur området faktiskt hänger ihop.
    "Mjärdevi": {
        "label": "Mjärdevi",
        "city": "Linköping",
        "map_query": "mjärdevi linköping",
        "latitude": 58.3940,
        "longitude": 15.5590,
    },
}

# Restaurant locations dictionary
restaurant_locations = {
    "Bar Schiacciate": {
        "description": "Italiensk mackbar grundad 2023 kring schiacciatan, ett tunnare och krispigare syskon till focaccia. Bröden bakas på plats och fylls med mortadella, stracciatella och prosciutto.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Bar%20Schiacciate%2C%20Lindholmsall%C3%A9n%2022C%2C%20G%C3%B6teborg",
        "latitude": 57.7096229,
        "longitude": 11.9416225,
        "website": "https://www.barschiacciate.se",
        "instagram": "https://www.instagram.com/barschiacciate/",
        "area": "Lindholmen",
        "lunch_hours": "Mån–fre 08–20"
    },
    "Benne Pastabar": {
        "description": "Färsk pasta som tillverkas på plats varje dag och såser lagade från grunden. Bakom det en uttalad idé: att alla ska ha råd med vällagad mat på restaurang.",
        "maps": "https://maps.app.goo.gl/7sGxXMU8q4wW3LBWA",
        "latitude": 57.7082797,
        "longitude": 11.9430027,
        "website": "https://bennepastabar.se/",
        "instagram": "https://www.instagram.com/bennepastabar/",
        "area": "Lindholmen",
        "lunch_hours": "Mån–fre 11–21"
    },
    "Bistro 3": {
        "description": "Sallader och välfyllda wraps med marinerade råvaror, plus pinsa och en salladsbuffé. Lunchen serveras både i bistron och uppe på takterrassen Rooftop.",
        "maps": "https://maps.app.goo.gl/vdJa9Hiq8Jx5KzaF6",
        "latitude": 57.7101793,
        "longitude": 11.9477941,
        "website": "https://bistro3.se",
        "area": "Lindholmen",
        "lunch_hours": "Mån–fre 11–14"
    },
    "Bistrot": {
        "description": "Modern lunchrestaurang vid Lindholmspirens strandpromenad. Vällagat med rustik bistrokänsla, svenska och internationella smaker, och alltid kött, fisk och vegetariskt på menyn.",
        "maps": "https://maps.app.goo.gl/avRsfzoVuwcrawUK7",
        "latitude": 57.7061134,
        "longitude": 11.9387859,
        "website": "https://www.bistrot.se/",
        "instagram": "https://www.instagram.com/bistrotlindholmen/",
        "area": "Lindholmen"
    },
    "Bombay Bistro": {
        "description": "Indisk restaurang med prisvärd vardagslunch och à la carte på kvällar och helger. Klassiker som butter chicken och vindaloo, med nybakat naan.",
        "maps": "https://maps.app.goo.gl/XS7Lj6ZrKdRQYJem7",
        "latitude": 57.708413,
        "longitude": 11.937699,
        "website": "https://www.bombaybistro.se/",
        "instagram": "https://www.instagram.com/bombaybistrogbg/",
        "area": "Lindholmen"
    },
    "Encounter Asian": {
        "description": "Asiatiskt kök som spänner från koreansk bibimbap till kinesisk shaguo och japansk yakiniku. Sushi och nudelsoppor på samma meny.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Encounter%20Asian%2C%20Lindholmen%2C%20G%C3%B6teborg",
        "latitude": 57.709112,
        "longitude": 11.937264,
        "website": "https://encounterasian.se",
        "area": "Lindholmen"
    },
    "District One": {
        "description": "Asiatiskt i Lindholmen Science Park med inspiration från Japan, Vietnam och Thailand. Sushi, ramen, pho och curry, plus ett par svenska husmansrätter till lunch.",
        "maps": "https://maps.app.goo.gl/RwHPDeykZvKpaTL26",
        "latitude": 57.7096404,
        "longitude": 11.9429148,
        "website": "https://www.districtone.se/",
        "instagram": "https://www.instagram.com/districtone.se/",
        "area": "Lindholmen"
    },
    "Kooperativet": {
        "description": "Food court med sex kök under samma tak mitt i Lindholmen Science Park, och en av stadens mest välbesökta lunchrestauranger på vardagar.",
        "maps": "https://maps.app.goo.gl/my6t4v54DmjTEBpt6",
        "latitude": 57.7085322,
        "longitude": 11.9446582,
        "website": "https://www.kooperativet.se/",
        "instagram": "https://www.instagram.com/kooperativetlindholmen/",
        "area": "Lindholmen"
    },
    "Masala Kitchen": {
        "description": "Indiskt med lunch mellan 11 och 14, en av flera Masala-restauranger i Göteborg.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Masala%20Kitchen%2C%20Lindholmen%2C%20G%C3%B6teborg",
        "latitude": 57.7065735,
        "longitude": 11.9453508,
        "website": "https://masalakitchen.se/lunch/",
        "area": "Lindholmen"
    },
    "Mimolett": {
        "description": "Italiensk lunch med pasta och risotto, med inslag av fisk och grillat. Den krämiga risotton och högrevsburgaren är det gästerna återkommer för.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Mimolett%2C%20Lindholmen%2C%20G%C3%B6teborg",
        "latitude": 57.7080059,
        "longitude": 11.9353462,
        # Ingen website. restaurangmimolett.se ligger kvar i DNS men skickar
        # vidare till helt andra sajter: en fransk WordPress-installation vid
        # ett tillfälle, en nederländsk vid nästa. Att låta WWW-länken peka dit
        # vore att skicka besökare till en okänd sajt i restaurangens namn.
        # Instagram finns kvar och får bära kontakten tills domänen är i ordning.
        "instagram": "https://www.instagram.com/restaurangmimolett/",
        "area": "Lindholmen"
    },
    "Miss F": {
        "description": "Café med frukost och lunch, mest känt för sina grillade matiga mackor. Även pajer, sallader och bibimbap, och uteservering med utsikt över vattnet.",
        "maps": "https://maps.app.goo.gl/bQFos82i7oNAazfv5",
        "latitude": 57.708312,
        "longitude": 11.944489,
        "website": "https://www.facebook.com/missfgbg/",
        "instagram": "https://www.instagram.com/missfgbg/",
        "area": "Lindholmen"
    },
    "Oishii": {
        "description": "Sushibar på Lindholmsvägen. Maten lagas i eget kök och äts på plats eller tas med.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Oishii%2C%20Lindholmen%2C%20G%C3%B6teborg",
        "latitude": 57.7055045,
        "longitude": 11.9336158,
        "website": "https://oishii.se/",
        "instagram": "https://www.instagram.com/oishii_gbg/",
        "area": "Lindholmen"
    },
    "Restaurant Pier 11": {
        "description": "Lunchbuffé med hållbarhet i fokus. Säsongens råvaror, husmanskost blandat med internationellt, och gott om grönsaker och rotfrukter.",
        "maps": "https://maps.app.goo.gl/VMJKfEYDJ6QFrtfn6",
        "latitude": 57.704871,
        "longitude": 11.9416524,
        "website": "https://ericssonbynordrest.se/restaurang/restaurant-pier-11/",
        "instagram": "https://www.instagram.com/pier11lindholmen/",
        "area": "Lindholmen"
    },
    "Uni3 – World of Food": {
        "description": "Matsal där lunchen delas upp på stationerna Water, Fire och Metal, med en rätt från varje.",
        "maps": "https://maps.app.goo.gl/4Ec1qUTYguYDXSwz7",
        "latitude": 57.7112876,
        "longitude": 11.9460612,
        "website": "https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/uni3-world-of-food/",
        "instagram": "https://www.instagram.com/uni3worldoffood/",
        "area": "Lindholmen"
    },
    "Seven Seasons": {
        "description": "Hållbar lunch där året delas in i sju matårstider i stället för fyra. Menyn följer naturens rytm snarare än kalendern.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Seven%20Seasons%2C%20Planetgatan%208%2C%20G%C3%B6teborg",
        "latitude": 57.7102849,
        "longitude": 11.9472573,
        "website": "https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/seven-seasons/",
        "area": "Lindholmen",
        "lunch_hours": "Mån–fre 07.30–16.00"
    },
    "Terrassen": {
        "description": "Compass Group-restaurang vid Saab i Tannefors. Dagens rätt, dagens soppa och \"Snabbt & Gott\" i olika prislägen.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Ensbov%C3%A4gen+3%2C+582+54+Link%C3%B6ping",
        "latitude": 58.4024082,
        "longitude": 15.6613493,
        "website": "https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/terrassen/",
        "area": "Tannefors",
        "lunch_hours": "Mån–fre 11.00–13.30"
    },
    "Krubbstugan": {
        "description": "Restaurang och catering på Gelbgjutaregatan. Dagens rätter och veckans special växlar, medan raggmunken och de bruna bönorna alltid finns kvar.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Gelbgjutaregatan+2%2C+581+87+Link%C3%B6ping",
        "latitude": 58.4064633,
        "longitude": 15.6509863,
        "website": "https://krubbstugan.se",
        "area": "Tannefors",
        "lunch_hours": "Mån–fre 11.00–14.00"
    },
    "Pegs & Tails": {
        "description": "Krog vid Campus Valla. En dagens rätt per veckodag, och dessutom veckans fisk, veckans green och ett par rätter som står kvar hela veckan.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Pegs+%26+Tails%2C+Universitetsv%C3%A4gen+8%2C+583+30+Link%C3%B6ping",
        "latitude": 58.4014320,
        "longitude": 15.5705894,
        "website": "https://www.pegsandtails.se",
        "area": "Mjärdevi",
        "lunch_hours": "Vardagar 11.30–14.00"
    },
    "Pinocchio": {
        "description": "Restaurang och pizzeria i Lambohov, strax söder om Mjärdevi. Två rätter om dagen på lunchmenyn, som byts varje vecka.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Pinocchio+Rest.+%26+Pizzeria%2C+Tr%C3%B6skaregatan+29%2C+583+33+Link%C3%B6ping",
        # Tröskaregatan 29, uppgiven av användaren och bekräftad mot Googles
        # egen platsuppgift. OpenStreetMap sa nummer 33, vilket var fel.
        "latitude": 58.3880316,
        "longitude": 15.5655798,
        "website": "https://pinoccio.se",
        "area": "Mjärdevi"
    },
    "La Fontana": {
        "description": "Italienskt i Mjärdevi med lunchbuffé varje vardag. Onsdag och fredag tänder de grillen, och det finns dagens pizza hela veckan.",
        "maps": "https://www.google.com/maps/search/?api=1&query=La+Fontana%2C+Teknikringen+7%2C+583+30+Link%C3%B6ping",
        "latitude": 58.3938460,
        "longitude": 15.5612025,
        "website": "http://lafontanamjardevi.se",
        "area": "Mjärdevi",
        "lunch_hours": "Mån–fre 11.00–14.00"
    },
    "Restaurang Husman": {
        "description": "Husmanskost på Teknikringen med två dagsrätter, plus pasta eller wok, vegetariskt och en sallad. Grillen står framme hela veckan med hamburgar- och kebabtallrikar.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Restaurang+Husman%2C+Teknikringen+8%2C+583+30+Link%C3%B6ping",
        "latitude": 58.3948533,
        "longitude": 15.5614184,
        "website": "https://restauranghusman.se",
        "area": "Mjärdevi",
        "lunch_hours": "Mån–fre 11.00–14.00"
    },
    "Chili & Lime": {
        "description": "Husmanskost och asiatisk buffé i Mjärdevi Center. Två dagsrätter att välja mellan, och varje dag dessutom poke bowl, vegetariskt och något från grillen.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Chili+%26+Lime%2C+Teknikringen+10%2C+583+30+Link%C3%B6ping",
        # Teknikringen 10 enligt deras egen sida, bekräftat i OpenStreetMap.
        "latitude": 58.3941110,
        "longitude": 15.5589143,
        "website": "http://www.chili-lime.se",
        "area": "Mjärdevi"
    },
    "Brödernas kök": {
        "description": "Bowls och sallader på Teknikringen. En dagens bowl per veckodag, och en säsongsmeny som står kvar hela veckan. Plocksallad från buffén går också att sätta ihop själv.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Br%C3%B6dernas+K%C3%B6k%2C+Teknikringen+10%2C+583+30+Link%C3%B6ping",
        # Teknikringen 10 enligt deras egen sida, bekräftat i OpenStreetMap.
        "latitude": 58.3942950,
        "longitude": 15.5592605,
        "website": "https://www.brodernaskok.se",
        "area": "Mjärdevi",
        "lunch_hours": "Mån–fre 11.00–13.30"
    },
    "Stångs Mjärdevi": {
        "description": "Klimatsmart restaurang i Collegium på Teknikringen, med närodlade råvaror. Dagens rätt och dagens grönt varje dag, plus veckans sallad och dessert. Tio procent rabatt före 11.30 och efter 13.00.",
        "maps": "https://www.google.com/maps/search/?api=1&query=St%C3%A5ngs+Mj%C3%A4rdevi%2C+Teknikringen+7%2C+583+30+Link%C3%B6ping",
        # Ur kartlänken på deras egen sida.
        "latitude": 58.3935717,
        "longitude": 15.5585668,
        "website": "https://stangsmjardevi.se",
        "instagram": "https://www.instagram.com/stangsmjardevi/",
        "area": "Mjärdevi",
        "lunch_hours": "Mån–fre 11.00–14.00"
    },
    "Universitetsklubben": {
        "description": "Campusrestaurang i huset Vallfarten på Linköpings universitet, med två matsalar. Två rätter om dagen, ofta en vegetarisk.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Universitetsklubben%2C+Vallfarten%2C+Campus+Valla%2C+Link%C3%B6ping",
        # Vallfarten enligt OpenStreetMap — huset restaurangen själv uppger.
        "latitude": 58.3972517,
        "longitude": 15.5723987,
        "website": "https://www.nordrest.se/restaurang/universitetsklubben/",
        "area": "Mjärdevi",
        "lunch_hours": "Mån–fre 11.30–13.30"
    },
    "Jasons Matstuga": {
        "description": "Jason växte upp i Mjölby, började i restaurangbranschen i Linköping och kom tillbaka efter tjugo år utomlands. Här möter svensk husmanskost en asiatisk buffé, och båda ingår i lunchen.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Jasons+Matstuga%2C+Torvingegatan+16%2C+582+78+Link%C3%B6ping",
        # Torvingegatan 16, slaget i OpenStreetMap. Kvarteret heter Kallerstad
        # där, men ligger vägg i vägg med Tannefors och hör till samma
        # lunchområde som Skyline och Terrassen.
        "latitude": 58.4173106,
        "longitude": 15.6723059,
        "website": "https://www.jasonmatstuga.com",
        "area": "Tannefors",
        "lunch_hours": "Mån–fre 11.00–14.00"
    },
    "Skyline": {
        "description": "Café, bar och bricklunch en trappa upp i terminalen på Linköping City Airport, med matsvinnet som uttalad hjärtefråga. Menyn läggs ut en dag i taget, så här syns bara dagens rätter.",
        "maps": "https://www.google.com/maps/search/?api=1&query=Link%C3%B6pings+flygplats%2C+582+54+Link%C3%B6ping",
        "latitude": 58.4075379,
        "longitude": 15.6580456,
        "website": "http://restaurangskyline.se",
        "area": "Tannefors",
        "lunch_hours": "Vardagar 11.00–13.00",
        # Sidan visar en enda dag, den som är idag. Övriga vardagar går inte
        # att hämta i förväg, och frontenden skriver då en annan tomrad än
        # den vanliga "ingen meny idag" — det här är inte ett fel.
        "daily_menu_only": True
    },
}
