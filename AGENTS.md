# Luns — arbetsregler

Henrik beställer; Lunsansvarig bygger i detta repo, som hench på servern.
Svara på svenska. Ett kort ger mandat inom kortets omfattning, inte mer.

## Regler varje gång

- AI körs bara med Codex CLI och ChatGPT-prenumeration. Inga modell-API:er,
  modellnycklar eller fallback. Inga nya AI-tjänster eller OpenClaw.
- Hitta aldrig på en rätt, meny, kategori eller allergenuppgift. Allt ska
  kunna härledas till restaurangens källa. Saknas underlag: rapportera det.
- Rör inte .github/workflows/ utan uttrycklig beställning. Rör inte hubben,
  StockTracker, SSH eller server-/nätverkskonfiguration.
- Hemligheter, venv, spaningsutdata och nedladdade bilagor får inte committas.
  Skriv aldrig ut tokens eller konfigurationsfiler.
- Bevara andras arbete. Läs git status och aktuella filer före redigering.
  Andra körningar kan arbeta i samma repo; använd inte add -A på okänd diff.
- Arbetet levereras till Dev, ALDRIG direkt till main. Henrik släpper själv.
  Hämta origin/Dev först; byt inte gren över andras okommittade ändringar.

## Läs rätt dokument

1. Läs docs/index.md. Välj sedan relevanta ämnesfiler.
2. Meny/skrapa: läs app/scrapers/AGENTS.md och docs/skrapor.md uttryckligen,
   även när din arbetskatalog är reporoten.
3. Sajt/byggkedja: läs docs/utveckling.md. Paketkort: docs/sakerhet.md.
4. Sök tidigare fall i docs/minne/ med rg; docs/minne/register.md är kartan.
   Det är historik, inte dagens läge. Läs inte alla avsnitt vid varje start.
5. CLAUDE.md och STATE.md är hänvisningar. Originalen i docs/historik/ är
   frysta. Instruktionerna här ersätter äldre läs-/minnesanvisningar.

## Verifiera och avsluta

- Dokumentationsändring: node --test scripts/minne.test.mjs före commit.
  Vid sajtändring: bygg. Vid skrapändring: verifiera källan och utfallet per dag.
- Committa och pusha eget arbete till Dev. Slå inte ihop med main.
- Kör scripts/testserver.sh för menyändring; --utan-skrap för enbart sajt
  eller dokumentation. Kontrollera status och lämna http://10.0.1.34:3002/.
  Vid dokumentationsändring räcker minnestester + bygge och befintlig frisk
  testserver om sajtkoden är identisk; skapa ingen onödig skrapkörning.
- En merge till main publicerar inte själv: workflow kör på schema/manuellt.
  Ändra inte workflow som del av ett vanligt kort.

## Spara ny kunskap

- Uppdatera rätt ämnesfil med symptom, orsak, lösning, datum och verifiering.
  Skilj mätning från antagande; ersätt gamla uppgifter på samma ställe.
- Skriv inte löpande dagbok i AGENTS.md. Håll filen kort, under 100 rader.
- Nya ämnen får en indexrad. Importfilerna är frysta för spårbarhet;
  rättelser skrivs i ämnesfilen med hänvisning till det äldre avsnittet.
