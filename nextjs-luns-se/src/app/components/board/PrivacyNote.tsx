'use client';

import React from 'react';
import Overlay, { useOverlayClose } from './Overlay';

/**
 * Vad sajten sparar och vad den skickar vidare.
 *
 * Texten räknar upp exakt vilka händelser som går till Umami i stället för
 * att lova något svepande. "Ingenting lämnar din enhet" hade varit enklare
 * att skriva men är inte sant: vilken restaurang som favoritmarkeras går dit
 * som vanlig produktstatistik. Att fritexten aldrig skickas står numera i
 * listan i stället för i ett eget avsnitt: raden om sökfältet bär hela
 * löftet, och en rubrik till för samma sak gjorde rutan längre utan att
 * säga mer.
 *
 * Samma glasruta som förstagångsvalet av plats, så de känns som samma sorts
 * meddelande från sajten.
 */
/**
 * Egen komponent för att kroken ska nå Overlays stängning. Anropad direkt i
 * PrivacyNote körs den utanför providern och får en tom funktion.
 */
function CloseButton({ label }: { label: string }) {
  const close = useOverlayClose();
  return (
    <button
      onClick={close}
      className="rounded-lg border-0 bg-[var(--acc)] px-4 py-2 text-[12px] font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90"
    >
      {label}
    </button>
  );
}

export default function PrivacyNote({
  onClose,
  onCloseStart,
}: {
  onClose: () => void;
  /** Sätts när rutan öppnats från inställningarna och ska lämna tillbaka dit. */
  onCloseStart?: () => void;
}) {
  return (
    <Overlay onClose={onClose} onCloseStart={onCloseStart} labelledBy="luns-privacy-title">
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
          Det finns inget konto på luns.se och ingen databas med besökare. Dina favoriter, dina
          bevakade rätter, ditt tema och din valda plats ligger i din egen webbläsare. Rensar du webbläsardata är de borta, och de följer inte med till en annan
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
          , som varken sätter cookies eller följer någon mellan sajter. I princip ett
          integritetsvänligt alternativ till Google Analytics.
        </p>

        <h3 className="mb-1.5 font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">
          DET SOM SKICKAS
        </h3>
        {/* Listan står i passiv form med flit. "Vilken restaurang du
            favoritmarkerar" låter som att vi vet att det var just du, vilket
            är precis motsatsen till vad stycket ovanför säger. När uppgiften
            når Umami finns ingen person kvar, och då ska meningen inte ha
            någon heller. Där texten handlar om det som stannar på enheten är
            "du" däremot rätt: det är ditt och lämnar dig aldrig. */}
        <ul className="mb-3 flex list-none flex-col gap-1 p-0 text-[13px] leading-[1.5] text-[var(--ink2)]">
          <li>· vilken plats som väljs</li>
          <li>· vilken restaurang som favoritmarkeras eller rätt som bevakas</li>
          <li>· vilket sugen på-filter som slås på</li>
          <li>· att sökfältet användes, aldrig vad som skrevs i det</li>
          <li>· att temat byttes eller introduktionen öppnades</li>
        </ul>
        {/* Sista stycket i rutan nu, så det bär avståndet ner till knappen
            som avsnittet under tidigare gjorde. */}
        <p className="mb-5 text-[13px] leading-[1.6] text-[var(--ink2)]">
          Ihopräknat visas en del av det för alla under{' '}
          <span className="font-semibold text-[var(--ink2)]">Statistik</span>, aldrig per person,
          bara som summor.
        </p>

        <div className="flex justify-end">
          {/* onCloseStart finns bara när rutan öppnades från inställningarna,
              och då leder knappen dit i stället för ut. */}
          <CloseButton label={onCloseStart ? 'Tillbaka' : 'Stäng'} />
        </div>
      </div>
    </Overlay>
  );
}
