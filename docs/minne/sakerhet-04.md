# Importerad kunskap: Open Alerts

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/sakerhet-2026-09-17.md, rader 129–231. Nya lärdomar hör i ämnesfilerna.

## Open Alerts

**En kvar, low.** Skanning 2026-09-02, efter att `browserslist` höjts:

| Källa | Omfattning | Resultat |
|---|---|---|
| Dependabot alerts-API | hela repot, alla states | 0 öppna — **och inget larm alls om `browserslist`**, se nedan |
| GitHubs advisory-API | 424 `paket@version` ur `package-lock.json`, 11 anrop | alla `http=200`, **1 träff**: `postcss-selector-parser@6.1.2`, low (kontrollprov `js-yaml@4.3.0` gav sin kända high) |
| `npm audit` | `nextjs-luns-se`, **`env -u NODE_ENV`** | `1 low` — samma träff. Utan miljörensningen svarar den `found 0 vulnerabilities`; se punkt 3 |

`postcss-selector-parser@6.1.2` (GHSA-w9m9-85wc-3x92 / CVE-2026-9358, **low**,
DoS via okontrollerad AST-rekursion, patch `6.1.3`) är dev-transitiv och
oåtgärdad. Den låg utanför kortet som gällde `browserslist` och är medvetet
inte rörd — den är ny i skanningen bara för att rådgivningen granskades
2026-09-01, inte för att något installerats. Egen åtgärd, egen commit.

Python-sidan och Actions-versionerna kontrollerades senast 2026-08-19 och är
inte omskannade i den här omgången.

`pip-audit` finns inte installerat på dev01 och är inget som ska in i
`requirements-dev.txt` — Python-sidan skannas i stället mot advisory-API:t med
`ecosystem=pip`, samma metod som npm-sidan. Skanna de faktiskt installerade
versionerna ur `.venv-prod/bin/pip list --format=freeze`, inte
`requirements.txt`: den är opinnad (`beautifulsoup4`, `requests`, `lxml` utan
versioner), så filen säger ingenting om vad som kör.

Nyckelversioner i lockfilen: `next@15.5.22`, `js-yaml@4.3.1`, `nanoid@3.3.18`,
`sharp@0.35.3`, `fast-uri@3.1.5`, `brace-expansion@5.0.9`, `postcss@8.5.26`,
`browserslist@4.28.8`.

### `browserslist` — åtgärdat 2026-09-02, utan Dependabot-larm

Kontrollen i hubben såg GHSA-c83g-rgw3-j3cx (CVE-2026-73089, high, obegränsad
cachetillväxt → OOM) på `browserslist@4.25.3`. Två saker skilde det från en
vanlig omgång:

**Det fanns inget Dependabot-larm.** Alerts-API:t hade noll öppna och noll
träffar på `browserslist` överhuvudtaget. Rådgivningen publicerades 2026-09-01,
dagen innan. Det är samma mönster som `nanoid` i augusti och skälet att punkt 2
i tooling-avsnittet finns — hade vi frågat alerts-API:t och stannat där hade
svaret blivit "inget öppet, allt är bra".

**Kortet nämnde en rådgivning, skanningen hittade två.** `4.25.3` träffades
också av GHSA-73wf-gq98-2v4g (CVE-2026-73088, high, krasch/prototypskrivning i
`normalizeStats`), publicerad samma minut ur samma granskningsomgång. Båda är
lagade i `4.28.7`. Läs aldrig av åtgärden ur kortets ena GHSA — skanna
versionen och se vad som faktiskt träffar den.

Åtgärden blev `npm update browserslist` → **4.28.8**, alltså bara lockfilen.
`autoprefixer` är enda beroendet som drar in paketet och dess intervall
`^4.24.4` rymmer redan patchen, så **inget `overrides` lades till**: ett
override hade inte skyddat mot något som intervallet inte redan tillåter, och
bara låst trädet till 4.x. Det är `nanoid`-lärdomen i Triage nedan, tillämpad.
Med på köpet kom `caniuse-lite`, `electron-to-chromium`, `node-releases`,
`update-browserslist-db` och nya `baseline-browser-mapping` — browserslists
egen datakedja, inget annat rörde sig i lockfilen.

Paketet är `dev: true` och används när CSS byggs, aldrig i webbläsaren. Den
sårbara vägen kräver dessutom en långkörande process med utifrån påverkade
frågesträngar; bygget kör `browserslist` en gång med ett fast värde och dör.
Reell exponering för sajten: ingen. Det är ändå rätt att höja — bevakningen
ska vara tyst av rätt skäl, inte av trötthet.

### De senaste larmen — alla stängda

| # | Paket | Grad | Advisory | Larm inkom | Åtgärdat |
|---|---|---|---|---|---|
| 88 | `js-yaml` (dev, transitiv) | high | GHSA-5p4m-2wfm-xmqj | 2026-08-11 | 2026-08-11 |
| 87 | `fast-uri` (dev, transitiv) | high | GHSA-7p8r-x3mc-p8w7 | 2026-08-05 | 2026-08-05 |
| 86 | `brace-expansion` (dev, transitiv) | high | GHSA-rgw5-rvv9-x895 | 2026-08-04 | 2026-08-05 |
| 85 | `next` (produktion, direkt) | medium | GHSA-q8wf-6r8g-63ch | 2026-07-27 | 2026-07-28 |
| 84 | `sharp` (produktion, transitiv) | high | GHSA-f88m-g3jw-g9cj | 2026-07-26 | 2026-07-28 |

Senaste **critical** var GHSA-9qr9-h5gf-34mp (`next`, RCE i React flight
protocol), inkom 2025-12-03 och åtgärdades 2025-12-16. Ingen critical sedan dess.

### Mailet om CVE-2026-16221 (`fast-uri`) — utrett 2026-08-19

Henrik fick ett mail om `fast-uri vulnerable to host confusion via literal
backslash authority delimiter` och såg sårbarheten stå kvar när han klickade.
Larmet är **#83, stängt sedan 2026-07-28 09:15:29**. Kedjan, för att den är
lärorik:

| När | Vad |
|---|---|
| 2026-07-19 | lockfilen bär `fast-uri@3.1.2` |
| 2026-07-21 | GHSA-v2hh-gcrm-f6hx publiceras: sårbart `>= 3.0.0, <= 3.1.3`, patch `3.1.4` |
| 2026-07-25 | Dependabot öppnar larm #83 → **mailet skickas här** |
| 2026-07-28 09:15:23 | PR #65 *Fix 6 high-severity npm advisories* mergas, `fast-uri` → `3.1.4` |
| 2026-07-28 09:15:29 | larm #83 stängs, sex sekunder efter mergen |
| 2026-08-05 | ny advisory (CVE-2026-18446), larm #87, `fast-uri` → `3.1.5`, stängt samma dag |

Två saker att ta med sig. **Ingen automatik lagade det** — det finns ingen
`.github/dependabot.yml`, så Dependabot larmar men öppnar aldrig
uppdaterings-PR. Varje fix i tabellen ovan är en PR som någon skrev. Och **inget
larm skapades eller ändrades den 18 augusti**; sista larmaktiviteten i repot är
`js-yaml` den 11 augusti. Ett mail daterat senare än larmet är en notis om
något som redan var stängt, inte ett nytt larm — kontrollera alltid `created_at`
på larmet i stället för att lita på mailets datum.

`fast-uri` är dessutom `dev: true` och dras in av `ajv`. Den följer aldrig med i
den statiska exporten, alltså har den aldrig kunnat nå en besökare på sajten.


<!-- Slut på importerade källblock. -->
