# Importerad kunskap: Triage

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/sakerhet-2026-09-17.md, rader 232–256. Nya lärdomar hör i ämnesfilerna.

## Triage

Kvar att ta ställning till: `postcss-selector-parser@6.1.2` → `6.1.3`, low,
dev-transitiv. Inte akut, men den ligger öppen tills någon höjer den.

Tre mönster från de senaste omgångarna är värda att ha kvar, eftersom alla
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

**Lägg inget override när föräldern redan tillåter patchen.** `browserslist`
höjdes 2026-09-02 med enbart `npm update`, eftersom `autoprefixer` ber om
`^4.24.4` och patchen `4.28.7` ryms där. Kolla alltid förälderns intervall
innan du skriver en rad i `overrides` — blocket ska bära de fall där något
faktiskt håller kvar en sårbar version, inte varje paket vi någon gång höjt.


<!-- Slut på importerade källblock. -->
