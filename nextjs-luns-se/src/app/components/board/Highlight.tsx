'use client';

import React from 'react';

/**
 * Markerar sökträffar i en beskrivning. Termerna kommer färdigexpanderade
 * från searchTerms(), så ett craving-chip markerar alla sina synonymer och
 * inte bara ordet man klickade på.
 */
export default function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;

  const pattern = terms
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)
    .join('|');
  if (!pattern) return <>{text}</>;

  const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
  if (parts.length < 2) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="rounded px-0.5 bg-[var(--accBg)]">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
