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
Manuell öppning från inställningarna har Tillbaka och återgår dit.
`news-open` skiljer automatisk och manuell öppning med en boolesk parameter.
Detta ingick från nyhetsversion 12; version 13 lägger till större text som standard.

Verifierat 2026-10-20: minnestest och Next-bygge passerar. Safari öppnade
version 12 automatiskt efter tidigare läst version 11. Stäng gick direkt
till lunchlistan, och omladdning öppnade ingen ny ruta. Ett nytt privat
fönster fick platsval och introduktion; ingen nyhetsruta efter att rundan
stängts eller efter omladdning. Manuell öppning behöll Tillbaka-knappen.

## Nyhetstexter och datumordning, 2026-10-20

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
rubrikrad utanför innehållets rullyta. Stäng/Tillbaka är minst 44px hög,
får fokus vid öppning och behåller befintlig stänganimation och återgång.
Panelens maxhöjd följer dvh (vh som fallback), med luft runt rutan.

De fem senaste synliga nyheterna visas först efter kontaktfiltrering och
datumsortering. Äldre poster ligger bakom Visa äldre nyheter med antal,
`aria-expanded` och `aria-controls`. Historiken går att fälla ihop igen;
varje ny öppning börjar hopfälld. Ingenting tas bort ur nyhetslistan.
Dator får högst 960px bred panel och två kolumner från sajtens brytpunkt
760px, mobil en kolumn. De två bildnyheterna ligger först vid samma datum,
så bilderna visas bredvid varandra på dator. Brödtexten använder ink2
för tydligare läsning. Befintlig nyhet om nyhetsrutan förklarar historiken;
version 13 behålls för förfiningen av samma ännu osläppta funktion.

Verifiering: minnestest och testserverbygge, därefter mobil/dator-kontroll
av rullning, kvarvarande stängknapp, fem senaste och utfälld historik.

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
