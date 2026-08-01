'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

const STORAGE_KEY = 'luns-location';

export interface LunsLocation {
  id: string;
  label: string;
  city: string;
  mapQuery: string;
  latitude: number;
  longitude: number;
  restaurantCount: number;
}

/**
 * When only one location exists, picking it is not a choice — gating every
 * visitor behind a single-option dialog would be pure friction. The welcome
 * picker therefore appears from the second location onwards. Set this to 0 to
 * force the choice even when there is nothing to choose between.
 */
const MIN_LOCATIONS_FOR_WELCOME = 2;

function readStoredLocation(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useLocation(locations: LunsLocation[]) {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read the stored choice once on mount
  useEffect(() => {
    setLocationId(readStoredLocation());
    setHydrated(true);
  }, []);

  // A stored location can go stale — an area gets renamed, or its last
  // restaurant disappears. Fall back to the welcome picker rather than
  // filtering against an id nothing matches.
  const stored = locations.find(l => l.id === locationId) ?? null;

  const onlyOption = locations.length > 0 && locations.length < MIN_LOCATIONS_FOR_WELCOME
    ? locations[0]
    : null;

  const selected = stored ?? onlyOption;

  const needsChoice = hydrated && locations.length > 0 && selected === null;

  const selectLocation = useCallback((id: string, isFirstChoice = false) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private mode or storage full — the choice still applies for this
      // session, it just will not be remembered.
    }
    trackEvent('location-select', { location: id, firstChoice: isFirstChoice });
    setLocationId(id);
  }, []);

  return { selected, needsChoice, hydrated, selectLocation };
}
