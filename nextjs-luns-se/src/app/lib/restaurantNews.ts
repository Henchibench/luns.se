export interface RestaurantIdentity {
  name: string;
  area: string;
}

export interface RestaurantVisit {
  version: 1;
  names: string[];
  pending: string[];
}

export const RESTAURANT_VISIT_KEY = 'luns-restaurants-seen:';

// Äldre versioner sparade ingen restauranglista. Vid införandet får befintliga
// Lindholmen-besökare denna kända nyhet; framtida tillägg hittas automatiskt.
export function initialRestaurantNews(area: string): string[] {
  return area === 'Lindholmen' ? ["Cuckoo's Nest"] : [];
}

export function parseRestaurantVisit(raw: string | null): RestaurantVisit | null {
  try {
    const data = JSON.parse(raw ?? 'null');
    const names = (value: unknown): value is string[] =>
      Array.isArray(value) && value.every(n => typeof n === 'string' && n.trim().length > 0);
    if (data?.version !== 1 || !names(data.names) || !names(data.pending)) return null;
    return { version: 1, names: data.names, pending: data.pending };
  } catch {
    return null;
  }
}

/** Jämför registret, aldrig antal rätter eller resultatet av dagens skrapning. */
export function discoverRestaurants(
  previous: RestaurantVisit | null,
  names: string[],
  initial: string[] = [],
): RestaurantVisit {
  const current = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'sv'));
  const added = previous ? current.filter(name => !previous.names.includes(name)) : initial;
  return {
    version: 1,
    names: current,
    // En oläst notis överlever omladdning, men ett borttaget ställe annonseras inte.
    pending: Array.from(new Set([...(previous?.pending ?? []), ...added]))
      .filter(name => current.includes(name)),
  };
}

export function dismissRestaurantNews(visit: RestaurantVisit, name?: string): RestaurantVisit {
  return { ...visit, pending: name ? visit.pending.filter(n => n !== name) : [] };
}
