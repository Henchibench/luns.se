'use client';

import React, { useEffect, useState } from 'react';
import { trackEvent } from '../utils/analytics';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    trackEvent('theme-toggle', { theme: newTheme });
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors"
      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
      title={theme === 'light' ? 'Byt till mörkt läge' : 'Byt till ljust läge'}
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      )}
    </button>
  );
}
