'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { LunsLocation } from '../../lib/menu';

/**
 * Platsväljaren, byggd för hand i stället för som ett select-element.
 *
 * Ett nativt select ritar sin utfällda lista i operativsystemet, inte i sidan.
 * Bakgrunden går därför inte att sätta: med color-scheme på light blev listan
 * en vit systemruta med vår bleka etikettfärg på, och med dark blev den
 * nästan kolsvart. Ingen av dem finns i sajtens palett, och option-regler i
 * CSS har ingen verkan på macOS.
 *
 * Här är listan vanliga element, och då gäller våra egna färger. Panelen har
 * samma yta och kant som inställningsrutan, så den känns som en del av sajten.
 *
 * Knappen behåller utseendet från select-elementet: samma chip-bakgrund, samma
 * mono-etikett, samma pil. Skillnaden ska bara synas när den är öppen.
 */
export default function LocationSelect({
  locations,
  selected,
  onSelect,
}: {
  locations: LunsLocation[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [aktiv, setAktiv] = useState(0);
  const rot = useRef<HTMLDivElement | null>(null);

  const nuvarande = locations.find(l => l.id === selected) ?? locations[0];

  // Klick utanför och Escape stänger. Utan dem blir en öppen lista något man
  // måste träffa exakt rätt yta för att bli av med.
  useEffect(() => {
    if (!open) return;
    const utanför = (e: MouseEvent) => {
      if (rot.current && !rot.current.contains(e.target as Node)) setOpen(false);
    };
    const tangent = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', utanför);
    window.addEventListener('keydown', tangent);
    return () => {
      document.removeEventListener('mousedown', utanför);
      window.removeEventListener('keydown', tangent);
    };
  }, [open]);

  const öppna = () => {
    setAktiv(Math.max(0, locations.findIndex(l => l.id === nuvarande?.id)));
    setOpen(true);
  };

  const välj = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  const påTangent = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        öppna();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAktiv(i => (i + 1) % locations.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAktiv(i => (i - 1 + locations.length) % locations.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      välj(locations[aktiv].id);
    }
  };

  return (
    <div ref={rot} className="relative flex-none">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : öppna())}
        onKeyDown={påTangent}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Välj plats"
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--chip)] px-2 py-1.5 font-mono text-[11px] text-[var(--ink)] transition-colors hover:bg-[var(--hi)]"
      >
        {nuvarande?.label}
        <span aria-hidden="true" className="text-[9px] text-[var(--mut)]">
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Välj plats"
          className="luns-panel absolute left-0 top-[calc(100%+6px)] z-50 m-0 flex min-w-full list-none flex-col gap-0.5 rounded-xl border border-[var(--glassBrd)] bg-[var(--bg)] p-1.5"
        >
          {locations.map((loc, i) => {
            const vald = loc.id === nuvarande?.id;
            return (
              <li key={loc.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={vald}
                  onClick={() => välj(loc.id)}
                  onMouseEnter={() => setAktiv(i)}
                  className="flex w-full cursor-pointer items-baseline justify-between gap-4 whitespace-nowrap rounded-lg border-0 px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors"
                  style={{
                    background: i === aktiv ? 'var(--hi)' : 'transparent',
                    color: vald ? 'var(--accStrong)' : 'var(--ink2)',
                    fontWeight: vald ? 600 : 400,
                  }}
                >
                  {loc.label}
                  <span className="text-[10px] text-[var(--mut)]">{loc.city}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
