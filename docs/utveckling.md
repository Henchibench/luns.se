# Utveckling och leverans

Status: arbetsregler sammanställda 2026-09-17 ur tidigare instruktioner.
Versionsnummer, källor och tjänststatus är inte nyverifierade i denna text.

- Python skriver JSON i nextjs-luns-se/public/data; Next bygger statisk sajt.
  Står rätten i menus.json men syns inte är första spåret frontend, annars skrapa.
- menus.json har uppslag under menus, restaurants.json under restaurants.
- Menyvisning: nextjs-luns-se/src/app/lib/menu.ts; tavla: src/app/page.tsx.
  Se importens repokarta för övriga filer; kontrollera att de fortfarande finns.
- Besöksstatistik hämtas vid byggtid, inte från besökarens webbläsare.
- Synlig ny funktion får nyhet i src/app/lib/news.ts och höjt NEWS_VERSION.
- Använd designens text-10 … text-30, inte fasta text-[13px], så textskalning
  fungerar. INFO-emoji används även som signal: testa råtext innan den strippas.

## Skrivstil

Henriks uttryckliga skrivregel från 2026-10-24: använd aldrig bindestreck
eller tankstreck i egen löptext, nyheter eller svar. Det gäller både korta
streck och de längre varianterna. Skriv om med punkt, komma eller naturliga
meningar. Regeln gäller redaktionell text; kodsyntax, adresser, filnamn och
restaurangernas källtext ska inte förvanskas.

Ophelias och Kooperativets nyheter innehöll tankstreck som Henrik ville ta
bort. Båda ersattes med punkt och ny mening. Nyhetsversion 15 behålls vid
textjusteringen. Verifiering: minnestest, nyhetstest och bygge utan skrapning.

## Leverera till Dev, inte main

1. Läs git status; hämta origin/Dev. Bevara andras arbete.
2. Arbeta på Dev eller isolerad arbetsgren från Dev. Committa och pusha till Dev.
3. Kör minnestestet före commit: node --test scripts/minne.test.mjs.
4. Vid menyändring: scripts/testserver.sh. För frontend: --utan-skrap.
   Följ AGENTS.md:s verifieringsregel för rena dokumentationsändringar.
5. Verifiera http://10.0.1.34:3002/ och lämna adressen. Henrik släpper själv.

scripts/testserver.sh speglar produktionsmiljön och märker förhandssidan.
Bygg manuellt bara med korrekt miljö: ärvda NODE_ENV/TURBOPACK/NEXT-variabler
har tidigare orsakat fel. Detaljer finns i minne/repo-05.md.

En ren Dev betyder inte att main har samma paket. Jämför origin/main..Dev
innan en redan levererad fix görs igen. En merge publicerar inte själv;
nuvarande workflow ska inspekteras före besked om nästa publicering.

## Statistikens period och bevakningar

Kontrollerat 2026-10-24 efter Henriks frågor om Så används sajten.
`scripts/fetch_stats.py` använder ett rullande fönster om 30 dagar för sök,
bevakningshändelser och övriga listor. Bara sammanfattningens BESÖK 7 DAGAR
har ett separat fönster. Urvalet filtreras till värdnamnet luns.se och Sverige.
Sök registreras högst en gång per sidladdning efter minst två tecken och
1,2 sekunders skrivpaus. Ändrade sökord i samma laddning ger inga nya händelser.

`dish-favorite-toggle` skickas både när en bevakning läggs till och tas bort.
Statistikhämtningen grupperar på rättens normaliserade namn utan att filtrera
`favorited`. Måttet är därför händelser, inte aktiva bevakningar eller unika
personer. Hämtningsskriptet behåller högst tio poster i svarets ordning;
BarList visar alla dessa och har ingen begränsning till två eller de senaste.
Den offentliga statistikfilen från 2026-10-23 09:33 UTC innehöll två olika
rättnamn med en händelse vardera och 13 sökhändelser under 30 dagar. Detta
bevisar inte att bara två rätter är aktivt bevakade i besökarnas webbläsare.

Henrik bad ta bort fottextens två förklarande meningar om sammanräkning och
byggtid. Endast uppdateringsdatumet är kvar. Sökrubriken visar nu periodens
etikett från statistikfilen. Insamling och beräkningar ändras inte.
Verifiering: kodspårning från händelser via hämtning till BarList, publicerad
statistikfil, minnestest och bygge utan skrapning. Testservern saknade
stats.json, så samma offentliga fil används där för kontroll av visningen.

## Låst Ubuntu-version i Actions, 2026-10-20

GitHub aviserade att ubuntu-latest flyttas till Ubuntu 26.04. På Henriks
uttryckliga beställning använder scrape-and-deploy nu ubuntu-24.04 tills
den nya miljön har provats separat. Det låser Ubuntu-utgåvan, inte alla
paketversioner eller framtida uppdateringar av GitHubs runner-image.
Schema, behörigheter och byggsteg är oförändrade. Diff och minnestest
kontrolleras före leverans; körning på GitHubs låsta runner verifieras
först efter Henriks släpp och nästa Actions-körning.

## Släppkontroll inför main, 2026-10-20

Kontrollerad sajtkod: Dev `0c92d6f`. Simulerad merge med `git merge-tree`
gav inga konflikter och samma filträd som Dev; main har inte ändrats.
49 Node-tester och 35 Python-tester passerade. Ett separat rent
produktionsbygge med rensad Next-/Node-miljö exporterades utan testband.
Testservern visar fortfarande samma sajtkod och är frisk på port 3002.
Menyöversikten kontrollerades från befintlig testdata (ingen ny källskrapning):
BO 5/5/5/5/4, Kathmandu 4/4/4/4/4, Cuckoo's Nest 5 per dag,
Silvis 0/9/9/9/9; Byns och Heurlins visas fortsatt med datumvarning.

Kontaktens live-konfiguration och produktionsformulärets texter verifierades,
se kontakt.md. npm-auditens kvarvarande byggberoenden redovisas i sakerhet.md.
Efter Henriks merge behöver Scrape and Deploy köras på main, manuellt eller
på ordinarie schema. Först efter publicering kan riktig Turnstile-verifiering
och mejlleverans provas från luns.se. Kontrollen ändrade inga workflows,
paket, Worker-inställningar eller produktionsresurser.

## Automatisk nyhetslogg, 2026-10-20

Tidigare tändes bara pricken på kugghjulet när `NEWS_VERSION` höjdes.
Henrik beställde att nyhetsloggen öppnas automatiskt för återkommande
besökare en gång per uppdatering. `useNews` läser `luns-news-seen` vid
montering, före introduktionen. En ny besökare får fortfarande bara
platsval och introduktion, samt en tyst baslinje för nyheter.

Sidan väntar på menydata, platsval och kontaktkonfiguration innan olästa
nyheter öppnas. Därmed är Tips & kontakt med sin bild med redan när rutan
visas. Introduktion, kontakt, inställningar och andra öppna paneler får
slutföras först. Versionen markeras som sedd vid öppning; omladdning öppnar
inte samma version igen. Blockerad lagring ger ingen automatisk ruta.

Automatisk öppning har knappen Stäng och går direkt till lunchlistan.
Manuell öppning från inställningarna återgår dit. Henrik bad 2026-10-20
att knappen alltid ska heta Stäng; etiketten är nu samma i båda fallen.
`news-open` skiljer automatisk och manuell öppning med en boolesk parameter.
Detta ingick från nyhetsversion 12; version 13 lägger till större text som standard.

Verifierat 2026-10-20: minnestest och Next-bygge passerar. Safari öppnade
version 12 automatiskt efter tidigare läst version 11. Stäng gick direkt
till lunchlistan, och omladdning öppnade ingen ny ruta. Ett nytt privat
fönster fick platsval och introduktion; ingen nyhetsruta efter att rundan
stängts eller efter omladdning. Manuell öppning behöll återgången till inställningar.

## Nyhetstexter och datumordning, 2026-10-20

Tillägg 2026-10-24: Henrik beställde en områdesnyhet om Ophelia efter flera
inkomna tips. ”Ophelia har flyttat in på Luns!” tackar för tipsen och visas
bara för förvalt Lindholmen. Version 15 gör nyheten oläst även efter 14.
Avslutningen ”Tjôta till” utgår; knappen ”Tjôta here” öppnar befintligt
kontaktformulär med valt område och stänger nyhetsrutan. Henrik valde samma
knapptext som den äldre kontaktposten. `actionLabel` gör texten valbar per
nyhet. Textjusteringen behåller version 15.
Posten följer kontaktens aktiveringsvillkor. Områdes-/versionstester och
minnestest körs, följt av bygge utan skrapning och knappkontroll på testservern.


Tillägg 2026-10-23: efter en felanmälan beställde Henrik en kort nyhet om
Kooperativets menyfix. På Henriks begäran fokuserar posten ”Kooperativets
meny är på banan igen” på felet, den saknade markeringen på källsidan och
att inläsningen är fixad, utan att knyta nyheten till fredagen. Den tackar
för felanmälan utan att ange avsändare. Textjusteringen behåller version 14. NEWS_VERSION är höjd till 14 så att
återkommande besökare med Lindholmen som förvalt område får blänkaren efter
släppet. Henrik avgränsade nyheten till just Lindholmen: samma områdes- och
kontakturval styr både kortlistan och olästmarkeringen/automatisk öppning.
Varje post har nu en publiceringsversion och kan ha `area`. Tidigare poster
har baslinjen 13; Kooperativet är version 14. Vid nya poster ska både räknaren
och postens version sättas. Nyckeln `luns-news-seen` behålls. Öppning i annat
område kvitterar bara dess senaste synliga version, och sparad version sänks
aldrig. Nya besökare får fortsatt en tyst baslinje för hela aktuella släppet.
Platsväljaren sparar valet som förvalt område, så urvalet följer ett nytt val.

Verifiering: `scripts/news.test.mjs` täcker områdesurval, automatiskt olästläge,
områdesbyte, kvittering, omladdning, nya besökare, äldre gemensamma nyheter
samt blockerad/skadad lagring. Minnestest passerar. Bygge och synlig lista
kontrolleras på testservern före leverans.

Henrik ville presentera Järntorget/Linné som ett nytt område inför släppet.
De fem tidigare posterna om områdets restauranger, menyfixar och områdesstart
ersattes med en enda nyhet: ”Nytt område: Järntorget/Linné”. Inget antal
restauranger anges, så texten inte blir fel när utbudet ändras. Ingressen
”Sajten byggs om lite i taget …” togs bort på hans begäran.

Posten från 20 oktober hamnade tidigare under 19 oktober eftersom komponenten
följde den manuella listans ordning. Visningen sorterar nu en filtrerad kopia
på ISO-datum, nyast först; samma datum behåller sin inbördes ordning.
Nyhetsversion 12 behålls för denna redigering av samma ännu osläppta nyheter.
Henrik förtydligade att nyheterna släpps tillsammans 20 oktober. Samtliga
poster i det aktuella släppet har därför 2026-10-20 som datum, inklusive
Tips & kontakt och restaurangblänkaren. Datum anger släpp, inte kodningsdag.

Henrik tog 2026-10-20 bort den äldre nyheten om större text från 19 augusti.
Restaurangnyheten förtydligar nu att blänkaren gäller en ny restaurang i
besökarens förvalda område. Detta är textändringar i samma osläppta
nyhetsversion 13; besökshistorikens logik är oförändrad.

Inställningsknappen använde texttecknet U+2699, vars utseende berodde på
webbläsarens fontval och kunde bli emoji. Det ersattes med en dekorativ
SVG i currentColor. Knappens etikett och olästmarkering är kvar.
Verifiering: minnestest, bygge och visuell kontroll av nyhetsdatum och ikon.

## Nya restauranger per område, 2026-10-19

Henrik beställde en blänkare för restauranger som tillkommit sedan förra
besöket, exempelvis Cuckoo's Nest för den som valt Lindholmen.
`useRestaurantNews` sparar namn och väntande nyheter per område under
`luns-restaurants-seen:<område>` i localStorage. Underlaget kommer från
restaurants.json, inte dagens matrader, filter eller favoriter. Ett tomt
register eller en misslyckad inläsning får inte skriva över besökshistoriken.

Första besöket i ett område sätter en tyst baslinje. Därefter annonseras
nya namn ovanför lunchlistan. Oöppnade blänkare finns kvar efter omladdning;
kryss stänger alla i området och klick på ett namn kvitterar bara den nyheten.
Klicket rensar tillfälliga mat-/favoritfilter och visar restaurangens lista.
Borttagna restauranger tas bort även från väntande nyheter. Områdena har
separat historik. Ingen historik skickas till server eller analystjänst.
Saknad/blockerad lagring ger ingen blänkare; rensad lagring kan inte återskapa
tidigare besök. Ett namnbyte räknas som ett tillägg eftersom registret saknar
separata stabila restaurang-ID:n.

Övergången från äldre versioner saknar full besökshistorik: för en återkommande
besökare med sparat Lindholmen och nyhetsversion under 10 annonseras enbart
Cuckoo's Nest vid första inläsningen. Det är en uttrycklig startnyhet, inte
ett påstående om exakt när personen sist såg stället. Nya besökare och andra
standardområden får ingen sådan startnyhet. Framtida tillägg kräver ingen
handredigerad nyhet. Integritetsrutan beskriver den lokala lagringen.

Verifiering: `scripts/restaurant-news.test.mjs` täcker tillägg, flera nyheter,
förstagångsbesök, omladdning, kvittering, områden, borttagning, återinförande,
skadad lagring och ändrade menyresultat med oförändrat register. Kontrollera
även blänkare och navigering i byggd testserver innan leverans.

## Namnsökning när lunchmenyn saknas, 2026-10-23

Vid införandet av Vita och Gillestugan upptäcktes att sökning på restaurangens
namn dolde hela kortet när dagens rätter saknades. Även klick på den nya
restaurangblänkaren använder namnsökning och gav därför ”Inga rätter matchar”.
Tomt kort visas nu också när söktexten matchar restaurangnamnet och inga
mattyp-/Sugen på-filter är aktiva. Besked, öppettider och MENY-länk finns då
kvar; inga rätter eller antal skapas. Favoriturvalet sker fortfarande först.
Verifierat: bygge och webbläsarkontroll med Vita, Gillestugan, Schnitzelplatz
samt Tai Shanghais måndagsbesked. VEG-filtret uteslöt Vitas tomma kort; Rensa
återställde beskedet. Den befintliga förhandssidan har samma sajtkod efter
denna dokumentationsuppdatering.

## Menybesked per dag, 2026-09-21

Symptom: restaurangkorten visade samma generella tomrad även när skrapan
kände orsaken, och ”idag” stod kvar vid val av en annan veckodag.
`menu.ts` skiljer nu INFO-rader med prefixet `Menybesked: ` från tider och
priser. Beskedet följer vald dag till `MenuList` och ersätter tomraden när
rätter saknas. Vid andra tomma menyer skrivs vald veckodag ut. Rätter eller
antal fylls aldrig ut med statusinformation; sök- och matfilter behåller sitt
beteende. Källkontroller och begränsningar finns i [skrapor](skrapor.md).

Verifiering: menyparsern provad med menybesked, vanlig INFO-rad och en rätt
för nästa dag; beskedet hamnar varken bland rätter eller bland öppettider.

## Lunchtid utan dubblett eller emoji, 2026-10-19

Symptom: Cuckoo's Nest visade lunchtiden två gånger och satte en klock-emoji
framför reservtiden. Källans inforad använder formen `kl.11.30-13.30`, som den
tidigare dubblettkontrollen inte kände igen, samtidigt som menykomponenten
själv lade till emojin framför `lunch_hours`.

Lösning: tidskontrollen känner nu även igen `kl.` följt av ett klockslag, så
källans aktuella inforad ersätter reservtiden. Reservtider visas som vanlig
text utan klock-emoji. Äldre emoji-signaler får finnas kvar i rå menydata för
bakåtkompatibilitet men tas bort innan visning.

Verifiering: den officiella lunchsidan kontrollerades 2026-10-19 och anger
måndag–fredag kl. 11.30–13.30. Node-test täcker källans format, reservtext utan
tid och äldre rådata med emoji; byggd förhandsvisning kontrolleras utan
dubblett och synlig klock-emoji.

## Datumvarnad meny och veckotillägg, 2026-10-19

`MENU_REFERENCE` håller en läsbar men obekräftad PDF-meny skild från dagens
rätter. Metadata måste ha rubrik, varning, HTTPS-länk och giltiga matrader.
Efter Henriks återkoppling 2026-10-19 visas vald dags rader med samma
kategori-, text-, pris- och bevakningskolumner som övriga restauranger.
Den separata utfällbara rutan är borttagen. Varningen står direkt ovanför
rätterna; dubbelt besked om saknad meny döljs när källmenyn visas.
Den extra länken ”Originalmeny” är borttagen på Henriks begäran. Restaurangens
vanliga MENY-länk finns kvar i rubriken.
Texten om att menyn inte ingår i dagens antal är också borttagen på Henriks
begäran. Endast varningen om menyns giltighet visas; räknelogiken är oförändrad.
De ingår inte i maträkning, matsökning eller matfilter; restaurangnamn och
favoritfilter fungerar. Byns vecka 41 och Heurlins odaterade PDF använder
detta på Henriks beställning, utan att anta att gammal mat fortfarande gäller.

`MENU_WEEKLY` har egna `valid_from`/`valid_until` och rader. Silvis använder
det för daterade veckorätter ovanpå sin stående meny. Bara aktuellt tillägg
tas med i mat, sökning och antal. Ett gammalt bygge visar fortfarande den
stående menyn när tillägget löpt ut. Skadat tillägg avvisas som helhet.
`menylage.py` räknar veckotilläggen och märker separat datumvarnad meny.
Verifiering: Python-källtester och `node --test scripts/bo-menu.test.mjs`.

## BO:s textmeny och daterad rotation, 2026-10-19

BO skickar inte längre `MENU_IMAGE`. Veckokontrollerad OCR av BO:s original och Kathmandus
valda stående vecka skickar `MENU_VALIDITY` med måndag/fredag inklusive år.
Frontend döljer rätter och info när datan gäller en annan visningsvecka,
även om samma statiska bygge ligger kvar. Befintligt stöd för äldre
`MENU_IMAGE` finns kvar för bakåtkompatibilitet. Källa, begränsningar och
verifiering finns i [skrapor](skrapor.md).

## BO:s originalbild i menylistan, 2026-09-21 (ersatt ovan)

Symptom: bildmenyer gav ett tomt kort trots läsbar officiell meny.
`MENU_IMAGE:` tolkas nu som separat metadata med URL, vecka och datum.
`MenuList` visar bilden utfällbar tillsammans med verifierade texträtter,
eller utfälld om aktuell avskrift saknas. Bilden räknas inte som en rätt
och ger inga påhittade träffar i matfilter. Favoritfilter och restaurangnamn
fungerar också för bildkort. Parsern döljer utgången bild och avskrift även
när gamla JSON-filer ligger kvar i ett statiskt bygge.

Källa, datumkontroller, driftbegränsning och uppdateringsrutin finns i
[skrapor](skrapor.md).
Verifiering: `node --test scripts/bo-menu.test.mjs`; full testserverkedja
och godkänd kontroll av text- och bildläge på mobil (390 px) och dator
(1440 px), inklusive simulerat bildbyte, sökning och favoritläge.

## Kompakt mobilhuvud och kalendervecka, 2026-10-24

Henrik ville ge lunchmenyerna mer utrymme på mobilen. Header samlar nu sök,
karta, kontakt och inställningar i en utfällbar meny under 760px. Loggan,
platsvalet, vädret och dagarna finns kvar utanför menyn. Ordmärket LUNS.SE
visas både på dator och mobil. Långa platsnamn får kortas visuellt
med hela namnet tillgängligt i platslistan. Menyn ligger ovanpå innehållet,
kan rullas på låg skärm och stängs via menyknappen, Escape, klick utanför
eller ett menyval. Escape lämnar fokus på menyknappen. Olästa nyheter
markeras på samma knapp och på inställningsvalet.

Henrik justerade placeringen samma dag: temperatur och vecka ligger direkt
intill loggan, före platsväljaren, även på mobil. Han påpekade också att
ordmärket LUNS.SE hade försvunnit. Det är återställt med temperatur och
vecka på en gemensam rad under namnet på mobil. På dator ligger allt
kvar på samma rad. Veckonumret skrivs kompakt som v.43. Nyhetsversion 16
behålls.

Sökningen filtrerar som tidigare medan man skriver. Sökknappen eller
Enter stänger menyn. En aktiv sökning visas separat med Rensa även när
menyn är stängd. Datorns kontroller ligger kvar direkt i sidhuvudet.
Introduktionsrundan och nyhetsversion 16 förklarar mobilmenyn.

`calendarWeek.ts` beräknar aktuell kalendervecka i Europe/Stockholm.
Veckan visas vid temperaturen, uppdateras varje minut och när fönstret får
fokus. Den avser dagens kalendervecka även under helgen, då själva
lunchlistan redan kan visa kommande vecka. Test täcker årsskifte, sommartid
och byte vid svensk midnatt. Veckan beror inte på när den statiska sajten
byggdes. Minnestest, nyhetstest, veckotest och produktionsbygge passerar.
Webbläsarkontroll med större text gjordes vid 320, 390, 760 och 1440px.
Vid 390px minskade sidhuvudets höjd från 152,75 till 116px. Vid 320px gav
rutnätets automatiska minsta kolumnbredd först 6px överbredd. En explicit
kolumn med minsta bredd noll och smalare sidmarginal i dagknapparna löste det;
uppmätt bredd och scrollbredd är båda 320px även med Järntorget/Linné valt.
Sök med Rensa, karta och återgång, kontakt, inställningar, Escape och byte
mellan mobil och dator kontrollerades. Båda färgteman granskades. Ingen
inskickning gjordes från kontaktformuläret. Kontroll på fysisk telefon med
Safaris tangentbord återstår.

## Lunchlistans rörelse i sidled, 2026-10-24

Henrik upplevde att menylistan inte satt fast på mobilen. I testwebbläsaren
mättes 447px scrollbredd i en 390px bred lunchlista på Lindholmen, med större
text. Oishiis källtext innehåller långa följder med kommatecken utan
mellanslag, som inte bröts och skapade horisontellt rullutrymme. Detta är
en verifierad möjlig orsak till rörelse i sidled, inte belägg för eventuella
separata problem med Safaris adressfält eller vertikal studs.

MenuList tillåter nu radbrytning även i långa sammanhängande textföljder.
Rättens textkolumn kan krympa och långa restaurangnamn samt länkrader får
brytas inom tillgänglig bredd. Texten bevaras; innehåll klipps inte och
menykällorna ändras inte. Dokumentationstest och bygge passerade. Efter
bygget var listans scrollbredd 390px vid 390px skärmbredd och 320px vid
320px, med samma menydata och större text. Vertikal rullning och kartans
gester har inte ändrats.

## Mobilens nedersta knappar och adressfält, 2026-10-20

Henrik rapporterade att Restauranger och Filter kunde hamna bakom mobilens
adressfält. Appskalet använde `h-screen` (100vh), som kan motsvara höjden
med infällda webbläsarverktyg även när adressfältet visas. Skalets
`backdrop-filter` gör det dessutom till containing block för knappraden.
Det är en identifierad risk i koden; felet har inte reproducerats på fysisk
telefon i denna kontroll.

Skalet använder nu `100dvh`, med `100vh` som fallback, så dess höjd följer
webbläsarens dynamiska visningsyta. Knappradens befintliga 24px marginal
plus safe-area behålls. De två panelerna begränsas till 72dvh och har även
safe-area i sin nedre rullmarginal. Inga användaragenter eller hårdkodade
mått för Safaris adressfält används.

Vid kontrollen upptäcktes dessutom att testserverns banderoll flyttade ned
skalet 30px utan att minska dess höjd: knapparnas nederkant låg på 670px i
en 664px hög vy. Byggskriptet anger nu `--luns-preview-offset:30px`, som
skalet drar bort från höjden. I produktion är detta avdrag noll.

Underlag: WebKits dokumentation om dynamiska viewport-enheter:
https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/.
Verifiering: minnestest och testserverbygge samt visuell kontroll av knappar
och paneler. Safaris expanderande adressfält behöver även provas på telefon.

## Större text som standard och områdesbild, 2026-10-20

Henrik beställde en nyhet om större text som standard. Kontrollen visade att
standardläget fortfarande var `normal`. HTML-attributet och `useTextSize`
startar nu med `stor`. Henrik förtydligade att även återkommande besökare
ska börja med större text vid släppet. Nyckeln är därför `luns-text-size-v2`;
äldre `luns-text-size` ignoreras. Det är en engångsåterställning: ett nytt
val av `normal` i v2 sparas och respekteras vid följande besök. Skriptet
före första målningen använder samma nyckel och tillämpar mindre text utan
att invänta React. Nyheten förklarar reglaget under Inställningar.
Nyhetsversionen är 13, med släppdatum 20 oktober.

Områdesnyheten använder `public/images/news/jarntorget-linne-sommarkvall.jpg`
(1535×1025). Henrik gav ett foto över Linnégatan och bad om en mysigare
sommarkväll. Bilden bearbetades med det inbyggda imagegen-verktyget, utan
modell-API/nyckel, och sparades som JPEG för sajten. Alt-texten beskriver
den som bearbetad vy. Den ersätter den första fria illustrationen i nyheten;
den tidigare filen finns kvar men refereras inte längre av nyhetslistan.

Verifiering: körd kontroll av både HTML-skript och React-hook för saknat,
normalt, stort och okänt sparat värde, inklusive gammalt `normal` utan v2
och nytt `normal` i v2; minnestest och Next-bygge samt
visuell kontroll av nyhet och inställningsreglage på testservern.

Första bildprompten (inbyggd bildgenerering, ersatt av fotobearbetningen):

```text
Use case: illustration-story
Asset type: landscape editorial illustration for a small news card on the Swedish lunch website Luns.se.
Primary request: A beautiful illustration inspired by Järntorget and Linné in Gothenburg, Sweden.
Scene: the lively meeting of a city square and a leafy street, recognizable Gothenburg blue-and-white tram, turn-of-the-century stone apartment facades, outdoor café tables and a few small strolling figures. Warm early autumn lunchtime light.
Style: refined hand-painted travel illustration, gouache and subtle paper grain, confident architectural shapes, inviting and locally grounded. Not a photograph or a literal map; an artistic impression of the neighborhood. Muted petrol teal shadows echo the site's teal design, warm ochre and terracotta facades, soft green trees.
Composition: wide landscape approximately 3:2, clear and readable at 350px wide, scene fills canvas, balanced depth, no border.
Constraints: no text, no lettering, no logos, no watermark, no invented restaurant names or menus.
```

Slutlig bildprompt (inbyggd imagegen, Henriks bifogade foto som underlag):

```text
Use case: lighting-weather
Asset type: landscape image for a news card announcing Järntorget/Linné on Luns.se.
Edit the supplied photograph into a cozy Gothenburg summer evening. Preserve the exact elevated viewpoint, framing, street alignment, tram tracks, all building positions, roof shapes, architectural details, skyline and wooded hills from the reference. This must clearly remain the same actual place, not a reimagined city.
Change only lighting, sky and atmosphere: a long Nordic summer evening shortly after sunset, soft peach and pale pink near the horizon fading into gentle blue above, lingering warm light on red roofs, softly glowing windows in a natural scattered pattern, warm street lamps and inviting subtle café lighting at street level. Lush summer green trees, gentle atmospheric depth. Keep sufficient natural ambient light to read the architecture; cozy and calm, not dark nighttime. Photorealistic editorial photography, restrained color grading, realistic shadows, no excessive orange cast or fantasy effects. Preserve existing signs without adding text, no new landmarks, no watermarks. Maintain the wide approximately 3:2 composition.
```

## Nyhetsruta på mobil och dator, 2026-10-20

Henrik rapporterade att stängknappen krävde rullning genom hela historiken
på mobil och att rutan var för smal på dator. `NewsNote` har nu en fast
rubrikrad utanför innehållets rullyta. På Henriks begäran ligger Stäng i
översta högra hörnet på mobil, men i en fast nederkant till höger från
760px bredd. CSS Grid flyttar samma knapp mellan lägena, även vid ändrad
fönsterbredd; inga dubbla fokusmål eller enhetsgissningar behövs.
Henrik upplevde två separata knapprader på dator som rörigt. Visa/Dölj äldre
nyheter ligger därför på samma fasta nedersta rad som Stäng, till vänster.
På mobil ligger historikknappen efter den synliga nyhetslistan. CSS döljer
den alternativa historikknappen helt, så bara en är synlig och fokuserbar.
Båda placeringarna för Stäng ligger utanför rullytan. Stäng är minst 44px hög,
får fokus vid öppning och behåller befintlig stänganimation och återgång.
Panelens maxhöjd följer dvh (vh som fallback), med luft runt rutan.

De fem senaste synliga nyheterna visas först efter kontaktfiltrering och
datumsortering. Äldre poster ligger bakom Visa äldre nyheter med antal,
`aria-expanded` och `aria-controls`. Historiken går att fälla ihop igen;
varje ny öppning börjar hopfälld. Ingenting tas bort ur nyhetslistan.
Henrik tyckte att två jämna kolumner gjorde kronologin otydlig och beställde
istället en tidslinje med kort omlott. En ordnad lista behåller nyast först
även för skärmläsare. Från 760px ligger linjen i mitten och korten växlar
vänster/höger. Högerkortet börjar 96px längre ned i varje par; nästa par
följer efter båda kortens höjd med 32px mellan raderna. Det ger mindre
tomrum kring bildkorten än en nästan separat rad per nyhet. Varje nästa
kort börjar längre ned; inga kort täcker varandra. Datumet ligger nära
kopplingspunkten, första punkten är fylld och övriga är ringar.
På mobil ligger linjen till vänster, korten i en kolumn med 20px avstånd
utan förskjutning. Linje och punkter är dekorativa CSS-element; datum har
semantiska time-element. Äldre nyheter fortsätter på samma linje utan
skiljestreck. Panelen behåller maxbredd 960px och befintliga färger och
typsnitt. Brödtexten använder ink2
för tydligare läsning. Befintlig nyhet om nyhetsrutan förklarar historiken;
version 13 behålls för förfiningen av samma ännu osläppta funktion.

Verifiering: minnestest och testserverbygge, därefter mobil/dator-kontroll
av rullning, kvarvarande stängknapp, fem senaste och utfälld historik.

## Inställningarnas stängknapp, 2026-10-20

Henrik påpekade att inställningarnas huvudmeny fortfarande krävde rullning
ned till Stäng på mobil, till skillnad från nyhetsrutan. SettingsOverlay
har nu samma responsiva skal: en enda Stäng-knapp högst upp till höger på
mobil, i fast nederkant till höger från 760px. Rubrik och knapp ligger
utanför rullytan, så endast inställningsinnehållet rullar. Panelens maxhöjd
följer dvh med vh-fallback; knappen är minst 44px och får fokus vid öppning.
Den första mobilplaceringen trängde ihop rubriken och lämnade ”info” på en
egen rad. Henrik valde sedan rubriken ”Inställningar å sånt” och tog bort
LUNS.SE. Rubriken och Stäng delar samma kompakta rad på mobil; en separat
knapprad tog för mycket höjd. Båda ligger kvar ovanför rullytan.
Text-24 behålls i båda lägena efter att
en mindre mobilrubrik upplevts för liten. På dator ligger Stäng i nederkant.
Verifiering: minnestest, bygge och mobilkontroll före/efter rullning samt
kontroll av datorplacering och stängning. Nyhetsversionen är oförändrad.

## Rensa mobilens filter, 2026-10-20

Filterpanelen saknade ett gemensamt sätt att avmarkera valen. Rensa ligger
nu bredvid Stäng i panelens fasta rubrikrad och nollställer mattyper,
Sugen på-val och det tillfälliga favoritfiltret. Panelen hålls öppen så att
resultatet syns direkt. Sparade favoriter, favoriternas startinställning,
söktext, område och dag ändras inte. Knappen är inaktiverad utan aktiva
filter och visas inte i restaurangpanelen. Båda knapparna är minst 44px höga.
Verifiering: minnestest, testserverbygge och mobilkontroll av kombinerade
filter, nollställning, knappstatus och stängning.

## Läsbar textkontrast i båda teman, 2026-10-20

Henrik upplevde att nyheter, inställningar och öppettider var svårlästa,
framför allt i mörkt läge. Gemensamma `--mut` var #4F7680 i mörkt läge:
beräknad kontrast mot kortens vita 6%-lager på #04252E var bara 2,74:1.
Samma färg användes för datum, öppettider och förklaringar i inställningar.

Mörkt läge använder nu `--mut: #A3C2C9` och `--ink2: #C5DDE2`.
Det ger cirka 7,18:1 respektive 9,57:1 på nyhets-/inställningskortens
komponerade bakgrund. Den ljusaste huvudtexten och bakgrunderna behålls.
I ljust läge ändras `--mut` från #6E8B92 till #405C65, så sekundärtext
blir mörkare. Ändringen sker i designtokens och når även öppettider,
formulärhjälp, datum och etiketter utan lokala färgundantag.
På Henriks begäran beskrivs kontrastförbättringen i det befintliga
nyhetskortet ”Större text som standard”, med oförändrad nyhetsversion 13.

Verifiering: beräkning av relativa luminanser för text på solid panel och
alfa-komponerat kort, minnestest, Next-bygge och visuell kontroll av nyheter,
inställningar och lunchlistan i båda teman. Beräkningen omfattar dessa ytor,
inte en fullständig tillgänglighetsgranskning av hela sajten. Metod:
https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html.
