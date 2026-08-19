'use client';

import { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '../utils/analytics';

export type TextSize = 'normal' | 'stor';

/**
 * Valet ligger på `data-textsize` på <html>, inte i en klass som temat.
 * Temat är av eller på, textstorleken kan bli fler steg än två, och ett
 * attribut med ett värde säger det bättre än en växande hög klassnamn.
 * Skriptet i layout.tsx läser samma nyckel innan sidan målas.
 */
const STORAGE_KEY = 'luns-text-size';

function readTextSize(): TextSize {
  if (typeof window === 'undefined') return 'normal';
  try {
    return localStorage.getItem(STORAGE_KEY) === 'stor' ? 'stor' : 'normal';
  } catch {
    return 'normal';
  }
}

export function useTextSize() {
  const [size, setSize] = useState<TextSize>('normal');

  useEffect(() => {
    setSize(readTextSize());
  }, []);

  const setLarge = useCallback((large: boolean) => {
    const next: TextSize = large ? 'stor' : 'normal';
    // Attributet tas bort helt i normalläget i stället för att sättas till
    // "normal". Standardvärdena bor i :root, och en tom regel att falla
    // tillbaka på är en regel som kan glömmas bort vid nästa steg.
    if (large) {
      document.documentElement.setAttribute('data-textsize', 'stor');
    } else {
      document.documentElement.removeAttribute('data-textsize');
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Privat läge — storleken gäller ändå den här sessionen.
    }
    trackEvent('text-size-toggle', { size: next });
    setSize(next);
  }, []);

  return { size, large: size === 'stor', setLarge };
}
