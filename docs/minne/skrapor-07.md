# Importerad kunskap: Beroenden — den viktigaste regeln i filen

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 266–283. Nya lärdomar hör i ämnesfilerna.

## Beroenden — den viktigaste regeln i filen

**Skrapan får bara använda `requests`, `beautifulsoup4` och `lxml`.**

Workflowet kör `pip install requests beautifulsoup4 lxml` och inget annat. Ett
import av något utanför den listan får skrapan att krascha i Actions medan den
fungerar perfekt på din maskin.

Det gäller **den färdiga skrapan**. Vid utvecklingen får du använda vad du vill
— se spaningsverktyget nedan. Håll isär de två, för det är precis där det går
fel: en selektor du läst ur en JS-renderad DOM finns inte i den HTML `requests`
får, och skrapan blir tyst trasig i produktion.

**`playwright_scraper.py` är en fälla, inte ett verktyg.** Den ligger kvar i
repot, ingen skrapa använder den, och en skrapa som ärver den får `None` från
`get_page_content_js()` i Actions eftersom playwright inte är installerat där.
Ärv `BaseScraper`.


<!-- Slut på importerade källblock. -->
