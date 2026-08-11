# Security Loop State — luns.se

_Last updated: 2026-08-11_
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

## Tooling note — `npm audit` räcker inte, och det är inte en detalj

Dependabots **alerts-API är fortfarande inte nåbart härifrån** — `gh` finns
inte installerat och ingen token är satt.

Den tidigare antagandet i den här filen, att `npm audit` frågar samma källa som
Dependabot, **stämmer inte**. `npm audit` läser npm-registrets egen spegling av
GitHub Advisory Database, och den speglingen släpar. Den här omgången hade
GitHub två high-varningar medan `npm audit` visade en. Den som saknades
(`js-yaml`, publicerad fem dagar tidigare) fanns inte i npm-registrets data alls
— den syntes alltså inte som "moderate" eller "fixad", utan som ingenting.

**Använd GitHubs advisory-API i stället.** Det är publikt och kräver ingen
token, till skillnad från alerts-API:t:

```bash
cd nextjs-luns-se
jq -r '.packages | to_entries[] | select(.key != "" and .value.version)
       | "\(.key | sub("^.*node_modules/";""))@\(.value.version)"' \
  package-lock.json | sort -u > /tmp/pkgs.txt
cd /tmp && split -l 40 pkgs.txt chunk_
for f in chunk_*; do
  curl -s --get --data-urlencode "affects=$(paste -sd, "$f")" \
    'https://api.github.com/advisories?ecosystem=npm&per_page=100' \
    | jq -r '.[] | "\(.severity)\t\(.ghsa_id)\t\(.summary)"'
done | sort -u
```

`affects` tar en kommaseparerad lista `paket@version` och svarar med exakt de
advisories vars sårbara intervall täcker versionen. 423 paket blir elva anrop,
väl under de 60/timme man får utan token. Kör `npm audit` också — men lita på
listan ovan när de två inte är överens.

**Push-utdata är en gratis kontrollsiffra.** `git push` skriver ut hur många
varningar GitHub ser på default-grenen. Stämmer inte den siffran med vad du
hittat har du inte hittat allt. Det var precis så den andra varningen upptäcktes
den här gången.

## Open Alerts

### npm (`nextjs-luns-se`)

Båda var **high**, vilket matchar de två varningar GitHub rapporterade på
default-grenen.

| # | Paket | Allvarlighet | Advisory | Typ | Sårbart intervall | Fix |
|---|---|---|---|---|---|---|
| 1 | `nanoid` | **High** (CVSS 5.9, CWE-835) | GHSA-2v37-7h3g-55p8 — egna generatorer kan loopa oändligt när `size` är noll | transitiv, **produktion** (`next` → `postcss` → `nanoid`, installerad 3.3.16) | `<3.3.17` | `nanoid@3.3.17` |
| 2 | `js-yaml` | **High** (CVSS 7.5) | GHSA-5p4m-2wfm-xmqj / CVE-2026-59870 — kvadratisk CPU-förbrukning vid `!!omap`-upplösning, publicerad 2026-08-06 | transitiv, **dev** (`eslint` → `@eslint/eslintrc` → `js-yaml`, installerad 4.3.0) | `>=4.0.0, <4.3.1` | `js-yaml@4.3.1` |

**Varning nr 2 syntes inte i `npm audit`** — se tooling-noten ovan.

### Python

- `requirements.txt` — `pip-audit`: inga kända sårbarheter.
- `requirements-dev.txt` (playwright) — `pip-audit`: inga kända sårbarheter.

### GitHub Actions

`actions/checkout@v5`, `setup-python@v6`, `setup-node@v5`,
`upload-pages-artifact@v5`, `deploy-pages@v5` — alla på aktuell major.

### Totalt

Critical: 0 · **High: 2** · Moderate: 0 · Low: 0

## Triage

### Alert 1 — nanoid (High, GHSA-2v37-7h3g-55p8)

- **Patchad version finns?** Ja, `nanoid@3.3.17`.
- **Nåbar i det här projektet?** Nej i praktiken. `nanoid` dras in av `postcss`
  under bygget, och den sårbara koden kräver att en **egen** generator anropas
  med `size = 0`. Postcss enda anrop är `nanoid(6)` i `lib/input.js` (för att
  namnge en css-input) — fast storlek, ingen egen generator, ingenting som
  kommer från indata. Inget i den exporterade sajten kör nanoid.
  Allvarlighetsgraden är hög men angreppsytan här är noll.
- **Uppgraderingsrisk:** mycket låg.

#### Vald åtgärd

Fixen togs **uppströms i stället för genom att pinna barnet**: `postcss@8.5.26`
kräver redan `nanoid ^3.3.17`, så `postcss`-overriden höjdes `^8.5.23` →
`^8.5.26` (och samma bump i `devDependencies`, så de två inte glider isär). Ett
eget `nanoid`-override hade tvingat hela trädet till 3.x-serien och blivit ett
hinder den dag något dev-beroende vill ha nanoid 5, som är ESM-only.

Efter `npm install` löser trädet `postcss@8.5.26` → `nanoid@3.3.18`.

### Alert 2 — js-yaml (High, GHSA-5p4m-2wfm-xmqj)

- **Patchad version finns?** Ja, `js-yaml@4.3.1`. Advisoryn noterar att fixen
  för CVE-2026-59870 inte backportades, men det gäller 3.x — 4.x-linjen har
  4.3.1.
- **Nåbar i det här projektet?** Nej. `js-yaml` är ett **dev-only** transitivt
  beroende via `eslint` → `@eslint/eslintrc`, som läser eslint-konfiguration
  från repot självt. Angreppet kräver att man matar in fientlig YAML med
  `!!omap`; här läses bara våra egna konfigfiler, och paketet följer inte med i
  den statiska exporten.
- **Uppgraderingsrisk:** mycket låg, patchversion.

#### Vald åtgärd

Overriden höjdes `^4.3.0` → `^4.3.1`. Notera mönstret: overriden stod på
`^4.3.0` och den versionen var precis den sårbara — **ett override som redan
finns skyddar inte, det låser fast**. Samma sak hände i juni, då `^4.1.1`
pekade rakt på det sårbara `4.1.1`. Läs alltid av vilken version som faktiskt
hamnade i lockfilen, inte vad intervallet ser ut att tillåta.

## Verifiering

- **GitHubs advisory-API mot alla 423 paket i lockfilen** → noll träffar.
- `npm audit` → **found 0 vulnerabilities**.
- `pip-audit` mot båda requirements-filerna → rent.
- `scripts/testserver.sh` → skrapning av 29 restauranger utan fel, `npm ci` +
  `npm run build` gick igenom, statisk export av alla sidor.

## Status

Juni-omgångens `js-yaml`-varning (GHSA-h67p-54hq-rp68, moderate) är en **annan**
advisory än nr 2 ovan och är löst sedan tidigare.

Kvar att ta ställning till, utanför den här omgången: `.github/security-loop.md`
säger fortfarande åt den schemalagda agenten att använda `npm audit` som
auktoritativ skanning, och att bara åtgärda critical/high automatiskt. Den
första punkten är nu känt otillräcklig — se tooling-noten.

## DONE

Båda high-varningarna åtgärdade, advisory-API:t, `npm audit` och `pip-audit`
rena och bygget grönt.
