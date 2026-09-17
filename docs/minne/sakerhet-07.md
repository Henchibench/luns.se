# Importerad kunskap: DONE

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/sakerhet-2026-09-17.md, rader 274–282. Nya lärdomar hör i ämnesfilerna.

## DONE

`browserslist` höjd 4.25.3 → 4.28.8 i lockfilen, vilket stänger både
GHSA-c83g-rgw3-j3cx och GHSA-73wf-gq98-2v4g (båda high, båda utan
Dependabot-larm). Advisory-API:t mot samtliga 424 npm-paket ger därefter en
enda träff, `postcss-selector-parser@6.1.2` (low), som lämnats öppen med flit
— den hör till ett eget kort. Bygget kört och sajten kontrollerad i webbläsaren
efter höjningen.


<!-- Slut på importerade källblock. -->
