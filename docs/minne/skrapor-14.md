# Importerad kunskap: En foodtruck är inte en restaurang med adress

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 482–494. Nya lärdomar hör i ämnesfilerna.

## En foodtruck är inte en restaurang med adress

Står stället på olika platser olika veckodagar räcker det inte att skrapa
menyn — då måste **platsschemat läsas också**, och menyn läggas bara på de
dagar stället faktiskt står i vårt område. Sukaldari står vid Dataton på
Teknikringen mån–ons och fre, men vid Saab på Ensbovägen på torsdagar.

Det är ett av de tystaste felen som finns: lägger man menyn på alla fem dagar
går någon ut på lunchen till en tom parkering, och ingenting på sajten ser
trasigt ut. Hårdkoda inte dagarna heller — läs dem ur schemat vid varje
körning, och returnera fellägena om schemat inte går att tolka. Då behåller
`scrape_menus.py` de dagar som senast stämde i stället för att gissa.


<!-- Slut på importerade källblock. -->
