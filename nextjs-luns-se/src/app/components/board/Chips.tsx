'use client';

import React from 'react';

export interface ChipSpec {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Chips i två storlekar. "touch" används i mobilens bottom sheet där de ska
 * gå att träffa med tummen; "compact" i vänsterspalten där de ska ta lite plats.
 */
export default function Chips({
  chips,
  size = 'compact',
}: {
  chips: ChipSpec[];
  size?: 'compact' | 'touch';
}) {
  const sizing =
    size === 'touch'
      ? 'rounded-[9px] px-3.5 py-[9px] text-[12.5px]'
      : 'rounded-md px-2.5 py-[5px] text-[11px]';

  return (
    <div className={`flex flex-wrap ${size === 'touch' ? 'gap-[7px]' : 'gap-1.5'}`}>
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={chip.onClick}
          aria-pressed={chip.active}
          className={`flex-none border font-semibold whitespace-nowrap cursor-pointer transition-colors ${sizing}`}
          style={{
            background: chip.active ? 'var(--accBg)' : 'var(--chip)',
            color: chip.active ? 'var(--accStrong)' : 'var(--ink2)',
            borderColor: chip.active ? 'var(--accBg)' : 'var(--line)',
          }}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">{children}</span>
  );
}
