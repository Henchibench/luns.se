'use client';

import React from 'react';
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
      <span className="mt-1 block text-13 font-semibold text-[var(--ink)]">{item.title}</span>
      <span className="mt-0.5 block text-12 leading-[1.5] text-[var(--mut)]">{item.body}</span>
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
      className="rounded-lg border-0 bg-[var(--acc)] px-4 py-2 text-12 font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90"
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
  return (
    <Overlay onClose={onClose} onCloseStart={onCloseStart} labelledBy="luns-news-title">
      <div
        className="luns-panel luns-scroll max-h-[86vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)] p-7"
        onClick={e => e.stopPropagation()}
      >
        <span className="font-mono text-10 tracking-[.15em] text-[var(--mut)]">LUNS.SE</span>
        <h2
          id="luns-news-title"
          className="mt-2 mb-3 font-heading text-24 font-bold tracking-[-.02em] text-[var(--ink)]"
        >
          Nytt på luns.se
        </h2>

        <ul className="mb-5 flex list-none flex-col gap-2 p-0">
          {NEWS_ITEMS.filter(item => !item.requiresContact || contactEnabled)
            .sort((a, b) => b.date.localeCompare(a.date)).map(item => (
            <Entry key={`${item.date}-${item.title}`} item={item} />
          ))}
        </ul>

        <div className="flex justify-end">
          {/* onCloseStart finns bara när rutan öppnades från inställningarna,
              och då leder knappen dit i stället för ut. */}
          <CloseButton label={onCloseStart ? 'Tillbaka' : 'Stäng'} />
        </div>
      </div>
    </Overlay>
  );
}
