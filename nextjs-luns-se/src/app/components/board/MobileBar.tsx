'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Chips, { ChipSpec, GroupLabel } from './Chips';
import { RailButton, RailItem } from './Rail';

export type SheetKind = 'rest' | 'filter' | null;

interface Props {
  sheet: SheetKind;
  onOpen: (kind: Exclude<SheetKind, null>) => void;
  onClose: () => void;
  items: RailItem[];
  onSelectRestaurant: (name: string) => void;
  typeChips: ChipSpec[];
  cravingChips: ChipSpec[];
  activeFilterCount: number;
  foodProfile: React.ReactNode;
  onOpenPrivacy: () => void;
}

const BAR_BUTTON =
  'flex-1 rounded-[14px] border border-[var(--glassBrd)] px-2.5 py-[13px] text-[13.5px] font-bold text-[var(--ink)] cursor-pointer';

export default function MobileBar({
  sheet,
  onOpen,
  onClose,
  items,
  onSelectRestaurant,
  typeChips,
  cravingChips,
  activeFilterCount,
  foodProfile,
  onOpenPrivacy,
}: Props) {
  // Escape stänger arket. Utan det är enda vägen ut att träffa exakt rätt yta.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, onClose]);

  return (
    <div className="wide:hidden">
      {/* Låg knapprad krockar med telefonens egen svepyta — 14px från kanten
          gjorde dem svåra att träffa. env() lägger till utrymmet för
          hemindikatorn på de telefoner som har en, och noll på övriga. */}
      <div className="fixed inset-x-3.5 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-40 flex gap-2">
        <button
          onClick={() => onOpen('rest')}
          data-tour="rail-mobile"
          className={BAR_BUTTON}
          style={{
            background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 30px rgba(0,10,14,.25)',
          }}
        >
          ☰ Restauranger
        </button>
        <button
          onClick={() => onOpen('filter')}
          data-tour="filter-mobile"
          className={BAR_BUTTON}
          style={{
            background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 30px rgba(0,10,14,.25)',
          }}
        >
          ⚙ Filter{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </button>
      </div>

      {sheet && (
        <>
          <div
            onClick={onClose}
            className="fixed inset-0 z-[45] bg-[rgba(0,14,18,.4)]"
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet === 'rest' ? 'Restauranger' : 'Filter'}
            className="luns-sheet fixed inset-x-0 bottom-0 z-[46] flex max-h-[72vh] flex-col rounded-t-[20px] border-t border-[var(--glassBrd)] bg-[var(--bg)]"
            style={{ boxShadow: '0 -12px 50px rgba(0,10,14,.35)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="font-mono text-[11px] tracking-[.15em] text-[var(--mut)]">
                {sheet === 'rest' ? `RESTAURANGER · ${items.length}` : 'FILTER'}
              </span>
              <button
                onClick={onClose}
                className="rounded-lg border-0 bg-[var(--chip)] px-3 py-1.5 text-xs font-semibold text-[var(--ink2)] cursor-pointer"
              >
                Stäng
              </button>
            </div>

            <div className="luns-scroll overflow-y-auto px-3 pt-1 pb-6">
              {sheet === 'rest' ? (
                <div className="flex flex-col gap-0.5">
                  {items.map(item => (
                    <RailButton
                      key={item.name}
                      item={item}
                      onSelect={onSelectRestaurant}
                      size="touch"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4 px-2 pt-2">
                  {/* Ingen FILTER-etikett här — arkets rubrik säger redan det. */}
                  <Chips chips={typeChips} size="touch" />
                  <div className="flex flex-col gap-2">
                    <GroupLabel>SUGEN PÅ…</GroupLabel>
                    <Chips chips={cravingChips} size="touch" />
                  </div>
                  <div className="border-t border-[var(--line)] pt-4">{foodProfile}</div>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/statistik"
                      className="text-[11.5px] text-[var(--mut)] underline underline-offset-2"
                    >
                      Statistik
                    </Link>
                    <button
                      onClick={onOpenPrivacy}
                      className="border-0 bg-transparent p-0 text-[11.5px] text-[var(--mut)] underline underline-offset-2 cursor-pointer"
                    >
                      Integritetsinfo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
