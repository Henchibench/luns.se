# Utveckling och leverans

Status: arbetsregler sammanställda 2026-09-17 ur tidigare instruktioner.
Versionsnummer, källor och tjänststatus är inte nyverifierade i denna text.

- Python skriver JSON i nextjs-luns-se/public/data; Next bygger statisk sajt.
  Står rätten i menus.json men syns inte är första spåret frontend, annars skrapa.
- menus.json har uppslag under menus, restaurants.json under restaurants.
- Menyvisning: nextjs-luns-se/src/app/lib/menu.ts; tavla: src/app/page.tsx.
  Se importens repokarta för övriga filer; kontrollera att de fortfarande finns.
- Besöksstatistik hämtas vid byggtid, inte från besökarens webbläsare.
- Synlig ny funktion får nyhet i src/app/lib/news.ts och höjt NEWS_VERSION.
- Använd designens text-10 … text-30, inte fasta text-[13px], så textskalning
  fungerar. INFO-emoji används även som signal: testa råtext innan den strippas.

## Leverera till Dev, inte main

1. Läs git status; hämta origin/Dev. Bevara andras arbete.
2. Arbeta på Dev eller isolerad arbetsgren från Dev. Committa och pusha till Dev.
3. Kör minnestestet före commit: node --test scripts/minne.test.mjs.
4. Vid menyändring: scripts/testserver.sh. För frontend: --utan-skrap.
   Följ AGENTS.md:s verifieringsregel för rena dokumentationsändringar.
5. Verifiera http://10.0.1.34:3002/ och lämna adressen. Henrik släpper själv.

scripts/testserver.sh speglar produktionsmiljön och märker förhandssidan.
Bygg manuellt bara med korrekt miljö: ärvda NODE_ENV/TURBOPACK/NEXT-variabler
har tidigare orsakat fel. Detaljer finns i minne/repo-05.md.

En ren Dev betyder inte att main har samma paket. Jämför origin/main..Dev
innan en redan levererad fix görs igen. En merge publicerar inte själv;
nuvarande workflow ska inspekteras före besked om nästa publicering.

## Menybesked per dag, 2026-09-21

Symptom: restaurangkorten visade samma generella tomrad även när skrapan
kände orsaken, och ”idag” stod kvar vid val av en annan veckodag.
`menu.ts` skiljer nu INFO-rader med prefixet `Menybesked: ` från tider och
priser. Beskedet följer vald dag till `MenuList` och ersätter tomraden när
rätter saknas. Vid andra tomma menyer skrivs vald veckodag ut. Rätter eller
antal fylls aldrig ut med statusinformation; sök- och matfilter behåller sitt
beteende. Källkontroller och begränsningar finns i [skrapor](skrapor.md).

Verifiering: menyparsern provad med menybesked, vanlig INFO-rad och en rätt
för nästa dag; beskedet hamnar varken bland rätter eller bland öppettider.
