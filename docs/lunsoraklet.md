# Lunsoraklets regi och röst

## Andra gestaltningen, 2026-10-24

Henrik upplevde den första tallriken som hastigt byggd och ljudet som töntigt.
Tal saknades helt. Nästa version använder en bildsatt gestalt tillsammans
med roterande instrument i riktig 3D, djup i stoftfältet, kamerafärd, dimma
och ljusspridning. Gestalten är en illustration på en yta i scenen, inte
ett modellerat eller ansiktsanimerat huvud. Den begränsningen ska inte döljas.
Humorn ligger i figurens oproportionerliga allvar inför ett lunchbeslut.

Palett: svart rymd #010305, kall dimma #142A32, oxiderad brons #967747,
varmt ljus #EDCF9C och benvit text #F3EDE0. Befintliga Bricolage Grotesque
bär replikerna och Schibsted Grotesk bär kontrollerna. Scenen fyller skärmen,
med repliker i nedre delen, stor gestalt ovanför och diskreta kontroller.
Ingen vanlig panel eller liten figur ovanför ett formulär.

Henrik bad också att kosmos skulle fylla hela skärmen. Rymddimman ritas
nu i skärmkoordinater och täcker hela webbläsarytan oavsett proportioner
eller kameraläge. Den tidigare svarta toningen över nederdelen är borttagen.
Stjärnor och dimma fortsätter bakom texten, med en mjuk lokal skugga för
läsbarhet. Detta ändrar bakgrunden i vyn, inte webbläsarens helskärmsläge.

Förlopp: omkring fjorton sekunders inträde, inväntat lunchval, åtta sekunders ritual,
sedan domen. Kameran färdas fram och ringarna rör sig fram till ritualens
sista 2,4 sekunder, då de samlas i ett gemensamt plan. De låser sig vid
domen samtidigt som ett basanslag och en luftig efterklang hörs. En enda
ljuspuls markerar låsningen. Ringarna förblir samlade medan resultatet visas.
På smal skärm dras kameran tillbaka så att ringarnas bredd ryms och
gestalten lyfts för att ge plats åt längre rättbeskrivningar. Porträttets
ytterkanter tonas mjukt så att ingen rak bildkant syns mot rymden.
Rättens namn visas först vid domen. Vid minskad rörelse hoppas väntan
över. Bibliotek och gestalt hämtas först när hemligheten öppnas.

Justering 2026-10-24: Henrik upplevde de kringflygande maträtterna under
ritualen som störande. De kom från sex källrätter som animerades i text
ovanpå scenen. Textlagret och dess animation har tagits bort. Ringarnas
rörelse, ljuset och ljudet bär nu ritualen. Själva lottningen är oförändrad.
Verifiering: minnestester och produktionsbygge passerar. Testservern byggdes
utan skrapning från `549ceab`. I webbläsaren visas ritualen utan maträtter
och övergår till en rätt med restaurang, kategori och pris. Inga fel eller
varningar registrerades i webbläsaren.

## Röstmanus

Röstregi: lugn, enorm och lätt uttråkad. Tydlig svenska med torr humor.
Läs naturligt och långsamt, utan att själv pressa rösten mörk. Djup och
rumsverkan läggs på varsamt efteråt så orden förblir begripliga. Ingen
imitation av en känd skådespelare. Leverera gärna varje replik separat.

1. Du har kallat på Lunsoraklet. Jag har sett stjärnor födas. Imperier falla.
   Och dig vela över vad du ska äta.
2. Överlämna ditt lunchöde. Trotsa domen, och må ditt kaffe vara ljummet i sju år.
3. Tystnad. Universum överväger din lunch.
4. Det är avgjort. Universum har tallrikt.
5. Ditt beslut har noterats. Av vem är oklart.

Pausen före repliken om lunchvelandet är själva skämtet. Den fullständiga
slumpade menyn ska visas som källtext. Den behöver inte talas, vilket gör
att fasta inspelningar kan fungera för alla restauranger utan en taltjänst.
Animationernas tid anpassas till de avkodade ljudfilernas verkliga längd.

Status 2026-10-24: Henrik har uttryckligen godkänt AI tjänster för att skapa
material till Lunsoraklet, exempelvis tal och ljud, och bekräftat att han har ElevenLabs.
Undantaget gäller materialet till detta påskägg. Regeln för övriga projektet
står kvar. Sajten använder sju repliker och tre färdiga effekter skapade
med material från ElevenLabs webbgränssnitt. Ingen modellnyckel eller ny
tjänst i drift behövs på sajten.
Det inbyggda bildverktyget i ChatGPT användes för bildmaterialet.

## Ljudproduktion

Kontot visade Starter och 90 000 krediter före första produktionen, 87 733 efter.
Förbrukning: 2 267 krediter inom befintligt abonnemang, utan köp eller
uppgradering. Starter omfattar kommersiell användning enligt
[ElevenLabs prislista](https://elevenlabs.io/pricing). Delning till SFX
Explore stängdes av före generering. Inga lösenord eller nycklar lästes ut.

Vid justeringen 2026-10-24 skapades en ny lunchreplik och två ljudlager
till domen. Kontot gick från 87 733 till 87 128 krediter, alltså ytterligare
605 krediter utan köp eller uppgradering. Första varianten används från
varje generering. De två effektlagren skapades med SFX v3, sju sekunder,
30 procent prompt influence, utan loop, promptförbättring eller delning.
Det första lagret beskriver ett tungt kosmiskt anslag med subbas och ett
låsande bronsinstrument. Det andra beskriver en bred luftig tryckvåg med
diffus efterklang utan bas, röst eller musik. De blandas till `impact.mp3`.

Tre röstprov skapades med Voice Design. Voice 1 sparades som arbetsversion
under namnet Lunsoraklet medan Henriks lyssningsval inväntades. Röstens ID
är `v4VkqdwiCeqCS0LhAxOW`. Det är en ny fiktiv röst, ingen klon av en person.
Inläsning: Eleven v4, uttryckligt språkval Swedish, stabilitet 0,5 och
likhet 0,75. Tonanvisningar calm, solemn, stern och deadpan användes för
respektive replik. Första generationen av varje replik används.

Filerna ligger i `nextjs-luns-se/public/oracle/audio/`. De hämtas först när
påskägget öppnas. Råa nedladdningar och tillfälliga verktyg ingår inte i Git.
Publicerade filer är bearbetade MP3 filer utan ursprungliga metadata,
44,1 kHz och 128 kbit/s. Talet är mono och effekterna stereo.

| Fil | Innehåll | Längd i sekunder |
|---|---|---:|
| call.mp3 | Du har kallat på Lunsoraklet | 2,72 |
| cosmos.mp3 | Stjärnor och imperier | 5,12 |
| lunch.mp3 | Och dig vela över vad du ska äta | 2,98 |
| invitation.mp3 | Lunchödet och kaffet | 8,54 |
| ritual.mp3 | Universum överväger lunchen | 4,96 |
| verdict.mp3 | Domen | 5,30 |
| declined.mp3 | Beslutet har noterats | 5,30 |
| atmosphere.mp3 | Sömlös rymdatmosfär | 30,04 |
| riser.mp3 | Stegring av sten, metall och luft | 6,61 |
| impact.mp3 | Subbas och luftig domsklang | 7,03 |

FFmpeg kontrollerade att samtliga filer kan avkodas. Uppmätt talnivå efter
bearbetning är mellan minus 18,75 och minus 17,31 LUFS. Högsta uppmätta
true peak för talet är minus 2,30 dBTP. Henriks önskemål om basigare röst
löses med ungefär en halvtons sänkning utan avsiktlig tempoändring och
2,5 dB basförstärkning vid 145 Hz före nivåutjämningen. Råinspelningarna
används vid bearbetningen för att undvika upprepad MP3 komprimering.

Spelaren sänker bakgrund och effekter under replikerna. Talet får nu
3,6 sekunders filtrerad efterklang med 65 ms fördröjning och ett svagt eko
vid 290 ms. Ekots återkoppling är 20 procent. Låga frekvenser filtreras
bort ur efterklangen så att orden inte grumlas. Mastervolym och
kompressor begränsar summan. Detta är mätningar, inte en subjektiv
lyssningsbedömning av rösten eller uttalet.

Ljudregi:

* Inträde: långsam luftförskjutning, dov resonans och glest metalliskt skimmer.
  Ingen melodislinga eller pling.
* Väntan: låg, sömlös rumsatmosfär utan tydlig rytm. Talet ska vara närmast
  lyssnaren och tydligt över bakgrunden.
* Ritual: ett växande tryck, som om gammal sten och metall sätts i rörelse.
  Tystnad precis före domen ger plats åt avslutningen.
* Dom: ett tungt basanslag och en bred luftig efterklang. En separat
  ljudkanal gör att den föregående tystnaden inte tonar bort anslaget.
  Berättarrösten börjar efter 1,5 sekunder, då domsljudet sänks.

Det färdiga domsljudet mäter minus 18,75 LUFS och minus 3,03 dBTP.
Det når över minus 40 dB ungefär 17 ms efter filens början. Filtrerad
RMS nivå är minus 20,61 dB i bandet 30 till 90 Hz och minus 36,13 dB i
bandet 2 till 10 kHz. Detta bekräftar bas och luftigt innehåll i filen,
inte hur det upplevs i en viss högtalare. Ändrade filer får versionsfrågan
`v=2` i ljudadressen för att äldre inspelningar inte ska återanvändas ur cache.

`oracleTiming` använder inläsningens längd för fasbyten och textens inträde.
En gemensam pausbar klocka driver fasbyten och scenens kamera. Ljud och bild
pausas tillsammans när fliken döljs. Pågående och schemalagda repliker
stoppas när besökaren går vidare eller stänger. Minskad rörelse hoppar över
inträde och ritual men behåller talet i val, dom och avböjning. Ljudknappen
styr allt ljud. Nätverksfel får inte blockera den textbaserade lottningen.
Inläsningen av filer avbryts efter tio sekunder och stängning avbryter direkt.

## Bildkälla

Projektfil: `nextjs-luns-se/public/oracle/oracle-entity.webp`.
Genererad med det inbyggda bildverktyget, utan API nyckel. Originalet ligger
under Codex generated_images. WebP filen är formatkonverterad för webben.

Slutlig prompt:

> Use case: stylized-concept. Asset type: premium game cinematic character cutout, for a real-time cosmic lunch oracle scene. Create one extraordinarily detailed monumental ancient celestial oracle head and upper shoulders, fully frontal, centered, perfectly symmetrical silhouette, with genuine transparent background. A majestic nonhuman weathered obsidian and dark porcelain sculpted face, fine metallic gold seams like a repaired ancient ceramic relic, deep sculptural eye sockets with restrained molten gold light inside, intricate layered engraved bronze crown suggesting the radial geometry of an ancient ceremonial dinner plate, impossibly old and quietly judgmental. Long dark stone shapes form a beard and temple architecture merging into the shoulders, but no human hair. A monumental god in a lavish cinematic science fiction game, not a cartoon plate, not a cute robot. Tangible physically based materials with scratches, pitted ceramic, oxidized bronze, microdetail. Dark dramatic chiaroscuro with a cold cyan rim light on left and a warm gold rim light on right, very little front fill, still readable facial structure. Face should occupy upper two thirds and shoulders bottom third, entire crown visible with padding all around. Faint gold glowing fissures across brow. No extra objects, no floating rings, no utensils, no stars, no background nebula, no labels or text, no watermark. The expression is solemn and overwhelmingly serious about a trivial lunch decision. This will be composited over procedural volumetric space and moving 3D astrolabe rings.

## Verifiering av andra versionen

2026-10-24: sju Node tester inklusive minnestester, TypeScript och statiskt
produktionsbygge passerar. Testservern byggdes utan skrapning. I datorvy
1280 × 900 och mobilvy 390 × 844 verifierades den nya gestalten, kamerafärden,
ringarna, dimman, ritualen, källans resultat och stängning med Escape mitt
under animationen. Fokus stannade i dialogen och återöppning fungerade.
Webbläsaren rapporterade inga grafikfel eller varningar. En utstickande
animationsyta under ritualen begränsades till dialogens bredd.

Varken den stora grafikfilen eller porträttets URL fanns i initial HTML.
Porträttet är 510512 byte som WebP. Första sidladdningens JavaScript blev
144 kB enligt Nexts byggsammanfattning. Bilden och 3D paketet hämtas först
vid aktivering. Ingen nyhet eller publicering till main ingick.

Detta är visuell kontroll i webbläsaren på dator, inte ett mätprotokoll från
en fysisk iPhone. Ljudets subjektiva kvalitet är inte verifierad genom
lyssning här. En fullt modellerad figur återstår som ett separat steg.

## Verifiering med inspelat ljud, 2026-10-24

Nio Node tester inklusive minnestester, TypeScript och statiskt
produktionsbygge passerar. Testservern byggdes utan skrapning från
`6679fed`. Samtliga tio ljudfiler svarar med HTTP 200 och `audio/mpeg`.
Deras SHA256 stämmer med de lokala produktionsfilerna. Tillsammans är de
1 232 152 byte. Ingen ljudfil förladdas i initial HTML. Första
sidladdningens JavaScript är nu 145 kB enligt byggsammanfattningen.

I datorvy verifierades inträde, inbjudan, ritual, källans slumpade rätt,
avböjning, ljudknapp och återöppning. Textens fördröjningar följer de
avkodade replikerna. I mobilvy 390 × 844 ryms text och kontroller utan
horisontell överströmning. Escape under ritualen stänger dialogen och
återställer fokus till loggan. Inga fel eller varningar registrerades i
webbläsaren. Den tillfälliga mobilstorleken återställdes efter kontrollen.

Det pausbara förloppets tidsberäkning och marginalerna runt längre
repliker verifierades med automatiska tester. Fysisk iPhone, högtalarnas
upplevda ljudnivå, uttal och röstens konstnärliga kvalitet behöver
bedömas genom Henriks provlyssning. Voice 1 är fortsatt arbetsversionen.
