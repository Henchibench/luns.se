interface ShareMenuItem {
  day: string;
  category: string;
  description: string;
}

interface ShareRestaurant {
  name: string;
  items: ShareMenuItem[];
  location?: {
    lunch_hours?: string | null;
  };
}

const SITE_URL = 'https://luns.se';

/**
 * Format today's menu as plain text ready to paste into Teams or Slack.
 * Restaurants with no dishes for the day are left out.
 */
export function buildMenuShareText(
  restaurants: ShareRestaurant[],
  day: string,
  locationLabel?: string
): string {
  const sections: string[] = [];

  for (const restaurant of restaurants) {
    const todays = restaurant.items.filter(item => item.day === day);
    if (todays.length === 0) continue;

    const hours = restaurant.location?.lunch_hours;
    const heading = hours ? `${restaurant.name} (lunch ${hours})` : restaurant.name;
    const dishes = todays.map(item => `• ${item.category}: ${item.description}`);
    sections.push([heading, ...dishes].join('\n'));
  }

  if (sections.length === 0) return '';

  const title = locationLabel ? `🍽 Luns idag (${day}) — ${locationLabel}` : `🍽 Luns idag (${day})`;
  return [title, '', sections.join('\n\n'), '', `Hela menyn med filter: ${SITE_URL}`].join('\n');
}

/** Copy text to the clipboard, with a fallback for non-secure contexts. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
