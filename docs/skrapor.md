# Skrapor — kontrakt och arbetsgång

Status: etablerade regler importerade 2026-09-17. Kontrollera aktuell kod och
källsida; uppgifter om en restaurangs innehåll är alltid tidsberoende.
Läs app/scrapers/AGENTS.md också. Här ges inget utökat uppdragsmandat.

## Källa först

1. HTML med menytext: använd BaseScraper och dess get_page_content.
2. JS-byggd meny: identifiera underliggande JSON, inte en Playwright-skrapa.
3. Stående meny: läs exakt, spara JSON och använd StaticMenuScraper.
4. Veckovis PDF med textlager: använd den smala standardbiblioteksläsaren i
   `pdf_text.py`, kontrollera vecka eller källans ändringsdatum och stäng av
   fallback till förra menyn. Veckovis bild: visa källstatus och direkt
   menylänk; inför inte OCR eller statisk ersättning.

Produktion har bara requests, beautifulsoup4, lxml utöver standardbiblioteket.
Spaning med scripts/spana.py får ha utvecklingsberoenden; de får inte läcka in
i produktionsskrapan. Läs minne/skrapor-09.md när spaning behövs.

## Kontrakt

- Ny restaurang berör skrapfil, app/restaurant_data.py och scripts/scrape_menus.py.
  Namnet ska matcha scraper.name exakt och area måste finnas i LOCATIONS.
- scrape() returnerar {namn: [rader]}. Rättformat:
  Måndag|<strong>Kategori</strong> - Rätten och dess beskrivning
- INFO-rader är valfria per dag, med etablerat format i BaseScraper.
- Felläge: "Ett fel uppstod vid hämtning av menyn" eller
  "Ingen lunchmeny tillgänglig"; logga med log_error. Runnern kan behålla
  föregående meny, så ett lyckat bygge bevisar inte att skrapningen är aktuell.
  Veckovis växlande källor ska sätta `allow_previous_menu = False`; då blir
  ett fel synligt i stället för att frysa förra veckans mat.
- Kategori måste vara källbelagd. Ordningen på rätterna bevisar inte vegetarisk
  mat. Använd neutral kategori när underlag saknas, aldrig påhittade etiketter.
- Stående JSON behöver source, captured och kalla_hash. Uppdatera datum och hash
  tillsammans efter verklig källäsning. Menyn får inte vara veckovis växlande.

## Testa

Jämför före/efter per restaurang OCH dag. Kontrollera kategori och område i
byggd data och på förhandssidan. menus.json/ restaurants.json är omslagna.
Släpp inte därför att skriptet bara avslutade utan fel.

BaseScraper hanterar retry, kodning och dolt innehåll. Gör inte egna generella
rensningar av display:none; dagar kan ligga bakom flikar. Ändring i basklassen
kräver jämförelse för alla restauranger, inte enbart det aktuella kortet.

Äldre exempel om stående menyer, foodtrucks, selektorer och plattformar finns
i minne/register.md. De är felsökningsunderlag, inte dagens restauranginventering.

## Järntorget/Linné — källinventering och införande 2026-09-21

Källa och verifiering: restaurangernas officiella länkar i kortet kontrollerades
med rå HTTP, renderad webbläsare, nätverkstrafik och hämtade menybilagor. Efter
chefens följdbeställning provkördes samtliga tio poster med
produktionsberoendena. PDF-läsaren jämfördes med `pdftotext` på de tre
originaldokumenten; `pdftotext` ingår inte i produktionslösningen.

| Källa | Beslut 2026-09-21 |
|---|---|
| Taj Mahal | Stående veckomeny i rå HTML. Införd som vanlig skrapa. |
| Silvis | Fem uttryckligt märkta stående rätter på egna sidan. Veckans rätter kommer från en JavaScript-laddad Facebook-widget och tas inte med. Den stående menyn är sparad med källhash. |
| Poh-Keh Masthugget | Officiella sidan anger plats och tider men ingen meny. Införd med restaurangens aktuella externa Foodora-meny; nio maträtter, drycker uteslutna. |
| Fula Hummern | Officiella sidan säger fortfarande sommarstängt och saknar aktuell meny. Införd med källstatus, inte med den gamla menybilden. |
| Restaurang BO | Vecka 39 publiceras som bild. Införd med automatisk veckokontroll, källstatus och direkt MENY-länk; inga bildrätter skrivs av eller fryses. |
| Heurlins | PDF:en har textlager men var senast ändrad 2026-09-07. Införd med färskhetskontroll och källstatus tills en aktuell PDF publiceras. |
| Kathmandu | Officiella lunchsidan stoppas av Cloudflare. Införd med Menydags som uttrycklig reservkälla; vecka 39 var ännu inte publicerad vid kontrollen. |
| Bongo Göteborg | Vecka 39 är en textbärande PDF. Införd med tre rätter per vardag och kontroll mot aktuellt ISO-veckonummer. |
| Byns Trattoria | PDF:en hade textlager men var fortfarande märkt vecka 38. Införd med veckokontroll och källstatus; vecka 38 visas inte som vecka 39. |
| Feskekörka | Två stående lunchsektioner finns i rå HTML för tis–tor respektive ons–tor. De infördes under samlingsposten Feskekörka; det gamla blocket märkt vecka 37 ignoreras. |

Veckomenyerna returnerar INFO-rader när aktuell mat saknas. Det gör att
restaurangen och dess original-/reservlänk finns på sajten utan att gammal mat
presenteras som dagens. `allow_previous_menu = False` hindrar dessutom runnern
från att återanvända en tidigare vecka efter ett senare hämtfel.
