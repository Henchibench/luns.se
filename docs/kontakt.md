# Kontaktformulär

Beställt och byggt 2026-10-19 med valfri e-post och Turnstile.
Formuläret heter sedan 2026-10-20 ”Tjôta med Luns” på Henriks begäran.
Namnet används i formulärrubriken, sidhuvudet, inställningarna och nyheten.
Nyhetstexten pekar ut knappen i menyn högst upp och bjuder även in till ett
glatt ”hallå eller”. Nyhetskortets ”Tjôta here” öppnar samma formulär med valt
område. Nyheter och eventuella inställningar stängs vid övergången, så
formuläret inte hamnar bakom en annan ruta. Knappen finns även om kortet
senare hamnar bland äldre nyheter och döljs när kontakt är avstängt.
Henrik beställde 2026-10-20 även platshållaren ”Start Tjôting...” i Ditt
meddelande. Fältets etikett och validering är oförändrade.
Verifiering av namnbytet och texterna: minnestest, bygge och visuell kontroll på testservern.
Sajten förblir statiskt exporterad på GitHub Pages. En separat Cloudflare
Worker verifierar inskickningen och har stöd för att skicka via Resend.
Nyheten Tjôta med Luns innehåller Henriks bifogade ”Help me help you”-meme
(oförändrad bild i `public/images/news/`). Nyheten och bilden följer samma
aktiveringsvillkor som formuläret. Nyhetsversion 12 inkluderar också automatisk
öppning för återkommande besökare, se utveckling.md.
Mottagaren är enligt Henrik `luns.se@outlook.com`. Resend anslöts 2026-10-20
efter att Henrik bekräftat Verified för `kontakt.luns.se` hos Resend.

## Textmarkering och stängning, 2026-10-20

Henrik rapporterade att formuläret stängdes när text i e-postfältet markerades
med musen och draget släpptes utanför panelen. Overlay stängde på varje click
som nådde bakgrunden; webbläsaren kan rikta ett klick mot gemensam förälder
när tryck och släpp sker på olika element.
Den gemensamma Overlay-komponenten kräver nu att primärknappens tryck och
släpp båda sker direkt på bakgrunden. Capture-händelser registrerar även
tryck i panelen, och pointercancel återställer tillståndet. Textmarkering
kan därmed lämna rutan utan att ett efterföljande bakgrundsklick stänger den.
Stängknappen och Escape använder samma tidigare stängväg. Skyddet gäller
även övriga paneler som använder Overlay. Ingen e-postvalidering ändrades.
Verifiering: minnestest, Next-bygge och drag-/klickkontroll på testservern.

## Test och produktion

Produktionskopplingen förbereddes och driftsattes 2026-10-20 på Henriks
beställning. Frontendändringen ligger på Dev och visas publikt först när
Henrik släppt till main och sajtens publiceringsworkflow byggt den.

- `workers/contact/worker.mjs` är mottagaren, utan npm-beroenden.
- `wrangler.production.jsonc`: `luns-contact`, `CONTACT_MODE=live`, endpoint
  `https://luns-contact.luns-se-hench.workers.dev/contact`, enbart origins
  `https://luns.se` och `https://www.luns.se`. Siteverify måste returnera
  motsvarande exakta hostname och action `contact`.
- Produktionens Managed-widget har sitekey `0x4AAAAAAFcHymVA-ct1e6oe` och
  domänerna `luns.se`/`www.luns.se`, med `no_clearance`.
- Avsändare: `Luns <formular@kontakt.luns.se>`. Fast mottagare:
  `luns.se@outlook.com`. Resend-domänen är Verified hos Resend; DNS finns
  hos one.com. `RESEND_API_KEY` och produktionswidgetens `TURNSTILE_SECRET`
  ligger som krypterade Worker-secrets, aldrig i git.
- `wrangler.jsonc`: separat `luns-contact-preview` i läget `demo`, endpoint
  `https://luns-contact-preview.luns-se-hench.workers.dev/contact`.
  Widgeten `0x4AAAAAAFcEmzXARfJbBm8d` tillåter bara test-IP och loopback.
  Demo verifierar riktiga token men mejlar och sparar inget; gränssnittet
  säger detta uttryckligen. Denna Worker har ingen Resend-nyckel.
- `public/contact-config.json` innehåller produktionsendpoint, publik sitekey
  och `mode=live`. Kontakt, Rapportera fel och nyheten aktiveras vid släpp.
- `scripts/testserver.sh --utan-skrap` ersätter enbart exporterade
  `out/contact-config.json` med `preview-public.json`. Testservern återgick
  därför till demo när produktionskopplingen förbereddes. Produktionsfilen
  i källträdet påverkas inte av testbygget.

Cloudflare-kontot är `8ce9451d9f605299a2384ec40a009581`. Produktionsorigin
accepteras inte av demo-Workern och lokala origins accepteras inte av
produktions-Workern. Det tidigare tillfälliga mejltestets konfigurationsfil
är borttagen för att inte kunna skriva över produktionen av misstag.

Att pusha Dev eller köra Actions uppdaterar inte Worker-koden automatiskt.
Den levereras separat genom Cloudflare MCP eller autentiserad Wrangler med
exakt konfigurationsfil. Vid MCP-uppladdning ska `keep_bindings: ["secret_text"]`
bevara befintliga secrets; skriv aldrig ut dem.

## Släppkontroll, 2026-10-20

För Dev `0c92d6f` byggdes ett separat produktionsbygge. Exporterad kontaktfil
matchar produktionsfilen och har live-läge; ingen gul testbanner injicerades.
Formuläret kontrollerades i webbläsare: inga testlägestexter, knappen heter
”Skicka meddelande” och integritetstexten beskriver riktig leverans.
Lokala förhandsvisningen användes bara för textkontroll, ingen inskickning;
produktionswidgeten ska endast verifiera luns.se/www.luns.se.

Cloudflare API bekräftade att driftsatt `luns-contact` är live, att Resend-
och Turnstile-hemligheternas bindningar samt limiter finns och att avsändare,
mottagare och domänbegränsningar matchar ovan. Inga hemliga värden lästes ut.
Preflight gav 204 för luns.se och www.luns.se, 403 för testservern.
Alla 26 Worker-tester passerade som del av 49 Node-tester. Slutligt riktigt
mejltest från luns.se återstår efter publicering; inga meddelanden skickades
under släppkontrollen.

## Publicering och återställning

Ingen ytterligare Cloudflare- eller Resend-konfiguration behövs inför detta
släpp. Henrik slår ihop Dev till main och kör befintliga **Scrape and Deploy**
via workflow_dispatch, eller låter nästa schemakörning publicera. En merge
ensam publicerar inte sajten. Workflow-filerna har inte ändrats.

Efter publicering: öppna Tjôta med Luns på luns.se och skicka ett testmeddelande.
Riktig leverans till Henriks inkorg är redan bekräftad från testservern;
produktionswidgetens automatiska verifiering kan slutkontrolleras från
produktionsdomänen först när den nya sidan är publicerad.

Vid behov kan formuläret stängas på servern med `CONTACT_MODE=disabled`,
vilket stoppar mejlsändning direkt. `public/contact-config.json` med
`mode=disabled` döljer formulär och kontaktnyhet vid nästa sajtpublicering;
den vanliga mejllänken under inställningar blir då kvar.

## Flöde och skydd

Tjôta med Luns i sidhuvudet och inställningarna öppnar samma formulär. Rapportera fel
förifyller restaurang och område. Meddelande krävs (10–4000 tecken); e-post,
restaurang och område är valfria. Inga kontaktutkast läggs i localStorage eller
analysdata. Cloudflare-scriptet laddas först när formuläret öppnas.

Servern kräver JSON, exakt tillåten origin, rätt Turnstile-action (`contact`),
och att Siteverify returnerar success=true och exakt samma hostname som origin.
Den accepterar högst 24 000 bytes oavsett Content-Length. Cloudflares limiter
släpper igenom fem försök per IP och minut **per Cloudflare-plats**; detta är
spamskydd, inte en global kostnadsgräns. Turnstile-token är engångs och återställs
efter varje försök. Leverantörsfel ger aldrig falsk bekräftelse.

Resend får ren text, fast ämnesprefix, fast mottagare och verifierad avsändare.
Valfri e-post används bara som Reply-To. Ingen automatisk kvittens skickas
(till en adress besökaren kan ha angett utan att äga den). Samma oförändrade
utkast använder samma idempotensnyckel vid retry, så ett oklart nätfel inte
normalt ger dubbla mejl. Resends idempotensskydd gäller 24 timmar.

Ingen egen meddelandedatabas. Cloudflare behandlar tekniska uppgifter för
verifiering/rate limiting; Resend och inkorgen behandlar skickade meddelanden.
Det är alltså kontakt utan krav på identitet, inte ett löfte om teknisk
ospårbarhet. Loggningen innehåller inga meddelanden, tokens eller e-postadresser.

## Verifiering

`node --test workers/contact/worker.test.mjs scripts/minne.test.mjs` testar
anonym/valfri e-post, felaktig indata, body-gräns, origin, rate limit, demo,
Siteverify-fel, action/hostname, återspelning och Resend-fel utan riktiga mejl.
Bygg frontenden och kör testservern. Verifiera dessutom demo med en riktig
Turnstile-token genom formuläret och avvisa återspelning på den driftsatta
endpointen. Uppmätt 2026-10-19 i Safari mot driftsatt test-Worker: Turnstile verifierade
automatiskt, anonym inskickning fick demobekräftelse, en ny token med valfri
e-post gav HTTP 200 och direkt återspelning av samma token gav HTTP 403.
Codex inbyggda webbläsare fick interaktiv kontroll; ingen slutsats om generellt
formulärfel dras av det. Ogiltig token/fel origin avvisades också via HTTP.
2026-10-20: tillagt mejltestläge för riktig inskickning från testservern.
28 tester passerar inklusive separation mellan mejltest, demo och produktion.
Bygget på testservern passerade. Driftsatt endpoint gav HTTP 204 för rätt
preflight, HTTP 403 för produktionsorigin och HTTP 403 för ogiltig token.
Henrik skickade därefter från Safari: formuläret visade riktig bekräftelse
och Resend visade Delivered för mejlet till `luns.se@outlook.com` med ämnet
`[Luns] Annat`. Henrik bekräftade därefter att inskickningen och mejlet fungerade.

Produktionsförberedelse 2026-10-20: separat widget och serverhemlighet,
konfiguration i Dev samt återgång till separat demo på testservern.
Verifierat: produktionens preflight ger 204 för luns.se och www.luns.se,
403 för testservern; demo ger 204 för testservern och 403 för luns.se.
Produktion avvisar ogiltig token med 403 verification. Alla 28 tester och
Next-bygget passerar. Safari verifierade automatiskt och demot gav
”Testet gick bra” efter miljöbytet. Fullständigt formulärtest från luns.se
återstår efter publicering.

Källor: [Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[Resend Send Email](https://resend.com/docs/api-reference/emails/send-email),
[Resend-domäner](https://resend.com/docs/dashboard/domains/introduction).
