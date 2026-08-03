'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';
import { dishSignature, signaturesMatch } from '../utils/dishMatch';

const STORAGE_KEY = 'luns-dish-favorites';

export interface FavoriteDish {
  /** Scoped to the restaurant: Kooperativet's Murgh Masala is not Bombay's. */
  restaurant: string;
  /** Normalised name used for matching. */
  signature: string;
  /** The description as it read when starred, for showing in the notice. */
  label: string;
}

interface DishMatch {
  restaurant: string;
  label: string;
}

function readFavorites(): FavoriteDish[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is FavoriteDish =>
        d && typeof d.restaurant === 'string' && typeof d.signature === 'string'
    );
  } catch {
    return [];
  }
}

function persist(dishes: FavoriteDish[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
  } catch {
    // Private mode or storage full — the stars still apply this session.
  }
}

/** A short, human-readable form of a starred dish for notices and chips. */
export function dishDisplayName(dish: FavoriteDish): string {
  const trimmed = dish.label.split(/\s[–—]\s|\s-\s|:|,/)[0].trim();
  const name = trimmed.length >= 4 && trimmed.length <= 60 ? trimmed : dish.label;
  return name.length > 60 ? `${name.slice(0, 57)}…` : name;
}

export function useDishFavorites() {
  const [dishes, setDishes] = useState<FavoriteDish[]>([]);

  useEffect(() => {
    const stored = readFavorites();
    setDishes(stored);
    if (stored.length > 0) {
      trackEvent('dish-favorites-loaded', { count: stored.length });
    }
  }, []);

  /** Does this description match something starred at this restaurant? */
  const isDishFavorite = useCallback(
    (restaurant: string, description: string) => {
      const signature = dishSignature(description);
      return dishes.some(
        d => d.restaurant === restaurant && signaturesMatch(d.signature, signature)
      );
    },
    [dishes]
  );

  const toggleDishFavorite = useCallback((restaurant: string, description: string) => {
    const signature = dishSignature(description);
    if (!signature) return;

    setDishes(prev => {
      // Clicking a filled star removes whichever entry matched it, even when
      // the match was fuzzy — otherwise a near-miss variant would be unclickable.
      const matched = prev.filter(
        d => d.restaurant === restaurant && signaturesMatch(d.signature, signature)
      );
      const next = matched.length > 0
        ? prev.filter(d => !matched.includes(d))
        : [...prev, { restaurant, signature, label: description }];

      persist(next);
      trackEvent('dish-favorite-toggle', {
        restaurant,
        dish: signature,
        favorited: matched.length === 0,
      });
      return next;
    });
  }, []);

  const removeDishFavorite = useCallback((restaurant: string, signature: string) => {
    setDishes(prev => {
      const next = prev.filter(d => !(d.restaurant === restaurant && d.signature === signature));
      persist(next);
      trackEvent('dish-favorite-toggle', { restaurant, dish: signature, favorited: false });
      return next;
    });
  }, []);

  /**
   * Starred dishes served on the given day, as {restaurant, label} using the
   * text from today's menu rather than the stored label — a dish that came
   * back slightly reworded should be announced the way it reads today.
   */
  const matchingDishesToday = useCallback(
    (
      restaurants: Array<{ name: string; items: Array<{ day: string; description: string }> }>,
      day: string
    ): DishMatch[] => {
      if (dishes.length === 0) return [];
      const matches: DishMatch[] = [];

      for (const restaurant of restaurants) {
        const starred = dishes.filter(d => d.restaurant === restaurant.name);
        if (starred.length === 0) continue;

        for (const item of restaurant.items) {
          if (item.day !== day) continue;
          const signature = dishSignature(item.description);
          if (starred.some(d => signaturesMatch(d.signature, signature))) {
            const label = dishDisplayName({ restaurant: restaurant.name, signature, label: item.description });
            if (!matches.some(m => m.restaurant === restaurant.name && m.label === label)) {
              matches.push({ restaurant: restaurant.name, label });
            }
          }
        }
      }
      return matches;
    },
    [dishes]
  );

  return {
    dishes,
    isDishFavorite,
    toggleDishFavorite,
    removeDishFavorite,
    matchingDishesToday,
  };
}
