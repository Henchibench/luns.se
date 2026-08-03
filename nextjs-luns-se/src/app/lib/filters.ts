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
    label: '🍔 BURGARE',
    terms: ['burger', 'hamburgare', 'högrevsburgare', 'cheeseburger', 'veggieburger', 'veganburger', 'halloumiburger', 'kycklingburgare', 'smashed burger'],
  },
  {
    id: 'pasta',
    label: '🍝 PASTA',
    terms: ['pasta', 'spaghetti', 'penne', 'carbonara', 'bolognese', 'marinara', 'pesto', 'nudlar', 'lasagne', 'tortellini'],
  },
  {
    id: 'pommes',
    label: '🍟 POMMES',
    terms: ['pommes', 'fries', 'klyftpotatis', 'wedges', 'pommes frites'],
  },
  {
    id: 'mos',
    label: '🥔 MOS',
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

/**
 * Sorterar rätter så att matprofilens valda kategorier hamnar överst. Stabil
 * inom respektive grupp, så menyns egen ordning består i övrigt.
 */
export function boostByProfile(dishes: Dish[], boostTypes: string[]): Dish[] {
  if (boostTypes.length === 0) return dishes;
  const boosted = (d: Dish) =>
    boostTypes.some(t => d.category.toLowerCase().includes(t.toLowerCase()));
  return [...dishes.filter(boosted), ...dishes.filter(d => !boosted(d))];
}

/** Rätter matprofilen gömmer undan. */
export function hiddenByProfile(dish: Dish, hideKeywords: string[]): boolean {
  if (hideKeywords.length === 0) return false;
  const haystack = `${dish.category} ${dish.description}`.toLowerCase();
  return hideKeywords.some(k => haystack.includes(k));
}
