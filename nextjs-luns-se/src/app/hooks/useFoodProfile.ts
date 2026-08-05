'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

const STORAGE_KEY = 'luns-food-profile';

export interface FoodProfile {
  /** Categories sorted to the top of every card, e.g. ["Vegetarisk"] */
  boostTypes: string[];
  /** Dishes whose description contains any of these are hidden, e.g. ["fläsk"] */
  hideKeywords: string[];
}

const EMPTY: FoodProfile = { boostTypes: [], hideKeywords: [] };

function readProfile(): FoodProfile {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return EMPTY;
    const parsed = JSON.parse(stored);
    return {
      boostTypes: Array.isArray(parsed.boostTypes) ? parsed.boostTypes : [],
      hideKeywords: Array.isArray(parsed.hideKeywords) ? parsed.hideKeywords : [],
    };
  } catch {
    return EMPTY;
  }
}

function persist(profile: FoodProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Private mode or storage full — the profile still applies this session.
  }
  // Bara antalet dolda ord, aldrig orden. Det är fritext besökaren skrivit
  // om sin egen kost — "fläsk" eller "skaldjur" säger något om tro eller
  // allergi och hör inte hemma i besöksstatistiken. Kategorierna är en fast
  // lista utan fritext och kan skickas som de är.
  trackEvent('food-profile-updated', {
    boostTypes: profile.boostTypes,
    hideCount: profile.hideKeywords.length,
  });
}

export function useFoodProfile() {
  const [profile, setProfile] = useState<FoodProfile>(EMPTY);

  // Read once on mount, after hydration
  useEffect(() => {
    setProfile(readProfile());
  }, []);

  const toggleBoostType = useCallback((type: string) => {
    setProfile(prev => {
      const next = {
        ...prev,
        boostTypes: prev.boostTypes.includes(type)
          ? prev.boostTypes.filter(t => t !== type)
          : [...prev.boostTypes, type],
      };
      persist(next);
      return next;
    });
  }, []);

  const addHideKeyword = useCallback((keyword: string) => {
    const cleaned = keyword.trim().toLowerCase();
    if (!cleaned) return;
    setProfile(prev => {
      if (prev.hideKeywords.includes(cleaned)) return prev;
      const next = { ...prev, hideKeywords: [...prev.hideKeywords, cleaned] };
      persist(next);
      return next;
    });
  }, []);

  const removeHideKeyword = useCallback((keyword: string) => {
    setProfile(prev => {
      const next = { ...prev, hideKeywords: prev.hideKeywords.filter(k => k !== keyword) };
      persist(next);
      return next;
    });
  }, []);

  const isActive = profile.boostTypes.length > 0 || profile.hideKeywords.length > 0;

  return { profile, toggleBoostType, addHideKeyword, removeHideKeyword, isActive };
}
