# Importerad kunskap: Att lägga till en restaurang är tre filer

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 36–75. Nya lärdomar hör i ämnesfilerna.

## Att lägga till en restaurang är tre filer

| Fil | Vad du gör |
|---|---|
| `app/scrapers/restaurants/<namn>_scraper.py` | ny skrapa |
| `app/restaurant_data.py` | ett uppslag i `restaurant_locations` |
| `scripts/scrape_menus.py` | en `import` och en rad i listan i `scrape_all_menus()` |

`git show 21b09fd` (La Fontana) är hela arbetet i en commit — härma den.

Uppslaget i `restaurant_data.py`:

```python
"La Fontana": {
    "description": "Italienskt i Mjärdevi med lunchbuffé varje vardag. …",
    "maps": "https://www.google.com/maps/search/?api=1&query=La+Fontana%2C+…",
    "latitude": 58.3938460,
    "longitude": 15.5612025,
    "website": "http://lafontanamjardevi.se",
    "area": "Mjärdevi",
    "lunch_hours": "Mån–fre 11.00–14.00"
},
```

`instagram` är valfritt. Koordinaterna slår du upp i OpenStreetMap — de
används för avståndssorteringen och ska peka på entrén, inte på kvarteret.

**Nyckeln här måste vara exakt samma sträng som skrapans `name`.** Menyerna
läggs upp under `scraper.name`, och `build_restaurants_response()` slår sedan
upp metadatan på den strängen. Stämmer de inte hamnar restaurangen på sajten
med `area: "Unknown"`, utan beskrivning och utan nål på kartan — och den räknas
inte in i något område. Ingenting går sönder, det syns bara på fel ställe.
Byter du visningsnamn: byt på båda ställena i samma commit, och kör
`scrape_menus.py` och kontrollera att inget står som `Unknown`.

`area` måste finnas i `LOCATIONS` högst upp i samma fil. Idag finns
**Lindholmen** (Göteborg), **Tannefors** och **Mjärdevi** (Linköping). Ett nytt
område kräver ett uppslag där också, annars hoppas restaurangen tyst över i
`build_locations_response()`.


<!-- Slut på importerade källblock. -->
