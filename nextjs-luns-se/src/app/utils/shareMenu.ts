interface ShareDish {
  category: string;
  description: string;
  price: string;
}

interface ShareSection {
  name: string;
  dishes: ShareDish[];
}

const SITE_URL = 'https://luns.se';

/**
 * Dagens meny som ren text, redo att klistra in i Teams eller Slack.
 * Restauranger utan rätter för dagen utelämnas.
 *
 * Kategorin skrivs ut utom när den är "Dagens" — då säger den ingenting som
 * beskrivningen inte redan säger, och raden blir bara längre.
 */
export function buildMenuShareText(
  sections: ShareSection[],
  day: string,
  locationLabel?: string
): string {
  const withDishes = sections.filter(s => s.dishes.length > 0);
  if (withDishes.length === 0) return '';

  const heading = locationLabel
    ? `🍽 Lunch ${day.toLowerCase()} — ${locationLabel}`
    : `🍽 Lunch ${day.toLowerCase()}`;

  const blocks = withDishes.map(section =>
    [
      section.name.toUpperCase(),
      ...section.dishes.map(dish => {
        const category = dish.category.toUpperCase() === 'DAGENS' ? '' : `${dish.category}: `;
        const price = dish.price ? ` (${dish.price})` : '';
        return `  • ${category}${dish.description}${price}`;
      }),
    ].join('\n')
  );

  return [heading, '', blocks.join('\n\n'), '', `Hela menyn med filter: ${SITE_URL}`].join('\n');
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
