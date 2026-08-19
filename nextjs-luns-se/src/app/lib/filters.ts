import type { Dish } from './menu';

export interface TypeFilter {
  id: string;
  label: string;
  keywords: string[];
}

/** Chipsen under FILTER i vänsterspalten. */
export const TYPE_FILTERS: TypeFilter[] = [
  { id: 'veg', label: 'VEG', keywords: ['veg', 'grön'] },
  { id: 'kott', label: 'KÖTT', keywords: ['kött', 'lamm', 'fläsk', 'kyckling', 'biff', 'burger', 'husman', 'anka'] },
  { id: 'fisk', label: 'FISK', keywords: ['fisk', 'sushi', 'räk', 'lax', 'skaldjur', 'spätta', 'flundra'] },
  { id: 'sallad', label: 'SALLAD', keywords: ['sallad', 'bowl'] },
  { id: 'asiat', label: 'ASIAT.', keywords: ['asiat', 'sushi', 'dumpling', 'wok', 'thai', 'poke', 'nudel'] },
  { id: 'indisk', label: 'INDISKT', keywords: ['indisk', 'masala', 'thali', 'tandoori', 'vindaloo', 'kadhai', 'punjabi', 'dopiaza'] },
];

export interface Craving {
  id: string;
  label: string;
  terms: string[];
}

/**
 * Chipsen under SUGEN PÅ…. De sätter söktermen i stället för att filtrera,
 * så träffarna markeras i beskrivningen precis som vid vanlig sökning.
 *
 * Designens lista hade "kyckling" och "beef" under burgare. De togs bort —
 * de matchar varenda kycklingrätt på menyn, inte bara burgarna.
 */
export const CRAVINGS: Craving[] = [
  {
    id: 'hamburgare',
    label: 'BURGARE',
    terms: ['burger', 'hamburgare', 'högrevsburgare', 'cheeseburger', 'veggieburger', 'veganburger', 'halloumiburger', 'kycklingburgare', 'smashed burger'],
  },
  {
    id: 'pasta',
    label: 'PASTA',
    terms: ['pasta', 'spaghetti', 'penne', 'carbonara', 'bolognese', 'marinara', 'pesto', 'nudlar', 'lasagne', 'tortellini'],
  },
  {
    id: 'pommes',
    label: 'POMMES',
    terms: ['pommes', 'fries', 'klyftpotatis', 'wedges', 'pommes frites'],
  },
  {
    id: 'mos',
    label: 'MOS',
    terms: ['mos', 'potatismos', 'potatispure', 'potatispuré', 'smashed potatoes', 'krossad potatis'],
  },
];

/** Termerna en sökning faktiskt letar efter — ett craving-id blir sin lista. */
export function searchTerms(search: string): string[] {
  const term = search.trim().toLowerCase();
  if (!term) return [];
  const craving = CRAVINGS.find(c => c.id === term);
  return craving ? craving.terms : [term];
}

/** Alla synonymer för de valda sugen på-chipsen, för markering av träffar. */
export function cravingTerms(activeCravingIds: string[]): string[] {
  return activeCravingIds.flatMap(id => CRAVINGS.find(c => c.id === id)?.terms ?? []);
}

/**
 * Sugen på-chipsen är ett OR mellan varandra: väljer man burgare och pasta
 * vill man se båda, inte rätter som råkar vara bådadera. Mot sökfältet och
 * övriga filter gäller AND, som för allt annat.
 */
export function matchesCravings(
  dish: Dish,
  restaurantName: string,
  activeCravingIds: string[]
): boolean {
  if (activeCravingIds.length === 0) return true;
  const haystack = `${dish.description} ${dish.category} ${restaurantName}`.toLowerCase();
  return activeCravingIds.some(id =>
    CRAVINGS.find(c => c.id === id)?.terms.some(term => haystack.includes(term))
  );
}

export function matchesSearch(dish: Dish, restaurantName: string, search: string): boolean {
  const terms = searchTerms(search);
  if (terms.length === 0) return true;
  const haystack = `${dish.description} ${dish.category} ${restaurantName}`.toLowerCase();
  return terms.some(t => haystack.includes(t));
}

export function matchesTypes(dish: Dish, activeTypeIds: string[]): boolean {
  if (activeTypeIds.length === 0) return true;
  const haystack = `${dish.category} ${dish.description}`.toLowerCase();
  return activeTypeIds.some(id => {
    const filter = TYPE_FILTERS.find(t => t.id === id);
    return filter ? filter.keywords.some(k => haystack.includes(k)) : false;
  });
}
