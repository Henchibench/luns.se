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

const ORACLE_DISCOVERED_KEY = 'luns-oracle-discovered';
let oracleDiscoveryPending = false;

/** Första upptäckten i denna webbläsare. Testservern räknas aldrig. */
export async function trackOracleDiscovery(): Promise<void> {
  if (typeof window === 'undefined'
    || !['luns.se', 'www.luns.se'].includes(window.location.hostname)
    || oracleDiscoveryPending) return;

  const umami = (window as any).umami;
  if (typeof umami?.track !== 'function') return;

  try {
    if (localStorage.getItem('umami.disabled') || localStorage.getItem(ORACLE_DISCOVERED_KEY)) return;
    // Spara före anropet så även en annan flik ser upptäckten. Kan inget
    // sparas avstår vi från mätningen i stället för att räkna om varje gång.
    localStorage.setItem(ORACLE_DISCOVERED_KEY, '1');
  } catch {
    return;
  }

  oracleDiscoveryPending = true;
  try {
    await umami.track('oracle-discovered');
  } catch {
    // Ett anrop som kastar får provas igen vid nästa öppning. Oraklet ska
    // fungera även när statistikinsamlingen är blockerad eller otillgänglig.
    try { localStorage.removeItem(ORACLE_DISCOVERED_KEY); } catch { /* Lagringen är otillgänglig. */ }
  } finally {
    oracleDiscoveryPending = false;
  }
}
