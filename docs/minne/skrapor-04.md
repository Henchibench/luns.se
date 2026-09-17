# Importerad kunskap: Kontraktet: `scrape()`

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 76–177. Nya lärdomar hör i ämnesfilerna.

## Kontraktet: `scrape()`

Ärv `BaseScraper` och implementera en metod. Konstruktorn tar inga argument —
skrapan bär sin egen `restaurant_info`:

```python
class LaFontanaScraper(BaseScraper):
    def __init__(self):
        super().__init__({
            'name': 'La Fontana',
            'website': 'http://lafontanamjardevi.se',
            'menu_url': 'http://lafontanamjardevi.se/dagens-lunch/',
        })

    def scrape(self) -> Dict[str, List[str]]:
        ...
```

Returen är `{self.name: [rader]}`. Varje rad är en sträng i ett av två format:

```
Måndag|<strong>Kategori</strong> - Rätten och dess beskrivning
INFO:Måndag - Restaurant Info: 💰 149 kr · Utan dryck 139:-
```

Veckodagarna är `Måndag Tisdag Onsdag Torsdag Fredag`, alltid med versal.
`INFO:`-raden är valfri och läggs en gång per dag som har rätter.

Är menyn fast och inte veckovis: lägg samma rätter på alla vardagar. Se
`bistro3_scraper.py`.

### Fellägena är en del av kontraktet

Två strängar är signaler, inte text:

```python
return {self.name: ["Ett fel uppstod vid hämtning av menyn"]}   # hämtningen sprack
return {self.name: ["Ingen lunchmeny tillgänglig"]}             # sidan svarade, men ingen meny fanns
```

`scrape_menus.py` känner igen dem och behåller **förra körningens meny** från
den publicerade `menus.json` i stället. Det betyder att en skrapa som går
sönder inte tömmer sajten — men också att den blir tyst. Logga alltid med
`self.log_error()` när du returnerar dem.

Kasta gärna undantag också; runnern fångar dem och gör samma sak.

**Hitta aldrig på en rätt.** Kan du inte läsa menyn, returnera fellägena. Det
här är en sajt folk väljer lunch efter.

### Det tystaste felet: en rätt som hamnar i fel rad

Fellägena ovan fångar att hämtningen sprack. De fångar inte att skrapan läste
sidan, fick med all text, och lade en rätt på fel ställe. Då är rätten kvar i
`menus.json` men osynlig för den som läser — ingen loggrad, inget larm.

Källan är nästan alltid att någon skriver menyn för hand i en WordPress. Bygg
därför aldrig igenkänningen på att texten är **snyggt formaterad**:

- Kräv inte att ett stycke *börjar* med sin rubrik. Rubriken kan stå mitt i
  stycket, och då hamnar rätten efter den under föregående kategori. Det var
  precis det som hände Kooperativet 2026-08-10 — se klassdocstringen i
  `kooperativet_scraper.py`, den beskriver mönstret och lösningen.
- Lita inte på `<strong>`. De glömmer fetstilen lika gärna som
  styckebrytningen. Ha en lista med kända kategorinamn som funkar på egen hand.
- Men lita inte bara på listan heller: en ny kategori som inte står där går
  annars förlorad. Ta rubrikkandidater från **båda** hållen.
- Matcha kategorinamn versalkänsligt och på hela ord. Rubriker skrivs i
  VERSALER medan "kött" och "fisk" står i var tredje rättsbeskrivning, och
  ordkravet är det som skiljer `VEG Taco Bowl` från kategorin `VEGETARISK`.

- Jämför aldrig en **dagrubrik** med `==`. Sidor märker gärna innevarande dag
  med en badge *inuti* rubriken — Nordrests castit lägger ett andra span med
  texten "Idag" i samma `h3`, så rubriktexten blir "Tisdag Idag". En exakt
  jämförelse missar då alltid precis den dag besökaren är ute efter, medan
  resten av veckan syns och allt ser friskt ut. Universitetsklubben tappade
  dagens meny varje dag av det skälet fram till 2026-08-11. Plocka dagnamnet ur
  det element som bär just dagen, och matcha annars veckodagen som **helt ord**
  i rubriken i stället för på hela strängen.

Kontrollen som avslöjar det: **räkna rätterna per dag före och efter** din
ändring och diffa raderna. En dag som tappar en rad, eller en rad som blivit
misstänkt lång, är en hopklistrad rätt. Att alla dagar utom en har mat är inte
heller normalt — kontrollera den dag som fattas mot sidan innan du släpper.

### Och det näst tystaste: en kategori du hittat på

Kategorin är inte dekoration. `VEGETARISK` framför en rätt är ett påstående om
maten, och den som läser sajten kan ha ett skäl att lita på det.

Sätt därför bara en kategori du kan **peka på i källan** — en rubrik, en
etikett, restaurangens egna ord. Att härleda den ur *ordningen* på raderna är
alltid fel, hur konsekvent mönstret än ser ut den vecka du mäter. Östgöta Kök
skriver "ny vegetarisk och ny animalisk rätt varje dag" och lade den
vegetariska först alla fem dagarna 2026-08-10 — men de har aldrig lovat
ordningen, och dagen de byter står det fel utan att något går sönder.

Saknas rubrik finns två ärliga utvägar: `Dagens`, eller rättens eget namn
(`ostgota_kok_scraper.py` delar raden vid snedstrecket som restaurangen själv
skiljer rätt från tillbehör med). Blir den delningen fel är det en kosmetisk
gräns — inte en osann uppgift om mat.


<!-- Slut på importerade källblock. -->
