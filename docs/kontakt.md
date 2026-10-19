# Kontaktformulär

Beställt och byggt 2026-10-19: Tips & kontakt, valfri e-post och Turnstile.
Sajten förblir statiskt exporterad på GitHub Pages. En separat Cloudflare
Worker verifierar inskickningen och har stöd för att skicka via Resend.
Mottagaren är enligt Henrik `luns.se@outlook.com`. Resend är ännu inte anslutet.

## Test och produktion

- `workers/contact/worker.mjs` är mottagaren, utan npm-beroenden.
- `workers/contact/wrangler.jsonc` gäller **bara testmiljön**.
- Test-Worker: `luns-contact-preview`, kontot `8ce9451d9f605299a2384ec40a009581`.
- Endpoint: `https://luns-contact-preview.luns-se-hench.workers.dev/contact`.
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

Ändra aldrig test-Worker till live. Produktionskopplingen ska vara en separat
Worker och Turnstile-widget med enbart `luns.se`/`www.luns.se` som förväntade
hostnames. Kopiera inte de lokala origin-värdena till produktion.
Att pusha Dev eller köra Actions uppdaterar inte Worker-koden automatiskt.
Den levereras separat genom Cloudflare MCP eller autentiserad Wrangler med
exakt konfigurationsfil. Vid MCP-uppladdning ska `keep_bindings: ["secret_text"]`
bevara befintliga secrets; skriv aldrig ut dem.

## Vad Henrik behöver ordna för mejl

1. Skapa konto på Resend. Lägg till en avsändardomän, gärna `kontakt.luns.se`,
   och de exakta DNS-poster Resend visar hos domänens DNS-leverantör.
   Inga befintliga MX-poster för vanlig inkommande e-post ska ersättas.
2. Vänta på status Verified i Resend. Välj avsändare, exempelvis
   `Luns <formular@kontakt.luns.se>`. Adressen är ett förslag, inte verifierad.
3. Skapa en API-nyckel med **Sending access**, begränsad till avsändardomänen.
   Lägg den direkt som Worker-secret `RESEND_API_KEY` i Cloudflare-dashboarden.
   Klistra inte in nyckeln i chatten, git eller ett kommando med klartext.
4. Sätt `CONTACT_FROM` till verifierad avsändare, `CONTACT_TO` till
   `luns.se@outlook.com`, samt `CONTACT_MODE=live` på produktions-Workern.
   Produktionswidgetens `TURNSTILE_SECRET` sätts direkt i samma Workers hemligheter.
5. Uppdatera den publika kontaktkonfigurationen med live-endpoint och sitekey.
   Verifiera riktig inskickning och avvisa återspelning innan Henrik släpper
   sajten via Dev→main. Ett lyckat Resend-svar betyder accepterat för leverans;
   kontrollera också att testmejlet kommer till inkorgen.

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
Slutlig mejlleverans kan inte verifieras innan Resend anslutits.

Källor: [Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[Resend Send Email](https://resend.com/docs/api-reference/emails/send-email),
[Resend-domäner](https://resend.com/docs/dashboard/domains/introduction).
