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

Förlopp: omkring fjorton sekunders inträde, inväntat lunchval, åtta sekunders ritual,
sedan domen. Kameran färdas fram, ringarna öppnar sig och ljudet tystnar
före resultatet. Rättens namn visas först vid domen. Vid minskad rörelse hoppas väntan
över. Bibliotek och gestalt hämtas först när hemligheten öppnas.

Justering 2026-10-24: Henrik upplevde de kringflygande maträtterna under
ritualen som störande. De kom från sex källrätter som animerades i text
ovanpå scenen. Textlagret och dess animation har tagits bort. Ringarnas
rörelse, ljuset och ljudet bär nu ritualen. Själva lottningen är oförändrad.

## Röstmanus

Röstregi: lugn, enorm och lätt uttråkad. Tydlig svenska med torr humor.
Läs naturligt och långsamt, utan att själv pressa rösten mörk. Djup och
rumsverkan läggs på varsamt efteråt så orden förblir begripliga. Ingen
imitation av en känd skådespelare. Leverera gärna varje replik separat.

1. Du har kallat på Lunsoraklet. Jag har sett stjärnor födas. Imperier falla.
   Och dig vela mellan pasta och sushi.
2. Överlämna ditt lunchöde. Trotsa domen, och må ditt kaffe vara ljummet i sju år.
3. Tystnad. Universum överväger din lunch.
4. Det är avgjort. Universum har tallrikt.
5. Ditt beslut har noterats. Av vem är oklart.

Pausen före orden om pasta och sushi är själva skämtet. Den fullständiga
slumpade menyn ska visas som källtext. Den behöver inte talas, vilket gör
att fasta inspelningar kan fungera för alla restauranger utan en taltjänst.
Animationernas tid anpassas till de avkodade ljudfilernas verkliga längd.

Status 2026-10-24: Henrik har uttryckligen godkänt AI tjänster för att skapa
material till Lunsoraklet, exempelvis tal och ljud, och bekräftat att han har ElevenLabs.
Undantaget gäller materialet till detta påskägg. Regeln för övriga projektet
står kvar. Sju repliker och tre effekter har nu skapats via ElevenLabs
webbgränssnitt. Ingen modellnyckel eller ny tjänst i drift behövs på sajten.
Det inbyggda bildverktyget i ChatGPT användes för bildmaterialet.

## Ljudproduktion

Kontot visade Starter och 90 000 krediter före produktion, 87 733 efter.
Förbrukning: 2 267 krediter inom befintligt abonnemang, utan köp eller
uppgradering. Starter omfattar kommersiell användning enligt
[ElevenLabs prislista](https://elevenlabs.io/pricing). Delning till SFX
Explore stängdes av före generering. Inga lösenord eller nycklar lästes ut.

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
| cosmos.mp3 | Stjärnor och imperier | 5,09 |
| lunch.mp3 | Pasta och sushi | 3,19 |
| invitation.mp3 | Lunchödet och kaffet | 8,54 |
| ritual.mp3 | Universum överväger lunchen | 4,94 |
| verdict.mp3 | Domen | 5,28 |
| declined.mp3 | Beslutet har noterats | 5,28 |
| atmosphere.mp3 | Sömlös rymdatmosfär | 30,04 |
| riser.mp3 | Stegring av sten, metall och luft | 6,61 |
| impact.mp3 | Domsklang | 5,04 |

FFmpeg kontrollerade att samtliga filer kan avkodas. Uppmätt talnivå efter
bearbetning är mellan minus 18,29 och minus 16,87 LUFS. Högsta uppmätta
true peak är minus 2,32 dBTP. Spelaren sänker bakgrund och effekter under
replikerna och lägger en låg filtrerad efterklang på talet. Mastervolym och
kompressor begränsar summan. Detta är mätningar, inte en subjektiv
lyssningsbedömning av rösten eller uttalet.

Ljudregi:

* Inträde: långsam luftförskjutning, dov resonans och glest metalliskt skimmer.
  Ingen melodislinga eller pling.
* Väntan: låg, sömlös rumsatmosfär utan tydlig rytm. Talet ska vara närmast
  lyssnaren och tydligt över bakgrunden.
* Ritual: ett växande tryck, som om gammal sten och metall sätts i rörelse.
  Tystnad precis före domen ger plats åt avslutningen.
* Dom: en tung men kort klang med lång efterklang. Berättarrösten kommer
  efter anslaget så orden inte dränks.

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
