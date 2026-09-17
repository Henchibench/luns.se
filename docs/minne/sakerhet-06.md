# Importerad kunskap: Status

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/sakerhet-2026-09-17.md, rader 257–273. Nya lärdomar hör i ämnesfilerna.

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

Det värvet fick sitt kvitto 2026-09-02: `browserslist` hade två high utan att
Dependabot sagt ett ord, och utan `dependabot.yml` fanns ingen PR som väntade.
Det som fångade det var kontrollen som skannar lockfilen själv.


<!-- Slut på importerade källblock. -->
