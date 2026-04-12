'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

const STORAGE_KEY = 'luns-favorites';
const FILTER_STORAGE_KEY = 'luns-show-only-favorites';

function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function readShowOnlyFavorites(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(FILTER_STORAGE_KEY) === 'true';
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavoritesState] = useState<boolean>(false);

  // Read from localStorage on mount + fire analytics
  useEffect(() => {
    const stored = readFavorites();
    setFavorites(stored);
    setShowOnlyFavoritesState(readShowOnlyFavorites());
    if (stored.length > 0) {
      trackEvent('favorites-loaded', { favorites: stored, count: stored.length });
    }
  }, []);

  const setShowOnlyFavorites = useCallback((value: boolean) => {
    localStorage.setItem(FILTER_STORAGE_KEY, value ? 'true' : 'false');
    trackEvent('favorites-filter-toggle', { enabled: value });
    setShowOnlyFavoritesState(value);
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

  return { favorites, isFavorite, toggleFavorite, showOnlyFavorites, setShowOnlyFavorites };
}
