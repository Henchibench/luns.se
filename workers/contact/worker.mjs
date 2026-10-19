// Mottagare och avsändare kommer bara från serverns inställningar. Besökaren
// kan aldrig använda formuläret som en öppen mejlrelay.
const TOPICS = { restaurant: 'Tipsa om restaurang', menu: 'Fel i menyn', idea: 'Förslag', other: 'Annat' };
const MAX_BYTES = 24000;
const list = value => (value || '').split(',').map(x => x.trim()).filter(Boolean);

function clean(value, max, multiline = false) {
  if (typeof value !== 'string' || value.length > max) throw new Error('invalid');
  if ((multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(value)) throw new Error('invalid');
  return value.trim();
}
export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
  const topic = clean(data.topic, 20);
  if (!Object.hasOwn(TOPICS, topic)) throw new Error('invalid');
  const message = clean(data.message, 4000, true);
  if (message.length < 10) throw new Error('invalid');
  const email = clean(data.email ?? '', 254);
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('invalid');
  const token = clean(data.token, 2048);
  if (!token) throw new Error('invalid');
  const requestId = clean(data.requestId, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error('invalid');
  if (data.website) throw new Error('invalid');
  return { topic, message, email, token, requestId, restaurant: clean(data.restaurant ?? '', 120), area: clean(data.area ?? '', 120) };
}

// Content-Length kan saknas eller ljuga. Gränsen gäller bytes som faktiskt lästs.
async function readBody(request) {
  if (!request.body) throw new Error('invalid');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function handle(request, env, fetcher = fetch) {
  const origin = request.headers.get('Origin') || '';
  const allowed = list(env.ALLOWED_ORIGINS).includes(origin);
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
  if (new URL(request.url).pathname !== '/contact') return reply(404, { error: 'not_found' });
  if (!allowed) return reply(403, { error: 'origin' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' } });
  if (request.method !== 'POST') return reply(405, { error: 'method' });
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return reply(415, { error: 'content_type' });
  const hostname = new URL(origin).hostname;
  const demo = env.CONTACT_MODE === 'demo';
  if (!['demo', 'live'].includes(env.CONTACT_MODE) || !env.TURNSTILE_SECRET || !env.CONTACT_LIMITER || !list(env.TURNSTILE_HOSTNAMES).includes(hostname)) return reply(503, { error: 'unavailable' });
  if (!demo && (!env.RESEND_API_KEY || !env.CONTACT_FROM || !env.CONTACT_TO || ['localhost', '127.0.0.1', '10.0.1.34'].includes(hostname))) return reply(503, { error: 'unavailable' });

  try {
    // CF sätter adressen vid kanten; godtycklig X-Forwarded-For används aldrig.
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return reply(403, { error: 'verification' });
    const limited = await env.CONTACT_LIMITER.limit({ key: ip });
    if (!limited.success) return reply(429, { error: 'rate_limit' });
  } catch { return reply(503, { error: 'unavailable' }); }

  let data;
  try { data = validate(await readBody(request)); }
  catch (error) { return reply(error.message === 'large' ? 413 : 400, { error: 'invalid' }); }
  let verification;
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: data.token, remoteip: request.headers.get('CF-Connecting-IP') }),
    });
    if (!response.ok) throw new Error('upstream');
    verification = await response.json();
  } catch { return reply(503, { error: 'verification_unavailable' }); }
  if (verification.success !== true || verification.action !== 'contact' || verification.hostname !== hostname) return reply(403, { error: 'verification' });

  // Testmiljön verifierar riktiga Turnstile-token men sparar och mejlar inget.
  if (demo) return reply(200, { ok: true, demo: true });
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `contact/${data.requestId}` },
      body: JSON.stringify({
        from: env.CONTACT_FROM, to: [env.CONTACT_TO],
        subject: `[Luns] ${TOPICS[data.topic]}`,
        text: `${TOPICS[data.topic]}\nRestaurang: ${data.restaurant || 'Inte angiven'}\nOmråde: ${data.area || 'Inte angivet'}\nE-post: ${data.email || 'Inte angiven (anonymt)'}\n\n${data.message}`,
        ...(data.email ? { reply_to: data.email } : {}),
      }),
    });
    if (!response.ok || typeof (await response.json()).id !== 'string') throw new Error('delivery');
    return reply(200, { ok: true, demo: false });
  } catch {
    // Varken leverantörens felsvar, meddelande, IP eller e-post loggas.
    console.warn(JSON.stringify({ event: 'contact_delivery_failed' }));
    return reply(502, { error: 'delivery' });
  }
}
export default { fetch: (request, env) => handle(request, env) };
