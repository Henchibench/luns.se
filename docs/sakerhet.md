# Säkerhetskunskap och paketkort

Status: metod sammanställd 2026-09-17; ingen ny sårbarhetsskanning gjord som
del av minnesuppdelningen. Gamla antal öppna larm är historiska mätningar.

- STATE.md från 2026-09-02 är arkiverad. Läs inte dess "Open Alerts" som dagens
  läge: senare arbete kan redan ha ändrat samma paket.
- Identifiera larmet/CVE:t, berörd version och vilket repo/gren som mäts.
  Advisory-sidan beskriver paketets sårbarhet, inte repots nuvarande status.
- Kontrollera om fixen ligger i Dev och väntar på Henriks släpp till main.
  Rättelse verifierad mot Hemhubbs lib/lunsSakerhet.ts 2026-09-17: säkerhets-
  kontrollen läser Dev, inte main. Äldre minne/repo-04.md säger motsatsen.
  Ett kvarstående paketlarm kan bero på gammal mätning, inte ett osläppt Dev.
- Läs lockfilens faktiska version, inte enbart tillåtet intervall eller override.
- npm audit med NODE_ENV=production kan utesluta dev-beroenden. Ange uttrycklig
  omfattning och kontrollera aktuell verktygskonfiguration.
- Ett tomt svar från en skanning är inte bevis på att anropet lyckades.
  Verifiera svarskod, format och täckning; redovisa otillgängliga källor.
- Mät både byggmiljön och eventuell exponering; anta inte att ett gammalt
  resonemang om dev-beroenden gäller för ett nytt paket eller nytt larm.
- Inget nytt skanningsschema, workflow eller automatiskt fixmandat införs här.

Detaljer och tidigare incidenter: minne/register.md → säkerhetsavsnitten.
Ny utredning ska ange datum, källa, berörda versioner och verifierat resultat.
