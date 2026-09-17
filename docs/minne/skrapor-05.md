# Importerad kunskap: Kolla plattformarna först

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 178–192. Nya lärdomar hör i ämnesfilerna.

## Kolla plattformarna först

Många restauranger publicerar via en plattform vi redan kan. Då är skrapan tio
rader i stället för hundra:

| Bas | Känns igen på |
|---|---|
| `mashie_scraper.py` | `matildaplatform.com` i en iframe — vanligt hos Compass Group |
| `compass_group_scraper.py` | Compass Groups egna restaurangsidor |
| `menydags_scraper.py` | `menydags.se/restaurang/<slug>/lunch` — flera på Lindholmen |
| `static_menu_scraper.py` | stående meny sparad som JSON (steg 3) |

De tre första tar `restaurant_info` plus något plattformsspecifikt (en URL,
en slug, en lista stationer) och gör resten själva.


<!-- Slut på importerade källblock. -->
