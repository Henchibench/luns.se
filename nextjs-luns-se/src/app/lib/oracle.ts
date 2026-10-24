import type { Section } from '../components/board/MenuList';

export interface Offering {
  restaurant: string;
  description: string;
  price: string;
}

/** Only the already filtered, date checked dishes. Never reference menus or images. */
export function offeringsFromSections(sections: Pick<Section, 'name' | 'dishes'>[]): Offering[] {
  const seen = new Set<string>();
  return sections.flatMap(section => section.dishes.flatMap(dish => {
    const key = JSON.stringify([section.name, dish.description.trim()]);
    if (!dish.description.trim() || seen.has(key)) return [];
    seen.add(key);
    return [{ restaurant: section.name, description: dish.description, price: dish.price }];
  }));
}

export function chooseOffering(pool: Offering[], random = Math.random): Offering | null {
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
}

/** Five deliberate activations within three seconds, then reset. */
export function nextLogoTaps(taps: number[], now: number): { taps: number[]; open: boolean } {
  const recent = [...taps.filter(time => now >= time && now - time <= 3000), now];
  return recent.length >= 5 ? { taps: [], open: true } : { taps: recent, open: false };
}
