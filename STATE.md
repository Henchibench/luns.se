# Security Loop State — luns.se

_Last updated: 2026-06-17_
_Branch: `claude/luns-se-security-loop-pmzteb`_

## Phase 1: Repository Understanding

**Project:** A static web app that scrapes and displays lunch menus from
restaurants near Lindholmen Science Park, Gothenburg. Python scrapers generate
JSON; a Next.js site is exported as a static site and hosted on GitHub Pages.

### Tech stack (two distinct ecosystems)

| Area | Stack | Manifest |
|------|-------|----------|
| Scrapers | Python 3.12 | `requirements.txt` |
| Frontend | Next.js 15 / React 18 / TypeScript 5 | `nextjs-luns-se/package.json` + `package-lock.json` |

### Dependency manifest files
- `requirements.txt` — Python scraper deps: `beautifulsoup4`, `requests`, `lxml` (all **unpinned**).
- `nextjs-luns-se/package.json` — Node deps (`next ^15.5.19`, `react ^18`, `react-dom ^18`) + dev tooling (eslint, tailwind, typescript, postcss).
- `nextjs-luns-se/package-lock.json` — full resolved lockfile (433 packages: 18 prod, 380 dev, 61 optional).
- `package.json` already contains an `overrides` block pinning several transitive deps (js-yaml, glob, minimatch, ajv, fast-uri, postcss, brace-expansion) — evidence of prior Dependabot remediation.

### CI workflows
- `.github/workflows/scrape-and-deploy.yml` — the only workflow.
  - Triggers: cron (Mon/Tue mornings) + `workflow_dispatch`.
  - Steps: Python 3.12 → `pip install requests beautifulsoup4 lxml` → run scrapers → Node 20 → `npm ci` → `npm run build` → upload + deploy to GitHub Pages.
  - No test job, no lint job, no `npm audit`/`pip-audit` gate in CI.

### Test / verification commands available
- **Frontend:** `npm run build` (Next.js production build / static export — this is the de-facto CI check), `npm run lint`, `npm run dev`. No unit-test suite present.
- **Python:** No test suite; verification is running `python scripts/scrape_menus.py`.
- **Audit:** `npm audit` (works — network available) and `pip-audit -r requirements.txt`.

## Open Alerts

### Tooling note
There is **no Dependabot-alerts API exposed** through the available GitHub MCP
tools, and the `gh` CLI is not available in this environment. Dependabot draws
its data from the GitHub Advisory Database; `npm audit` and `pip-audit` query
the same advisory source, so they were used as the authoritative scan. No open
Dependabot **PRs** exist (only open PR is #61 "Choose default rest", unrelated).

### npm (`nextjs-luns-se`) — `npm audit`
| # | Package | Severity | Advisory / CVE | Type | Depended-on file | Vulnerable range | Fix |
|---|---------|----------|----------------|------|------------------|------------------|-----|
| 1 | `js-yaml` | **Moderate** | GHSA-h67p-54hq-rp68 (CWE-407, CVSS 5.3) — quadratic-complexity DoS in merge-key handling via repeated aliases | transitive, **dev-only** (`"dev": true` in lockfile; eslint toolchain) | `nextjs-luns-se/package-lock.json` (installed `js-yaml@4.1.1`) | `<=4.1.1` | `js-yaml@4.2.0` |

> Note: the existing override pins `js-yaml: ^4.1.1`, which still resolves to the
> vulnerable `4.1.1`. The advisory range is `<=4.1.1`, so the override must be
> raised to `^4.2.0` to take effect.

### Python (`requirements.txt`) — `pip-audit`
- **No known vulnerabilities found.** (`beautifulsoup4`, `requests`, `lxml`.)

### Totals
- Critical: 0 · High: 0 · **Moderate: 1** · Low: 0

## Triage

### Alert 1 — js-yaml (Moderate, GHSA-h67p-54hq-rp68)
- **Patched version available?** Yes — `js-yaml@4.2.0` (drop-in patch release).
- **Reachable in this project?** **No.** `js-yaml` is a **dev-only** transitive
  dependency of the eslint/eslint-config-next toolchain. It is not part of the
  static Next.js export shipped to GitHub Pages, and it never parses
  attacker-controlled YAML at runtime. The DoS requires parsing untrusted YAML
  containing merge keys with repeated aliases — not a code path that exists in
  the deployed site or the build pipeline's trusted inputs.
- **Upgrade risk:** **Very low.** `4.1.1 → 4.2.0` is a patch bump; the fix is via
  the existing `overrides` block (change `^4.1.1` → `^4.2.0`). No application
  code imports js-yaml directly. Risk is limited to a possible `npm ci` lockfile
  refresh; verified by `npm run build`.

### Prioritized action list
1. **(Low urgency)** Bump the `js-yaml` override in `nextjs-luns-se/package.json`
   from `^4.1.1` to `^4.2.0`, regenerate `package-lock.json`, and verify with
   `npm run build`. Branch: `fix/dependabot-js-yaml`.
   - Severity moderate + not reachable (dev-only) → low real-world risk; safe,
     trivial fix worth taking to keep `npm audit` clean.

### Stop-condition status
- Critical/High alerts: **0 outstanding** → the hard "critical & high resolved"
  bar is already met. The single open item is Moderate and dev-only.
- Iteration count: 1 (well under the 10 limit). Progress was made.

## Fix Applied (human-approved 2026-06-17)

Triage was reviewed and the recommended fix approved.

### Alert 1 — js-yaml — RESOLVED
- Branch: `fix/dependabot-js-yaml`.
- Change: `nextjs-luns-se/package.json` override `js-yaml: ^4.1.1` → `^4.2.0`;
  `package-lock.json` regenerated (`npm install`) — `js-yaml` now resolves to
  **4.2.0** (patched).
- Verification:
  - `npm audit` → **found 0 vulnerabilities**.
  - `npm run build` → **succeeded** (compile, lint/type-check, static export of
    all 4 pages all pass).

### Stop condition — DONE
- Critical/High alerts: 0. Remaining Moderate alert (js-yaml) now resolved.
- `npm audit` clean (0 vulns), `pip-audit` clean, CI build passing.
- All known Dependabot/advisory findings resolved with passing verification.
