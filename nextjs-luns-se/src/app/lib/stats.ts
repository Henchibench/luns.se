/**
 * Statistiken bakom /statistik.
 *
 * Filen skrivs vid bygget, precis som menus.json — se lib/menu.ts. Ingen
 * API-nyckel når därför besökaren, och sidan gör inget anrop mot någon
 * analystjänst när den öppnas.
 *
 * Umami levererar rådata: händelsenamn och antal. Översättningen till något
 * begripligt sker i hämtningsskriptet, inte här — sidan ska kunna rita det den
 * får utan att veta vad en "favorite-toggle" är.
 */

export interface Bucket {
  label: string;
  value: number;
  /** Andra raden, mindre och dämpad. Restaurangnamn under en rätt, till exempel. */
  sub?: string;
}

export interface StatsFile {
  /** ISO-tid för när siffrorna hämtades. Visas i foten. */
  generated: string;
  /**
   * Sant så länge filen innehåller påhittade siffror. Sidan sätter då ut en
   * varning. Hellre en ful banner under utvecklingen än en sida som ser
   * trovärdig ut och ljuger om riktiga restauranger.
   */
  sample?: boolean;
  period: { label: string; days: number };
  visits: { total: number; weekdays: Bucket[] };
  /** Ett värde per timme, index 0–23. */
  hours: number[];
  restaurants: Bucket[];
  dishes: Bucket[];
  locations: Bucket[];
  cravings: Bucket[];
}

export async function loadStats(): Promise<StatsFile> {
  const response = await fetch('/data/stats.json');
  if (!response.ok) throw new Error(`stats.json: ${response.status}`);
  return response.json();
}

/** Timmen då flest öppnar sajten. Används till en mening, inte till en siffra. */
export function peakHour(hours: number[]): number {
  let best = 0;
  hours.forEach((value, hour) => {
    if (value > hours[best]) best = hour;
  });
  return best;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('sv-SE');
}
