# Importerad kunskap: Spaning: `scripts/spana.py`

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 332–399. Nya lärdomar hör i ämnesfilerna.

## Spaning: `scripts/spana.py`

Utvecklingsverktyg, körs bara för hand. Kräver `requirements-dev.txt`
(playwright) och en engångs `playwright install chromium`.

```
python scripts/spana.py https://exempel.se/lunch
```

Skriver till en katalog och sammanfattar på stdout:

| Fil | Vad den är bra för |
|---|---|
| `ra.html` | vad `requests` får — **här måste menyn finnas** för att steg 1 ska gå |
| `renderad.html` | DOM:en efter att JS kört — var menyn *ser ut* att ligga |
| `natverk.jsonl` | varje XHR/fetch med URL, status och början av kroppen — här hittar du endpointen för steg 2 |
| `sida.png` | helsidesskärmbild |
| `bilagor/` | nedladdade menybilder och PDF:er, med `pdftotext`-utdata bredvid |

Skriptet säger själv om menytexten fanns i `ra.html` eller bara i
`renderad.html`.

Det är en utgångspunkt, inte en bur. Ligger menyn bakom en flik, en veckoväljare
eller en cookieruta får du skriva en engångssnutt med playwright som klickar
fram den. Det som räknas är vad som blir kvar i repot.

Spaningsutdata ska aldrig med i en commit.

### Att läsa en SVG där texten är kurvor

Masalas menyer är SVG utan en enda textnod — `<path>` hela vägen. Det finns
inget att greppa i, filen måste renderas och läsas med ögonen. Varken
`rsvg-convert`, `inkscape` eller `cairosvg` finns på dev01, så det blir
playwright, och att bara `goto()` filen och ta `screenshot(full_page=True)`
faller: skärmbilden blir aldrig skriven. Lägg SVG:n i en `<img>` i en liten
HTML-fil bredvid, sätt bredden till en multipel av `viewBox`-bredden och
fotografera elementet:

```python
html.write_text(f'<img src="{svg.name}" style="width:{288*3}px;display:block">')
pg.goto(html.as_uri())
pg.locator('img').screenshot(path=out)
```

3× räcker för att läsa rubrikerna, 8–10× för att avgöra enskilda ord. Zooma
alltid in på det som ser ut som ett stavfel innan du "rättar" det: Masala
skriver faktiskt "Famberade linser" och "DAL DHOKLIZ", och de orden ska stå
kvar precis så.

### Masalas fyra menybilder heter inte samma sak

De fyra menyerna byttes ut styckevis. Meny 1 och 4 har det nya namnet
(`lunch-menu4-MK-nov2025-2.svg`), meny 2 och 3 ligger kvar under det gamla
(`lunch2-1.svg`, `lunch3-1.svg`) och finns inte alls i det nya. `MENU_NUMBER`
i `masala_scraper.py` matchar bara det nya namnet, så vartannat varv faller
skrapan tillbaka på veckonummer-aritmetiken utan att något ser fel ut.

Hela uppsättningen syns via WordPress mediabibliotek, vilket är snabbare än att
gissa filnamn:

```
curl -s 'https://masalakitchen.se/wp-json/wp/v2/media?search=lunch&per_page=100&_fields=source_url,modified'
```

`Last-Modified` på bilderna är dessutom det enda hederliga svaret på frågan
"byter de meny varje vecka?". Ligger datumen månader tillbaka är menyn stående,
hur mycket den än skiljer sig från det vi har sparat.


<!-- Slut på importerade källblock. -->
