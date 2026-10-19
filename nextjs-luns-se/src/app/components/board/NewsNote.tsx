'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Overlay, { useOverlayClose } from './Overlay';
import { NEWS_ITEMS, type NewsItem } from '../../lib/news';

/**
 * Vad som är nytt sedan sist.
 *
 * Öppnas automatiskt en gång per ny version för återkommande besökare,
 * eller manuellt från inställningarna. Nya besökare får introduktionen.
 *
 * Samma glasruta som integritetsinfon och statistiken, så den känns som en
 * undersida till inställningarna och inte som ett eget meddelande.
 */

const MONTHS = [
  'jan',
  'feb',
  'mars',
  'april',
  'maj',
  'juni',
  'juli',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];

/**
 * Datumet formateras ur strängen och inte via Date.
 *
 * `new Date('2026-08-19')` tolkas som midnatt UTC och skrivs sedan ut i
 * läsarens tidszon, så en besökare väster om Greenwich hade fått 18 augusti.
 * Här står ett fast datum som aldrig ska glida en dag beroende på var någon
 * sitter.
 */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const name = MONTHS[Number(month) - 1];
  if (!name) return iso;
  return `${Number(day)} ${name} ${year}`;
}

function Entry({ item }: { item: NewsItem }) {
  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3.5">
      <span className="block font-mono text-10 tracking-[.1em] text-[var(--mut)]">
        {formatDate(item.date)}
      </span>
      <h3 className="mt-1 font-heading text-16 font-semibold text-[var(--ink)]">{item.title}</h3>
      <p className="mt-1 text-13 leading-[1.5] text-[var(--ink2)]">{item.body}</p>
      {item.image && (
        <Image src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height}
          unoptimized className="mt-3 h-auto w-full rounded-lg" />
      )}
    </li>
  );
}

function CloseButton({ label }: { label: string }) {
  const close = useOverlayClose();
  return (
    <button
      onClick={close}
      autoFocus
      className="min-h-11 shrink-0 rounded-lg border-0 bg-[var(--acc)] px-4 py-2 text-12 font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
    >
      {label}
    </button>
  );
}

export default function NewsNote({
  onClose,
  onCloseStart,
  contactEnabled = false,
}: {
  onClose: () => void;
  contactEnabled?: boolean;
  /** Sätts när rutan öppnats från inställningarna och ska lämna tillbaka dit. */
  onCloseStart?: () => void;
}) {
  const [showOlder, setShowOlder] = useState(false);
  const sorted = NEWS_ITEMS.filter(item => !item.requiresContact || contactEnabled)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted.slice(0, 5);
  const older = sorted.slice(5);

  return (
    <Overlay onClose={onClose} onCloseStart={onCloseStart} labelledBy="luns-news-title">
      <div
        className="luns-panel luns-news-panel flex w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-4 wide:px-6">
          <h2 id="luns-news-title" className="font-heading text-24 font-bold tracking-[-.02em] text-[var(--ink)]">
            Nytt på luns.se
          </h2>
          <CloseButton label={onCloseStart ? 'Tillbaka' : 'Stäng'} />
        </div>

        <div className="luns-scroll min-h-0 overflow-y-auto overscroll-contain p-4 wide:p-6">
          <ul aria-label="Senaste nyheterna" className="grid list-none grid-cols-1 items-start gap-3 p-0 wide:grid-cols-2 wide:gap-4">
            {latest.map(item => <Entry key={`${item.date}-${item.title}`} item={item} />)}
          </ul>

          {older.length > 0 && (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <button
                type="button"
                aria-expanded={showOlder}
                aria-controls="luns-older-news"
                onClick={() => setShowOlder(value => !value)}
                className="min-h-11 rounded-lg border border-[var(--line)] bg-[var(--chip)] px-4 py-2 text-13 font-semibold text-[var(--ink)] cursor-pointer hover:bg-[var(--hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
              >
                {showOlder ? 'Dölj äldre nyheter' : `Visa äldre nyheter (${older.length})`}
              </button>
              <ul id="luns-older-news" aria-label="Äldre nyheter" hidden={!showOlder}
                className={showOlder ? 'mt-4 grid list-none grid-cols-1 items-start gap-3 p-0 wide:grid-cols-2 wide:gap-4' : 'hidden'}>
                {older.map(item => <Entry key={`${item.date}-${item.title}`} item={item} />)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
