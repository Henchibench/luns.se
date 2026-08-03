# Handoff: Lunchtavlan — luns.se 2026 redesign

## Overview
Redesign av luns.se: en "lunchtavla" i glassmorphism-stil (teal/petrol) som visar skrapade lunchmenyer från restauranger kring Lindholmen (och Tannefors). Kärnidén: dagens meny i fokus, en vänsterspalt med scroll-spy som alltid visar var man är, samt en kartvy.

## About the Design Files
Filerna i paketet är **designreferenser byggda i HTML** — en fungerande prototyp som visar avsedd look och beteende, inte produktionskod. Uppgiften är att **återskapa designen i mål-kodbasen** (Next.js + React + Tailwind, `nextjs-luns-se/`) med dess befintliga mönster: komponenter i `src/app/components/`, hooks i `src/app/hooks/`, data från `public/data/menus.json` + `restaurants.json`.

## Fidelity
**High-fidelity.** Färger, typografi, spacing och interaktioner är avsedda som slutgiltiga. Återskapa pixel-perfekt.

## Screens / Views

### 1. Huvudvy (lista) — `Lunchtavlan Glas.dc.html`
- **Layout**: Fullskärm. CSS grid: rad 1 header (auto), rad 2 innehåll (1fr). Innehåll: grid-kolumner `270px 1fr` (desktop) / `1fr` (mobil <760px). Hela appen ligger på en glasyta: `background: var(--glass); backdrop-filter: blur(30px) saturate(1.15)` ovanpå en body-bakgrund (se Design Tokens).
- **Header** (flex, wrap, gap 8×14, padding 16px 28px 10px):
  - Logga: `luns-logo-transparent.png` 36×36 + wordmark "LUNS.SE" (IBM Plex Mono 600, 18px, letter-spacing .04em; "LUNS" i `--acc`, ".SE" i `--mut`)
  - Platsval: `<select>` (IBM Plex Mono 11px, chip-bakgrund, radius 8)
  - Dagflikar MÅN–FRE: knappar padding 7px 13px, radius 8; aktiv: bg `--acc`, text `--bg`, vikt 700; inaktiv: transparent bg, 1px `--line`-border, text `--ink2`
  - Sökfält: flex 1 1 160px, chip-bg, 1px `--line`, radius 8, padding 9px 14px, 13px
  - Klocka "HH:MM · LUNCH PÅGÅR" (vardagar 11–14), IBM Plex Mono 11px `--acc` — dold på mobil
  - "KOPIERA DAGENS": bg `--acc`, text `--bg`, 12px/700, radius 8 (mobil: "KOPIERA")
  - Vyknapp "KARTA"/"LISTA" (aktiv karta: bg `--accBg`, text `--accStrong`)
  - Temaknapp ☾/☀ 38×38, chip-bg, radius 8
- **Vänsterspalt** (endast desktop): egen glaspanel `--glass2`, 1px `--glassBrd`, radius 16, margin 4 0 18 18. Innehåll scrollar med fade-mask topp/botten (16px/22px). Delar:
  - Rubrik "RESTAURANGER · N" (IBM Plex Mono 10px, letter-spacing .15em, `--mut`)
  - Restaurangknappar: padding 8px 12px, radius 8, margin 0 10px, 13px; namn ellipsis; ♥ (11px `--acc`) på favoriter; aktiv (scroll-spy): bg `--accBg`, text `--accStrong`, vikt 600; transition background/color .3s ease; hover: `--hi`
  - "FILTER"-grupp: chips (VEG/KÖTT/FISK/SALLAD/ASIAT./INDISKT + ♥ FAVORITER) 11px/600, padding 5px 10px, radius 6; aktiv: bg+border `--accBg`, text `--accStrong`; inaktiv: chip-bg, 1px `--line`
  - "SUGEN PÅ…"-grupp: 🍔 BURGARE, 🍝 PASTA, 🍟 POMMES, 🥔 MOS (sätter söktermen)
  - Fotnot "Menyer skrapas varje vardagsmorgon" (10.5px `--mut`)
- **Huvudyta**: scrollbar med fade-mask topp/botten 44px. Rubrik "Måndag 3 aug." (Bricolage Grotesque 700, 30px desktop/24px mobil, letter-spacing -.02em) + "N RÄTTER" (IBM Plex Mono 11px `--mut`).
  - Restaurangsektion: rad med ♥-knapp (14px; favorit `--acc`, annars `--mut`), namn i versaler (IBM Plex Mono 11.5px/600, letter-spacing .12em, `--acc`), 1px-linje som fyller ut (`--line`), meta (öppettider, 10.5px mono `--mut`), länkar "KARTA ↗ MENY ↗ INSTA ↗" (10px mono)
  - Ev. inforad (11.5px `--mut`) och för tomma restauranger kursiv rad "Ingen meny idag — kolla direkt med restaurangen via länkarna ovan"
  - Rätt-rad (flex, gap 14, padding 5px 8px, radius 6, hover `--hi`): kategori (92px, IBM Plex Mono 10px, kategorifärg), beskrivning (13.5px/1.55 `--ink2`, sökträffar markeras med bg `--accBg` radius 4), pris "NN:-" (56px högerställd, mono 11px `--mut`), stjärna ☆/★ (13px; bevakad `--star`)
  - Efter sista restaurangen: dynamisk spacer så sista restaurangen kan scrollas till exakt 56px från toppen (hard stop, se Interaktioner)
- **Bevakningsbanner** (när bevakad rätt serveras idag): bg `--accBg`, text `--accStrong` 12.5px/600, radius 8, ★ i `--star`
- **Tomt läge**: centrerat "Inga rätter matchar" + "Rensa allt"-knapp

### 2. Kartvy — `karta.html` (iframe i huvudytan)
- Leaflet 1.9.4 + CARTO-basemaps på OpenStreetMap-data: `light_all` (ljust), `dark_all` (mörkt). Attribution "© OpenStreetMap contributors © CARTO" krävs.
- Mörkt läge: tiles filtreras `brightness(1.5) contrast(.92) sepia(.45) hue-rotate(140deg) saturate(1.5)` för teal-ton
- Pins: L.divIcon-pill med restaurangnamnet (IBM Plex Mono 10.5px/600, glas-bakgrund, radius 999, border teal, skugga)
- Popup: namn, "N RÄTTER IDAG", knapp "Visa meny →" → postMessage `{type:'luns-select', name}` till föräldern som byter till listvyn och scrollar till restaurangen
- Iframe: radius 16, 1px `--glassBrd`; src får `?loc=<plats>&theme=<light|dark>`
- **OBS: koordinaterna i `COORDS`-tabellen är ungefärliga** — ersätt med exakta lat/lng
- Kartan centrerar/fitBounds på vald plats (Lindholmen/Tannefors)

### 3. Mobil (<760px)
- En kolumn; vänsterspalten renderas inte
- Flytande bottenrad (fixed, 14px från kanter, z-index 40): två knappar "☰ Restauranger" och "⚙ Filter · N" — bg `color-mix(in srgb, var(--bg) 82%, transparent)` + blur(20px), 1px `--glassBrd`, radius 14, 13.5px/700, skugga `0 8px 30px rgba(0,10,14,.25)`
- Bottom sheet: backdrop `rgba(0,14,18,.4)`; panel fixed botten, radius 20 20 0 0, bg `--bg`, max-height 72vh, slide-up-animation .25s; header med titel (mono 10-11px) + "Stäng"-knapp; innehåll scrollbart
  - Restauranger: vertikala rader 12px 14px, 14.5px, aktiv highlight som desktop; tryck stänger sheeten och scrollar till restaurangen
  - Filter: samma chips i touchstorlek (padding 9px 14px, 12.5px, radius 9)
- Huvudytan får padding-bottom 90px så bottenraden inte täcker innehåll

## Interaktioner & Behavior
- **Dagval**: klick byter dag; menylistan animeras in med fade+8-10px uppåtglid .35s ease (re-trigga animationen vid varje byte). Rubrikens datum räknas ut för vald veckodag (helger pekar på nästa veckas måndag; helgbesök defaultar till måndag)
- **Scroll-spy**: aktiv restaurang = sista sektionen vars topp ≤ 70px från huvudytans topp (rAF-throttlad scroll-lyssnare). Highlighten glider med transition .3s
- **Klick på restaurang** (spalt/sheet/karta): smooth-scroll så sektionen hamnar 52px från toppen
- **Hard stop**: spacer efter sista sektionen = `mainHeight - lastSectionHeight - 56 - mainPaddingBottom`, omräknad vid resize/innehållsbyte — man kan inte scrolla förbi sista restaurangnamnet
- **Favoriter (♥)**: per restaurang, localStorage; ♥ FAVORITER-chippet filtrerar. Ingen omsortering av spalten
- **Bevaka rätt (★)**: signatur `restaurang|beskrivning`, localStorage; banner när den serveras idag
- **Sök**: fritext mot beskrivning+kategori+restaurangnamn; "sugen på"-chips sätter söktermen och matchar synonymlistor (burger/hamburgare/cheeseburger…); träffar highlightas
- **Kopiera dagens**: bygger textlista (rubrik + per restaurang: "• KATEGORI: beskrivning (pris)") → clipboard → toast 2.4s (fixed bottencentrerad, bg `--ink`, text `--bg`, radius 10)
- **Tema**: ☾/☀ togglar `dark`-klass på `<html>`, sparas i localStorage
- **Plats**: select filtrerar restauranger per `area`, sparas i localStorage

## State Management
`restaurants` (parsead data), `locations`, `location`, `day`, `search`, `types[]`, `onlyFavs`, `activeRest` (scroll-spy), `favs[]`, `stars[]`, `theme`, `toast`, `spacerH`, `sheet` (null|'rest'|'filter'), `view` ('list'|'map'), `animFlip`.
localStorage-nycklar: `luns2026-favs`, `luns2026-stars`, `luns2026-theme`, `luns2026-loc`.
Dataparsning: menyrad `"Dag|<strong>Kategori</strong> - beskrivning"`, pris extraheras ur avslutande `"(NN kr)"`; inforader `"INFO:Dag - Restaurant Info: text"`.

## Design Tokens
Typografi: **Schibsted Grotesk** (brödtext/UI), **Bricolage Grotesque** (rubriker), **IBM Plex Mono** (etiketter/wordmark). Google Fonts.

Ljust läge:
- Bakgrund (body): `linear-gradient(178deg, #CBDDDF, #BAD1D4 60%, #A9C4C8)` + filmkorn-overlay (SVG fractalNoise, opacity .07, fixed, z-index över allt, pointer-events none)
- `--glass: rgba(255,255,255,.38)` · `--glass2: rgba(255,255,255,.28)` · `--glassBrd: rgba(255,255,255,.6)`
- `--chip: rgba(255,255,255,.48)` · `--hi: rgba(255,255,255,.5)` · `--line: rgba(30,80,90,.22)`
- `--ink: #0E2229` · `--ink2: #31505A` · `--mut: #6E8B92`
- `--acc: #0D5B6E` · `--accStrong: #093F4D` · `--accBg: rgba(60,150,170,.24)` · `--bg: #E9F1F2` · `--star: #B5892A`
- Kategorifärger: grönt `#3F7350` (veg/sallad), varmt `#9A5340` (kött), blått `#2A6A85` (fisk), lila `#5D619A` (övrigt)

Mörkt läge (original-teal från luns.se):
- Bakgrund: `linear-gradient(178deg, #043440, #022A35 60%, #01212A)`
- `--glass: rgba(2,32,41,.5)` · `--glass2: rgba(255,255,255,.045)` · `--glassBrd: rgba(255,255,255,.13)`
- `--chip: rgba(255,255,255,.06)` · `--hi: rgba(255,255,255,.08)` · `--line: rgba(255,255,255,.13)`
- `--ink: #DCEDF0` · `--ink2: #A3C2C9` · `--mut: #4F7680`
- `--acc: #54C2D8` · `--accStrong: #8ADCE8` · `--accBg: rgba(84,194,216,.15)` · `--bg: #04252E` · `--star: #E3C25B`
- Kategorifärger: `#8FC49C` / `#D69A82` / `#79B7CE` / `#A2A4D8`

Radius: 8 (kontroller), 6 (småchips), 16 (paneler/iframe), 14 (mobilknappar), 20 (sheet), 999 (pills). Fade-masks: `linear-gradient(180deg, transparent, #000 44px, #000 calc(100% - 44px), transparent)` (huvudyta), 16/22px (spalt).

## Assets
- `assets/luns-logo-transparent.png` — klassiska loggan (från repo: `nextjs-luns-se/public/`)
- `data/menus.json`, `data/restaurants.json` — skrapad data (från repo: `nextjs-luns-se/public/data/`)
- Karttiles: CARTO light_all/dark_all (kräver attribution), Leaflet 1.9.4

## Files
- `Lunchtavlan Glas.dc.html` — huvuddesignen (template + logik i samma fil; logiken ligger i `<script data-dc-script>` längst ner)
- `karta.html` — fristående kartvy (bäddas in som iframe)
- `assets/`, `data/` — se ovan
- `Lunchtavlan.dc.html` — äldre icke-glas-version (referens)
