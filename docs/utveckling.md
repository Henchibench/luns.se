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
