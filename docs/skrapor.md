# Skrapor — kontrakt och arbetsgång

Status: etablerade regler importerade 2026-09-17. Kontrollera aktuell kod och
källsida; uppgifter om en restaurangs innehåll är alltid tidsberoende.
Läs app/scrapers/AGENTS.md också. Här ges inget utökat uppdragsmandat.

## Källa först

1. HTML med menytext: använd BaseScraper och dess get_page_content.
2. JS-byggd meny: identifiera underliggande JSON, inte en Playwright-skrapa.
3. Stående meny: läs exakt, spara JSON och använd StaticMenuScraper.
4. Veckovis PDF med textlager: använd den smala standardbiblioteksläsaren i
   `pdf_text.py`, kontrollera vecka eller källans ändringsdatum och stäng av
   fallback till förra menyn.
5. Veckovis bild: läs restaurangens eget original med lokal OCR när textlager
   saknas. BO använder Tesseract med svenska språkdata och Pillow för radutsnitt.
   Kräv aktuell vecka och hel menystruktur; feltolkad bild ger menybesked,
   aldrig förra veckans rätter eller inbäddad bild.
6. Stående rotation med uttryckliga udda/jämna veckor kan sparas med källa,
   datum och hash, precis som annan stående meny. Välj efter ISO-veckan,
   inte genom att växla var sjunde dag (vecka 53 och vecka 1 är båda udda).

Produktion har requests, beautifulsoup4, lxml och Pillow utöver standardbiblioteket.
BO kräver även Tesseract och svenska språkdata som systempaket.
Spaning med scripts/spana.py får ha utvecklingsberoenden; de får inte läcka in
i produktionsskrapan. Läs minne/skrapor-09.md när spaning behövs.

## Kontrakt

- Ny restaurang berör skrapfil, app/restaurant_data.py och scripts/scrape_menus.py.
  Namnet ska matcha scraper.name exakt och area måste finnas i LOCATIONS.
- scrape() returnerar {namn: [rader]}. Rättformat:
  Måndag|<strong>Kategori</strong> - Rätten och dess beskrivning
- INFO-rader är valfria per dag, med etablerat format i BaseScraper.
- `INFO:Dag - Restaurant Info: Menybesked: text` förklarar varför rätter saknas
  för dagen. Frontenden visar beskedet i stället för sin generella tomrad.
  Det räknas aldrig som en rätt eller som ett besked om att hela restaurangen
  är stängd. Vanliga INFO-rader med tider/priser behåller sin betydelse.
- Felläge: "Ett fel uppstod vid hämtning av menyn" eller
  "Ingen lunchmeny tillgänglig"; logga med log_error. Runnern kan behålla
  föregående meny, så ett lyckat bygge bevisar inte att skrapningen är aktuell.
  Veckovis växlande källor ska sätta `allow_previous_menu = False`; då blir
  ett fel synligt i stället för att frysa förra veckans mat.
- Kategori måste vara källbelagd. Ordningen på rätterna bevisar inte vegetarisk
  mat. Använd neutral kategori när underlag saknas, aldrig påhittade etiketter.
- Stående JSON behöver source, captured och kalla_hash. Uppdatera datum och hash
  tillsammans efter verklig källäsning. Menyn får inte vara veckovis växlande.

## Testa

Jämför före/efter per restaurang OCH dag. Kontrollera kategori och område i
byggd data och på förhandssidan. menus.json/ restaurants.json är omslagna.
Släpp inte därför att skriptet bara avslutade utan fel.

BaseScraper hanterar retry, kodning och dolt innehåll. Gör inte egna generella
rensningar av display:none; dagar kan ligga bakom flikar. Ändring i basklassen
kräver jämförelse för alla restauranger, inte enbart det aktuella kortet.

Äldre exempel om stående menyer, foodtrucks, selektorer och plattformar finns
i minne/register.md. De är felsökningsunderlag, inte dagens restauranginventering.

## Järntorget/Linné — kompletterade menyer 2026-10-19

**Feskekörka:** första lunchsektionen på den egna sidan har ändrats från
tis–tor till tis–lör. Skrapan läser nu dagintervallet ur respektive rubrik.
Endast huvudrätterna mellan VARMRÄTTER/DESSERT respektive MAT/EFTER MATEN
tas med; det separat veckomärkta, äldre blocket utesluts. Kontrollerat utfall
mån–fre är 0/3/9/9/3. Prisintervallet för soppan bevaras.

**Byns Trattoria:** följ iframe-länken i `#lunch-pdf`, inte första PDF-länken
på sidan. Originalet är fortfarande vecka 41, ändrat 2026-10-03. Henrik har
beställt visning med varning. `MENU_REFERENCE` innehåller menyn separat från
dagens sökbara mat, med veckonummer, ändringsdatum och uppmaning att kontrollera
med restaurangen. En aktuell veckomärkt, nyligen ändrad fil återgår automatiskt
till vanlig meny. Veckonumret läses ur den hämtade PDF:en vid varje körning;
41 är inte hårdkodat. Ett övergångstest följer gammal vecka 41 → aktuell 43
→ inaktuell 43 vid veckobyte → aktuell 44. Varning och menybesked försvinner
helt när aktuell meny tas in, och varningen följer PDF:ens nya veckonummer
om den senare blir gammal. Filens ändringsdatum kontrolleras också för att
inte godkänna samma veckonummer från ett tidigare år.
PDF:ens textordning är ons–tor, fredag, dokumentrubrik,
mån–tis, sedan dagsrubrikerna. Tidigare tolkning satte rätter på fel dagar
och tappade första namnet. Alla fem alternativ per dag kontrollerades mot
den synliga original-PDF:en; en ändrad/ofullständig mall avvisas.

**Heurlins:** följ länken med texten ”Meny lunch”, så att filbyten upptäcks.
Oktobermallen har lunch ons–fre: två veckorätter, Fish and chips och tre
prissatta Caesarsallader. Menyfilen är ändrad 2026-10-14 men saknar utskrivet
veckodatum. Den visas därför separat med datumvarning för veckan 19–23 oktober,
inte som bekräftad aktuell mat. Om filen uppdateras inom visningsveckans
datumfönster används vanlig meny med `MENU_VALIDITY`. Dagintervall, priser
och textordning kontrollerades visuellt. Annonsen efter ”Boka brunch” utesluts.
De två tidigare septembermallarna stöds fortfarande.

Den dynamiska kontrollen återverifierades på Henriks begäran 2026-10-19:
varje skrapning följer lunchknappen och läser PDF-svarets `Last-Modified`.
Eftersom PDF:en saknar veckonummer används datumet i Stockholm: från fredagen
före visningsveckan till dess fredag. En aktuell fil tar bort både varning
och besked om obekräftad meny. Detta fungerar vid ersättning på samma URL
och vid nytt filnamn. Vid veckobyte blir en oförändrad äldre fil varnad igen.
Datumet är en publiceringssignal, inte ett bevis för att själva maträtterna
ändrats; om servern saknar tillförlitligt datum behålls varningen.
Övergångstester täcker båda URL-fallen, veckobyte, saknat datum, okänd tidszon,
gammalt år och framtida datum. Ingen meny eller varning hårdkodas.

**Silvis:** den lilla fördröjt laddade rutan på restaurangens lunchsida är
deras eget Facebook-flöde i Fouita-widgeten `0x111b3d`. Följ samma publika
JSON-anrop som widgeten: `api2.fouita.com/v1/q/widget` ger flödeskonfiguration,
`social-api.fouita.com/social/fb/get-page-data` ger inläggen. Bara sid-ID
`254527854405580` (Silvis Lunch) får användas. Flödets publika nyckel hämtas
dynamiskt; inga Facebook-tokens används eller sparas. Svaren innehåller mer
än menytext: behåll endast `message` och `created_time`, logga inte råsvaren.
Veckonummer och publiceringsdatum inklusive år måste matcha visningsveckan.
Fyra fullständiga rubrik-/prisblock krävs; nätfel eller ny mall lämnar bara
den källkontrollerade stående menyn. Det är restaurangens eget publicerade
flöde, inte en annan lunchskrapares databas. Vecka 43 ger fyra veckorätter
plus fem stående, alltså 0/9/9/9/9. `MENU_WEEKLY` låter tillägget löpa ut i
frontend utan att stående mat försvinner. Den stående texten återkontrollerades.

**Fula Hummern:** borttagen ur restaurangregistret och skrapkörningen på
Henriks begäran eftersom den publicerade menyn inte uppdaterats från vecka 25.

Verifiering: direkt hämtning av alla fyra källor, visuellt kontrollerade
original-PDF:er och Silvis veckoinlägg. `test_linne_menus.py` täcker dagordning,
priser, gamla veckor/år, källknappar, ändrade mallar och nätfel. Frontendtest
täcker separat referensmeny och att veckotillägg löper ut oberoende av stående
mat. Hela produktionskedjan och webbläsarkontrollen körs vid leveransen.

## BO och Kathmandu — fungerande textmenyer 2026-10-19

Detta ersätter BO:s bildreserv och Kathmandus Menydags-reserv från september
nedan. Äldre kontroller är historik, inte nuvarande implementation.

**BO:** Menydags är borttagen som källa på Henriks begäran. Skrapan hämtar
[BO:s lunchsida](https://www.restaurangbo.se/lunchmat) och väljer den entydiga
originalbild vars filnamn anger visningsveckan. Veckonumret i själva bilden
måste också stämma. Bilden anger inget år; kontrollen bevisar därför inte
att en bild med samma veckonummer från ett äldre år är ny. Originalet hämtas
på nytt vid varje körning och ingen sparad avskrift återanvänds.

Tesseract (`swe`, sidläge 3) hittar rader och läser texten. BO:s tunna versaler
förlorade accenter i helbildsläsningen trots hög OCR-konfidens. Därför läses
varje rättnamn med pris igen från ett separat bildutsnitt (sidläge 7).
Det återgav FLÄSKFILÉ, SMÅLÄNDSKA och RÄKOR korrekt utan ordlista eller gissade
rättelser. Pillow gör endast utsnitten; ingen extern AI- eller OCR-tjänst används.
Två läsningar måste ge samma pris. Alla fem dagar, Veckans gröna, Sallad och
slutgränsen Lunchdryck måste finnas i rätt ordning. Rättnamn och beskrivning
krävs, text med medelkonfidens under 70 avvisas. Konfidens är en felindikator,
inte en garanti för korrekt text. Ny layout eller svårläst bild kan kräva
anpassning; då visas ett menybesked och en länk till originalet.

Vecka 43 jämfördes mot originalbilden: alla 24 rätter med priser och tillbehör,
5/5/5/5/4 per dag. Fredagsdessert är information. Veckans gröna och sallader
läggs på samtliga vardagar; diet- och allergenetiketter gissas inte.
Livehämtning inklusive OCR tog cirka 5,5 sekunder på dev01 med Tesseract 5.5.0.
Inga nedladdade bilder eller OCR-filer committas. Temporära bilder rensas.

Henrik beställde uttryckligen Tesseract i testmiljön och GitHub Actions.
Actions installerar `tesseract-ocr` och `tesseract-ocr-swe` med apt, och samma
Pythonberoenden från requirements.txt som testservern. På dev01 installerades
systempaketen av Henrik; testservern kontrollerar dem före skrapning och
uppdaterar även ett befintligt produktionsvenv. Vid saknade paket avbryts
bygget utan att den körande förhandssidan stoppas. På macOS behövs Tesseract
med `swe` tillgängligt för den som vill köra hela skrapkedjan där.

**Kathmandu:** vanlig HTTP gav fortfarande 403 med `cf-mitigated: challenge`,
men den officiella sidan öppnades i vanlig webbläsare utan manuell verifiering.
Den säger uttryckligen ”Välj udda eller jämn vecka och veckodag”. Båda
veckorna finns som JSON i Nexts publika `self.__next_f.push`-skript, i blocket
`weeklyLunchMenu`. Endast JSON tolkas; JavaScript exekveras aldrig av skrapan.
Alla tio dagsval kontrollerades i den synliga webbläsaren mot JSON: 3 rätter
per dag för 129 kr, samt uttryckligt stående Momo (8 st per person) för 139 kr.
Dietetiketter och inkluderade tillbehör kommer från restaurangens egna data.

`data/kathmandu.json` är en källkontrollerad stående tvåveckorsrotation med
`source`, `captured` och SHA-256 `kalla_hash` av menyobjektet serialiserat med
`json.dumps(menu, ensure_ascii=False, sort_keys=True)`. Det är inte en
veckomeny sparad för evigt. Vid varje körning försöker skrapan läsa originalet;
vid åtkomstfel används den verifierade rotationen med en varning i loggen.
Om originalet går att läsa men har ny eller ofullständig struktur används
inte den sparade kopian. Ändringar som restaurangen gör medan HTTP är blockerad
kan däremot inte upptäckas automatiskt: återkontrollera i webbläsaren och
uppdatera hela rotationen, datumet och hashen tillsammans.

Båda skraporna använder `menu_week.py` för Stockholmsdatum och helgens
kommande vecka. `MENU_VALIDITY` ger datum till frontend så att även ett gammalt
bygge spärrar föregående veckas text/rotation. Ingen tidigare skrapning
återanvänds. `menylage.py` räknar inte datumraden som mat.

Verifiering: Python-tester för BO, Kathmandu och Järntorgets PDF-mallar;
Node-tester för metadata, utgången text och oförändrade bildmetadata från äldre
byggen. Produktionsvenv utan Playwright ger BO 5/5/5/5/4 och Kathmandu
4/4/4/4/4. Nästa vecka, helg, ISO-årsskifte (53→1), osäker/ofullständig OCR, nätfel,
skadad sparad rotation och ändrad källstruktur är täckta. Full lokal
produktionskedja och Next-bygge godkända. Webbläsaren verifierade rätt område,
alla fem dagars antal, noll menybilder och sökning på BO:s pestopasta.
Övriga restaurangers källfel
(Feskekörka, Byns och Heurlins) ingår inte i denna ändring.

## Cuckoo's Nest återinförd, 2026-10-19

Symptom: restaurangen togs bort 2026-08-04 eftersom den då bara bedömdes
servera à la carte och den gamla skrapan gav tomt resultat. Den officiella
[lunchsidan](https://www.cuckoosnest.se/menyer/lunch) anger nu lunch måndag–
fredag 11.30–13.30 och publicerar en uttryckligen veckomärkt meny.

Källa och orsak: rå HTTP gav 200 med Drupal-genererad HTML. Vid kontrollen stod
vecka 43 i den svenska `content-region`: en namnlös dagsrätt per vardag,
"Veckans vegetariska" och tre namngivna lunchklassiker. En separat engelsk
`sidebar-region` upprepar samma meny och ska inte läsas. Menyn är alltså
veckovis HTML, inte den stående kategorimeny som den borttagna skrapan antog.

Lösning: restaurangen och dess officiella menylänk är återinförda på
Lindholmen. Skrapan läser endast den svenska kolumnen, använder neutral
"Dagens" där källan saknar kategori och bevarar restaurangens rubriker och
priser för övriga alternativ. Alla fem vardagar och aktuellt ISO-veckonummer
krävs. `allow_previous_menu = False` hindrar förra veckans rätter från att
ligga kvar efter ett källfel eller uteblivet menybyte.

Verifiering: källan gav 5/5/5/5/5 rätter för vecka 43. Enhetstest täcker den
svenska kolumnen, veckospärren, ofullständig vecka, kategorier och priser.

## Järntorget/Linné — källinventering och införande 2026-09-21

Källa och verifiering: restaurangernas officiella länkar i kortet kontrollerades
med rå HTTP, renderad webbläsare, nätverkstrafik och hämtade menybilagor. Efter
chefens följdbeställning provkördes samtliga tio poster med
produktionsberoendena. PDF-läsaren jämfördes med `pdftotext` på de tre
originaldokumenten; `pdftotext` ingår inte i produktionslösningen.

| Källa | Beslut 2026-09-21 |
|---|---|
| Taj Mahal | Stående veckomeny i rå HTML. Införd som vanlig skrapa. |
| Silvis | Fem uttryckligt märkta stående rätter på egna sidan. Veckans rätter kommer från en JavaScript-laddad Facebook-widget och tas inte med. Den stående menyn är sparad med källhash. |
| Poh-Keh Masthugget | Officiella sidan anger plats och tider men ingen meny. Införd med restaurangens aktuella externa Foodora-meny; nio maträtter, drycker uteslutna. |
| Fula Hummern | Officiella sidan säger fortfarande sommarstängt och saknar aktuell meny. Införd med källstatus, inte med den gamla menybilden. |
| Restaurang BO | Bildmenyn är avläst och verifierad för 21–25 september: 5/5/5/5/4 lunchalternativ. Avskriften kräver samma originalbild och giltighetsdatum. Vid bildbyte visas den nya veckobilden direkt på kortet, utan den gamla texten. Se bildhanteringen nedan. |
| Heurlins | Den gamla PDF:en från 7 september ersattes under återkontrollen av en ny, ändrad 21 september 07.17 UTC. Två veckorätter per vardag hämtas nu med den nya indelningen mån–ons/tor–fre. Övriga alternativ finns via MENY. |
| Kathmandu | Officiella lunchsidan stoppas fortfarande av Cloudflare, även i webbläsarkontrollen. Menydags är reservkälla men saknar vecka 39. Datumets ISO-år, vecka och veckodag kontrolleras innan rätter tas med. MENY leder till officiella lunchsidan. |
| Bongo Göteborg | Vecka 39 är en textbärande PDF. Införd med tre rätter per vardag och kontroll mot aktuellt ISO-veckonummer. |
| Byns Trattoria | PDF-läsningen fungerar: originalet och dess textlager anger vecka 38. Kontrollerad tolkning ger 5/5/5/5/5 alternativ för den veckan; aktuell vecka 39 får menybesked. Ny hämtning utan cache gav samma fil. Se återkontrollen nedan. |
| Feskekörka | Två odaterade lunchsektioner finns i rå HTML och synlig webbläsare för tis–tor respektive ons–tor. De visas under samlingsposten Feskekörka; blocket märkt vecka 37 ignoreras. Mån/fre får ett förklarande menybesked, inte besked om stängd restaurang. Tidigare meny återanvänds inte efter hämtfel. |

Veckomenyerna returnerar INFO-rader när aktuell mat saknas. Det gör att
restaurangen och dess original-/reservlänk finns på sajten utan att gammal mat
presenteras som dagens. `allow_previous_menu = False` hindrar dessutom runnern
från att återanvända en tidigare vecka efter ett senare hämtfel.

### Återkontroll av saknade menyer, 2026-09-21

Symptom: samma text ”Ingen meny idag” syntes för lunchstängt, saknat
källunderlag och misslyckad hämtning. Menybesked skiljer nu orsakerna åt.
[Silvis](https://silvis.nu/lunchmeny_i_linne_jarntorget/) anger uttryckligen
tis–fre 11–14; måndagen ska ha noll rätter och besked om ingen lunchservering.
[Feskekörkas lunchsida](https://www.feskekorka.se/lunchmeny) ger fortsatt
0/3/9/9/0 rätter mån–fre. Haldis har öppet på måndagar enligt egna sidan;
saknad verifierad lunchmeny får därför inte tolkas som stängt.

[Heurlins lunchsida](https://heurlinsgbg.se/lunch) länkade först till
`Lunch_Meny_NY-(3).pdf`, ändrad 7 september. En ny hämtning med separat
cacheparameter gav samma gamla dokument. Senare under arbetet byttes länken
till `Lunch_Meny_Heurlins_2026_NYMENY.pdf-(10).pdf`, ändrad 21 september
07.17.30 UTC. Den nya PDF:en utlöste skrapfel eftersom gamla koden krävde
”Måndag & tisdag”. Lösning: kontrollera båda kända PDF-mallarnas textordning
och läs de uttryckliga dagintervallen. Fyra veckoblock ger 2/2/2/2/2 rätter.
Den 21 september gäller första paret mån–ons och andra tor–fre. Kategorier
och priser kommer från respektive rubrik. Sida två har fristående textobjekt
för priser och alternativ; dessa kopplas inte ihop på gissning. Länken MENY
ger hela dokumentet. Äldre odaterade dokument stoppas fortfarande av
färskhetskontrollen; ett gammalt ändringsdatum bevisar inte att restaurangen
saknar en ny meny någon annanstans.

[Kathmandus officiella lunchsida](https://www.kathmandurestaurang.se/sv/lunchmeny)
gav 403 i rå HTTP med/utan www, med avslutande snedstreck och via HTTP→HTTPS.
Webbläsaren stannade i Cloudflares verifiering. [Menydags](https://www.menydags.se/restaurang/kathmandu/lunch)
visade daterade men tomma dagar vecka 39. Pris- och rättformat kontrollerades
mot arkivsidan för vecka 37, enbart för att verifiera tolken. Arkivmat visas
inte på sajten. Datumspärren testas även över ISO-årsskifte och med delvis
publicerad vecka. Pris måste finnas i ett separat prisfält, inte i ett
tal med bindestreck inne i rättens beskrivning.

Verifiering: `python -m unittest scripts.test_jarntorget_menus` med
produktionsberoendena; Heurlins två original jämförda med `pdftotext` och den
nya PDF:ens visuella första sida. Källtyperna är oförändrade: ingen
webbläsare, OCR, ny tjänst eller extra paket används i produktionsskraporna.
Spaningen upptäckte också att `scripts/spana.py` kraschar på saknat `datum`
efter blockerad råhämtning; sparad webbläsar-HTML kunde ändå inspekteras.
Det separata verktygsfelet ändras inte inom detta kort.

### Byns PDF-avläsning, återkontroll 2026-09-21

Symptom: tomt restaurangkort uppfattades som att vi inte kunde läsa en bild
eller PDF. [Officiella lunchsidan](https://www.bynstrattoria.se/food/lunch)
länkar och bäddar in samma [textbärande PDF](https://www.bynstrattoria.se/lunch/lunch.pdf).
Orsak: originalets synliga rubrik och textlager anger båda **VECKA 38**,
inte aktuell vecka 39. HTTP gav 200 och Last-Modified 2026-09-15 10:16:32 GMT.
Hämtning med unik cacheparameter, Cache-Control: no-cache och utan www gav
samma SHA-256: `a269c3438b3d4f597ff82750457e44859cf74053cef9e6778e76eb3a2018690e`.
Sidans bild `images/lunch.jpg` är inte den inbäddade veckomenyn.
[Menydags](https://www.menydags.se/restaurang/byns-trattoria/lunch) kontrollerades
som komplement eftersom officiella menyn gäller föregående vecka; datumblocken
21–25 september saknar också rätter. Sökindex gav äldre versioner av samma
PDF-adress och används därför inte som bevis för aktuell mat.

Åtgärd och verifiering: originalet renderades lokalt och lästes visuellt.
Befintlig produktionsskrapa provades med en tillfällig testklocka för vecka 38:
5/5/5/5/5 alternativ, rätt fördelning mån–tis/ons–tors/fredag och 145 kr,
kontrollerat mot PDF:en. Testklockan och arkivrätterna sparades inte i sajtdata.
Verklig körning vecka 39 ger 0/0/0/0/0 rätter och ett förklarande menybesked
varje dag. Ingen kodändring eller ny bildavskrift behövs för den här filen.
En aktuell PDF med samma mall kan läsas automatiskt vid nästa skrapning;
ändrad mall eller ny filadress måste verifieras innan det kan lovas.
Veckospärren ska behållas. Bilagorna finns endast i ignorerad spaningskatalog.

### BO:s bild och Kathmandus åtkomst, återkontroll 2026-09-21

Symptom: BO finns på sajten men visar inga maträtter trots att restaurangen
publicerat sin lunchmeny. Detta är en begränsning i vår inläsning, inte en
oläsbar eller saknad källa. [Officiella lunchsidan](https://www.restaurangbo.se/lunchmat)
och dess bild gav HTTP 200. Originalet `v.39.jpg` lästes visuellt: det har
tydliga dagar, rätter och priser. Exempelvis anger måndagen nattbakad karré
159 kr och ångad fisk 159 kr. Bildens veckomärkning är 39; den innehåller
inget uttryckligt årtal. Sidans HTML saknar rätttext och bildens alt-text är
tom. Squarespace-vyn `?format=json` gav också 200, men dess `mainContent`
har samma bild och ingen menytext.

### BO:s bildhantering och ersatt stoppregel, 2026-09-21

Orsak till det tidigare stoppet: historiska
[minne/skrapor-02.md](minne/skrapor-02.md) krävde ”bygg ingenting” eftersom
veckovis OCR inte var byggt. Syftet var att undvika fryst, felaktig mat.
Chefens följdbeställning ersätter det generella förbudet. Aktiva regler i
`app/scrapers/AGENTS.md` och denna ämnesfil tillåter nu verifierad bildhantering
med datum- och källspärr. De frysta importerna lämnas orörda för spårbarhet.

Lösning: `restaurang_bo.json` innehåller visuellt kontrollerade rätter, priser,
information, käll-URL, bild-URL, SHA-256 och giltighet 2026-09-21–2026-09-25.
BO:s källrubriker ”Veckans gröna” och ”Sallad” behålls. Dagrätterna får den
neutrala etiketten ”Dagens”; inga allergener eller kött-/fiskkategorier gissas.
Fredagens dessert är information, inte en extra lunchrätt. Drycker tas inte
med. Källans stavning behålls, bland annat ”tagiatelle” och ”haricot verts”.

Vid varje skrapning hämtas lunchsidan och dess veckobild med requests. Ett fast
`Accept: image/jpeg` behövs: Squarespace levererar annars olika bildformat
med olika hash från samma adress. Endast samma URL, bildhash och exakt
måndag–fredag med årtal får använda avskriften. Förra menyn återanvänds aldrig.
Bildens eget veckonummer ska stämma med veckan som sajten visar; på helgen
är det kommande vecka. Två olika bilder med samma veckonummer stoppas som
oklart underlag. Bilden anger inget årtal, så dess år knyts till hämtveckan;
avskriftens årtal är uttryckligt och kan inte återanvändas ett år senare.

Den nya raden `MENU_IMAGE:{...}` bär URL, vecka och giltighetsdatum genom
befintlig JSON. Den är varken INFO-text eller en maträtt och ändrar inte
maträkningen. Originalet finns utfällbart på restaurangkortet. Saknas en
verifierad avskrift visas bilden utfälld, med länk för förstoring och besked
att bildens rätter inte kan sökas eller filtreras. Favoriter och namnsökning
kan fortfarande visa bildkortet; matfilter tilldelar det inga gissade träffar.
Frontenden spärrar även text och bild från ett gammalt bygge vid veckobyte.

Det återkommande automatiska stödet är hämtning och visning av originalbilden.
Ny sökbar text kräver fortfarande en verifierad avläsning i en Codex-session;
ingen automatisk OCR eller schemalagd AI-körning har införts. Vid uppdatering:
hämta bilden med `RestaurangBOScraper.fetch_image`, läs den visuellt och ersätt
avskriftens samtliga dagar, information, käll-URL, bild-URL, SHA-256, captured,
valid_from och valid_until tillsammans. Hasha exakt de hämtade bildbyten.
Bilder sparas bara i ignorerad `spana-*`, aldrig i git. Kör BO-testerna och
kontrollera varje dag mot originalet före commit. Inga nya produktionspaket,
modell-API:er, tjänster, serverinställningar eller workflows behövs.

Verifiering: 18 Python-tester (`scripts.test_bo_menu` och
`scripts.test_jarntorget_menus`) och fem frontendtester
(`node --test scripts/bo-menu.test.mjs`) kontrollerar bland annat bildbyte på
samma URL, ny URL, nästa vecka, helg, årtal, ofullständig avskrift, nätfel och
utgången frontenddata. Liveutfallet är 5/5/5/5/4 rätter jämfört med originalet.
Full skrapning och Next-bygge godkända. Webbläsarkontroll på 390 och 1440 px
verifierade alla dagar, priser, sökning och originalbild. Simulerat bildbyte
visade bilden utfälld utan gamla texträtter; namnsökning och favoritläge
fungerade utan falska matträffar. Rapportverktyget `menylage.py` känner igen
bildmetadata och skiljer bildmeny utan avskrift från saknad meny.

### Kathmandus åtkomst, oförändrad observation från tidigare kontroll

[Kathmandus officiella lunchsida](https://www.kathmandurestaurang.se/sv/lunchmeny)
gav fortsatt HTTP 403 med `cf-mitigated: challenge`. Detsamma gällde startsidan,
robots.txt, sitemap.xml samt lunchadressen utan www och med avslutande
snedstreck. Chromium stannade i ”Utför säkerhetsverifiering” efter väntan.
Försök att nå verifieringsrutans checkbox via webbläsarens rollselektor
gav timeout; ingen genomförd verifiering eller menyåtkomst påstås.
Sökindex visade officiell startsida och à la carte, men inget verifierat
aktuellt lunchunderlag. Det bevisar inte att Cloudflare är omöjligt att
passera; ingen reproducerbar väg har verifierats här.
[Menydags reservsida](https://www.menydags.se/restaurang/kathmandu/lunch)
gav 200 men noll rättposter i datumblocken 21–25 september 2026.

Den tidigare åtkomstkontrollen gav 0/0/0/0/0 rätter för Kathmandu. Kathmandu
ändras inte i BO-kortet. Bilagor och webbläsarbilder ligger endast i
gitignorerad spaningskatalog.
