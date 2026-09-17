# Importerad kunskap: Testservern — sista steget innan du lämnar över

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/repo-2026-09-17.md, rader 150–243. Nya lärdomar hör i ämnesfilerna.

## Testservern — sista steget innan du lämnar över

`scripts/testserver.sh` kör hela produktionskedjan och servar utfallet på
**<http://10.0.1.34:3002/>** (dev01). Det är där Henrik tittar på ditt jobb
innan han slår ihop Dev med main, och därför är **inget kort klart förrän
servern kör och adressen står i rapporten**.

```bash
scripts/testserver.sh                 # skrapa, bygg, (om)starta servern
scripts/testserver.sh --utan-skrap    # bygg bara om frontenden
scripts/testserver.sh status          # kör den, och vad visar den?
scripts/testserver.sh stopp
```

Den ersätter `scrape_menus.py` + `npm run build` som du körde för hand: samma
kommandon i samma ordning, plus tre saker de inte gjorde.

**Den kör i ett venv utan playwright.** `.venv-prod` byggs ur
`requirements.txt` och speglar det workflowet installerar. Har din skrapa råkat
importera playwright faller den *här*, direkt, i stället för tyst i Actions tre
dagar senare. Det är den enda platsen den fällan faktiskt fångas.

**Den sammanfattar skrapningen** med `scripts/menylage.py`: rätter per veckodag,
en rad per restaurang, med de två felsträngarna utskrivna som fel. Läs tabellen
— det är där du ser att din restaurang fick mat på fem dagar och inte allt på
måndag. Vill du jämföra före och efter din ändring: kopiera undan
`nextjs-luns-se/public/data/menus.json` innan du kör, och kör `menylage.py` mot
kopian efteråt.

**Den märker sidan** med ett gult band överst — gren, commit, byggtid, och om
arbetsträdet har okommittade ändringar. Bandet är ett CSS-pseudoelement på
`html` och injiceras i `out/`, som är gitignorerad. Det kan alltså varken följa
med en commit eller hamna på den riktiga sajten. En `<div>` gick inte: React
hydrerar hela dokumentet och rensar bort noder den inte känner igen, så bandet
försvann efter en sekund och sidan såg skarp ut precis när man började läsa den.

Går något fel avbryter skriptet och rör **inte** den körande servern. En gammal
version uppe är bättre än en trasig sida, och bandet visar när den byggdes.

Låt servern stå kvar när du är klar — Henrik ska kunna titta i morgon bitti utan
att starta något. Nästa kort bygger om och startar om den. Efter en omstart av
dev01 är den borta, med flit: en gammal sajt utan avsändare är sämre än ingen.

**Den bygger med rensad miljö**, och det är inte kosmetik. Kör du skriptet ur
ett skal som ärvts från en `next start` — eller ur en agent som startats där —
följer `NEXT_*`, `__NEXT_*` och `TURBOPACK=1` med hela vägen in i bygget.
`TURBOPACK=1` tvingar turbopack-bygge, och turbopack spricker med
`output: 'export'` på Nexts inbyggda felsidor:

    Error: <Html> should not be imported outside of pages/_document.
    Error occurred prerendering page "/404"

Kompileringen går igenom först, så felet ser ut att sitta i sidkoden — det gör
det inte, ingen fil i repot importerar `next/document`. `NODE_ENV=production`
ur samma arv ger i stället `npm ci` utan devDependencies och ett bygge som
faller på `Cannot find module 'tailwindcss'`. Actions ser ingetdera, eftersom
det startar i ett tomt skal. Skriptet rensar därför båda innan bygget. Bygger
du för hand med `npm run build`: kolla `env | grep -E 'TURBOPACK|NODE_ENV'`
innan du felsöker något annat. Node-versionen har inget med saken att göra.

Samma `NODE_ENV=production` förstör **`npm audit`**, och där syns det inte alls:
npm läser den som `omit=dev`, hoppar över dev-beroendena och svarar `found 0
vulnerabilities` utan att nämna vad den utelämnat. Alla sårbarheter repot haft
har varit dev-transitiva, så svaret blir "rent" precis när det inte är det.
Kör `env -u NODE_ENV npm audit`. Uppmätt 2026-09-02, mer i `STATE.md`.

Och när kontrollen larmar på ett paket vars intervall i `package.json` redan
rymmer den fixade versionen: **intervallet är inte det som är installerat.**
Det gäller `overrides` och vanliga `dependencies` lika mycket. `fast-uri`
stod på `^3.1.4` och låg ändå kvar på sårbara 3.1.5 — `^` *tillåter* en fixad
version, men `npm ci` installerar det `package-lock.json` säger, och lockfilen
rörs inte förrän intervallet inte längre rymmer den låsta versionen. Höj därför
golvet till den fixade versionen (`^3.1.6`) och kör `npm install`, så att låset
tvingas flytta. Kontrollera med `npm ls <paket> --all --include=dev` att
versionen faktiskt bytts — inte med att intervallet ser rätt ut. Uppmätt
2026-09-03 på `fast-uri`, och igen 2026-09-09 på `next`: `^15.5.22` i
`dependencies` hade rymt fixade 15.5.24, men låset satt kvar på 15.5.22.
Samma åtgärd, samma kontroll. Låset landar gärna över golvet du satte —
15.5.25, inte 15.5.24 — och det är rätt, det är `npm ls` som avgör.

Står paketet inte alls i `package.json` är det samma sak med ett steg till:
lägg ett **nytt** `overrides`-golv på den fixade versionen. Uppmätt 2026-09-10
på `@humanfs/node` (via eslint) och `postcss-selector-parser` (via tailwindcss)
— båda uppströmsintervallen, `^0.16.6` och `^6.1.2`, rymde redan fixen, så
ingenting i trädet tvingade låset att flytta. Det är därför `npm audit` kan
larma på ett paket där varenda intervall ser rätt ut.

Två saker som ser ut som fel och inte är det: sidan frågar efter område första
gången (välj Lindholmen eller Mjärdevi, annars står det "0 rätter"), och
`stats.json` ger 404 lokalt eftersom besöksstatistiken bara hämtas i Actions.

Kontrollera i webbläsaren att restaurangen dyker upp under rätt område. Att den
står under fel område, eller som `Unknown`, syns inte i skrapans utdata.


<!-- Slut på importerade källblock. -->
