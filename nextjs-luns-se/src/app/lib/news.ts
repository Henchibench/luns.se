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
}

/** Höjs när listan fått något nytt värt att peka på. */
export const NEWS_VERSION = 1;

export const NEWS_ITEMS: NewsItem[] = [
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
