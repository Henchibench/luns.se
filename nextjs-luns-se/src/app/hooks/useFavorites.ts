'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

const STORAGE_KEY = 'luns-favorites';
/**
 * Startläget för favoritfiltret, inte filtret självt.
 *
 * Förut sparades chipen "♥ FAVORITER" rakt av under luns-show-only-favorites,
 * vilket gjorde den till det enda filtret som låg kvar till nästa besök. De
 * andra chipsen nollställs, och ingenting i gränssnittet berättade skillnaden.
 * Nu är beteendet ett eget val i inställningarna, och chipen är lika flyktig
 * som sina grannar. Ny nyckel med flit: den gamla beskrev ett filter, den här
 * beskriver ett startläge.
 */
const AUTOSTART_KEY = 'luns-start-with-favorites';

function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function readStartWithFavorites(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(AUTOSTART_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [startWithFavorites, setStartWithFavoritesState] = useState<boolean>(false);
  const [showOnlyFavorites, setShowOnlyFavoritesState] = useState<boolean>(false);

  // Read from localStorage on mount + fire analytics
  useEffect(() => {
    const stored = readFavorites();
    setFavorites(stored);

    const auto = readStartWithFavorites();
    setStartWithFavoritesState(auto);
    // Utan favoriter döljer filtret allt, och sajten öppnar på "Inga rätter
    // matchar". Inställningen får vänta tills det finns något att visa.
    if (auto && stored.length > 0) setShowOnlyFavoritesState(true);

    if (stored.length > 0) {
      // Antalet räcker. Hela listan vid varje sidladdning gav ingenting
      // som favorite-toggle inte redan berättar, en restaurang i taget.
      trackEvent('favorites-loaded', { count: stored.length });
    }
  }, []);

  const setShowOnlyFavorites = useCallback((value: boolean) => {
    trackEvent('favorites-filter-toggle', { enabled: value });
    setShowOnlyFavoritesState(value);
  }, []);

  /**
   * Slår om även filtret som gäller nu. En inställning som inte syns förrän
   * nästa besök ser trasig ut, och den som klickar vill se vad den gör.
   *
   * Utom när det inte finns några favoriter: då är det enda synliga resultatet
   * en tom sida med "Inga rätter matchar", vilket ser ut som ett fel och inte
   * som ett val. Valet sparas ändå och börjar gälla när första hjärtat finns.
   */
  const setStartWithFavorites = useCallback(
    (value: boolean) => {
      try {
        localStorage.setItem(AUTOSTART_KEY, value ? 'true' : 'false');
      } catch {
        // Privat läge: valet gäller den här sessionen och glöms sedan.
      }
      setStartWithFavoritesState(value);
      if (favorites.length > 0 || !value) setShowOnlyFavoritesState(value);
    },
    [favorites.length]
  );

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

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    showOnlyFavorites,
    setShowOnlyFavorites,
    startWithFavorites,
    setStartWithFavorites,
  };
}
