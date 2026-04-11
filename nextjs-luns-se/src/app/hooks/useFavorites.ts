'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

const STORAGE_KEY = 'luns-favorites';

function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Read from localStorage on mount + fire analytics
  useEffect(() => {
    const stored = readFavorites();
    setFavorites(stored);
    if (stored.length > 0) {
      trackEvent('favorites-loaded', { favorites: stored, count: stored.length });
    }
  }, []);

  const isFavorite = useCallback(
    (name: string) => favorites.includes(name),
    [favorites]
  );

  const toggleFavorite = useCallback((name: string) => {
    const current = readFavorites();
    const favorited = !current.includes(name);
    const next = favorited
      ? [...current, name]
      : current.filter(n => n !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    trackEvent('favorite-toggle', { restaurant: name, favorited });
    setFavorites(next);
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
