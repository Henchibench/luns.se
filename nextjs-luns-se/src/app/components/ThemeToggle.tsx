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
    document.documentElement.classList.toggle('dark', theme === 'dark');
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
      className="fixed top-4 right-4 z-[9999] w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm border shadow-lg transition-all duration-150 hover:shadow-md active:scale-95 transform hover:-translate-y-0.5 bg-white/90 text-gray-700 border-gray-200 hover:bg-white dark:bg-gray-800/90 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-800"
      title={theme === 'light' ? 'Byt till mörkt läge' : 'Byt till ljust läge'}
      aria-label={theme === 'light' ? 'Byt till mörkt läge' : 'Byt till ljust läge'}
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
