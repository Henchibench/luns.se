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

function Entry({ item, onOpenContact }: { item: NewsItem; onOpenContact?: () => void }) {
  return (
    <li className="luns-news-entry rounded-xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3.5">
      <time dateTime={item.date} className="luns-news-date block font-mono text-10 tracking-[.1em] text-[var(--mut)]">
        {formatDate(item.date)}
      </time>
      <h3 className="mt-1 font-heading text-16 font-semibold text-[var(--ink)]">{item.title}</h3>
      <p className="mt-1 text-13 leading-[1.5] text-[var(--ink2)]">{item.body}</p>
      {item.action === 'contact' && onOpenContact && (
        <button type="button" onClick={onOpenContact}
          className="mt-3 min-h-11 rounded-lg bg-[var(--acc)] px-4 py-2 text-13 font-semibold text-[var(--bg)] cursor-pointer hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]">
          Skriv till oss
        </button>
      )}
      {item.image && (
        <Image src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height}
          unoptimized className="mt-3 h-auto w-full rounded-lg" />
      )}
    </li>
  );
}

function CloseButton() {
  const close = useOverlayClose();
  return (
    <button
      onClick={close}
      autoFocus
      className="min-h-11 shrink-0 rounded-lg border-0 bg-[var(--acc)] px-4 py-2 text-12 font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
    >
      Stäng
    </button>
  );
}

function OlderNewsButton({ expanded, count, onToggle, className }: {
  expanded: boolean;
  count: number;
  onToggle: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls="luns-news-items"
      onClick={onToggle}
      className={`min-h-11 rounded-lg border border-[var(--line)] bg-[var(--chip)] px-4 py-2 text-13 font-semibold text-[var(--ink)] cursor-pointer hover:bg-[var(--hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)] ${className}`}
    >
      {expanded ? 'Dölj äldre nyheter' : `Visa äldre nyheter (${count})`}
    </button>
  );
}

export default function NewsNote({
  onClose,
  onCloseStart,
  contactEnabled = false,
  onOpenContact,
}: {
  onClose: () => void;
  contactEnabled?: boolean;
  onOpenContact?: () => void;
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
        className="luns-panel luns-news-panel grid w-full max-w-[960px] grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)] wide:grid-rows-[auto_minmax(0,1fr)_auto]"
        onClick={e => e.stopPropagation()}
      >
        <div className="col-start-1 row-start-1 flex items-center border-b border-[var(--line)] py-4 pl-4 wide:col-span-2 wide:px-6">
          <h2 id="luns-news-title" className="font-heading text-24 font-bold tracking-[-.02em] text-[var(--ink)]">
            Nytt på luns.se
          </h2>
        </div>

        <div className="col-start-2 row-start-1 flex items-center justify-end border-b border-[var(--line)] py-4 pr-4 pl-3 wide:col-span-2 wide:col-start-1 wide:row-start-3 wide:border-t wide:border-b-0 wide:px-6">
          {older.length > 0 && (
            <OlderNewsButton expanded={showOlder} count={older.length}
              onToggle={() => setShowOlder(value => !value)} className="mr-auto hidden wide:block" />
          )}
          <CloseButton />
        </div>

        <div className="luns-scroll col-span-2 row-start-2 min-h-0 overflow-y-auto overscroll-contain p-4 wide:p-6">
          <ol id="luns-news-items" role="list" aria-label="Nyheter, nyast först" className="luns-news-timeline">
            {(showOlder ? sorted : latest).map(item => <Entry key={`${item.date}-${item.title}`} item={item} onOpenContact={contactEnabled ? onOpenContact : undefined} />)}
          </ol>

          {older.length > 0 && (
            <OlderNewsButton expanded={showOlder} count={older.length}
              onToggle={() => setShowOlder(value => !value)} className="mt-4 wide:hidden" />
          )}
        </div>
      </div>
    </Overlay>
  );
}
