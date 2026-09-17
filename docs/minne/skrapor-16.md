# Importerad kunskap: En kyl på ett kontor är också ett lunchställe

Status: historiskt underlag importerat 2026-09-17, inte nyverifierad drift.
Läs AGENTS.md och docs/index.md först. Gamla uppdrag/kommandon ger inget mandat.
Källa: docs/historik/skrapor-2026-09-17.md, rader 510–534. Nya lärdomar hör i ämnesfilerna.

## En kyl på ett kontor är också ett lunchställe

Stångs Matlådor avfärdades först som "en produkt hos en restaurang vi redan
har". Det var fel: kylarna står ute i husen — Stångs kallar dem **Stångs
Express** och installerar dem hos företagen — så för den som sitter i ett hus
med en är det ett eget alternativ, inte ett besök hos Stångs Mjärdevi. Fråga
"kan man äta lunch här utan att gå till restaurangen?" innan du skriver av
något som en produkt.

Sortimentet ligger bara i kassasystemet, och `POST db20.bokad.se/webdata` med
`{"system": "<system>"}` ger **hela registret i ett anrop** — kategorier,
produkter och priser. Det är en annan väg in än `/find` och `/findone` som
`stangs_mjardevi_scraper.py` använder för dagens rätter, och den enda som
visar vad som står i kylarna. Prislistorna följer dock inte med; standard-
prislistans id kräver fortfarande ett `/findone` mot `pricelists`.

Varje kyl har sina egna kategorier med i stort sett samma rätter i
("QUALCOMM MATLÅDOR", "SAAB MATLÅDOR", "Sectra Teknikringen Lunchlåda", …).
Lägg ihop dem och deduplicera på rättens namn — men **säg i en INFO-rad att
alla alternativ inte finns i alla kylar**, för det gör de inte. Att i stället
lista bara "rätt" kyl kräver en hårdkodad lista över vilka hus som har en, och
den ruttnar tyst nästa gång Stångs sätter upp en till. `productGroups` i
svaret avslöjar var de står bättre än kategorinamnen gör: `SAAB MJÄRDEVI 6%`
är hur man vet att Saab-kylen står i Mjärdevi och inte på Ensbovägen.


<!-- Slut på importerade källblock. -->
