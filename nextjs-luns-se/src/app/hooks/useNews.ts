'use client';

import { useCallback, useEffect, useState } from 'react';
import { NEWS_VERSION, latestNewsVersion } from '../lib/news';
import { welcomeSeen } from './useWelcome';
import { trackEvent } from '../utils/analytics';

/** Egen nyckel, samma mönster som rundans luns-welcome-seen. */
const STORAGE_KEY = 'luns-news-seen';

/**
 * Finns det något i nyhetslistan besökaren inte sett? Sidan öppnar då rutan
 * automatiskt när den är redo; pricken finns kvar tills rutan öppnas.
 *
 * Regeln som håller rundan och nyhetsnotisen isär: den som inte sett rundan
 * är ny, och för en ny besökare är ingenting "nytt sedan sist" — hela sajten
 * är ny. Då skrivs nyhetsnyckeln ner direkt, utan prick, så att rundan får
 * vara ensam om att förklara. Nästa höjning av NEWS_VERSION når hen som alla
 * andra. Ingen ser alltså både rundan och notisen.
 *
 * Kroken läser vid montering och inte när rundan hunnit köra, med flit: just
 * då är welcome-nyckeln fortfarande osatt för den nya besökaren, och det är
 * precis det svar vi vill ha. Rundan sätter sin nyckel först när den öppnas,
 * alltså efter att den här redan sagt sitt.
 */
export function useNews(area?: string, contactEnabled = false) {
  const [seenVersion, setSeenVersion] = useState<number | null>(null);
  const version = latestNewsVersion(area, contactEnabled);
  const unread = seenVersion !== null && seenVersion < version;

  useEffect(() => {
    try {
      if (!welcomeSeen()) {
        setSeenVersion(NEWS_VERSION);
        localStorage.setItem(STORAGE_KEY, String(NEWS_VERSION));
        return;
      }
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      setSeenVersion(Number.isFinite(saved) ? saved : NEWS_VERSION);
    } catch {
      // Privat läge: en prick som aldrig går att släcka är sämre än ingen.
    }
  }, []);

  /**
   * Markeras som läst när rutan öppnas, inte när den stängs — samma val som
   * rundan gör. Den som öppnar och stänger direkt har sett vad som fanns.
   */
  const markSeen = useCallback((automatic = false) => {
    const nextSeen = Math.max(seenVersion ?? NEWS_VERSION, version);
    setSeenVersion(nextSeen);
    try {
      localStorage.setItem(STORAGE_KEY, String(nextSeen));
    } catch {
      // Går inte att spara — pricken kommer tillbaka nästa besök. Får duga.
    }
    trackEvent('news-open', { version, automatic });
  }, [seenVersion, version]);

  return { unread, markSeen };
}
