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

Förlopp: elva sekunders inträde, inväntat lunchval, åtta sekunders ritual,
sedan domen. Kameran färdas fram, ringarna öppnar sig, källans rätter dras
in och ljudet tystnar före resultatet. Vid minskad rörelse hoppas väntan
över. Bibliotek och gestalt hämtas först när hemligheten öppnas.

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
Animationernas tid ska anpassas till inspelningens verkliga längd när den finns.

Status 2026-10-24: Henrik har uttryckligen godkänt AI tjänster för att skapa
material till Lunsoraklet, exempelvis tal och ljud, och bekräftat att han har ElevenLabs.
Undantaget gäller materialet till detta påskägg. Regeln för övriga projektet
står kvar. Ingen röstfil finns ännu och ElevenLabs väntar på inloggning.
Det inbyggda bildverktyget i ChatGPT användes för bildmaterialet.

## Ljudproduktion

Skapa först ett kort röstprov med inledningens manus. Välj en röst som talar
naturlig svenska och bär humorn utan att låta som en reklamuppläsare.
Godkända repliker sparas som separata ljudfiler. Produktion sker en gång,
inte för varje besökare. Sajten ska spela lokala filer utan nycklar eller
anrop till en taltjänst. Kontrollera kontots rättigheter och tillgängliga
krediter före produktion. Köp eller uppgradering ingår inte i godkännandet.

Ljudregi för nästa version:

* Inträde: en väldig port som öppnar sig långt borta, långsam luftförskjutning,
  dov resonans och glest metalliskt skimmer. Ingen melodislinga eller pling.
* Väntan: låg, sömlös rumsatmosfär utan tydlig rytm. Talet ska vara närmast
  lyssnaren och tydligt över bakgrunden.
* Ritual: ett växande tryck, som om gammal sten och metall sätts i rörelse.
  Tystnad precis före domen ger plats åt avslutningen.
* Dom: en tung men kort klang med lång efterklang. Berättarrösten kommer
  efter anslaget så orden inte dränks.

Låt den riktiga inläsningens längd styra fasbyten. Ljud och bild ska pausas
tillsammans om fliken döljs. Ingen föregående replik får fortsätta när
besökaren går vidare eller stänger. Minskad rörelse ska inte behöva betyda
att tal saknas. Ljudknappen ska styra både tal och effekter.

Förberedelsen verifierades med minnestester och produktionsbygge. Sajtkoden
är oförändrad och befintlig testserver är frisk. Detta verifierar inte någon
ny röst eller något nytt ljud, eftersom produktionen väntar på kontoåtkomst.

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
lyssning här. Tal och en fullt modellerad figur återstår som separata steg.
