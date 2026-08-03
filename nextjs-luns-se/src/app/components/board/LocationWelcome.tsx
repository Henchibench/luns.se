'use client';

import React from 'react';
import type { LunsLocation } from '../../lib/menu';

/**
 * Förstagångsvalet. Designen har bara väljaren i headern, men utan det här
 * landar alla i Linköping på Lindholmen och tror att sajten är fel.
 * Visas en gång; sedan sköter väljaren i headern resten.
 */
export default function LocationWelcome({
  locations,
  onSelect,
}: {
  locations: LunsLocation[];
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)', backdropFilter: 'blur(20px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="luns-welcome-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--glassBrd)] bg-[var(--glass2)] p-7">
        <span className="font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">LUNS.SE</span>
        <h2
          id="luns-welcome-title"
          className="mt-2 mb-1 font-heading text-2xl font-bold tracking-[-.02em] text-[var(--ink)]"
        >
          Var äter du lunch?
        </h2>
        <p className="mb-5 text-[13px] leading-[1.55] text-[var(--ink2)]">
          Välj plats så visar vi menyerna där. Vi kommer ihåg valet till nästa gång.
        </p>

        <div className="flex flex-col gap-2">
          {locations.map(location => (
            <button
              key={location.id}
              onClick={() => onSelect(location.id)}
              className="flex w-full items-baseline justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--chip)] px-4 py-3 text-left cursor-pointer transition-colors hover:bg-[var(--hi)]"
            >
              <span className="text-[15px] font-semibold text-[var(--ink)]">{location.label}</span>
              <span className="font-mono text-[10px] text-[var(--mut)] whitespace-nowrap">
                {location.city} · {location.restaurantCount ?? 0} st
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
