/**
 * Umami-anrop, med två spärrar.
 *
 * window.umami saknas helt i utveckling — skriptet laddas bara i produktion,
 * se layout.tsx — så anropen tystnar av sig själva där.
 *
 * localStorage-flaggan är Umamis eget sätt att utesluta sin egen webbläsare,
 * men deras tracker respekterar den bara för sidvisningar. Anrop via track()
 * går igenom ändå, vilket är hela vårt trafikbrus. Därför kollar vi den här
 * också: sätt umami.disabled i konsolen på varje enhet du själv surfar från,
 * så räknas varken dina sidvisningar eller dina klick.
 */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const umami = (window as any).umami;
  if (!umami) return;

  try {
    if (localStorage.getItem('umami.disabled')) return;
  } catch {
    // Privat läge kan kasta på localStorage. Hellre spåra än krascha.
  }

  umami.track(name, data);
}
