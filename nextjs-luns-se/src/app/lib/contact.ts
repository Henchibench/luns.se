export interface ContactConfig { mode: 'demo' | 'live'; endpoint: string; sitekey: string }
export const CONTACT_TOPICS = { restaurant: 'Tipsa om restaurang', menu: 'Fel i menyn', idea: 'Förslag', other: 'Annat' };
export type ContactTopic = keyof typeof CONTACT_TOPICS;
export interface ContactContext { restaurant?: string; area?: string }

// Samma statiska bygge kan förhandsvisas utan att testläget når GitHub Pages.
// Testservern ersätter bara den exporterade, offentliga konfigurationsfilen.
export async function loadContactConfig(): Promise<ContactConfig | null> {
  try {
    const response = await fetch('/contact-config.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    if (!['demo', 'live'].includes(data.mode) || typeof data.sitekey !== 'string' || !/^0x[\w-]{10,}$/.test(data.sitekey)) return null;
    const url = new URL(data.endpoint);
    if (url.protocol !== 'https:' || url.pathname !== '/contact' || url.username || url.password) return null;
    return { mode: data.mode, endpoint: url.href, sitekey: data.sitekey };
  } catch { return null; }
}

// randomUUID saknas på testserverns HTTP-origin. getRandomValues fungerar även
// där; en stabil identitet per utkast hindrar dubbla mejl vid nätverksretry.
export function contactRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function contactError(code: string): string {
  if (code === 'rate_limit') return 'Du har gjort flera försök på kort tid. Vänta en minut och försök igen.';
  if (code === 'verification') return 'Säkerhetskontrollen behöver göras om. Vänta tills den är klar och försök igen.';
  if (code === 'invalid') return 'Kontrollera att meddelandet har minst 10 tecken och att eventuell e-postadress är rätt skriven.';
  if (code === 'delivery') return 'Vi kunde inte bekräfta att meddelandet skickades. Texten finns kvar; försök igen om en stund.';
  return 'Det går inte att skicka just nu. Texten finns kvar; försök igen om en stund.';
}
