# Importerad kunskap: Så testar du

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 400–434. Nya lärdomar hör i ämnesfilerna.

## Så testar du

Det finns inga tester i repot. Verifieringen är att köra skrapan och titta.

```bash
python -c "
from app.scrapers.restaurants.din_scraper import DinScraper
for rad in DinScraper().scrape()['Ditt Namn']: print(rad)
"
```

Rätter på flera veckodagar är rimligt. Noll rätter, eller hela veckan på en dag,
är det inte.

Vill du kontrollera utfallet i den byggda datan ligger båda filerna under
`nextjs-luns-se/public/data/` — men **de är omslagna**, inte uppslag direkt på
restaurangnamnet. `menus.json` har raderna under `["menus"][namn]` och
`restaurants.json` metadatan under `["restaurants"][namn]`; resten är
`metadata`, `total`, `locations` och `scrape_timestamp`. Slår du upp namnet på
toppnivån får du `None` och tror att skrapan gav noll rätter.

```bash
python -c "
import json
m = json.load(open('nextjs-luns-se/public/data/menus.json'))['menus']
for rad in m['Ditt Namn']: print(rad)
"
```

Det är också där du ser att `area` blev rätt — det syns inte i skrapans utdata.

Sista steget är alltid `scripts/testserver.sh`, som kör samma kedja som Actions
och servar den färdiga sajten. Den beskrivs i `CLAUDE.md` i roten, och den är
den enda platsen där playwright-fällan faktiskt fångas.


<!-- Slut på importerade källblock. -->
