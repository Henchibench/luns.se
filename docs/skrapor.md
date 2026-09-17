# Skrapor — kontrakt och arbetsgång

Status: etablerade regler importerade 2026-09-17. Kontrollera aktuell kod och
källsida; uppgifter om en restaurangs innehåll är alltid tidsberoende.
Läs app/scrapers/AGENTS.md också. Här ges inget utökat uppdragsmandat.

## Källa först

1. HTML med menytext: använd BaseScraper och dess get_page_content.
2. JS-byggd meny: identifiera underliggande JSON, inte en Playwright-skrapa.
3. Stående meny: läs exakt, spara JSON och använd StaticMenuScraper.
4. Veckovis bild/PDF: rapportera begränsningen; inför inte OCR eller statisk
   ersättning utan separat beställning.

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
