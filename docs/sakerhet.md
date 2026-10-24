# Säkerhetskunskap och paketkort

Metod sammanställd 2026-09-17. Senaste släppkontroll och paketpatchar är
daterade 2026-10-24 nedan. Äldre antal öppna larm är historiska mätningar.
Vid minnesuppdelningen i september gjordes ingen ny sårbarhetsskanning.

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

## `next` 15.5.28, 2026-10-23

Symptom: Kontrollens mätning på Dev pekade ut GHSA-2464-fhr4-w9xw, en
critical RCE i bildoptimeringen för SVG-filer, och GHSA-p3m5-59mp-jv5r /
CVE-2026-94482, en high DoS i App Router med Server Actions. Egen mätning med
`npm ls next --all --include=dev` och `npm ls next --omit=dev` bekräftade
`next@15.5.27` som direkt produktionsberoende.

Orsak och lösning: Paketintervallet och lockfilen stod på 15.5.27, som ingår
i båda sårbara intervallen. Miniminivån höjdes till `^15.5.28`, vilket
uppdaterade Next och dess versionsbundna `@next/env`- och SWC-paket till
15.5.28.

Källa: Kontrollens paketkort, GitHubs granskade advisories och npm-registret,
kontrollerade 2026-10-23. Båda advisories angav 15.5.28 som första rättade
15.x-version och npm-registret bekräftade att versionen finns. Verifiering:
de båda `npm ls`-mätningarna visade endast 15.5.28 och ett rent
produktionsbygge samt `npm audit --omit=dev` passerade.

## `next` 15.5.27, 2026-10-08

Symptom: Kontrollens mätning på Dev pekade ut GHSA-4jqv-mc3x-m676 /
CVE-2026-94543 och GHSA-mcj8-r9mp-w47p / CVE-2026-94484, två moderate
cache poisoning-sårbarheter i Nexts SSG/ISR-rendering. Egen mätning med
`npm ls next --all --include=dev` och `npm ls next --omit=dev` bekräftade
`next@15.5.25` som direkt produktionsberoende.

Orsak och lösning: Paketintervallet började på `^15.5.24` och lockfilen
höll kvar 15.5.25. Miniminivån höjdes till `^15.5.27`, vilket uppdaterade
Next och dess versionsbundna `@next/env`- och SWC-paket till 15.5.27.

Källa: Kontrollens paketkort och GitHubs granskade advisories, kontrollerade
2026-10-08. Båda angav `>= 15.0.0, < 15.5.27` som sårbart och 15.5.27 som
första rättade 15.x-version. Verifiering: båda `npm ls`-mätningarna visade
endast 15.5.27, GitHubs advisory-API gav noll träffar för `next@15.5.27` och
`env -u NODE_ENV npm audit --omit=dev` gav noll produktionssårbarheter.

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

Ny status 2026-10-24: GitHub återkallade advisoryn den 23 oktober eftersom
den inte bedöms vara praktiskt exploaterbar. Den ska inte räknas som en
aktiv sårbarhet. `braces` 3.0.3 behålls. Källa:
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.

Historisk status vid kontrollen den 3 oktober: Ingen rättad paketversion fanns. GitHubs advisory angav
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

## Släppkontroll och säkerhetspatchar, 2026-10-24

Utgångsläge Dev `e1a1c81`, jämfört med main `916a67f`. Next 15.5.28 och
sharp 0.35.5 finns i båda grenarna och i den senaste lyckade publiceringen
från `a8b6354`. GitHubs öppna Dependabotlista innehöll bara larm 101 för
PostCSS. En separat kontroll mot granskade advisories omfattade alla 432
unika npm paketversioner i lockfilen och elva paket i testserverns
Pythonmiljö. Samtliga anrop lyckades och kontrollprovet med den gamla
Nextversionen 15.5.27 gav de förväntade sårbarheterna.

Den bredare kontrollen hittade fem advisories för fast-uri, en för PostCSS
och 16 för Pythonpaketen Pillow, certifi och urllib3. Pillow hade bland
annat en kritisk brist i FPX avkodning och certifi hade kritiskt klassade
problem med betrodda certifikat. Skraporna hämtar externa bilder och gör
HTTPS anrop, så Pythonproblemen åtgärdades före släppet. Detta är inte
belägg för att någon har utnyttjat felen. FPX kräver dessutom ett valfritt
olefile beroende, och flera andra Pillowfunktioner används inte av skraporna.

| Paket | Före | Verifierad version efter | Åtgärd |
|---|---|---|---|
| fast-uri | 3.1.7 | 3.1.9 | Höjd override till ^3.1.9 |
| postcss-selector-parser | 6.1.4 | 6.1.5 | Säkerhetsfix för den befintliga 6.x serien |
| Pillow | 12.3.0 | 13.0.0 | requirements tillåter >=13.0.0,<14 |
| certifi | 2026.7.22 | 2026.10.23 | Lägsta säkra version 2026.10.19 anges uttryckligen |
| urllib3 | 2.7.0 | 2.8.0 | Lägsta säkra version 2.8.0 anges uttryckligen |

Pillow 13 kräver Python 3.11 eller senare. Actions använder redan 3.12 och
testservern 3.14.4. Ingen workflow eller serverkonfiguration ändrades.
Npm låste om bara de två berörda paketen. Tailwind ligger kvar på 3.4.17.

PostCSS kräver särskild tolkning: den officiella utgåvan 6.1.5 innehåller
samma säkerhetsfix som 7.1.6, särskilt för användare av Tailwind 3.
GitHubs advisory och npm audit anger fortfarande det alltför breda
intervallet <7.1.6. Därför kvarstår tre moderate paketnoder i npm audit,
men alla avser samma redan rättade parserbrist. Ingen varning har dolts
eller avfärdats i GitHub. Det installerade paketets Set baserade fix
kontrollerades och CSS från produktionsbygget är identisk byte för byte
med bygget före paketändringen. Uppgradera inte till Tailwind 4 enbart
för att få bort denna kvarvarande databasträff.

Efter rättning: `npm audit --omit=dev` ger noll träffar. GitHubs kontroll
av de ändrade npm versionerna lämnar bara PostCSSavvikelsen ovan.
Den återkallade bracesadvisoryn räknas inte. Ny kontroll av alla elva
installerade Pythonpaket ger noll aktiva advisories. `pip check` passerar.
72 Node tester och 73 Python tester passerar, liksom produktionsbygget.
Produktionsexporten innehåller kontaktens livekonfiguration och ingen
testbanderoll. En simulerad merge gav inga konflikter och samma träd som Dev.

BO:s och Gillestugans verkliga originalbilder för vecka 43 hämtades som
kontrollmaterial, utan att äldre mat publicerades för vecka 44. Exakt samma
bildbytes lästes på testservern före och efter paketbytet. Samtliga
menyrader blev identiska: BO 5/5/5/5/4 och Gillestugan 7/7/7/7/7 per vardag.
Bilder, råsvar och skanningsrapporter lagras inte i Git.

Gitleaks granskade de 39 nya committerna utan hemlighetsträffar. Exporten
av hela spårade trädet gav bara den tidigare kända publika CARTO nyckeln.
GitHub rapporterar att secret scanning är avstängt och att ingen analys
finns för code scanning; dessa kan inte redovisas som godkända kontroller.
Lokal skanning ersätter inte kontinuerlig bevakning. Ingen ny sådan
konfiguration infördes inom släppkontrollen och operativsystemets paket
ingår inte i denna granskning.

Källor kontrollerade 2026-10-24:

* https://github.com/postcss/postcss-selector-parser/releases/tag/6.1.5
* https://github.com/fastify/fast-uri/releases/tag/v3.1.9
* https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html
* https://github.com/advisories/GHSA-5x8w-8jj5-q52h
* https://github.com/advisories/GHSA-6q48-6c7w-9gw2
* https://github.com/urllib3/urllib3/releases/tag/2.8.0
* https://github.com/Henchibench/luns.se/security/dependabot/101

## Granskning för publikt repo, 2026-10-20

Gitleaks 8.30.1 kördes lokalt med maskerade resultat på Dev `c5118a2`:
53 commits i origin/main..origin/Dev gav inga hemlighetsträffar. Export av
samtliga spårade filer gav endast den befintliga CARTO Basemaps-nyckeln i
webbläsarkoden. Den är klientanvänd och behöver hanteras med leverantörens
begränsningar, inte betraktas som en dold serverhemlighet.

Skanning av all lokalt tillgänglig Git-historik gav dessutom en äldre,
separat credential-träff. Den fanns inte i dagens filträd eller det nya
släppets commits. Historiska träffar måste utredas privat och vid behov
spärras hos utfärdaren; att radera en fil är inte en återkallelse. Inga
nyckelvärden eller skanningsrapporter har lagts i repot. Automatisk skanning
är ingen garanti mot alla slags känsliga uppgifter.

Resend/Turnstile-serverhemligheter finns som Worker-bindningar; publika
sitekeys, endpoint, konto-ID, kontaktadress och vissa interna testadresser
är däremot synliga i kod/dokumentation. Sitekey är avsiktligt publik enligt
Cloudflare: https://developers.cloudflare.com/turnstile/get-started/.
CARTO beskriver klientnycklar och begränsningar på
https://www.carto.com/basemaps/apikey/.

`.gitignore` täcker nu alla `.env.*` utom uttryckliga `.env.example` och
`.env.*.example`, utöver befintliga `.dev.vars*`, `.wrangler/`, virtuella
miljöer och testserverfiler. Exempelfiler får aldrig innehålla riktiga
hemligheter. Kontrollerat med git check-ignore och minnestest. Ingen sajt-
eller driftkod ändrades; föregående produktionsbygge och frisk testserver
har identisk sajtkod.
