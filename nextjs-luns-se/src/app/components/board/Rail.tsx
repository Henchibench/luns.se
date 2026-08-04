'use client';

import React from 'react';
import Chips, { ChipSpec, GroupLabel } from './Chips';

export interface RailItem {
  name: string;
  /** Rätter som syns för restaurangen just nu — 0 dämpar namnet. */
  visibleCount: number;
  favorite: boolean;
  active: boolean;
}

interface Props {
  items: RailItem[];
  onSelect: (name: string) => void;
  typeChips: ChipSpec[];
  cravingChips: ChipSpec[];
  /** Matprofilen, komponerad av sidan så spalten och mobilarket delar den. */
  foodProfile: React.ReactNode;
  onOpenPrivacy: () => void;
  onOpenStats: () => void;
}

/** En restaurangrad. Delas mellan spalten och mobilens bottom sheet. */
export function RailButton({
  item,
  onSelect,
  size = 'compact',
}: {
  item: RailItem;
  onSelect: (name: string) => void;
  size?: 'compact' | 'touch';
}) {
  const sizing =
    size === 'touch'
      ? 'rounded-[10px] px-3.5 py-3 text-[14px]'
      : 'mx-2.5 rounded-lg px-3 py-2 text-[13px]';

  return (
    <button
      onClick={() => onSelect(item.name)}
      aria-current={item.active ? 'true' : undefined}
      className={`flex flex-none items-center justify-between gap-[7px] border-0 text-left cursor-pointer transition-[background-color,color] duration-300 hover:bg-[var(--hi)] ${sizing}`}
      style={{
        background: item.active ? 'var(--accBg)' : size === 'touch' ? 'var(--chip)' : 'transparent',
        color: item.active
          ? 'var(--accStrong)'
          : item.visibleCount === 0
            ? 'var(--mut)'
            : 'var(--ink2)',
        fontWeight: item.active ? 600 : 400,
      }}
    >
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</span>
      {item.favorite && (
        <span className="flex-none text-[11px] text-[var(--acc)]" aria-label="favorit">
          ♥
        </span>
      )}
    </button>
  );
}

export default function Rail({
  items,
  onSelect,
  typeChips,
  cravingChips,
  foodProfile,
  onOpenPrivacy,
  onOpenStats,
}: Props) {
  return (
    <nav data-tour="rail" className="hidden wide:flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--glassBrd)] bg-[var(--glass2)] mb-[18px] ml-[18px] mt-1">
      <div className="luns-scroll luns-mask-rail flex flex-1 flex-col overflow-y-auto pt-3.5 pb-[18px]">
        <span className="px-5 pt-1 pb-2 font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">
          RESTAURANGER · {items.length}
        </span>

        {items.map(item => (
          <RailButton key={item.name} item={item} onSelect={onSelect} />
        ))}

        <div className="mx-5 mt-3.5 flex flex-none flex-col gap-2 border-t border-[var(--line)] pt-3.5">
          <GroupLabel>FILTER</GroupLabel>
          <Chips chips={typeChips} />
        </div>

        <div className="mx-5 mt-3.5 flex flex-none flex-col gap-2 border-t border-[var(--line)] pt-3.5">
          <GroupLabel>SUGEN PÅ…</GroupLabel>
          <div data-tour="cravings">
            <Chips chips={cravingChips} />
          </div>
        </div>

        <div data-tour="profile" className="mx-5 mt-3.5 flex flex-none flex-col border-t border-[var(--line)] pt-3.5">
          {foodProfile}
        </div>

        <div className="mt-auto flex flex-col items-start gap-1 px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenStats}
              className="border-0 bg-transparent p-0 text-[10px] text-[var(--mut)] underline underline-offset-2 cursor-pointer transition-colors hover:text-[var(--acc)]"
            >
              Statistik
            </button>
            <button
              onClick={onOpenPrivacy}
              className="border-0 bg-transparent p-0 text-[10px] text-[var(--mut)] underline underline-offset-2 cursor-pointer transition-colors hover:text-[var(--acc)]"
            >
              Integritetsinfo
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
