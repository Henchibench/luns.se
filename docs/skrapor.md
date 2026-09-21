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
5. Veckovis bild: läs originalet och spara verifierad text med käll-URL,
   bildens SHA-256 och uttryckliga giltighetsdatum. Kontrollera aktuell bild
   vid varje skrapning; utgången eller ändrad bild får inte återanvända
   avskriften. Visa den nya originalbilden på sajten tills den lästs av.
   Bildläsning i Codex-sessionen är tillåten; produktionsskrapan behöver
   varken AI, OCR eller webbläsare. Automatisk återkommande textavläsning
   får inte påstås utan att den faktiskt finns.

Produktion har bara requests, beautifulsoup4, lxml utöver standardbiblioteket.
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
| Byns Trattoria | PDF:en hade textlager men var fortfarande märkt vecka 38. Införd med veckokontroll och källstatus; vecka 38 visas inte som vecka 39. |
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

[Byns officiella sida](https://www.bynstrattoria.se/food/lunch) pekade fortsatt
på `lunch/lunch.pdf`, märkt vecka 38 och ändrad 15 september, även utan cache.
Menydags saknade också vecka 39. [Kathmandus officiella lunchsida](https://www.kathmandurestaurang.se/sv/lunchmeny)
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

Verifiering: 17 Python-tester (`scripts.test_bo_menu` och
`scripts.test_jarntorget_menus`) och fem frontendtester
(`node --test scripts/bo-menu.test.mjs`) kontrollerar bland annat bildbyte på
samma URL, ny URL, nästa vecka, helg, årtal, ofullständig avskrift, nätfel och
utgången frontenddata. Liveutfallet är 5/5/5/5/4 rätter jämfört med originalet.
Full produktionskedja och webbläsarkontroll ingår i leveranskontrollen.

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
