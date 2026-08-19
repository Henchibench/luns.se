'use client';

import { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '../utils/analytics';

/**
 * Egen nyckel, inte den gamla luns-tour-seen. Alla som såg rundan för den
 * förra designen har den kvar i localStorage, och de är just de som behöver
 * se den nya — hela gränssnittet är utbytt sedan dess.
 */
const STORAGE_KEY = 'luns-welcome-seen';

/** Höj när rundan ändras så mycket att den är värd att visa igen. */
export const WELCOME_VERSION = 1;

/**
 * Exporterad för nyhetsnotisen, som är den andra halvan av samma regel: den
 * som ännu inte sett rundan är ny och ska se rundan, ingenting annat. Testet
 * måste vara ett och samma på båda ställena — en höjd WELCOME_VERSION gör
 * gamla besökare nya igen, och då ska nyheterna hålla tyst precis som vid ett
 * förstabesök.
 */
export function welcomeSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) >= WELCOME_VERSION;
  } catch {
    // Privat läge: hellre ingen runda än en som kommer tillbaka varje besök.
    return true;
  }
}

export function useWelcome(blocked: boolean) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (blocked || checked) return;
    setChecked(true);
    if (welcomeSeen()) return;

    // Markeras som sedd när den öppnas, inte när den avslutas. Den som
    // stänger rundan direkt har gjort sitt val och ska slippa den igen.
    try {
      localStorage.setItem(STORAGE_KEY, String(WELCOME_VERSION));
    } catch {
      // Går inte att spara — rundan visas då igen nästa besök. Får duga.
    }
    trackEvent('welcome-open', { version: WELCOME_VERSION });
    setOpen(true);
  }, [blocked, checked]);

  const close = useCallback((atStep: number, total: number) => {
    trackEvent('welcome-close', { step: atStep + 1, total, finished: atStep >= total - 1 });
    setOpen(false);
  }, []);

  /** För en manuell "visa rundan igen"-knapp. */
  const restart = useCallback(() => {
    trackEvent('welcome-open', { version: WELCOME_VERSION, manual: true });
    setOpen(true);
  }, []);

  return { open, close, restart };
}
