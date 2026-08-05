'use client';

import React from 'react';
import { GroupLabel } from './Chips';
import { dishDisplayName, type FavoriteDish } from '../../hooks/useDishFavorites';

/**
 * Listan över bevakade rätter, med en väg att ta bort dem.
 *
 * Stjärnan i menyn kan också sluta bevaka, men bara de dagar rätten faktiskt
 * serveras. Utan den här listan går en bevakning inte att ångra resten av
 * veckan, och det var själva skälet till att den byggdes.
 *
 * Bodde i matprofilen tills den togs bort. Innehållet är ett eget ansvar och
 * följde bara med på köpet, så det blev en egen komponent i stället för att
 * försvinna med sin gamla granne.
 */
export default function WatchedDishes({
  dishes,
  onRemove,
}: {
  dishes: FavoriteDish[];
  onRemove: (restaurant: string, signature: string) => void;
}) {
  if (dishes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <GroupLabel>BEVAKADE RÄTTER</GroupLabel>
      <div className="flex flex-wrap gap-1.5">
        {dishes.map(dish => (
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
              onClick={() => onRemove(dish.restaurant, dish.signature)}
              aria-label={`Sluta bevaka ${dishDisplayName(dish)}`}
              className="border-0 bg-transparent p-0 font-bold leading-none text-[var(--mut)] cursor-pointer hover:text-[var(--acc)]"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
