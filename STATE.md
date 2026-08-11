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

## Tooling note

Dependabots **alerts-API är fortfarande inte nåbart härifrån** — `gh` finns
inte installerat och ingen token är satt. Dependabot hämtar sin data ur GitHub
Advisory Database, och `npm audit` / `pip-audit` frågar samma källa, så de
används som skanning. Det innebär att antalet fynd här kan skilja sig från
antalet rader på repots säkerhetsflik: en alert som redan är åtgärdad men inte
stängd, eller en som gäller något utanför de fyra manifesten, syns inte i en
lokal audit. Vill man matcha listan exakt behöver `gh` eller en token finnas.

## Open Alerts

### npm (`nextjs-luns-se`)

| # | Paket | Allvarlighet | Advisory | Typ | Sårbart intervall | Fix |
|---|---|---|---|---|---|---|
| 1 | `nanoid` | **High** (CVSS 5.9, CWE-835) | GHSA-2v37-7h3g-55p8 — egna generatorer kan loopa oändligt när `size` är noll | transitiv, **produktion** (`next` → `postcss` → `nanoid`, installerad 3.3.16) | `<3.3.17` | `nanoid@3.3.17` |

### Python

- `requirements.txt` — `pip-audit`: inga kända sårbarheter.
- `requirements-dev.txt` (playwright) — `pip-audit`: inga kända sårbarheter.

### GitHub Actions

`actions/checkout@v5`, `setup-python@v6`, `setup-node@v5`,
`upload-pages-artifact@v5`, `deploy-pages@v5` — alla på aktuell major.

### Totalt

Critical: 0 · **High: 1** · Moderate: 0 · Low: 0

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

### Vald åtgärd

Fixen togs **uppströms i stället för genom att pinna barnet**: `postcss@8.5.26`
kräver redan `nanoid ^3.3.17`, så `postcss`-overriden höjdes `^8.5.23` →
`^8.5.26` (och samma bump i `devDependencies`, så de två inte glider isär). Ett
eget `nanoid`-override hade tvingat hela trädet till 3.x-serien och blivit ett
hinder den dag något dev-beroende vill ha nanoid 5, som är ESM-only.

Efter `npm install` löser trädet `postcss@8.5.26` → `nanoid@3.3.18`.

## Verifiering

- `npm audit` → **found 0 vulnerabilities**.
- `pip-audit` mot båda requirements-filerna → rent.
- `scripts/testserver.sh` → skrapning av 29 restauranger utan fel, `npm ci` +
  `npm run build` gick igenom, statisk export av alla sidor.

## Status

Juni-omgångens `js-yaml` (GHSA-h67p-54hq-rp68) är löst sedan tidigare;
overriden står på `^4.3.0`.

## DONE

Alla fynd som går att se ur advisory-databasen är åtgärdade, `npm audit` och
`pip-audit` rena och bygget grönt. Kvarstår att jämföra mot den faktiska
alert-listan på GitHub, vilket kräver `gh` eller en token.
