'use client';

import { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '../utils/analytics';

export type Theme = 'light' | 'dark';

/**
 * Nyckeln heter fortfarande "theme" och inte designens "luns2026-theme".
 * Ett namnbyte hade nollställt valet för alla som redan varit här, och
 * skriptet i layout.tsx läser samma nyckel innan sidan målas.
 */
const STORAGE_KEY = 'theme';

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Privat läge — temat gäller ändå den här sessionen.
      }
      trackEvent('theme-toggle', { theme: next });
      return next;
    });
  }, []);

  return { theme, toggle, mounted };
}
