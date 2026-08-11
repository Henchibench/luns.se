# luns.se — vad den som skriver en skrapa behöver veta

Sajten visar dagens lunch för ett antal restauranger i Linköping och Göteborg.
Python skrapar menyerna, Next.js visar dem, GitHub Actions kör alltihop och
publicerar till GitHub Pages. Ingen server, ingen databas.

Den här filen är till för att lägga till en restaurang utan att först läsa hela
repot. Håll den uppdaterad — lär du dig något som hade sparat dig tid, skriv in
det och committa.

## Först av allt: vad slags menykälla är det?

Det här är det första beslutet och det avgör allt annat. Skriv ingen kod förrän
du vet svaret. Ta det första steget som stämmer:

| | Källa | Vad du gör |
|---|---|---|
| **1** | Menytexten finns i sidans HTML | vanlig skrapa mot sidan |
| **2** | Menyn byggs av JavaScript | hitta JSON-endpointen bakom sidan och skrapa den |
| **3** | Menyn är **stående** — bild, PDF eller HTML som inte byts | läs den en gång, spara som JSON, ärv `StaticMenuScraper` |
| **4** | Menyn är en **bild eller PDF som byts varje vecka** | bygg ingenting, rapportera |

Skillnaden mellan 1 och 2 avgörs enklast med `scripts/spana.py` (se nedan), som
lägger sidans råa HTML och den JS-renderade DOM:en bredvid varandra.

Steg 4 är det enda vi inte kan lösa idag: det skulle kräva OCR vid varje
körning i Actions, och det är inte byggt. Rapportera i stället hur bilden ser
ut, hur ofta den byts och om den ligger bakom inloggning. Det är ett fullgott
svar.

**Bygg aldrig en statisk meny (steg 3) av en meny som faktiskt byts.** Den ser
rätt ut idag och är fel på tisdag, och till skillnad från en trasig skrapa
märks det inte — inget går sönder, det står bara fel mat på sajten. Är du
osäker: säg att du är osäker.

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

## Kontraktet: `scrape()`

Ärv `BaseScraper` och implementera en metod. Konstruktorn tar inga argument —
skrapan bär sin egen `restaurant_info`:

```python
class LaFontanaScraper(BaseScraper):
    def __init__(self):
        super().__init__({
            'name': 'La Fontana',
            'website': 'http://lafontanamjardevi.se',
            'menu_url': 'http://lafontanamjardevi.se/dagens-lunch/',
        })

    def scrape(self) -> Dict[str, List[str]]:
        ...
```

Returen är `{self.name: [rader]}`. Varje rad är en sträng i ett av två format:

```
Måndag|<strong>Kategori</strong> - Rätten och dess beskrivning
INFO:Måndag - Restaurant Info: 💰 149 kr · Utan dryck 139:-
```

Veckodagarna är `Måndag Tisdag Onsdag Torsdag Fredag`, alltid med versal.
`INFO:`-raden är valfri och läggs en gång per dag som har rätter.

Är menyn fast och inte veckovis: lägg samma rätter på alla vardagar. Se
`bistro3_scraper.py`.

### Fellägena är en del av kontraktet

Två strängar är signaler, inte text:

```python
return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}   # hämtningen sprack
return {self.name: ["Ingen lunchmeny tillgänglig"]}             # sidan svarade, men ingen meny fanns
```

`scrape_menus.py` känner igen dem och behåller **förra körningens meny** från
den publicerade `menus.json` i stället. Det betyder att en skrapa som går
sönder inte tömmer sajten — men också att den blir tyst. Logga alltid med
`self.log_error()` när du returnerar dem.

Kasta gärna undantag också; runnern fångar dem och gör samma sak.

**Hitta aldrig på en rätt.** Kan du inte läsa menyn, returnera fellägena. Det
här är en sajt folk väljer lunch efter.

### Det tystaste felet: en rätt som hamnar i fel rad

Fellägena ovan fångar att hämtningen sprack. De fångar inte att skrapan läste
sidan, fick med all text, och lade en rätt på fel ställe. Då är rätten kvar i
`menus.json` men osynlig för den som läser — ingen loggrad, inget larm.

Källan är nästan alltid att någon skriver menyn för hand i en WordPress. Bygg
därför aldrig igenkänningen på att texten är **snyggt formaterad**:

- Kräv inte att ett stycke *börjar* med sin rubrik. Rubriken kan stå mitt i
  stycket, och då hamnar rätten efter den under föregående kategori. Det var
  precis det som hände Kooperativet 2026-08-10 — se klassdocstringen i
  `kooperativet_scraper.py`, den beskriver mönstret och lösningen.
- Lita inte på `<strong>`. De glömmer fetstilen lika gärna som
  styckebrytningen. Ha en lista med kända kategorinamn som funkar på egen hand.
- Men lita inte bara på listan heller: en ny kategori som inte står där går
  annars förlorad. Ta rubrikkandidater från **båda** hållen.
- Matcha kategorinamn versalkänsligt och på hela ord. Rubriker skrivs i
  VERSALER medan "kött" och "fisk" står i var tredje rättsbeskrivning, och
  ordkravet är det som skiljer `VEG Taco Bowl` från kategorin `VEGETARISK`.

Kontrollen som avslöjar det: **räkna rätterna per dag före och efter** din
ändring och diffa raderna. En dag som tappar en rad, eller en rad som blivit
misstänkt lång, är en hopklistrad rätt.

### Och det näst tystaste: en kategori du hittat på

Kategorin är inte dekoration. `VEGETARISK` framför en rätt är ett påstående om
maten, och den som läser sajten kan ha ett skäl att lita på det.

Sätt därför bara en kategori du kan **peka på i källan** — en rubrik, en
etikett, restaurangens egna ord. Att härleda den ur *ordningen* på raderna är
alltid fel, hur konsekvent mönstret än ser ut den vecka du mäter. Östgöta Kök
skriver "ny vegetarisk och ny animalisk rätt varje dag" och lade den
vegetariska först alla fem dagarna 2026-08-10 — men de har aldrig lovat
ordningen, och dagen de byter står det fel utan att något går sönder.

Saknas rubrik finns två ärliga utvägar: `Dagens`, eller rättens eget namn
(`ostgota_kok_scraper.py` delar raden vid snedstrecket som restaurangen själv
skiljer rätt från tillbehör med). Blir den delningen fel är det en kosmetisk
gräns — inte en osann uppgift om mat.

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

`kalla_hash` krävs för **nya** stående menyer. `mimolett.json` och
`masala_lunch_all_weeks.json` skrevs innan fältet fanns och saknar det —
kontrollen hoppar tyst över dem, så de bevakas inte. Läser du om någon av dem:
lägg till fältet samtidigt.

Skriv av **exakt** vad som står. Översätt inte, snygga inte till, fyll inte i
luckor, och skriv inte om en engelsk beskrivning till svenska — det är
restaurangens egna ord.

`mimolett_scraper.py` visar mönstret ett steg längre: den försöker hämta live
först och faller tillbaka på den sparade menyn, och loggar ett fel när den
sparade blivit äldre än `STALE_AFTER_DAYS`. Gör så när källan går att nå ibland.

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

## `BaseScraper` gör redan det jobbiga

Använd `self.get_page_content(url=None)`. Den sköter

- retry med backoff på 500/502/503/504,
- IPv4-tvång (Actions-runners får annars slumpmässiga timeouts på IPv6),
- teckenkodning — utan `charset` i svaret gissar `requests` fel och å ä ö blir
  Ã¥ Ã¤ Ã¶, så bytesen skickas till BeautifulSoup i stället,
- rensning av innehåll som är dolt på samtliga brytpunkter, se nedan.

Gör aldrig ett eget `requests.get`. Du får tillbaka alla fyra problemen.

`self.clean_text()` normaliserar blanksteg. `log_info/log_warning/log_error`
prefixar med restaurangnamnet.

### Dolt på alla brytpunkter är innehåll som inte finns

En skrapa läser rå HTML och ser därför ingen skillnad på det som visas och det
som är avstängt. Elementor är vanligt bland restaurangsidorna, och det de
stänger av blir liggande kvar i markupen. Pegs & Tails hade fem rubriker kvar
som ingen besökare kan se — "Dagens drive", "Veckans fisk", "Veckans green" —
och skrapan byggde kategorier av dem. Nästa gång kan det vara hela förra årets
meny, och då serverar vi den utan att något går sönder.

`remove_always_hidden()` i `BaseScraper` tar därför bort element som bär
**alla** brytpunktsklasserna samtidigt:

```
elementor-hidden-desktop  elementor-hidden-laptop
elementor-hidden-tablet   elementor-hidden-mobile
```

Alla fyra betyder att ingen skärmbredd återstår där blocket kan visas.

**Skillnaden mot responsivt dolt är hela poängen.** Bär blocket bara några av
klasserna visas det för någon — ofta är det just mobilvarianten som bär hela
menytexten. Pegs & Tails har 38 block med `elementor-hidden-*`; bara sex är
döda. Vidga aldrig regeln till "har någon hidden-klass".

Av samma skäl rör rensningen **inte** vanlig `display:none`. Menysidor bygger
dragspel och flikar där dagarna ligger dolda tills man klickar, och den som
rensar dem raderar menyer. Regeln gäller bara det vi kan bevisa ur markupen
ensam. Kan du inte bevisa att något aldrig kan visas: låt det vara.

Utvidgar du regeln: kör hela `scrape_menus.py` före och efter och diffa
`menus.json` per restaurang och dag. Ändringen sitter i basklassen och slår
tyst mot alla restauranger på en gång.

## Spaning: `scripts/spana.py`

Utvecklingsverktyg, körs bara för hand. Kräver `requirements-dev.txt`
(playwright) och en engångs `playwright install chromium`.

```
python scripts/spana.py https://exempel.se/lunch
```

Skriver till en katalog och sammanfattar på stdout:

| Fil | Vad den är bra för |
|---|---|
| `ra.html` | vad `requests` får — **här måste menyn finnas** för att steg 1 ska gå |
| `renderad.html` | DOM:en efter att JS kört — var menyn *ser ut* att ligga |
| `natverk.jsonl` | varje XHR/fetch med URL, status och början av kroppen — här hittar du endpointen för steg 2 |
| `sida.png` | helsidesskärmbild |
| `bilagor/` | nedladdade menybilder och PDF:er, med `pdftotext`-utdata bredvid |

Skriptet säger själv om menytexten fanns i `ra.html` eller bara i
`renderad.html`.

Det är en utgångspunkt, inte en bur. Ligger menyn bakom en flik, en veckoväljare
eller en cookieruta får du skriva en engångssnutt med playwright som klickar
fram den. Det som räknas är vad som blir kvar i repot.

Spaningsutdata ska aldrig med i en commit.

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

## Vad en skrapa aldrig ska röra

Att lägga till en restaurang är tre filer: skrapan, raden i `scrape_menus.py`
och metadatan i `restaurant_data.py`. Ligger ändringen utanför dem är det
antagligen fel väg.

`.github/`, repots hemligheter och utrullningen står utanför uppdraget. De
ändras för hand, av skäl som har med sajtens drift att göra och inte med en
enskild restaurang.

## Stil

Skraporna är kommenterade på svenska och förklarar **varför**, inte vad. En
klassdocstring beskriver hur sidan är byggd och vilka fällor den har — se
`la_fontana_scraper.py`, `mimolett_scraper.py` och `mashie_scraper.py`. Nästa
person som står inför att sidan slutat fungera ska slippa göra om utredningen.

Väljer du en selektor på `data-kind` i stället för på klassnamn: skriv varför
(byggaren hashar sina CSS-moduler). Det är den sortens anteckning som är värd
plats.

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
