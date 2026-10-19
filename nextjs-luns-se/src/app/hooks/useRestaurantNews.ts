'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { welcomeSeen } from './useWelcome';
import {
  RESTAURANT_VISIT_KEY, parseRestaurantVisit, discoverRestaurants,
  dismissRestaurantNews, initialRestaurantNews,
  type RestaurantIdentity, type RestaurantVisit,
} from '../lib/restaurantNews';

export function useRestaurantNews(catalog: RestaurantIdentity[], area: string | undefined, ready: boolean) {
  const initial = useRef<{ area: string | null; returning: boolean } | null>(null);
  const latest = useRef<{ area: string; visit: RestaurantVisit } | null>(null);
  const [notice, setNotice] = useState<{ area: string; names: string[] } | null>(null);

  useEffect(() => {
    if (initial.current) return;
    try {
      // Läs innan välkomstrundan hunnit öppnas för en helt ny besökare.
      initial.current = {
        area: localStorage.getItem('luns-location'),
        returning: welcomeSeen() && Number(localStorage.getItem('luns-news-seen')) < 10,
      };
    } catch {
      initial.current = { area: null, returning: false };
    }
  }, []);

  useEffect(() => {
    if (!ready || !area) return;
    const names = catalog.filter(r => r.area === area).map(r => r.name);
    // Ofullständig inläsning får aldrig ersätta ett tidigare besök med tom data.
    if (!names.length) return;
    try {
      const key = RESTAURANT_VISIT_KEY + area;
      const raw = localStorage.getItem(key);
      const seed = raw === null && initial.current?.returning && initial.current.area === area
        ? initialRestaurantNews(area) : [];
      const visit = discoverRestaurants(parseRestaurantVisit(raw), names, seed);
      localStorage.setItem(key, JSON.stringify(visit));
      latest.current = { area, visit };
      setNotice({ area, names: visit.pending });
    } catch {
      // Utan lagring kan vi inte veta vad besökaren redan har sett.
      setNotice(null);
    }
  }, [catalog, area, ready]);

  const dismiss = useCallback((name?: string) => {
    if (!area || latest.current?.area !== area) return;
    let visit = latest.current.visit;
    try {
      // Bevara eventuella nya notiser från en annan flik.
      visit = parseRestaurantVisit(localStorage.getItem(RESTAURANT_VISIT_KEY + area)) ?? visit;
      visit = dismissRestaurantNews(visit, name);
      localStorage.setItem(RESTAURANT_VISIT_KEY + area, JSON.stringify(visit));
    } catch {
      visit = dismissRestaurantNews(visit, name);
    }
    latest.current = { area, visit };
    setNotice({ area, names: visit.pending });
  }, [area]);

  return { names: notice && notice.area === area ? notice.names : [], dismiss };
}
