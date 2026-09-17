# Importerad kunskap: `BaseScraper` gör redan det jobbiga

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 284–331. Nya lärdomar hör i ämnesfilerna.

## `BaseScraper` gör redan det jobbiga

Använd `self.get_page_content(url=None)`. Den sköter

- retry med backoff på 500/502/503/504,
- IPv4-tvång (Actions-runners får annars slumpmässiga timeouts på IPv6),
- teckenkodning — utan `charset` i svaret gissar `requests` fel och å ä ö blir
  Ã¥ Ã¤ Ã¶, så bytesen skickas till BeautifulSoup i stället,
- rensning av innehåll som är dolt på samtliga brytpunkter, se nedan.

Gör aldrig ett eget `requests.get`. Du får tillbaka alla fyra problemen.

`self.clean_text()` normaliserar blanksteg. `log_info/log_warning/log_error`
prefixar med restaurangnamnet.

### Dolt på alla brytpunkter är innehåll som inte finns

En skrapa läser rå HTML och ser därför ingen skillnad på det som visas och det
som är avstängt. Elementor är vanligt bland restaurangsidorna, och det de
stänger av blir liggande kvar i markupen. Pegs & Tails hade fem rubriker kvar
som ingen besökare kan se — "Dagens drive", "Veckans fisk", "Veckans green" —
och skrapan byggde kategorier av dem. Nästa gång kan det vara hela förra årets
meny, och då serverar vi den utan att något går sönder.

`remove_always_hidden()` i `BaseScraper` tar därför bort element som bär
**alla** brytpunktsklasserna samtidigt:

```
elementor-hidden-desktop  elementor-hidden-laptop
elementor-hidden-tablet   elementor-hidden-mobile
```

Alla fyra betyder att ingen skärmbredd återstår där blocket kan visas.

**Skillnaden mot responsivt dolt är hela poängen.** Bär blocket bara några av
klasserna visas det för någon — ofta är det just mobilvarianten som bär hela
menytexten. Pegs & Tails har 38 block med `elementor-hidden-*`; bara sex är
döda. Vidga aldrig regeln till "har någon hidden-klass".

Av samma skäl rör rensningen **inte** vanlig `display:none`. Menysidor bygger
dragspel och flikar där dagarna ligger dolda tills man klickar, och den som
rensar dem raderar menyer. Regeln gäller bara det vi kan bevisa ur markupen
ensam. Kan du inte bevisa att något aldrig kan visas: låt det vara.

Utvidgar du regeln: kör hela `scrape_menus.py` före och efter och diffa
`menus.json` per restaurang och dag. Ändringen sitter i basklassen och slår
tyst mot alla restauranger på en gång.


<!-- Slut på importerade källblock. -->
