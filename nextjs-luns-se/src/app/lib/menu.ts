/**
 * Menydata: typer, inläsning och tolkning.
 *
 * Skrapan levererar två filer i public/data. Radformatet är
 *   "Dag|<strong>Kategori</strong> - beskrivning"
 * för rätter och
 *   "INFO:Dag - Restaurant Info: text"
 * för meddelanden som hör till en dag men inte är en rätt.
 */

import type { RestaurantIdentity } from './restaurantNews';

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
  menu_url?: string;
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
  /** Källans besked när rätter saknas, skilt från tider och priser. */
  menuStatus: Record<string, string>;
  /** Restaurangens veckobild; räknas aldrig som en sökbar maträtt. */
  menuImage?: MenuImage;
  referenceMenu?: ReferenceMenu;
  meta: RestaurantMeta;
}

export interface ReferenceMenu {
  label: string;
  warning: string;
  url: string;
  dishes: Dish[];
}

interface MenuValidity {
  valid_from: string;
  valid_until: string;
}

export interface MenuImage extends MenuValidity {
  url: string;
  week: number;
}

function parseMenuValidity(raw: string): MenuValidity | undefined {
  try {
    const data = JSON.parse(raw);
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data.valid_from) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.valid_until)) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

function parseMenuImage(raw: string): MenuImage | undefined {
  try {
    const data = JSON.parse(raw) as MenuImage;
    const url = new URL(data.url);
    if (url.protocol !== 'https:' || url.hostname !== 'images.squarespace-cdn.com' ||
        !Number.isInteger(data.week) || data.week < 1 || data.week > 53 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.valid_from) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.valid_until)) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

/** Även ett gammalt statiskt bygge ska sluta visa föregående veckas menyval. */
export function menuImageIsCurrent(image: MenuValidity, now: Date = new Date()): boolean {
  const stockholm = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
  const monday = dateForDay('Måndag', new Date(`${stockholm}T12:00:00`));
  const stamp = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const end = `${friday.getFullYear()}-${String(friday.getMonth() + 1).padStart(2, '0')}-${String(friday.getDate()).padStart(2, '0')}`;
  return image.valid_from === stamp && image.valid_until === end;
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

/** Äldre källmat hålls utanför dagens sökning, filter och antal. */
function parseReferenceMenu(raw: string): ReferenceMenu | undefined {
  try {
    const data = JSON.parse(raw);
    if (typeof data.label !== 'string' || !data.label.trim() ||
        typeof data.warning !== 'string' || !data.warning.trim() ||
        new URL(data.url).protocol !== 'https:' || !Array.isArray(data.rows)) return undefined;
    const dishes = data.rows.map((row: unknown) => typeof row === 'string' ? parseDish(row) : null);
    if (!dishes.length || dishes.some((dish: Dish | null) => !dish || !DAYS.includes(dish.day as Day))) return undefined;
    return { label: data.label, warning: data.warning, url: data.url, dishes };
  } catch {
    return undefined;
  }
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

/**
 * Avgör om en rå inforad redan innehåller serveringstider.
 *
 * Äldre skrapdata kan använda en klock-emoji som dold signal. Källor som
 * Cuckoo's Nest skriver i stället "kl.11.30", så även den formen måste
 * kännas igen innan lunch_hours läggs till som reservtext.
 */
export function infoStatesLunchHours(text: string): boolean {
  return /🕐|öppet|öppettid|lunch\s+serveras|\bkl\.?\s*\d{1,2}(?:[.:]\d{2})?/i.test(text);
}

export function parseRestaurants(
  menus: Record<string, string[]>,
  metaByName: Record<string, RestaurantMeta>,
  now: Date = new Date()
): Restaurant[] {
  return Object.entries(menus).map(([name, rows]) => {
    const dishes: Dish[] = [];
    const info: Record<string, string[]> = {};
    const menuStatus: Record<string, string> = {};
    let menuImage: MenuImage | undefined;
    let referenceMenu: ReferenceMenu | undefined;
    let validity: MenuValidity | undefined;

    rows.forEach(row => {
      if (row.startsWith('MENU_REFERENCE:')) {
        referenceMenu = parseReferenceMenu(row.slice('MENU_REFERENCE:'.length));
        return;
      }
      if (row.startsWith('MENU_WEEKLY:')) {
        // Veckotillägg ska löpa ut utan att den stående menyn försvinner.
        try {
          const raw = row.slice('MENU_WEEKLY:'.length);
          const dated = parseMenuValidity(raw);
          const data = JSON.parse(raw);
          if (dated && menuImageIsCurrent(dated, now) && Array.isArray(data.rows)) {
            const extra = data.rows.map((r: unknown) => typeof r === 'string' ? parseDish(r) : null);
            if (extra.length && extra.every((dish: Dish | null) => dish && DAYS.includes(dish.day as Day))) {
              dishes.push(...extra);
            }
          }
        } catch { /* Skadad tilläggsdata får inte dölja stående rätter. */ }
        return;
      }
      if (row.startsWith('MENU_VALIDITY:')) {
        validity = parseMenuValidity(row.slice('MENU_VALIDITY:'.length));
        return;
      }
      if (row.startsWith('MENU_IMAGE:')) {
        menuImage = parseMenuImage(row.slice('MENU_IMAGE:'.length));
        return;
      }
      if (row.startsWith('INFO:')) {
        const match = row.match(INFO_LINE);
        if (match) {
          const day = match[1];
          const text = match[2].trim();
          if (text.startsWith('Menybesked: ')) {
            menuStatus[day] = text.slice('Menybesked: '.length);
          } else {
            info[day] = [...(info[day] ?? []), text];
          }
        }
        return;
      }
      const dish = parseDish(row);
      if (dish) dishes.push(dish);
    });

    if ((rows.some(row => row.startsWith('MENU_IMAGE:')) &&
        (!menuImage || !menuImageIsCurrent(menuImage, now))) ||
        (rows.some(row => row.startsWith('MENU_VALIDITY:')) &&
        (!validity || !menuImageIsCurrent(validity, now)))) {
      dishes.length = 0;
      menuImage = undefined;
      DAYS.forEach(day => {
        delete info[day];
        menuStatus[day] = 'Den sparade menyn gäller inte veckan som visas. Se MENY för restaurangens senaste meny.';
      });
    }

    const meta = metaByName[name] ?? ({ name, area: 'Lindholmen' } as RestaurantMeta);
    return {
      name,
      area: meta.area || 'Lindholmen',
      dishes,
      info,
      menuStatus,
      menuImage,
      referenceMenu,
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
  catalog: RestaurantIdentity[];
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

  // Registret finns kvar även när en skrapa saknar matrader. Det är detta
  // som avgör om en restaurang är nytillkommen, inte dagens menyresultat.
  const catalog = Object.entries(restaurantsData.restaurants ?? {})
    .filter(([, meta]) => typeof meta.area === 'string' && meta.area.length > 0)
    .map(([name, meta]) => ({ name, area: meta.area }));
  return { restaurants, locations, catalog };
}
