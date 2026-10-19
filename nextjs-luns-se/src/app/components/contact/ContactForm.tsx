'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Overlay, { useOverlayClose } from '../board/Overlay';
import { CONTACT_TOPICS, contactError, contactRequestId, type ContactConfig, type ContactContext, type ContactTopic } from '../../lib/contact';

type Turnstile = {
  render: (element: HTMLElement, options: {
    sitekey: string; action: string; theme: 'light' | 'dark'; size: 'flexible'; language: 'sv';
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
    'timeout-callback': () => void;
  }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
const INPUT = 'mt-1 block w-full rounded-lg border border-[var(--line)] bg-[var(--chip)] px-3 py-2.5 text-14 text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--acc)]';
const BUTTON = 'rounded-lg px-4 py-2.5 text-13 font-semibold cursor-pointer disabled:cursor-wait disabled:opacity-50';
interface Props { config: ContactConfig; context: ContactContext; theme: 'light' | 'dark'; onClose: () => void }

function Form({ config, context, theme }: Omit<Props, 'onClose'>) {
  const close = useOverlayClose();
  const panel = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  const busy = useRef(false);
  const [topic, setTopic] = useState<ContactTopic>(context.restaurant ? 'menu' : 'restaurant');
  const [restaurant, setRestaurant] = useState(context.restaurant || '');
  const [area, setArea] = useState(context.area || '');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [verificationError, setVerificationError] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => { previous?.focus(); };
  }, []);
  useEffect(() => () => {
    if (widget.current !== null) window.turnstile?.remove(widget.current);
  }, []);

  const renderWidget = () => {
    if (!container.current || !window.turnstile || widget.current !== null) return;
    widget.current = window.turnstile.render(container.current, {
      sitekey: config.sitekey, action: 'contact', theme, size: 'flexible', language: 'sv',
      callback: value => { setToken(value); setVerificationError(false); },
      'expired-callback': () => setToken(''),
      'error-callback': () => { setToken(''); setVerificationError(true); },
      'timeout-callback': () => { setToken(''); setVerificationError(true); },
    });
  };
  const resetWidget = () => {
    setToken('');
    if (widget.current !== null) window.turnstile?.reset(widget.current);
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !token) return;
    const body = { topic, restaurant: restaurant.trim(), area: area.trim(), message: message.trim(), email: email.trim(), website };
    if (body.message.length < 10) { setError(contactError('invalid')); return; }
    const fingerprint = JSON.stringify(body);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: contactRequestId() };
    busy.current = true;
    setPending(true); setError('');
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, token, requestId: submission.current.id }),
        signal: AbortSignal.timeout(30000), credentials: 'omit',
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) { setError(contactError(result.error)); return; }
      // Ett demo-svar får aldrig presenteras som ett levererat meddelande.
      if (result.demo !== (config.mode === 'demo')) { setError(contactError('unavailable')); return; }
      setSent(true); setMessage(''); setEmail('');
      panel.current?.focus();
    } catch { setError(contactError('unavailable')); }
    finally { resetWidget(); busy.current = false; setPending(false); }
  }

  return (
    <div ref={panel} tabIndex={-1} className="luns-panel luns-scroll max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)] p-5 text-[var(--ink)] outline-none sm:p-7"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        // Håll tangentbordsfokus i formuläret. Turnstiles iframe är också fokuserbar.
        if (e.key !== 'Tab') return;
        const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([tabindex="-1"]), textarea, select, a[href], iframe');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }}>
      <div className="mb-2 flex items-start justify-between gap-4">
        <h2 id="luns-contact-title" className="font-heading text-24 font-bold tracking-[-.02em]">{sent ? (config.mode === 'demo' ? 'Testet gick bra' : 'Tack för ditt meddelande!') : 'Tjôta med Luns'}</h2>
        <button type="button" onClick={close} aria-label="Stäng kontaktformuläret" className="-mr-2 -mt-2 h-11 w-11 flex-none rounded-lg text-24 hover:bg-[var(--hi)]">×</button>
      </div>
      {sent ? <div role="status">
        <p className="text-14 leading-relaxed text-[var(--ink2)]">{config.mode === 'demo' ? 'Säkerhetskontrollen och formuläret fungerade. Inget meddelande har sparats eller skickats.' : 'Meddelandet har skickats till Luns. Om du lämnade en e-postadress kan vi svara dig där.'}</p>
        <button type="button" onClick={close} className={`${BUTTON} mt-6 bg-[var(--acc)] text-[var(--bg)]`}>Tillbaka till lunchen</button>
      </div> : <>
        <p className="mb-5 text-14 leading-relaxed text-[var(--ink2)]">Saknas ett lunchställe, är menyn fel eller har du en idé? Skriv till oss. Du behöver inte ange namn eller e-post.</p>
        {config.mode === 'demo' && <p className="mb-5 rounded-lg border border-[var(--line)] bg-[var(--accBg)] px-3 py-2 text-12 text-[var(--ink2)]">Testläge: du kan prova formuläret, men inget meddelande skickas.</p>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-13 font-semibold">Vad gäller det?
            <select disabled={pending} value={topic} onChange={e => setTopic(e.target.value as ContactTopic)} className={INPUT}>{Object.entries(CONTACT_TOPICS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-13 font-semibold">Restaurang <span className="font-normal text-[var(--ink2)]">(valfritt)</span>
              <input disabled={pending} value={restaurant} maxLength={120} onChange={e => setRestaurant(e.target.value)} className={INPUT} autoComplete="off" />
            </label>
            <label className="block text-13 font-semibold">Område <span className="font-normal text-[var(--ink2)]">(valfritt)</span>
              <input disabled={pending} value={area} maxLength={120} onChange={e => setArea(e.target.value)} className={INPUT} autoComplete="off" />
            </label>
          </div>
          <label className="block text-13 font-semibold">Ditt meddelande
            <textarea disabled={pending} value={message} onChange={e => setMessage(e.target.value)} required minLength={10} maxLength={4000} rows={4} className={`${INPUT} min-h-[110px] resize-y`} placeholder="Berätta vad vi kan hjälpa till med…" />
            <span className="mt-1 block text-11 font-normal text-[var(--ink2)]">Minst 10 tecken. {message.length}/4000</span>
          </label>
          <label className="block text-13 font-semibold">E-post <span className="font-normal text-[var(--ink2)]">(valfritt)</span>
            <input disabled={pending} value={email} onChange={e => setEmail(e.target.value)} type="email" maxLength={254} autoComplete="email" className={INPUT} aria-describedby="contact-email-help" />
            <span id="contact-email-help" className="mt-1 block text-12 font-normal text-[var(--ink2)]">Lämna en adress om du vill kunna få svar.</span>
          </label>
          <div className="hidden" aria-hidden="true"><label>Webbplats<input disabled={pending} value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
          <div ref={container} className="min-h-[65px]" />
          {verificationError && <div role="alert" className="text-12 text-[var(--ink2)]">Säkerhetskontrollen kunde inte laddas. Kontrollera anslutningen och eventuella innehållsblockerare. <button type="button" className="underline" onClick={() => { setVerificationError(false); resetWidget(); renderWidget(); }}>Försök igen</button></div>}
          <p className="text-11 leading-relaxed text-[var(--ink2)]">{config.mode === 'demo' ? 'I testläget kontrollerar Cloudflare inskickningen. Innehållet sparas inte och går inte vidare till Resend.' : 'När du skickar behandlas meddelandet och eventuell e-post av Cloudflare och Resend för att nå vår inkorg.'} Cloudflare behandlar även tekniska uppgifter för spamskydd. <a href="https://www.cloudflare.com/turnstile-privacy-policy/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Om spamskyddet</a>.</p>
          {error && <p role="alert" className="rounded-lg border border-[var(--acc)] p-3 text-13">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span role="status" className="text-12 text-[var(--ink2)]">{pending ? 'Kontrollerar och skickar…' : token ? 'Säkerhetskontrollen är klar' : 'Inväntar säkerhetskontrollen…'}</span>
            <button type="submit" disabled={pending || !token} className={`${BUTTON} bg-[var(--acc)] text-[var(--bg)]`}>{pending ? 'Vänta…' : config.mode === 'demo' ? 'Testa formuläret' : 'Skicka meddelande'}</button>
          </div>
        </form>
      </>}
      {!sent && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} onError={() => setVerificationError(true)} />}
    </div>
  );
}
export default function ContactForm({ onClose, ...props }: Props) {
  return <Overlay onClose={onClose} labelledBy="luns-contact-title"><Form {...props} /></Overlay>;
}
