# Importerad kunskap: Selektorer som ser stabila ut och inte är det

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 457–481. Nya lärdomar hör i ämnesfilerna.

## Selektorer som ser stabila ut och inte är det

Två mönster går att känna igen på håll, och båda ger en skrapa som fungerar
idag och tystnar utan förvarning:

- **`data-v-…` på varje element** är Vue/Nuxt scopade CSS. Hashen byts när de
  bygger om frontenden. Använd komponentens eget klassnamn i stället — se
  `saab_arena_scraper.py`, som ankrar på `html-render-container` och
  väljer rätt block genom att räkna veckodagar i det.
- **Numrerade klasser i WordPress-teman**, som Divis `et_pb_text_2_tb_body`,
  räknar moduler i sidordning och flyttar sig när någon lägger till en modul
  ovanför. Leta efter ett handskrivet `id` i stället — Östgöta Köks meny står
  i `<div id="menyblock">`, och det är sidans enda fasta punkt.

Regeln bakom båda: fäst i något en **människa** har skrivit, inte i något en
byggare har genererat.

Har Divi-sidan varken `id` eller rubrikklasser finns en tredje väg:
**avgränsa ett intervall med två rubriker någon skrivit själv** och tolka
dokumentordningen där emellan. Divi lägger varje rubrik och varje stycke i sin
egen `div.et_pb_text_inner`, så rätten och dess beskrivning är **syskon** och
inte nästlade — det finns ingen behållare per rätt att greppa. Rubriktexten
("Vår menu", "Du hittar oss på") är det enda i markupen en människa bestämt.
Se `sukaldari_scraper.py`.


<!-- Slut på importerade källblock. -->
