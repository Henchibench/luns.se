# Importerad kunskap: Repo summary

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/sakerhet-2026-09-17.md, rader 6–19. Nya lärdomar hör i ämnesfilerna.

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


<!-- Slut på importerade källblock. -->
