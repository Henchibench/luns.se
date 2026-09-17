# Importerad kunskap: De två halvorna

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/repo-2026-09-17.md, rader 14–93. Nya lärdomar hör i ämnesfilerna.

## De två halvorna

| | Vad | Var |
|---|---|---|
| **Menyerna** | ett trettiotal Python-skrapor som skriver JSON | `app/scrapers/`, `app/restaurant_data.py`, `scripts/scrape_menus.py` |
| **Sajten** | Next.js 15, React 18, Tailwind, statisk export | `nextjs-luns-se/src/app/` |

Kedjan i sin helhet, och den är kort:

```
python scripts/scrape_menus.py     ->  nextjs-luns-se/public/data/menus.json
                                       nextjs-luns-se/public/data/restaurants.json
python scripts/fetch_stats.py      ->  nextjs-luns-se/public/data/stats.json
cd nextjs-luns-se && npm ci && npm run build   ->  out/
```

Sajten exporteras statiskt (`output: 'export'`) och hämtar JSON-filerna i
webbläsaren, se `src/app/lib/menu.ts`. Datan och sajten är alltså skilda saker,
och det är första frågan när något ser fel ut: **står rätten i `menus.json`?**
Gör den det är det ett sajtfel, annars ett skrapfel. Filen är omslagen —
raderna ligger under `["menus"][namn]`, inte direkt på namnet.

### Sajten, en trappa ner

| Fil | Vad den gör |
|---|---|
| `src/app/page.tsx` | tavlan: laddar datan, håller filter och urval |
| `src/app/components/board/` | delarna — listan, raden, kartan, platsväljaren, rutorna |
| `src/app/lib/menu.ts` | hämtar och tolkar `menus.json` + `restaurants.json` |
| `src/app/lib/filters.ts` | filtren och sökningen |
| `src/app/lib/stats.ts` | besöksstatistiken, hämtas först när rutan öppnas |
| `src/app/hooks/` | favoriter, plats, tema, väder, rundturen |

**Bygger du något besökaren ser: lägg en rad i nyhetslistan.** Den bor i
`src/app/lib/news.ts`, är kurerad för hand och skrivs aldrig ur git — 248 av
commitarna är skrapor och paketbumpar. Ny post överst, och höj `NEWS_VERSION` i
samma fil: det är höjningen som tänder pricken på kugghjulet, en post utan den
syns bara för den som ändå öppnar rutan. Regeln som håller notisen isär från
rundan står i `src/app/hooks/useNews.ts` — en ny besökare får rundan och aldrig
pricken, ingen ser båda.

Textstorlekar skrivs **aldrig** som `text-[13px]`. Designens nio steg heter
`text-10` … `text-30`, är definierade i `tailwind.config.js` och pekar på
`--fs-*` i `globals.css`. Inställningen "Större text" byter bara variablerna,
så en storlek som står rakt i klassen står utanför den och blir liten kvar när
allt annat växer. Detsamma gäller en fast bredd på en kolumn som håller text:
ange den i `em`, som kategorikolumnen i menylistan.

Kartans tiles kommer från CARTO och **kräver en nyckel sedan 2026-09**. Den
står i klartext som `CARTO_KEY` i `components/board/RestaurantMap.tsx`, och
det är rätt plats: tile-anropen görs av besökarens webbläsare i en statisk
export, så nyckeln är läsbar ändå. En byggtidsvariabel hade bara gömt den för
oss och gett tomma kartor i Actions den dag någon glömde sätta den. Begränsa
den hos CARTO i stället, på domän.

Utan nyckel går ingenting sönder — CARTO bränner in "API KEY REQUIRED"
i själva PNG-tilen, så kartan renderas som vanligt och ser vandaliserad ut.
Kravet gäller i dag bara raster-tiles (`light_all`/`dark_all`), och CARTO
säger att vector följer efter utan datum; samma nyckel ska in då. Kontrollera
nyckeln genom att hämta en tile och *titta* på den, med `curl` och `Read` —
inte genom att läsa statuskoden, som är 200 i båda fallen. Mätt på
`light_all/12/2185/1127.png`: 6943 byte utan nyckel, 5927 med. Både
webbläsaren och CDN:en cachar tiles, så ladda om hårt innan du tror att
fixen inte tog.

Skraporna skriver emoji först på sina INFO-rader — 💰 på priser, 🕐 på tider,
någon enstaka annan. De ligger kvar i `menus.json` med flit och plockas bort
vid visning, av `stripInfoEmoji()` i `lib/menu.ts`. Två skäl: strippningen
gäller direkt även för data som redan ligger där, och 🕐 är inte dekor —
`INFO_STATES_HOURS` i `page.tsx` läser den för att se om raden redan har
öppettider, så `lunch_hours` inte skrivs ut en gång till. **Ordningen i
`page.tsx` är därför regeln: testa dubbletten på råtexten, strippa sedan.**
Byter man plats på dem står tiderna två gånger, och inget ser trasigt ut.
Skulle skraporna själva sluta sätta emoji faller testet ner på orden, som är
en svagare signal.

Besöksstatistiken hämtas från Umami **vid bygget** (`scripts/fetch_stats.py`),
inte i besökarens webbläsare. Sajten anropar därför ingen analystjänst när
någon öppnar den, och ingen nyckel når ut. Behåll den ordningen.


<!-- Slut på importerade källblock. -->
