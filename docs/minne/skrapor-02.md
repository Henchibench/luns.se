# Importerad kunskap: Först av allt: vad slags menykälla är det?

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 11–35. Nya lärdomar hör i ämnesfilerna.

## Först av allt: vad slags menykälla är det?

Det här är det första beslutet och det avgör allt annat. Skriv ingen kod förrän
du vet svaret. Ta det första steget som stämmer:

| | Källa | Vad du gör |
|---|---|---|
| **1** | Menytexten finns i sidans HTML | vanlig skrapa mot sidan |
| **2** | Menyn byggs av JavaScript | hitta JSON-endpointen bakom sidan och skrapa den |
| **3** | Menyn är **stående** — bild, PDF eller HTML som inte byts | läs den en gång, spara som JSON, ärv `StaticMenuScraper` |
| **4** | Menyn är en **bild eller PDF som byts varje vecka** | bygg ingenting, rapportera |

Skillnaden mellan 1 och 2 avgörs enklast med `scripts/spana.py` (se nedan), som
lägger sidans råa HTML och den JS-renderade DOM:en bredvid varandra.

Steg 4 är det enda vi inte kan lösa idag: det skulle kräva OCR vid varje
körning i Actions, och det är inte byggt. Rapportera i stället hur bilden ser
ut, hur ofta den byts och om den ligger bakom inloggning. Det är ett fullgott
svar.

**Bygg aldrig en statisk meny (steg 3) av en meny som faktiskt byts.** Den ser
rätt ut idag och är fel på tisdag, och till skillnad från en trasig skrapa
märks det inte — inget går sönder, det står bara fel mat på sajten. Är du
osäker: säg att du är osäker.


<!-- Slut på importerade källblock. -->
