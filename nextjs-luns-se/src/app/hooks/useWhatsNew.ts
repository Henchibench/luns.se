'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

const STORAGE_KEY = 'luns-tour-seen';

/**
 * Bump when there is a new batch of features worth walking people through.
 * Storing the version rather than a boolean means the next round can run its
 * own tour instead of this being a once-and-never-again affair.
 */
export const TOUR_VERSION = 1;

function readSeenVersion(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * @param blocked Something else owns the screen right now — the location
 *        welcome, or the page is still loading. Two overlays at once is
 *        unusable, so the tour waits.
 */
export function useWhatsNew(blocked: boolean) {
  const [seenVersion, setSeenVersion] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setSeenVersion(readSeenVersion());
  }, []);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(TOUR_VERSION));
    } catch {
      // Private mode — the tour will show again next visit. Not worth guarding.
    }
    setSeenVersion(TOUR_VERSION);
  }, []);

  const hydrated = seenVersion !== null;
  const unseen = hydrated && seenVersion < TOUR_VERSION;

  // Auto-start once, but only when nothing else is in the way
  useEffect(() => {
    if (!unseen || blocked || isActive) return;
    setIsActive(true);
    trackEvent('tour-start', { version: TOUR_VERSION, trigger: 'auto' });
    // Mark it seen as soon as it opens: someone who reloads mid-tour has had
    // their chance, and being nagged by an overlay is worse than missing it.
    markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen, blocked]);

  const startTour = useCallback(() => {
    setIsActive(true);
    trackEvent('tour-start', { version: TOUR_VERSION, trigger: 'manual' });
    markSeen();
  }, [markSeen]);

  const endTour = useCallback(() => {
    setIsActive(false);
  }, []);

  return { isActive, startTour, endTour };
}
