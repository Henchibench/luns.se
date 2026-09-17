# Importerad kunskap: Grenen är Dev

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/repo-2026-09-17.md, rader 106–149. Nya lärdomar hör i ämnesfilerna.

## Grenen är Dev

Börja varje arbete med:

```bash
git fetch origin Dev && git checkout Dev && git pull
```

Committa och pusha dit. `main` är det som är publicerat, och dit går arbetet
när **Henrik** släpper det — han har en knapp i hubben som slår ihop Dev med
main. Gör det aldrig själv, och committa aldrig direkt på main.

Knappen i hubben dyker upp när Dev ligger före main, alltså när det finns något
osläppt — den är en grind, inte ett larm. Vad som väntar syns här:

```bash
git fetch origin main
git log --oneline origin/main..Dev      # vad väntar på att släppas
git diff --stat origin/main..Dev        # vilka filer det rör
```

Att main har fler commits än Dev betyder ingenting: varje släpp lägger en
merge-commit på main som aldrig går tillbaka. Det är bara `origin/main..Dev`
som säger om något är osläppt.

**Hubbens kontroll läser main, inte Dev.** Ett paketkort larmar därför om igen
så länge fixen ligger osläppt, och det ser ut som att åtgärden inte tog. Första
kontrollen på ett sådant kort är alltså inte `npm ls` — det är om fixen redan
står i `git log origin/main..Dev`. Gör den det är kortet besvarat och väntar på
knappen; bygg inte om något. Uppmätt 2026-09-03: kontrollen larmade på fast-uri
3.1.5, vilket är precis vad `origin/main` hade i låset medan Dev sedan dagen
innan kört 3.1.7. Samma dag larmade den igen på samma paket under ett *annat*
advisory-id (GHSA-jqff-g426-hqxp i stället för GHSA-5jgf-p345-68v8) — samma
sårbara intervall och samma fixade version. Jämför därför **versionsintervallet**
mot det som är installerat, inte id:t mot commit-meddelandet.

**Brödtexten på ett kort behöver inte höra ihop med larmet.** Ett paketkort
kom 2026-09-03 med hubbens menykorts-mall påklistrad — flera stycken om en
stående meny vars källa ändrats, utan att namnge någon restaurang, medan
`DETALJ` handlade uteslutande om fast-uri. Det är `DETALJ` som är kortet. Gå
inte och leta efter en meny som ska läsas om innan du kontrollerat att någon
faktiskt är utpekad; se `app/scrapers/CLAUDE.md` för hur man ser vilka stående
menyer kontrollen ens bevakar.


<!-- Slut på importerade källblock. -->
