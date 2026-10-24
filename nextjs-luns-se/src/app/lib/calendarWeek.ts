/** Kalenderveckan i Sverige, även när besökaren är i en annan tidszon. */
export function calendarWeek(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const date = new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
