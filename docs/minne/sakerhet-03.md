# Importerad kunskap: Tooling — tre källor, och de säger inte samma sak

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/sakerhet-2026-09-17.md, rader 20–128. Nya lärdomar hör i ämnesfilerna.

## Tooling — tre källor, och de säger inte samma sak

**1. Dependabots alerts-API är nåbart nu.** Tidigare omgångar noterade motsatsen
(`gh` saknades, ingen token). Det stämmer inte längre — `gh` finns på dev01 och
dess token räcker för alerts:

```bash
gh api repos/Henchibench/luns.se/dependabot/alerts --paginate
```

Det är den auktoritativa listan över vad GitHub faktiskt larmar om, och det är
den som genererar mailen Henrik får. Börja här: det ger svar på "finns det något
öppet?" på en sekund, i stället för elva curl-anrop. `state`-fältet är
`open`/`fixed`/`dismissed`. Fältet `fixed_at` säger när det stängdes.

Code scanning och secret scanning svarar däremot `403` med den här token — de
går inte att kontrollera härifrån.

**Ett Dependabot-mail besvaras med larmnumret, inte med paketnamnet.** Mailen
Henrik får länkar till *advisory-sidan* (`github.com/advisories/GHSA-…`), och den
beskriver sårbarheten i paketet för hela världen. Den finns kvar för alltid och
säger ingenting om det här repot — klickar man dit ser det ut som att felet står
kvar även när det lagades för veckor sedan. Repots status står på en annan sida:

```bash
# hitta larmet ur mailets CVE eller GHSA
gh api repos/Henchibench/luns.se/dependabot/alerts --paginate \
  -q '.[] | select(.security_advisory.cve_id=="CVE-…")
      | "#\(.number) \(.state) inkom \(.created_at) stängt \(.fixed_at) — \(.html_url)"'
```

`state` och `fixed_at` är svaret. Öppna larm, och bara de, listas på
<https://github.com/Henchibench/luns.se/security/dependabot?q=is%3Aopen>.

**Samma paket kan larma om och om igen på nya CVE:n.** `fast-uri` har fått fem
high-advisories under 2026 — CVE-2026-6321, -6322, -13676, -16221 och -18446, alla
varianter av samma host confusion, med patcharna 3.1.1, 3.1.2, 3.1.3, 3.1.4 och
3.1.5 i tur och ordning. "Vi lagade fast-uri i juli" duger därför inte som svar
på ett mail om fast-uri. Läs vilket CVE mailet gäller och slå upp *det* larmet.

**2. Advisory-API:t ser mer än alerts-API:t, och det är inte teoretiskt.**
`nanoid@3.3.16` (GHSA-2v37-7h3g-55p8, high) åtgärdades 2026-08-11. Den varningen
har **aldrig funnits som Dependabot-larm** — noll träffar på `nanoid` i hela
alerts-historiken. Den hittades genom att skanna lockfilen paket för paket mot
advisory-API:t. Ett tomt alerts-API betyder alltså inte att lockfilen är ren, och
det är skälet att köra hela skanningen även när GitHub är tyst.

**3. `npm audit` är sist på listan.** Det läser npm-registrets egen spegling av
advisory-databasen, och den släpar. 2026-08-11 visade GitHub två high och
`npm audit` en: `js-yaml@4.3.0` (GHSA-5p4m-2wfm-xmqj, publicerad fem dagar
tidigare) fanns inte i registerdatan alls — inte som "moderate", inte som
"fixad", utan som ingenting. Kör det som andra åsikt; när källorna är oense
vinner advisory-API:t.

**`NODE_ENV=production` i skalet får `npm audit` att ljuga, och det ser inte ut
som ett fel.** Uppmätt 2026-09-02: samma lockfil, samma minut, två svar.

```bash
npm audit                 # found 0 vulnerabilities     <- NODE_ENV=production ärvt
env -u NODE_ENV npm audit # 2 vulnerabilities (1 low, 1 high)
```

npm läser `NODE_ENV` som `omit=dev` och hoppar då över dev-beroendena — tyst,
utan att nämna att den utelämnat något. **Varje sårbarhet i det här repots
historia har varit dev-transitiv**, så det gör `npm audit` exakt värdelöst
just här, och på det mest bedrägliga sättet: det svarar "rent".

Det är samma ärvda miljö som beskrivs i rotens `CLAUDE.md` och som får bygget
att falla på `tailwindcss` — ett skal som kommer ur en `next start`, eller en
agent som startats därifrån. `env | grep NODE_ENV` innan du tror på ett rent
`npm audit`, precis som före ett bygge. Registret självt släpade **inte** den
här gången: kört med rensad miljö mot den gamla lockfilen gav `npm audit` båda
browserslist-rådgivningarna korrekt.

**4. En ren skanning ruttnar av sig själv.** Advisory-API:t svarar med
*granskade* rådgivningar, och granskningen kommer ofta långt efter
publiceringen. `postcss-selector-parser@6.1.2` (GHSA-w9m9-85wc-3x92, low)
publicerades 2026-05-26 men granskades först 2026-09-01 — därför gav
skanningen 2026-08-19 noll träffar på exakt samma version, helt korrekt, och
träffar nu utan att en enda rad i lockfilen har ändrats. Slutsatsen: "vi
skannade rent i augusti" säger ingenting om september. Skanna om, varje gång.

### Skanningen, och en kontroll man ska göra

```bash
cd nextjs-luns-se
jq -r '.packages | to_entries[] | select(.key != "" and .value.version)
       | "\(.key | sub("^.*node_modules/";""))@\(.value.version)"' \
  package-lock.json | sort -u > /tmp/pkgs.txt
cd /tmp && split -l 40 pkgs.txt "chunk_$$_"
for f in chunk_$$_*; do
  curl -s --get --data-urlencode "affects=$(paste -sd, "$f")" \
    'https://api.github.com/advisories?ecosystem=npm&per_page=100' \
    | jq -r '.[] | "\(.severity)\t\(.ghsa_id)\t\(.summary)"'
done | sort -u
```

**Tomt svar och trasigt anrop ser likadana ut.** Loopen skriver ingenting både
när allt är rent och när curl faller, `jq` får skräp eller kvoten (60/timme utan
token) tar slut. Verifiera därför alltid två saker innan du tror på ett tomt
resultat: att varje anrop gav `http=200`, och att ett kontrollprov med en känd
sårbar version ger träff. `js-yaml@4.3.0` duger — den ska ge
GHSA-5p4m-2wfm-xmqj, medan `js-yaml@4.3.1` ska ge tomt.

Deduplicera på `name@version`, **aldrig på namnet ensamt.** Lockfilen bär just nu
`ansi-regex`, `ansi-styles`, `debug`, `emoji-regex`, `eslint-visitor-keys`,
`fast-glob`, `glob-parent`, `ignore` och `picomatch` i två versioner var. Faller
en rad bort är det den sårbara kopian du tappade.


<!-- Slut på importerade källblock. -->
