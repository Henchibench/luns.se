/**
 * Vad som är nytt på luns.se, kurerat för hand.
 *
 * Listan skrivs, den genereras inte ur git. Historiken är i huvudsak skrapor
 * och paketbumpar, och en besökare som kommer hit för att välja lunch har
 * ingen nytta av att veta att en selektor bytts. Här står bara det som märks
 * på skärmen, med orden en gäst förstår.
 *
 * Nyheterna visas i datumordning med senaste först. Vid samma datum behålls
 * ordningen här. Lägger du till en post: höj NEWS_VERSION. Det är
 * höjningen som öppnar rutan nästa gång en återkommande besökare kommer hit.
 * En ny post utan höjd räknare syns bara för den som öppnar rutan manuellt.
 */
export interface NewsItem {
  /** ISO-datum för släppet där nyheten blir tillgänglig. */
  date: string;
  title: string;
  body: string;
  requiresContact?: boolean;
  image?: { src: string; alt: string; width: number; height: number };
}

/** Höjs när listan fått något nytt värt att peka på. */
export const NEWS_VERSION = 13;

export const NEWS_ITEMS: NewsItem[] = [
  {
    date: '2026-10-20',
    title: 'Tips & kontakt',
    body: 'Tipsa om ett lunchställe, rapportera en felaktig meny eller skicka en idé direkt på sajten. Du behöver inte ange namn eller e-post. Under varje restaurang finns Rapportera fel.',
    requiresContact: true,
    image: { src: '/images/news/help-me-help-you.png', alt: 'Meme med texten: Help me help you.', width: 696, height: 404 },
  },
  {
    date: '2026-10-20',
    title: 'Nytt område: Järntorget/Linné',
    body: 'Nu finns Järntorget/Linné i Göteborg på Luns! Välj området i platsväljaren för att se lunchmenyerna där.',
    image: { src: '/images/news/jarntorget-linne-sommarkvall.jpg', alt: 'Bearbetad vy över Linnégatan och kvarteren vid Järntorget i varmt sommarkvällsljus.', width: 1535, height: 1025 },
  },
  {
    date: '2026-10-20',
    title: 'Nyheter när du kommer tillbaka',
    body: 'När något nytt har tillkommit öppnas den här rutan nästa gång du besöker Luns, en gång per uppdatering. De senaste nyheterna visas först och äldre går att fälla ut. Du hittar alltid nyheterna under Inställningar och info.',
  },
  {
    date: '2026-10-20',
    title: 'Större text som standard',
    body: 'Vi har slagit på större text för alla så att menyerna blir lättare att läsa. Föredrar du mindre text? Öppna Inställningar via kugghjulet och stäng av Större text. Ditt nya val sparas till nästa besök.',
  },
  {
    date: '2026-10-20',
    title: 'Nya restauranger i ditt område',
    body: 'När en restaurang tillkommer i ett område du besökt får du en liten blänkare ovanför lunchlistan. Tryck på namnet för att se menyn, eller stäng blänkaren. Cuckoo’s Nest finns nu med på Lindholmen.',
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
