/**
 * Menydata: typer, inläsning och tolkning.
 *
 * Skrapan levererar två filer i public/data. Radformatet är
 *   "Dag|<strong>Kategori</strong> - beskrivning"
 * för rätter och
 *   "INFO:Dag - Restaurant Info: text"
 * för meddelanden som hör till en dag men inte är en rätt.
 */

export const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'] as const;
export type Day = (typeof DAYS)[number];

export interface Dish {
  day: string;
  category: string;
  description: string;
  /** Formaterat som "125:-", tom sträng när menyn saknar pris. */
  price: string;
}

export interface RestaurantMeta {
  name: string;
  area: string;
  website?: string;
  maps?: string;
  instagram?: string;
  lunch_hours?: string | null;
  /** Handskriven mening om restaurangen, inte skrapad. */
  description?: string | null;
  /** Publicerar bara dagens meny, aldrig veckans. Tomma dagar är väntat. */
  daily_menu_only?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  has_menu?: boolean;
}

export interface Restaurant {
  name: string;
  area: string;
  dishes: Dish[];
  /** Inforader per dag. */
  info: Record<string, string[]>;
  meta: RestaurantMeta;
}

export interface LunsLocation {
  id: string;
  label: string;
  city: string;
  mapQuery: string;
  latitude: number;
  longitude: number;
  restaurantCount?: number;
}

/** Måndag = 0. Helger pekar på måndag, för då är det nästa vecka som gäller. */
export function currentDayIndex(now: Date = new Date()): number {
  const jsDay = now.getDay(); // 0 = söndag
  const mondayBased = jsDay === 0 ? 6 : jsDay - 1;
  return mondayBased > 4 ? 0 : mondayBased;
}

export function currentDay(now: Date = new Date()): string {
  return DAYS[currentDayIndex(now)];
}

/**
 * Datumet för en vald veckodag. Under helgen pekar hela veckan framåt, mot
 * nästa veckas måndag — annars skulle "Måndag" visa ett datum som varit.
 */
export function dateForDay(day: string, now: Date = new Date()): Date {
  const jsDay = now.getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() + (todayIdx > 4 ? 7 - todayIdx : -todayIdx));
  const result = new Date(monday);
  result.setDate(monday.getDate() + Math.max(0, DAYS.indexOf(day as Day)));
  return result;
}

const PRICE_AT_END = /\((\d+)[.,]?\s*kr\)\s*$/i;

function parseDish(raw: string): Dish | null {
  const match = raw.match(/^([^|]+)\|<strong>(.*?)<\/strong>\s*-?\s*(.*)$/);
  if (!match) return null;

  let description = match[3].trim();
  let price = '';
  const priceMatch = description.match(PRICE_AT_END);
  if (priceMatch) {
    price = `${priceMatch[1]}:-`;
    description = description.slice(0, priceMatch.index).trim();
  }

  return { day: match[1].trim(), category: match[2].trim(), description, price };
}

const INFO_LINE = /^INFO:([^\s-]+)\s*-\s*Restaurant Info:\s*(.*)$/;

/**
 * Emojierna skraporna inleder sina inforader med — 💰 på priser, 🕐 på tider,
 * och en handfull enstaka (📧 🍽️ 💡 🚚 🧊 💳).
 *
 * Intervallet i stället för \p{Extended_Pictographic}: den kräver ES2018 och
 * tsconfig står på ES2017. Blocken nedan täcker allt skraporna faktiskt
 * skriver, plus FE0F som gör 🍽 till 🍽️.
 */
const DECORATIVE_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

/**
 * Rensar emoji ur en inforad före visning.
 *
 * Strippningen sker i sajten och inte i skraporna, av två skäl: den gäller
 * direkt även för data som redan ligger i menus.json, och emojin finns kvar i
 * datan som signal. En skrapa som fallerar behåller förra körningens rader, så
 * en ändring i skraporna hade dröjt kvar i gammal data hur länge som helst.
 *
 * VIKTIGT: 🕐 är inte bara dekor. INFO_STATES_HOURS i page.tsx läser den för
 * att avgöra om raden redan innehåller öppettider, så lunch_hours inte skrivs
 * ut en andra gång. Kör den här funktionen därför ALLTID efter det testet.
 *
 * Anropas per inforad, inte på den hopslagna strängen: raderna fogas ihop med
 * "  ·  " och den dubbla mellanrymden hade kollapsat här.
 */
export function stripInfoEmoji(text: string): string {
  return text.replace(DECORATIVE_EMOJI, '').replace(/\s{2,}/g, ' ').trim();
}

export function parseRestaurants(
  menus: Record<string, string[]>,
  metaByName: Record<string, RestaurantMeta>
): Restaurant[] {
  return Object.entries(menus).map(([name, rows]) => {
    const dishes: Dish[] = [];
    const info: Record<string, string[]> = {};

    rows.forEach(row => {
      if (row.startsWith('INFO:')) {
        const match = row.match(INFO_LINE);
        if (match) {
          const day = match[1];
          info[day] = [...(info[day] ?? []), match[2].trim()];
        }
        return;
      }
      const dish = parseDish(row);
      if (dish) dishes.push(dish);
    });

    const meta = metaByName[name] ?? ({ name, area: 'Lindholmen' } as RestaurantMeta);
    return {
      name,
      area: meta.area || 'Lindholmen',
      dishes,
      info,
      meta,
    };
  });
}

/** Kategorifärg enligt designen: grönt, blått, varmt eller lila. */
export function categoryColor(category: string): string {
  const c = category.toLowerCase();
  if (/veg|grön|sallad/.test(c)) return 'var(--cGreen)';
  if (/fisk|sushi|räk|lax|skaldjur/.test(c)) return 'var(--cBlue)';
  if (/kött|lamm|fläsk|kyckling|biff|burger|husman|indisk|anka/.test(c)) return 'var(--cWarm)';
  return 'var(--cPurple)';
}

interface MenusFile {
  menus: Record<string, string[]>;
}

interface RestaurantsFile {
  restaurants: Record<string, RestaurantMeta>;
  locations?: LunsLocation[];
}

export async function loadMenuData(): Promise<{
  restaurants: Restaurant[];
  locations: LunsLocation[];
}> {
  const [menusData, restaurantsData] = await Promise.all([
    fetch('/data/menus.json').then(r => r.json() as Promise<MenusFile>),
    fetch('/data/restaurants.json').then(r => r.json() as Promise<RestaurantsFile>),
  ]);

  const restaurants = parseRestaurants(menusData.menus, restaurantsData.restaurants ?? {});

  // Skrapan skriver en locations-lista. Äldre datafiler saknar den, så härled
  // en användbar lista ur restaurangernas area i stället för att lämna
  // väljaren tom och sidan blank.
  const emitted = restaurantsData.locations;
  const locations: LunsLocation[] = emitted?.length
    ? emitted
    : Array.from(new Set(restaurants.map(r => r.area)))
        .sort()
        .map(area => ({
          id: area,
          label: area,
          city: area,
          mapQuery: area,
          latitude: 57.7059,
          longitude: 11.9359,
          restaurantCount: restaurants.filter(r => r.area === area).length,
        }));

  return { restaurants, locations };
}
