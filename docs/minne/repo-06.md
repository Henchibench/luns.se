# Importerad kunskap: Körningen i produktion

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/repo-2026-09-17.md, rader 244–261. Nya lärdomar hör i ämnesfilerna.

## Körningen i produktion

`.github/workflows/scrape-and-deploy.yml`, vardagar 03:00 UTC och dessutom
05:00 på måndagar. Måndagen får två därför att veckans menyer läggs ut då, och
en del gör det sent. Övriga dagar räcker en, eftersom Skyline aldrig har mer än
dagens lunch uppe och de andra publicerar veckan i förväg.

Klockslaget ser orimligt tidigt ut och är satt med flit: GitHub startar inte
schemalagda körningar på utsatt tid utan när det finns kapacitet, och för det
här repot har förseningen legat på två till två och en halv timme. 03:00 UTC
landar därför omkring sjutiden svensk tid.

Extra körningar kan bara göra datan bättre: en skrapa som fallerar behåller
förra körningens meny.

**En merge till main publicerar ingenting av sig själv.** Workflowet har ingen
push-trigger, bara schema och manuell start. Kod som ligger på main syns på
sajten först vid nästa körning.

<!-- Slut på importerade källblock. -->
