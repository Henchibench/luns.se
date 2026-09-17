# Importerad kunskap: Ska du röra en skrapa?

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/repo-2026-09-17.md, rader 94–105. Nya lärdomar hör i ämnesfilerna.

## Ska du röra en skrapa?

Då gäller `app/scrapers/CLAUDE.md`: källtypsbeslutet, kontraktet för `scrape()`,
fellägena, de tysta felen, stående menyer och spaningsverktyget. Läs den innan
du skriver kod. Handlar arbetet om något annat behöver du den inte.

Den enda regeln därifrån som är värd att kunna även annars: **produktionen har
bara `requests`, `beautifulsoup4` och `lxml`.** Playwright finns på dev01 för
att man ska kunna *titta* på en sida, aldrig för att den färdiga skrapan ska
använda det. En skrapa som ändå gör det fungerar lokalt, ger tomt i Actions,
och sajten visar gårdagens meny för alltid utan att något ser trasigt ut.


<!-- Slut på importerade källblock. -->
