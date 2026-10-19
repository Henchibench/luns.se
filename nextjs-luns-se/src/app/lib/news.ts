/**
 * Vad som är nytt på luns.se, kurerat för hand.
 *
 * Listan skrivs, den genereras inte ur git. Historiken är i huvudsak skrapor
 * och paketbumpar, och en besökare som kommer hit för att välja lunch har
 * ingen nytta av att veta att en selektor bytts. Här står bara det som märks
 * på skärmen, med orden en gäst förstår.
 *
 * Lägger du till en post: skriv den överst och höj NEWS_VERSION. Det är
 * höjningen som tänder pricken på kugghjulet — en ny post utan höjd räknare
 * syns bara för den som råkar öppna rutan ändå.
 */
export interface NewsItem {
  /** ISO-datum, hämtat från när ändringen faktiskt gick in. */
  date: string;
  title: string;
  body: string;
  requiresContact?: boolean;
}

/** Höjs när listan fått något nytt värt att peka på. */
export const NEWS_VERSION = 11;

export const NEWS_ITEMS: NewsItem[] = [
  {
    date: '2026-10-19',
    title: 'Tips & kontakt',
    body: 'Tipsa om ett lunchställe, rapportera en felaktig meny eller skicka en idé direkt på sajten. Du behöver inte ange namn eller e-post. Under varje restaurang finns Rapportera fel.',
    requiresContact: true,
  },
  {
    date: '2026-10-19',
    title: 'Nya restauranger i ditt område',
    body: 'När en restaurang tillkommer i ett område du besökt får du en liten blänkare ovanför lunchlistan. Tryck på namnet för att se menyn, eller stäng blänkaren. Cuckoo’s Nest finns nu med på Lindholmen.',
  },
  {
    date: '2026-10-19',
    title: 'Fler lunchmenyer i Järntorget/Linné',
    body: 'Silvis visar nu även veckans rätter och Feskekörkas lunchdagar är uppdaterade. Byns och Heurlins publicerade menyer går att läsa med en tydlig varning när giltigheten är osäker. Fula Hummern har tagits bort eftersom lunchmenyn inte uppdaterats.',
  },
  {
    date: '2026-10-19',
    title: 'Textmenyer hos BO och Kathmandu',
    body: 'BO:s veckomeny läses nu automatiskt från restaurangens egen bild och går att söka. Kathmandu visar sin stående lunchmeny för udda eller jämna veckor, med rätt alternativ på varje dag.',
  },
  {
    date: '2026-09-21',
    title: 'BO:s lunchmeny går att läsa här',
    body: 'Nu finns BO:s lunchrätter och priser på rätt veckodag. När restaurangen byter menybild visas det nya originalet direkt på kortet tills rätterna har lästs av.',
  },
  {
    date: '2026-09-21',
    title: 'Tydligare besked när lunchmenyn saknas',
    body: 'I Järntorget/Linné ser du nu varför en meny saknas när vi vet orsaken. Silvis har exempelvis ingen måndagslunch. Välj tisdag–fredag för deras stående rätter.',
  },
  {
    date: '2026-09-21',
    title: 'Järntorget/Linné är med',
    body: 'Göteborg har fått ett område till. Välj Järntorget/Linné för tio lunchställen mellan Masthuggskajen, Långgatorna och Feskekörka.',
  },
  {
    date: '2026-09-11',
    title: 'Kartan är ren igen',
    body: 'Karttjänsten hade lagt texten "API key required" tvärs över rutorna. Den är borta nu — gator och nålar syns utan skräp framför. Ser du den kvar ligger en gammal bild i webbläsarens minne, ladda om sidan.',
  },
  {
    date: '2026-08-19',
    title: 'Större text',
    body: 'Under Inställningar går texten att höja ett steg. Rätter, namn och etiketter växer, men listan rymmer lika många restauranger — det är bokstäverna som blir större, inte raderna.',
  },
  {
    date: '2026-08-04',
    title: 'Mörkt läge',
    body: 'Reglaget högst upp i inställningarna byter sajten till mörk. Valet ligger kvar till nästa besök.',
  },
  {
    date: '2026-08-04',
    title: 'Alla restauranger på en karta',
    body: 'KARTA i headern byter listan mot en karta över området, med en nål per restaurang. Klicka på en nål så hoppar du till dess meny.',
  },
  {
    date: '2026-08-03',
    title: 'Bevaka en rätt',
    body: 'Stjärnan bredvid en rätt bevakar den. Serveras den igen står det högst upp på dagen, även om restaurangen skrivit om den lite.',
  },
  {
    date: '2026-07-28',
    title: 'Favoritmarkera stället',
    body: 'Hjärtat sparar en restaurang, och favoritfiltret visar bara dem. Sajten kan dessutom öppna med filtret redan på.',
  },
];
