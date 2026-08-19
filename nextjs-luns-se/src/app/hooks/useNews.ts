'use client';

import { useCallback, useEffect, useState } from 'react';
import { NEWS_VERSION } from '../lib/news';
import { welcomeSeen } from './useWelcome';
import { trackEvent } from '../utils/analytics';

/** Egen nyckel, samma mönster som rundans luns-welcome-seen. */
const STORAGE_KEY = 'luns-news-seen';

/**
 * Pricken på kugghjulet: finns det något i nyhetslistan besökaren inte sett?
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
export function useNews() {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    try {
      if (!welcomeSeen()) {
        localStorage.setItem(STORAGE_KEY, String(NEWS_VERSION));
        return;
      }
      setUnread(Number(localStorage.getItem(STORAGE_KEY)) < NEWS_VERSION);
    } catch {
      // Privat läge: en prick som aldrig går att släcka är sämre än ingen.
    }
  }, []);

  /**
   * Markeras som läst när rutan öppnas, inte när den stängs — samma val som
   * rundan gör. Den som öppnar och stänger direkt har sett vad som fanns.
   */
  const markSeen = useCallback(() => {
    setUnread(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(NEWS_VERSION));
    } catch {
      // Går inte att spara — pricken kommer tillbaka nästa besök. Får duga.
    }
    trackEvent('news-open', { version: NEWS_VERSION });
  }, []);

  return { unread, markSeen };
}
