'use client';

import React, { useState } from 'react';
import { GroupLabel } from './Chips';
import { dishDisplayName, type FavoriteDish } from '../../hooks/useDishFavorites';
import type { FoodProfile as Profile } from '../../hooks/useFoodProfile';

/** Kategorierna man kan lyfta till toppen. Id:t matchas mot rättens kategori. */
export const BOOST_TYPES = [
  { id: 'Kött', label: '🥩 KÖTT' },
  { id: 'Fisk', label: '🐟 FISK' },
  { id: 'Vegetarisk', label: '🥗 VEG' },
  { id: 'Sallad', label: '🥬 SALLAD' },
  { id: 'Veckans', label: '⭐ VECKANS' },
  { id: 'Asiatisk', label: '🍜 ASIATISK' },
  { id: 'Indisk', label: '🍛 INDISK' },
  { id: 'Thai', label: '🌶️ THAI' },
  { id: 'Världen', label: '🌍 VÄRLDEN' },
];

interface Props {
  profile: Profile;
  onToggleBoostType: (id: string) => void;
  onAddHideKeyword: (keyword: string) => void;
  onRemoveHideKeyword: (keyword: string) => void;
  watchedDishes: FavoriteDish[];
  onRemoveWatched: (restaurant: string, signature: string) => void;
  size?: 'compact' | 'touch';
}

export default function FoodProfile({
  profile,
  onToggleBoostType,
  onAddHideKeyword,
  onRemoveHideKeyword,
  watchedDishes,
  onRemoveWatched,
  size = 'compact',
}: Props) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const cleaned = draft.trim();
    if (!cleaned) return;
    onAddHideKeyword(cleaned);
    setDraft('');
  };

  const chipSize =
    size === 'touch'
      ? 'rounded-[9px] px-3.5 py-[9px] text-[12.5px]'
      : 'rounded-md px-2.5 py-[5px] text-[11px]';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <GroupLabel>MIN MATPROFIL</GroupLabel>
        {/* Skillnaden mot chipsen ovanför är hela poängen: filtren gäller nu,
            matprofilen gäller nästa gång också. */}
        <span className="text-[10.5px] leading-[1.45] text-[var(--mut)]">
          Sparas till nästa besök.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10.5px] text-[var(--mut)]">Visa först</span>
        <div className={`flex flex-wrap ${size === 'touch' ? 'gap-[7px]' : 'gap-1.5'}`}>
          {BOOST_TYPES.map(type => {
            const active = profile.boostTypes.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => onToggleBoostType(type.id)}
                aria-pressed={active}
                className={`flex-none border font-semibold whitespace-nowrap cursor-pointer transition-colors ${chipSize}`}
                style={{
                  background: active ? 'var(--accBg)' : 'var(--chip)',
                  color: active ? 'var(--accStrong)' : 'var(--ink2)',
                  borderColor: active ? 'var(--accBg)' : 'var(--line)',
                }}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10.5px] text-[var(--mut)]">Dölj rätter som innehåller</span>
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="t.ex. fläsk"
            aria-label="Dölj rätter som innehåller"
            className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--chip)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--acc)]"
          />
          <button
            onClick={submit}
            className="flex-none rounded-md border border-[var(--line)] bg-[var(--chip)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink2)] cursor-pointer transition-colors hover:bg-[var(--hi)]"
          >
            Lägg till
          </button>
        </div>

        {profile.hideKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.hideKeywords.map(keyword => (
              <span
                key={keyword}
                className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--chip)] px-2.5 py-[5px] text-[11px] text-[var(--ink2)]"
              >
                {keyword}
                <button
                  onClick={() => onRemoveHideKeyword(keyword)}
                  aria-label={`Sluta dölja ${keyword}`}
                  className="border-0 bg-transparent p-0 font-bold leading-none text-[var(--mut)] cursor-pointer hover:text-[var(--acc)]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {watchedDishes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {/* Stjärnan i menyn tar bort en bevakning, men bara den dag rätten
              serveras. Utan listan går en bevakad rätt inte att ångra. */}
          <span className="text-[10.5px] text-[var(--mut)]">Bevakade rätter</span>
          <div className="flex flex-wrap gap-1.5">
            {watchedDishes.map(dish => (
              <span
                key={`${dish.restaurant}-${dish.signature}`}
                className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--chip)] px-2.5 py-[5px] text-[11px] text-[var(--ink2)]"
              >
                <span className="text-[var(--star)]">★</span>
                <span className="min-w-0 truncate">
                  {dishDisplayName(dish)}
                  <span className="text-[var(--mut)]"> · {dish.restaurant}</span>
                </span>
                <button
                  onClick={() => onRemoveWatched(dish.restaurant, dish.signature)}
                  aria-label={`Sluta bevaka ${dishDisplayName(dish)}`}
                  className="border-0 bg-transparent p-0 font-bold leading-none text-[var(--mut)] cursor-pointer hover:text-[var(--acc)]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
