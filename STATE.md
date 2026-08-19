# Security Loop State — luns.se

_Last updated: 2026-08-19_
_Branch: `Dev`_

## Repo summary

Statisk sajt: Python-skrapor (`requirements.txt`) genererar JSON, Next.js
exporteras statiskt och publiceras på GitHub Pages via
`.github/workflows/scrape-and-deploy.yml`. Två manifest bevakas av Dependabot:

| Ekosystem | Manifest |
|---|---|
| Python (skrapor) | `requirements.txt`, `requirements-dev.txt` |
| Node (frontend) | `nextjs-luns-se/package.json` + `package-lock.json` |

Verifieringskommandot är `npm run build`; det finns ingen testsvit. Fixar för
transitiva npm-beroenden görs via `overrides`-blocket i `package.json`.

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

## Open Alerts

**Inga.** Skanning 2026-08-19:

| Källa | Omfattning | Resultat |
|---|---|---|
| Dependabot alerts-API | hela repot, alla states | 72 larm totalt, **samtliga `fixed`** — 0 öppna, 0 dismissade |
| GitHubs advisory-API | 423 `paket@version` ur `package-lock.json`, 11 anrop | alla `http=200`, **0 träffar** (kontrollprov `fast-uri@3.1.3` gav 2 träffar som väntat) |
| GitHubs advisory-API | 9 `paket@version` ur `.venv-prod` (ecosystem `pip`) | **0 träffar** (kontrollprov `requests@2.31.0` gav 3 träffar) |
| `npm audit` | `nextjs-luns-se` | `found 0 vulnerabilities` |
| GitHub Actions | `checkout@v5`, `setup-python@v6`, `setup-node@v5`, `upload-pages-artifact@v5`, `deploy-pages@v5` | alla på aktuell major |

`pip-audit` finns inte installerat på dev01 och är inget som ska in i
`requirements-dev.txt` — Python-sidan skannas i stället mot advisory-API:t med
`ecosystem=pip`, samma metod som npm-sidan. Skanna de faktiskt installerade
versionerna ur `.venv-prod/bin/pip list --format=freeze`, inte
`requirements.txt`: den är opinnad (`beautifulsoup4`, `requests`, `lxml` utan
versioner), så filen säger ingenting om vad som kör.

Nyckelversioner i lockfilen: `next@15.5.22`, `js-yaml@4.3.1`, `nanoid@3.3.18`,
`sharp@0.35.3`, `fast-uri@3.1.5`, `brace-expansion@5.0.9`, `postcss@8.5.26`.

### De senaste larmen — alla stängda

| # | Paket | Grad | Advisory | Larm inkom | Åtgärdat |
|---|---|---|---|---|---|
| 88 | `js-yaml` (dev, transitiv) | high | GHSA-5p4m-2wfm-xmqj | 2026-08-11 | 2026-08-11 |
| 87 | `fast-uri` (dev, transitiv) | high | GHSA-7p8r-x3mc-p8w7 | 2026-08-05 | 2026-08-05 |
| 86 | `brace-expansion` (dev, transitiv) | high | GHSA-rgw5-rvv9-x895 | 2026-08-04 | 2026-08-05 |
| 85 | `next` (produktion, direkt) | medium | GHSA-q8wf-6r8g-63ch | 2026-07-27 | 2026-07-28 |
| 84 | `sharp` (produktion, transitiv) | high | GHSA-f88m-g3jw-g9cj | 2026-07-26 | 2026-07-28 |

Senaste **critical** var GHSA-9qr9-h5gf-34mp (`next`, RCE i React flight
protocol), inkom 2025-12-03 och åtgärdades 2025-12-16. Ingen critical sedan dess.

### Mailet om CVE-2026-16221 (`fast-uri`) — utrett 2026-08-19

Henrik fick ett mail om `fast-uri vulnerable to host confusion via literal
backslash authority delimiter` och såg sårbarheten stå kvar när han klickade.
Larmet är **#83, stängt sedan 2026-07-28 09:15:29**. Kedjan, för att den är
lärorik:

| När | Vad |
|---|---|
| 2026-07-19 | lockfilen bär `fast-uri@3.1.2` |
| 2026-07-21 | GHSA-v2hh-gcrm-f6hx publiceras: sårbart `>= 3.0.0, <= 3.1.3`, patch `3.1.4` |
| 2026-07-25 | Dependabot öppnar larm #83 → **mailet skickas här** |
| 2026-07-28 09:15:23 | PR #65 *Fix 6 high-severity npm advisories* mergas, `fast-uri` → `3.1.4` |
| 2026-07-28 09:15:29 | larm #83 stängs, sex sekunder efter mergen |
| 2026-08-05 | ny advisory (CVE-2026-18446), larm #87, `fast-uri` → `3.1.5`, stängt samma dag |

Två saker att ta med sig. **Ingen automatik lagade det** — det finns ingen
`.github/dependabot.yml`, så Dependabot larmar men öppnar aldrig
uppdaterings-PR. Varje fix i tabellen ovan är en PR som någon skrev. Och **inget
larm skapades eller ändrades den 18 augusti**; sista larmaktiviteten i repot är
`js-yaml` den 11 augusti. Ett mail daterat senare än larmet är en notis om
något som redan var stängt, inte ett nytt larm — kontrollera alltid `created_at`
på larmet i stället för att lita på mailets datum.

`fast-uri` är dessutom `dev: true` och dras in av `ajv`. Den följer aldrig med i
den statiska exporten, alltså har den aldrig kunnat nå en besökare på sajten.

## Triage

Ingenting att triagera — inget öppet i någon av källorna ovan.

Två mönster från de senaste omgångarna är värda att ha kvar, eftersom båda
kostade tid när de missades:

**Ett override som redan finns skyddar inte, det låser fast.** `js-yaml`-raden
stod på `^4.3.0` och just 4.3.0 var den sårbara versionen; i juni pekade `^4.1.1`
på samma sätt rakt på sårbara 4.1.1. Läs alltid av vilken version som faktiskt
hamnade i lockfilen, inte vad intervallet ser ut att tillåta.

**Ta fixen uppströms när det går.** `nanoid` löstes genom att höja
`postcss`-overriden till `^8.5.26` (som själv kräver `nanoid ^3.3.17`) i stället
för att pinna `nanoid` direkt — ett eget nanoid-override hade låst hela trädet
till 3.x-serien och blivit ett hinder den dag ett dev-beroende vill ha nanoid 5,
som är ESM-only.

## Status

Punkten som stod öppen i förra omgången — att `.github/security-loop.md`
utpekade `npm audit` som auktoritativ skanning — **är löst.** Prompten har skrivits
om och beskriver nu advisory-API-metoden. Kvar i den står fortfarande att
alerts-API:t inte är nåbart utan token; se punkt 1 i tooling-avsnittet ovan, det
gäller inte längre på dev01.

Att det saknas `.github/dependabot.yml` är ett aktivt val att bekräfta: utan den
larmar Dependabot men lagar aldrig själv. Hittills har varje fix skrivits för
hand eller av den här rutinen, vilket fungerat — men det förklarar också varför
ett larm kan stå öppet i tre dygn innan någon rör det.

Ingen åtgärd behövs. Inga grenar eller PR skapade.

## DONE

Noll öppna sårbarheter. Alerts-API:t, advisory-API:t mot samtliga 423
npm-paket och de 9 Python-paketen i `.venv-prod`, `npm audit` och
Actions-versionerna är alla rena. Larmet bakom mailet om CVE-2026-16221 är
spårat och stängt sedan 2026-07-28; se avsnittet ovan.
