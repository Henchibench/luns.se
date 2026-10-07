# Säkerhetskunskap och paketkort

Status: metod sammanställd 2026-09-17; ingen ny sårbarhetsskanning gjord som
del av minnesuppdelningen. Gamla antal öppna larm är historiska mätningar.

- STATE.md från 2026-09-02 är arkiverad. Läs inte dess "Open Alerts" som dagens
  läge: senare arbete kan redan ha ändrat samma paket.
- Identifiera larmet/CVE:t, berörd version och vilket repo/gren som mäts.
  Advisory-sidan beskriver paketets sårbarhet, inte repots nuvarande status.
- Kontrollera om fixen ligger i Dev och väntar på Henriks släpp till main.
  Rättelse verifierad mot Hemhubbs lib/lunsSakerhet.ts 2026-09-17: säkerhets-
  kontrollen läser Dev, inte main. Äldre minne/repo-04.md säger motsatsen.
  Ett kvarstående paketlarm kan bero på gammal mätning, inte ett osläppt Dev.
- Läs lockfilens faktiska version, inte enbart tillåtet intervall eller override.
- npm audit med NODE_ENV=production kan utesluta dev-beroenden. Ange uttrycklig
  omfattning och kontrollera aktuell verktygskonfiguration.
- Ett tomt svar från en skanning är inte bevis på att anropet lyckades.
  Verifiera svarskod, format och täckning; redovisa otillgängliga källor.
- Mät både byggmiljön och eventuell exponering; anta inte att ett gammalt
  resonemang om dev-beroenden gäller för ett nytt paket eller nytt larm.
- Inget nytt skanningsschema, workflow eller automatiskt fixmandat införs här.

Detaljer och tidigare incidenter: minne/register.md → säkerhetsavsnitten.
Ny utredning ska ange datum, källa, berörda versioner och verifierat resultat.

## `sharp` 0.35.5, 2026-10-07

Symptom: Kontrollens mätning på Dev pekade ut GHSA-wq5f-xc86-pv6w, en
minnesrelaterad sårbarhet i `sharp`-binärernas librsvg som under vissa
förutsättningar kan ge kodkörning på glibc-baserad Linux. Egen mätning med
`npm ls sharp --all --include=dev` bekräftade `sharp@0.35.4` via Next. Samma
version fanns i produktionsträdet enligt `npm ls sharp --omit=dev`.

Orsak och lösning: Repots override hade miniminivån `^0.35.4` och lockfilen
höll kvar 0.35.4. Override-gränsen höjdes till `^0.35.5`, vilket flyttade
`sharp`, plattformsbinärerna och deras libvips-paket till utgåvorna som hör
till 0.35.5.

Källa: Kontrollens paketkort, GitHubs granskade advisory och npm-registret,
kontrollerade 2026-10-07. GitHub angav `< 0.35.5` som sårbart och 0.35.5 som
första rättade version; npm-registret hade 0.35.5 som senaste version.
Verifiering: `npm ls` med både `--all --include=dev` och `--omit=dev` visade
endast 0.35.5. Den installerade modulen rapporterade librsvg 2.63.2 och
`env -u NODE_ENV npm audit --omit=dev` gav noll produktionssårbarheter.

## `source-map-js` 1.2.2, 2026-10-06

Symptom: Kontrollens mätning på Dev pekade ut GHSA-68fv-2mgg-jv7q /
CVE-2026-93749, en event-loop-DoS via sektionsoffsetar i indexerade source maps.
Egen mätning med `npm ls source-map-js --all --include=dev` bekräftade
`source-map-js@1.2.1` via `postcss@8.5.26`. Kopian ingick även i
produktionsberoendena genom Next.

Orsak och lösning: `postcss` tillät fortfarande den sårbara versionen och
lockfilen höll kvar 1.2.1. En riktad override till `^1.2.2` flyttade den enda
installerade kopian till den första rättade versionen 1.2.2.

Källa: Kontrollens paketkort, GitHubs advisory-API och npm-registret,
kontrollerade 2026-10-06. GitHub angav `>= 1.0.0, < 1.2.2` som sårbart och
1.2.2 som första rättade version; npm-registret hade 1.2.2 som senaste version.
Verifiering: `npm ls` med både `--all --include=dev` och `--omit=dev` visade
endast 1.2.2. `env -u NODE_ENV npm audit --include=dev` saknade därefter träff
på `source-map-js`; auditens andra, separata träffar ändrades inte inom kortet.

## `braces` 3.0.3, 2026-10-03

Symptom: Kontrollens mätning på Dev pekade ut GHSA-vfj7-8cjw-p6xm /
CVE-2026-93687, en stackutmattnings-DoS vid djupt nästlade mönster.
Egen mätning med `npm ls braces --all --include=dev` bekräftade en deduplicerad
`braces@3.0.3`. `npm explain braces` visade konsumenter under både Tailwind och
ESLint, via `chokidar`, `micromatch` och `fast-glob`.

Status och exponering: Ingen rättad paketversion fanns. GitHubs advisory angav
`<= 3.0.3` som sårbart och saknade `first_patched_version`; npm-registrets
senaste publicerade version var 3.0.3. Paketet är endast ett
dev-beroende (`npm ls braces --omit=dev` var tomt), används vid byggens
globmatchning och följer inte med den statiska sajten. Repots globbmönster är
fasta i versionsstyrd konfiguration, inte indata från webbtrafik. Ingen
paketändring gjordes: en större verktygsmigrering eller en egen fork är inte en
upstream-patch och skulle kräva separat risk- och kompatibilitetsarbete.

Källa: Kontrollens paketkort samt GitHubs advisory och upstream-ärende #70,
kontrollerade 2026-10-03. Verifiering: `npm audit --include=dev` gav high-träff
på advisoryn och `fixAvailable` pekade på en semver-major av Tailwind, medan
`npm view braces version versions --json` fortfarande slutade på 3.0.3.

## `brace-expansion` 5.0.9, 2026-09-30

Symptom: Kontrollens mätning på Dev pekade ut tre DoS-rådgivningar i den
dev-transitiva `brace-expansion@5.0.9`: GHSA-qhr7-859c-m2p7,
GHSA-6j4f-fj2g-mc7p och GHSA-q2hr-2g5m-vwhr. Egen mätning med
`npm ls brace-expansion --all --include=dev` bekräftade samma version i kedjan
`eslint` → `minimatch` → `brace-expansion`.

Orsak och lösning: lockfilen höll kvar 5.0.9 och repots override tillät den
med `^5.0.8`. Override-gränsen höjdes till `^5.0.12`, vilket flyttade den enda
installerade kopian till 5.0.12 utan andra paketändringar.

Källa: Kontrollens paketkort 2026-09-30 och npm-registret samma datum, där
5.0.12 var aktuell senaste version. Verifiering: `npm ls` visade endast
5.0.12; `env -u NODE_ENV npm audit --include=dev` gav ingen träff på
`brace-expansion`. Auditens enda kvarvarande träff var en separat moderate i
`fast-uri`, GHSA-hrr3-gc8f-f4qj, som låg utanför detta kort och inte ändrades.
