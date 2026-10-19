# Kontaktformulär

Beställt och byggt 2026-10-19: Tips & kontakt, valfri e-post och Turnstile.
Sajten förblir statiskt exporterad på GitHub Pages. En separat Cloudflare
Worker verifierar inskickningen och har stöd för att skicka via Resend.
Nyheten Tips & kontakt innehåller Henriks bifogade ”Help me help you”-meme
(oförändrad bild i `public/images/news/`). Nyheten och bilden följer samma
aktiveringsvillkor som formuläret; nyhetsversion 11 behålls inför samma släpp.
Mottagaren är enligt Henrik `luns.se@outlook.com`. Resend anslöts 2026-10-20
efter att Henrik bekräftat Verified för `kontakt.luns.se` hos Resend.

## Test och produktion

- `workers/contact/worker.mjs` är mottagaren, utan npm-beroenden.
- `workers/contact/wrangler.jsonc` gäller **bara testmiljön**.
- `workers/contact/wrangler.production.jsonc` gäller `luns-contact`, skapad
  2026-10-19 som separat mottagare för riktiga mejl. Produktionsfilen är en
  avstängd mall. Aktuell driftsättning följer i stället
  `wrangler.mail-test.jsonc`: `CONTACT_MODE=mail-test`, workers.dev på,
  enbart origin `http://10.0.1.34:3002`, testwidgetens secret och avsändaren
  `Luns <formular@kontakt.luns.se>`. Produktionsorigins accepteras inte.
  Resend-nyckeln läggs där under Settings → Variables and Secrets → Add,
  Type Secret, namnet `RESEND_API_KEY`. Inget mejl skickas av att nyckeln sparas.
- Test-Worker: `luns-contact-preview`, kontot `8ce9451d9f605299a2384ec40a009581`.
- Demo-endpoint: `https://luns-contact-preview.luns-se-hench.workers.dev/contact`.
- Testservern använder nu `https://luns-contact.luns-se-hench.workers.dev/contact`
  med publik mode `live` eftersom inskickningar ger riktiga mejl.
- Turnstile: Managed, no_clearance, bara `10.0.1.34`, `localhost`, `127.0.0.1`.
  Secret ligger i Workerns krypterade binding `TURNSTILE_SECRET`, aldrig i git.
- `CONTACT_MODE=demo` verifierar på riktigt men sparar eller mejlar inget.
  Svaret innehåller `demo:true`; gränssnittet säger uttryckligen att inget skickats.
- `scripts/testserver.sh --utan-skrap` kopierar `preview-public.json` enbart till
  exporterade `out/contact-config.json`. Nyckeln där är publik, inte hemlig.
- Källfilen `public/contact-config.json` har läget `disabled`. Ett vanligt
  produktionsbygge döljer Kontakt och Rapportera fel tills kopplingen är klar.
  Den befintliga mejllänken under inställningar finns då kvar. Nyhetsposten
  för kontakt visas bara där formuläret är aktiverat.

Demo-Workern förblir demo. Mejltest sker på `luns-contact` i läget `mail-test`,
som också i koden kräver exakt testserver-origin. Alla ordinarie kontroller
(Turnstile, engångstoken, fast mottagare, rate limit och Resend) gäller.
`live` avvisar fortfarande de lokala värdarna.
Produktionskopplingen använder den separata Workern `luns-contact`
och ska få en separat Turnstile-widget med enbart `luns.se`/`www.luns.se` som förväntade
hostnames. Kopiera inte de lokala origin-värdena till produktion.
Att pusha Dev eller köra Actions uppdaterar inte Worker-koden automatiskt.
Den levereras separat genom Cloudflare MCP eller autentiserad Wrangler med
exakt konfigurationsfil. Vid MCP-uppladdning ska `keep_bindings: ["secret_text"]`
bevara befintliga secrets; skriv aldrig ut dem.

## Inför publicering

DNS-domänen `kontakt.luns.se` är Verified enligt Henrik 2026-10-20. Resends
DNS-poster är tillagda hos one.com. API-nyckeln ligger som secret i
`luns-contact` och bevaras vid leverans; inga nycklar finns i repot.

Mejltestet använder befintlig testwidget och fast mottagare
`luns.se@outlook.com`. För att publicera senare: skapa en separat
produktionswidget för bara `luns.se` och `www.luns.se`, ersätt
`TURNSTILE_SECRET`, sätt produktionskonfigurationens avsändare och mode `live`
och aktivera dess workers.dev-adress. Uppdatera därefter den publika
kontaktkonfigurationen med produktionswidgetens sitekey. Testservern behöver
då återgå till demo eller få en separat mejltestmottagare; blanda inte de
lokala origins med produktion. Henrik släpper själv Dev→main.

Ett lyckat Resend-svar betyder accepterat för leverans; kontrollera också
leveransstatus eller att testmejlet kommer till inkorgen.

## Flöde och skydd

Kontakt i sidhuvudet och inställningarna öppnar samma formulär. Rapportera fel
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
Riktig leverans ska kontrolleras efter driftsättning.

Källor: [Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[Resend Send Email](https://resend.com/docs/api-reference/emails/send-email),
[Resend-domäner](https://resend.com/docs/dashboard/domains/introduction).
