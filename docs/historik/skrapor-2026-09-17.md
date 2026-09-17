# Skrapkontraktet — för den som rör en skrapa

Den här filen gäller när arbetet handlar om **menyerna**: en ny restaurang, en
skrapa som slutat fungera, en stående meny som ska läsas om. Rör du bara sajten,
texterna eller byggkedjan behöver du inte den — då räcker `CLAUDE.md` i roten,
som också beskriver testservern och hur arbetet når main.

Håll den uppdaterad. Lär du dig något som hade sparat dig tid: skriv in det här
och committa. Det är en del av uppdraget.

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

- Jämför aldrig en **dagrubrik** med `==`. Sidor märker gärna innevarande dag
  med en badge *inuti* rubriken — Nordrests castit lägger ett andra span med
  texten "Idag" i samma `h3`, så rubriktexten blir "Tisdag Idag". En exakt
  jämförelse missar då alltid precis den dag besökaren är ute efter, medan
  resten av veckan syns och allt ser friskt ut. Universitetsklubben tappade
  dagens meny varje dag av det skälet fram till 2026-08-11. Plocka dagnamnet ur
  det element som bär just dagen, och matcha annars veckodagen som **helt ord**
  i rubriken i stället för på hela strängen.

Kontrollen som avslöjar det: **räkna rätterna per dag före och efter** din
ändring och diffa raderna. En dag som tappar en rad, eller en rad som blivit
misstänkt lång, är en hopklistrad rätt. Att alla dagar utom en har mat är inte
heller normalt — kontrollera den dag som fattas mot sidan innan du släpper.

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

### Att läsa en SVG där texten är kurvor

Masalas menyer är SVG utan en enda textnod — `<path>` hela vägen. Det finns
inget att greppa i, filen måste renderas och läsas med ögonen. Varken
`rsvg-convert`, `inkscape` eller `cairosvg` finns på dev01, så det blir
playwright, och att bara `goto()` filen och ta `screenshot(full_page=True)`
faller: skärmbilden blir aldrig skriven. Lägg SVG:n i en `<img>` i en liten
HTML-fil bredvid, sätt bredden till en multipel av `viewBox`-bredden och
fotografera elementet:

```python
html.write_text(f'<img src="{svg.name}" style="width:{288*3}px;display:block">')
pg.goto(html.as_uri())
pg.locator('img').screenshot(path=out)
```

3× räcker för att läsa rubrikerna, 8–10× för att avgöra enskilda ord. Zooma
alltid in på det som ser ut som ett stavfel innan du "rättar" det: Masala
skriver faktiskt "Famberade linser" och "DAL DHOKLIZ", och de orden ska stå
kvar precis så.

### Masalas fyra menybilder heter inte samma sak

De fyra menyerna byttes ut styckevis. Meny 1 och 4 har det nya namnet
(`lunch-menu4-MK-nov2025-2.svg`), meny 2 och 3 ligger kvar under det gamla
(`lunch2-1.svg`, `lunch3-1.svg`) och finns inte alls i det nya. `MENU_NUMBER`
i `masala_scraper.py` matchar bara det nya namnet, så vartannat varv faller
skrapan tillbaka på veckonummer-aritmetiken utan att något ser fel ut.

Hela uppsättningen syns via WordPress mediabibliotek, vilket är snabbare än att
gissa filnamn:

```
curl -s 'https://masalakitchen.se/wp-json/wp/v2/media?search=lunch&per_page=100&_fields=source_url,modified'
```

`Last-Modified` på bilderna är dessutom det enda hederliga svaret på frågan
"byter de meny varje vecka?". Ligger datumen månader tillbaka är menyn stående,
hur mycket den än skiljer sig från det vi har sparat.

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

## Vad ett skrapkort inte ska svälla ut till

Att lägga till en restaurang är tre filer: skrapan, raden i `scrape_menus.py`
och metadatan i `restaurant_data.py`. Ligger ändringen utanför dem hör den
antagligen till sajten och inte till menyn. Det är ingen förbjuden mark — du
äger repot — men det är ett eget arbete, och ska beskrivas som det i stället
för att åka snålskjuts på ett menykort.

`.github/` och utrullningen ändras bara när Henrik ber om det, av skäl som har
med sajtens drift att göra och inte med en enskild restaurang.

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

Har Divi-sidan varken `id` eller rubrikklasser finns en tredje väg:
**avgränsa ett intervall med två rubriker någon skrivit själv** och tolka
dokumentordningen där emellan. Divi lägger varje rubrik och varje stycke i sin
egen `div.et_pb_text_inner`, så rätten och dess beskrivning är **syskon** och
inte nästlade — det finns ingen behållare per rätt att greppa. Rubriktexten
("Vår menu", "Du hittar oss på") är det enda i markupen en människa bestämt.
Se `sukaldari_scraper.py`.

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

## Vad som faktiskt finns i Mjärdevi

`mjardevi.se/dagens-lunch/` är områdets egen lista och duger som facit när
någon föreslår en restaurang. Per 2026-08-11 täcker luns.se hela den listan.

Vill du bredda: `lunchaimjardevi.com` täcker mer än Mjärdevi och har sina
skrapor öppna på `github.com/popeen/Luncha-I-Mjardevi-Scraper` (PowerShell).
Kontrollerad 2026-08-11 innehöll den nio ställen vi saknade, men bara
Sukaldari och Stångs Matlådor låg i Mjärdevi: Zodiaken var nedlagd (`hors.se`
pekar numera på Nordrest, som inte har den), Ros Bröllop hade blivit ren
eventlokal, Trucken en eventfoodtruck utan dagslunch, Freshmarket hade slagits
ihop med Östgöta Kök som vi redan skrapar, och Torn1, Ellas och Gastromix
ligger i Tornby och Malmslätt. Kontrollera alltid **både** att stället finns
kvar och att det ligger i ett område vi har.

## En kyl på ett kontor är också ett lunchställe

Stångs Matlådor avfärdades först som "en produkt hos en restaurang vi redan
har". Det var fel: kylarna står ute i husen — Stångs kallar dem **Stångs
Express** och installerar dem hos företagen — så för den som sitter i ett hus
med en är det ett eget alternativ, inte ett besök hos Stångs Mjärdevi. Fråga
"kan man äta lunch här utan att gå till restaurangen?" innan du skriver av
något som en produkt.

Sortimentet ligger bara i kassasystemet, och `POST db20.bokad.se/webdata` med
`{"system": "<system>"}` ger **hela registret i ett anrop** — kategorier,
produkter och priser. Det är en annan väg in än `/find` och `/findone` som
`stangs_mjardevi_scraper.py` använder för dagens rätter, och den enda som
visar vad som står i kylarna. Prislistorna följer dock inte med; standard-
prislistans id kräver fortfarande ett `/findone` mot `pricelists`.

Varje kyl har sina egna kategorier med i stort sett samma rätter i
("QUALCOMM MATLÅDOR", "SAAB MATLÅDOR", "Sectra Teknikringen Lunchlåda", …).
Lägg ihop dem och deduplicera på rättens namn — men **säg i en INFO-rad att
alla alternativ inte finns i alla kylar**, för det gör de inte. Att i stället
lista bara "rätt" kyl kräver en hårdkodad lista över vilka hus som har en, och
den ruttnar tyst nästa gång Stångs sätter upp en till. `productGroups` i
svaret avslöjar var de står bättre än kategorinamnen gör: `SAAB MJÄRDEVI 6%`
är hur man vet att Saab-kylen står i Mjärdevi och inte på Ensbovägen.
