# luns.se — repots karta

Sajten visar dagens lunch för ett trettiotal restauranger i Linköping och
Göteborg. Python skrapar menyerna, Next.js visar dem, GitHub Actions kör
alltihop och publicerar till GitHub Pages. Ingen server, ingen databas.

Du äger repot, inte bara skraporna. Ett arbete här kan vara en ny restaurang,
men lika gärna en sida som ser fel ut, en text som ska skrivas om, en bugg i
filtreringen eller något i byggkedjan. Den här filen är hela repot i korthet.

Håll den uppdaterad. Lär du dig något som hade sparat dig tid: skriv in det och
committa. Det är en del av uppdraget.

## De två halvorna

| | Vad | Var |
|---|---|---|
| **Menyerna** | ett trettiotal Python-skrapor som skriver JSON | `app/scrapers/`, `app/restaurant_data.py`, `scripts/scrape_menus.py` |
| **Sajten** | Next.js 15, React 18, Tailwind, statisk export | `nextjs-luns-se/src/app/` |

Kedjan i sin helhet, och den är kort:

```
python scripts/scrape_menus.py     ->  nextjs-luns-se/public/data/menus.json
                                       nextjs-luns-se/public/data/restaurants.json
python scripts/fetch_stats.py      ->  nextjs-luns-se/public/data/stats.json
cd nextjs-luns-se && npm ci && npm run build   ->  out/
```

Sajten exporteras statiskt (`output: 'export'`) och hämtar JSON-filerna i
webbläsaren, se `src/app/lib/menu.ts`. Datan och sajten är alltså skilda saker,
och det är första frågan när något ser fel ut: **står rätten i `menus.json`?**
Gör den det är det ett sajtfel, annars ett skrapfel. Filen är omslagen —
raderna ligger under `["menus"][namn]`, inte direkt på namnet.

### Sajten, en trappa ner

| Fil | Vad den gör |
|---|---|
| `src/app/page.tsx` | tavlan: laddar datan, håller filter och urval |
| `src/app/components/board/` | delarna — listan, raden, kartan, platsväljaren, rutorna |
| `src/app/lib/menu.ts` | hämtar och tolkar `menus.json` + `restaurants.json` |
| `src/app/lib/filters.ts` | filtren och sökningen |
| `src/app/lib/stats.ts` | besöksstatistiken, hämtas först när rutan öppnas |
| `src/app/hooks/` | favoriter, plats, tema, väder, rundturen |

Besöksstatistiken hämtas från Umami **vid bygget** (`scripts/fetch_stats.py`),
inte i besökarens webbläsare. Sajten anropar därför ingen analystjänst när
någon öppnar den, och ingen nyckel når ut. Behåll den ordningen.

## Ska du röra en skrapa?

Då gäller `app/scrapers/CLAUDE.md`: källtypsbeslutet, kontraktet för `scrape()`,
fellägena, de tysta felen, stående menyer och spaningsverktyget. Läs den innan
du skriver kod. Handlar arbetet om något annat behöver du den inte.

Den enda regeln därifrån som är värd att kunna även annars: **produktionen har
bara `requests`, `beautifulsoup4` och `lxml`.** Playwright finns på dev01 för
att man ska kunna *titta* på en sida, aldrig för att den färdiga skrapan ska
använda det. En skrapa som ändå gör det fungerar lokalt, ger tomt i Actions,
och sajten visar gårdagens meny för alltid utan att något ser trasigt ut.

## Grenen är Dev

Börja varje arbete med:

```bash
git fetch origin Dev && git checkout Dev && git pull
```

Committa och pusha dit. `main` är det som är publicerat, och dit går arbetet
när **Henrik** släpper det — han har en knapp i hubben som slår ihop Dev med
main. Gör det aldrig själv, och committa aldrig direkt på main.

## Testservern — sista steget innan du lämnar över

`scripts/testserver.sh` kör hela produktionskedjan och servar utfallet på
**<http://10.0.1.34:3002/>** (dev01). Det är där Henrik tittar på ditt jobb
innan han slår ihop Dev med main, och därför är **inget kort klart förrän
servern kör och adressen står i rapporten**.

```bash
scripts/testserver.sh                 # skrapa, bygg, (om)starta servern
scripts/testserver.sh --utan-skrap    # bygg bara om frontenden
scripts/testserver.sh status          # kör den, och vad visar den?
scripts/testserver.sh stopp
```

Den ersätter `scrape_menus.py` + `npm run build` som du körde för hand: samma
kommandon i samma ordning, plus tre saker de inte gjorde.

**Den kör i ett venv utan playwright.** `.venv-prod` byggs ur
`requirements.txt` och speglar det workflowet installerar. Har din skrapa råkat
importera playwright faller den *här*, direkt, i stället för tyst i Actions tre
dagar senare. Det är den enda platsen den fällan faktiskt fångas.

**Den sammanfattar skrapningen** med `scripts/menylage.py`: rätter per veckodag,
en rad per restaurang, med de två felsträngarna utskrivna som fel. Läs tabellen
— det är där du ser att din restaurang fick mat på fem dagar och inte allt på
måndag. Vill du jämföra före och efter din ändring: kopiera undan
`nextjs-luns-se/public/data/menus.json` innan du kör, och kör `menylage.py` mot
kopian efteråt.

**Den märker sidan** med ett gult band överst — gren, commit, byggtid, och om
arbetsträdet har okommittade ändringar. Bandet är ett CSS-pseudoelement på
`html` och injiceras i `out/`, som är gitignorerad. Det kan alltså varken följa
med en commit eller hamna på den riktiga sajten. En `<div>` gick inte: React
hydrerar hela dokumentet och rensar bort noder den inte känner igen, så bandet
försvann efter en sekund och sidan såg skarp ut precis när man började läsa den.

Går något fel avbryter skriptet och rör **inte** den körande servern. En gammal
version uppe är bättre än en trasig sida, och bandet visar när den byggdes.

Låt servern stå kvar när du är klar — Henrik ska kunna titta i morgon bitti utan
att starta något. Nästa kort bygger om och startar om den. Efter en omstart av
dev01 är den borta, med flit: en gammal sajt utan avsändare är sämre än ingen.

**Den bygger med rensad miljö**, och det är inte kosmetik. Kör du skriptet ur
ett skal som ärvts från en `next start` — eller ur en agent som startats där —
följer `NEXT_*`, `__NEXT_*` och `TURBOPACK=1` med hela vägen in i bygget.
`TURBOPACK=1` tvingar turbopack-bygge, och turbopack spricker med
`output: 'export'` på Nexts inbyggda felsidor:

    Error: <Html> should not be imported outside of pages/_document.
    Error occurred prerendering page "/404"

Kompileringen går igenom först, så felet ser ut att sitta i sidkoden — det gör
det inte, ingen fil i repot importerar `next/document`. `NODE_ENV=production`
ur samma arv ger i stället `npm ci` utan devDependencies och ett bygge som
faller på `Cannot find module 'tailwindcss'`. Actions ser ingetdera, eftersom
det startar i ett tomt skal. Skriptet rensar därför båda innan bygget. Bygger
du för hand med `npm run build`: kolla `env | grep -E 'TURBOPACK|NODE_ENV'`
innan du felsöker något annat. Node-versionen har inget med saken att göra.

Två saker som ser ut som fel och inte är det: sidan frågar efter område första
gången (välj Lindholmen eller Mjärdevi, annars står det "0 rätter"), och
`stats.json` ger 404 lokalt eftersom besöksstatistiken bara hämtas i Actions.

Kontrollera i webbläsaren att restaurangen dyker upp under rätt område. Att den
står under fel område, eller som `Unknown`, syns inte i skrapans utdata.

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
## Hårda regler

- **Hitta aldrig på en rätt**, och gissa aldrig fram en meny. Sajten är till för
  att välja lunch efter. Kan du inte läsa menyn: säg det.
- **Ändra inte `.github/workflows/`** utan att Henrik bett om det. En trasig
  workflow stoppar alla menyer, inte bara det du arbetar med.
- **Committa aldrig** `.venv`, `.venv-prod`, spaningsutdata, nedladdade bilder
  eller något med nycklar i. Kolla med `git status` vad som kommer med innan du
  kör `add -A`.
- **Rör ingenting utanför det här repot.** Hubben, StockTracker och servrarnas
  konfiguration är någon annans bord.

Är du osäker på om något faller under reglerna: gör det inte, och fråga.

## Stil

Svenska kommentarer som förklarar **varför**, inte vad — i Python och i
TypeScript lika mycket. Nästa person som står inför att något slutat fungera ska
slippa göra om utredningen. Det gäller särskilt sådant som ser konstigt ut och
är uppmätt: ett klockslag, en selektor på `data-kind`, ett fallback-läge.
