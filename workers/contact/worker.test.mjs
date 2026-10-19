import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './worker.mjs';
const input = { topic: 'menu', message: 'Det här är ett testmeddelande.', email: '', restaurant: 'Testrestaurang', area: 'Testområde', requestId: 'c7b71c1f-94a2-4e91-af1a-d697178b67a9', token: 'fresh-token' };
const env = { CONTACT_MODE: 'live', ALLOWED_ORIGINS: 'https://luns.se', TURNSTILE_HOSTNAMES: 'luns.se', TURNSTILE_SECRET: 'test-only', RESEND_API_KEY: 'test-only', CONTACT_FROM: 'Luns <kontakt@example.com>', CONTACT_TO: 'recipient@example.com', CONTACT_LIMITER: { limit: async () => ({ success: true }) } };
const request = (data = input, options = {}) => new Request('https://worker.example/contact', { method: 'POST', headers: { Origin: 'https://luns.se', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...options.headers }, body: options.body ?? JSON.stringify(data) });
const verify = { success: true, action: 'contact', hostname: 'luns.se' };
function mock(result = verify) { const calls = []; return { calls, fetch: async (url, options) => { calls.push({ url, ...options }); return Response.json(url.includes('siteverify') ? result : { id: 'email-id' }); } }; }

test('anonymt: fast mottagare, ren text, ingen reply_to', async () => {
  const m = mock(); const res = await handle(request({ ...input, to: 'intruder@example.com' }), env, m.fetch);
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), { ok: true, demo: false });
  const mail = JSON.parse(m.calls[1].body); assert.deepEqual(mail.to, [env.CONTACT_TO]); assert.equal(mail.from, env.CONTACT_FROM); assert.equal(mail.reply_to, undefined); assert.equal(mail.html, undefined);
  assert.equal(m.calls[1].headers['Idempotency-Key'], `contact/${input.requestId}`);
});
test('valfri e-post blir reply_to, aldrig mottagare eller avsändare', async () => { const m = mock(); await handle(request({ ...input, email: 'person@example.org' }), env, m.fetch); assert.equal(JSON.parse(m.calls[1].body).reply_to, 'person@example.org'); });
test('demo verifierar men skickar inte', async () => { const m = mock(); const res = await handle(request(), { ...env, CONTACT_MODE: 'demo', RESEND_API_KEY: undefined }, m.fetch); assert.deepEqual(await res.json(), { ok: true, demo: true }); assert.equal(m.calls.length, 1); });
for (const result of [{ success: false }, { ...verify, action: 'login' }, { ...verify, hostname: 'evil.example' }, { ...verify, success: 'true' }]) test(`fel verifiering avvisas: ${JSON.stringify(result)}`, async () => { const m = mock(result); assert.equal((await handle(request(), env, m.fetch)).status, 403); assert.equal(m.calls.length, 1); });
test('förbrukad token avvisas vid återspelning', async () => { let used = false, mails = 0; const fetcher = async url => { if (!url.includes('siteverify')) { mails++; return Response.json({ id: 'ok' }); } const r = used ? { success: false, 'error-codes': ['timeout-or-duplicate'] } : verify; used = true; return Response.json(r); }; assert.equal((await handle(request(), env, fetcher)).status, 200); assert.equal((await handle(request(), env, fetcher)).status, 403); assert.equal(mails, 1); });
for (const changes of [{ message: 'kort' }, { message: ' '.repeat(20) }, { email: 'fel' }, { email: 'a@b.com\r\nBcc: victim@example.com' }, { message: 'x'.repeat(4001) }, { topic: 'toString' }, { token: '' }, { requestId: 'oops' }, { website: 'spam' }]) test(`ogiltig indata ${Object.keys(changes)}`, async () => { const m = mock(); assert.equal((await handle(request({ ...input, ...changes }), env, m.fetch)).status, 400); assert.equal(m.calls.length, 0); });
test('begränsad kropp även utan Content-Length', async () => { const m = mock(); assert.equal((await handle(request(input, { body: 'x'.repeat(24001) }), env, m.fetch)).status, 413); assert.equal(m.calls.length, 0); });
test('fel origin och saknad origin stoppas före leverantörsanrop', async () => { const m = mock(); for (const origin of ['https://evil.example', '']) { const res = await handle(request(input, { headers: { Origin: origin } }), env, m.fetch); assert.equal(res.status, 403); assert.equal(res.headers.get('Access-Control-Allow-Origin'), null); } assert.equal(m.calls.length, 0); });
test('CORS preflight och content type', async () => { const res = await handle(new Request('https://worker.example/contact', { method: 'OPTIONS', headers: { Origin: 'https://luns.se' } }), env); assert.equal(res.status, 204); assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://luns.se'); assert.equal((await handle(request(input, { headers: { 'Content-Type': 'text/plain' } }), env)).status, 415); });
test('rate limit och saknad limiter stänger', async () => { assert.equal((await handle(request(), { ...env, CONTACT_LIMITER: { limit: async () => ({ success: false }) } })).status, 429); assert.equal((await handle(request(), { ...env, CONTACT_LIMITER: undefined })).status, 503); });
test('nätfel hos Siteverify kan aldrig leda till mejl', async () => { assert.equal((await handle(request(), env, async () => { throw new Error('offline'); })).status, 503); });
test('Resend-fel kan aldrig bli lyckat svar', async () => { const res = await handle(request(), env, async url => url.includes('siteverify') ? Response.json(verify) : Response.json({ error: 'rejected' }, { status: 500 })); assert.equal(res.status, 502); assert.equal((await res.json()).error, 'delivery'); });
test('live kräver Resend och får inte använda lokal hostname', async () => { assert.equal((await handle(request(), { ...env, RESEND_API_KEY: '' })).status, 503); assert.equal((await handle(request(input, { headers: { Origin: 'http://localhost:3002' } }), { ...env, ALLOWED_ORIGINS: 'http://localhost:3002', TURNSTILE_HOSTNAMES: 'localhost' })).status, 503); });
test('mail-test skickar från exakt testserver med riktig verifiering', async () => {
  const origin = 'http://10.0.1.34:3002';
  const testEnv = { ...env, CONTACT_MODE: 'mail-test', ALLOWED_ORIGINS: origin, TURNSTILE_HOSTNAMES: '10.0.1.34' };
  const m = mock({ ...verify, hostname: '10.0.1.34' });
  const res = await handle(request(input, { headers: { Origin: origin } }), testEnv, m.fetch);
  assert.deepEqual(await res.json(), { ok: true, demo: false });
  assert.equal(m.calls.length, 2);
  assert.deepEqual(JSON.parse(m.calls[1].body).to, [env.CONTACT_TO]);
  const bad = mock({ success: false });
  assert.equal((await handle(request(input, { headers: { Origin: origin } }), testEnv, bad.fetch)).status, 403);
  assert.equal(bad.calls.length, 1);
  assert.equal((await handle(request(input, { headers: { Origin: origin } }), { ...testEnv, RESEND_API_KEY: '' }, m.fetch)).status, 503);
});
test('mail-test avvisar publik sajt och andra lokala origins även om allowlist felkonfigurerats', async () => {
  const m = mock();
  for (const origin of ['https://luns.se', 'http://localhost:3002', 'http://10.0.1.34:3003']) {
    assert.equal((await handle(request(input, { headers: { Origin: origin } }), { ...env, CONTACT_MODE: 'mail-test', ALLOWED_ORIGINS: origin, TURNSTILE_HOSTNAMES: new URL(origin).hostname }, m.fetch)).status, 503);
  }
  assert.equal(m.calls.length, 0);
});
