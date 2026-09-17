# Importerad kunskap: Stående menyer (steg 3)

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 193–265. Nya lärdomar hör i ämnesfilerna.

## Stående menyer (steg 3)

`StaticMenuScraper` läser en JSON ur `app/scrapers/data/` i konstruktorn och
lägger den på `self.menu_data`. `mimolett.json` är förlagan:

```json
{
  "source": "https://mimolett.kvartersmenyn.se",
  "captured": "2026-08-05",
  "kalla_hash": "sha256:…",
  "price": "129 kr",
  "note": "Vi har glutenfri pasta, fullkornspasta och olika rätter enligt LCHF",
  "categories": [
    {"category": "KÖTT & FISK", "dishes": [{"name": "…", "description": "…"}]}
  ]
}
```

- `source` — var menyn lästes. Alltid med, annars går den inte att läsa om.
- `captured` — dagen den lästes, ISO-format.
- `kalla_hash` — sha256 av källan som den såg ut då (bildens bytes, PDF:ens
  text, eller HTML-blocket menyn stod i). Hubbens kontroll hämtar om källan och
  jämför, så att en meny som ändras upptäcks i stället för att ruttna.
  `spana.py` skriver ut hashen för varje bilaga den laddar ner.

`kalla_hash` krävs för **nya** stående menyer. `mimolett.json` skrevs innan
fältet fanns och saknar det än — kontrollen hoppar tyst över den, så den bevakas
inte. Läser du om den: lägg till fältet samtidigt.

Och eftersom kontrollen läser **main**, är det main:s version av filen som avgör
om menyn är bevakad — inte den du har framför dig. En hash du just lagt till på
Dev bevakar ingenting förrän Henrik tryckt på knappen. Vill du veta vad
kontrollen faktiskt tittar på, fråga main och inte arbetsträdet:

```bash
git show origin/main:app/scrapers/data/<fil>.json | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('captured'), d.get('kalla_hash'))"
```

Uppmätt 2026-09-03: båda filerna i `data/` saknade `kalla_hash` på main —
Masalas hash fanns bara i den osläppta commiten — så inget stående meny-larm
kunde komma därifrån över huvud taget.

Är källan **flera** filer räcker inte ett fält. `masala_lunch_all_weeks.json`
har därför en `kalla_hash` per vecka — sha256 över just den veckans bildfiler,
i den ordning de står i `weeks[...].source` — och en på toppnivån som är sha256
över de fyra veckohasharnas hex-strängar i ordning. Receptet står i filens eget
`kalla_hash_metod`, för att den som räknar om hashen inte ska behöva gissa.
Hasha inte lunchsidans HTML i ett sådant fall: den byter bild varje vecka när
fliken roterar, och då larmar kontrollen på en meny som inte ändrats.

Skriv av **exakt** vad som står. Översätt inte, snygga inte till, fyll inte i
luckor, och skriv inte om en engelsk beskrivning till svenska — det är
restaurangens egna ord.

`mimolett_scraper.py` visar mönstret ett steg längre: den försöker hämta live
först och faller tillbaka på den sparade menyn, och loggar ett fel när den
sparade blivit äldre än `STALE_AFTER_DAYS`. Gör så när källan går att nå ibland.

### När kortet kommer från hubbens kontroll

"Källan ser inte längre ut som när menyn lästes" betyder att det är en sådan
här fil som ska läsas om — ingen ny restaurang. Hämta källan igen, läs den med
egna ögon (är det en bild eller PDF: ladda ner den), och skriv av det som
ändrats. Uppdatera **både** `captured` och `kalla_hash`, annars larmar
kontrollen igen i morgon.

Har källan ändrats därför att restaurangen byter meny **varje vecka** är menyn
inte stående, och en statisk JSON är fel lösning från början. Lappa den inte en
gång till — säg det i rapporten i stället, och beskriv vad du såg. Att uppdatera
filen varje vecka döljer problemet, och emellan gångerna står det fel mat på
sajten.


<!-- Slut på importerade källblock. -->
