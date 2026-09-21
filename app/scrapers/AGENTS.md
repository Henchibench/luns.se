# Skrapor — obligatoriska regler

Läs rotens AGENTS.md och docs/skrapor.md före menyarbete.

- Produktionsberoenden: requests, beautifulsoup4 och lxml. Inte Playwright.
  Playwright får användas för spaning, aldrig i den färdiga skrapan.
- Avgör källa först: HTML → vanlig skrapa; JS → underliggande JSON;
  verkligt stående meny → sparad JSON; veckovis PDF → textlager;
  veckovis bild → daterad, källkontrollerad avläsning och aktuell originalbild.
  Veckomat får aldrig sparas som en stående meny; se docs/skrapor.md.
- Hitta aldrig på mat eller härled kategori/allergen ur ordningsföljden.
  Använd bara uttryckligt källunderlag. Gissa inte.
- Ärv BaseScraper, använd get_page_content och befintliga basplattformar.
  Använd inte playwright_scraper.py som produktionsbas.
- Bevara scrape()-kontraktet och fellägena. Logga misslyckanden.
  Namnet i restaurant_data måste matcha scraper.name exakt.
- Kontrollera rätter per veckodag, kategorier och område före/efter ändring.
  menus.json och restaurants.json har omslag; läs menus respektive restaurants.
- Nya stående menyer behöver source, captured och kalla_hash enligt källan.
  Skriv av exakt; översätt eller fyll inte i luckor.
- Rensa inte all display:none eller alla hidden-klasser: flikar kan bära mat.
- Ändra inte workflow eller utrullning som del av ett enskilt skrapkort.

Historiska exempel och detaljer väljs via docs/index.md → skrapor.
Nya lärdomar skrivs i docs/skrapor.md eller ett nytt namngivet ämnesdokument,
inte i denna fil och inte i arkivet.
