'use client';

import React from 'react';
import Overlay, { useOverlayClose } from './Overlay';

/**
 * Vad sajten sparar och vad den skickar vidare.
 *
 * Texten räknar upp exakt vilka händelser som går till Umami i stället för
 * att lova något svepande. "Ingenting lämnar din enhet" hade varit enklare
 * att skriva men är inte sant — vilken restaurang du favoritmarkerar går
 * dit som vanlig produktstatistik. Det som aldrig skickas är fritexten.
 *
 * Samma glasruta som förstagångsvalet av plats, så de känns som samma sorts
 * meddelande från sajten.
 */
/**
 * Egen komponent för att kroken ska nå Overlays stängning. Anropad direkt i
 * PrivacyNote körs den utanför providern och får en tom funktion.
 */
function CloseButton() {
  const close = useOverlayClose();
  return (
    <button
      onClick={close}
      className="rounded-lg border-0 bg-[var(--acc)] px-4 py-2 text-[12px] font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90"
    >
      Stäng
    </button>
  );
}

export default function PrivacyNote({ onClose }: { onClose: () => void }) {
  return (
    <Overlay onClose={onClose} labelledBy="luns-privacy-title">
      <div
        className="luns-panel luns-scroll max-h-[86vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)] p-7"
        onClick={e => e.stopPropagation()}
      >
        <span className="font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">LUNS.SE</span>
        <h2
          id="luns-privacy-title"
          className="mt-2 mb-3 font-heading text-2xl font-bold tracking-[-.02em] text-[var(--ink)]"
        >
          Integritetsinfo
        </h2>

        <p className="mb-4 text-[13px] leading-[1.6] text-[var(--ink2)]">
          Det finns inget konto på luns.se och ingen databas med besökare. Dina favoriter, din
          matprofil, dina bevakade rätter, ditt tema och din valda plats ligger i din egen
          webbläsare. Rensar du webbläsardata är de borta, och de följer inte med till en annan
          enhet.
        </p>

        <h3 className="mb-1.5 font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">
          BESÖKSSTATISTIK
        </h3>
        <p className="mb-3 text-[13px] leading-[1.6] text-[var(--ink2)]">
          För att se om sajten används alls använder vi{' '}
          <a
            href="https://umami.is/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--acc)] underline underline-offset-2"
          >
            Umami
          </a>
          , som varken sätter cookies eller följer dig mellan sajter. I princip ett
          integritetsvänligt alternativ till Google Analytics. Vi får veta att någon gjorde något.
        </p>

        <h3 className="mb-1.5 font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">
          DET SOM SKICKAS
        </h3>
        <ul className="mb-3 flex list-none flex-col gap-1 p-0 text-[13px] leading-[1.5] text-[var(--ink2)]">
          <li>· vilken plats du väljer</li>
          <li>· vilken restaurang du favoritmarkerar eller rätt du bevakar</li>
          <li>· vilket sugen på-filter du slår på</li>
          <li>· att matprofilen ändrats, och hur många ord den döljer</li>
          <li>· att du bytte tema eller öppnade introduktionen</li>
        </ul>
        <p className="mb-3 text-[13px] leading-[1.6] text-[var(--ink2)]">
          Ihopräknat visas en del av det för alla under{' '}
          <span className="font-semibold text-[var(--ink2)]">Statistik</span>, aldrig per person,
          bara som summor.
        </p>

        <h3 className="mb-1.5 font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">
          DET SOM ALDRIG SKICKAS
        </h3>
        <p className="mb-5 text-[13px] leading-[1.6] text-[var(--ink2)]">
          Det du skriver själv. Sökrutan spåras inte alls, och orden du döljer i matprofilen stannar
          i din webbläsare. Bara antalet räknas.
        </p>

        <div className="flex justify-end">
          <CloseButton />
        </div>
      </div>
    </Overlay>
  );
}
