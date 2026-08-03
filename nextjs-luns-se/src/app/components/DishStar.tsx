'use client';

import React from 'react';

interface DishStarProps {
  isFavorite: boolean;
  onToggle: () => void;
}

/**
 * Star on an individual dish, so you get told when it comes back.
 *
 * Deliberately quieter than the restaurant heart: it only reaches full opacity
 * when starred or hovered, because there is one of these on every dish and a
 * row of solid icons would drown the menu itself.
 */
export default function DishStar({ isFavorite, onToggle }: DishStarProps) {
  const label = isFavorite ? 'Sluta bevaka rätten' : 'Bevaka rätten — få veta när den kommer tillbaka';

  return (
    <button
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={isFavorite}
      className={`favorite-heart flex-shrink-0 flex items-center transition-opacity ${
        isFavorite
          ? 'text-amber-500 opacity-100'
          : 'text-gray-400 dark:text-gray-500 opacity-40 hover:opacity-100 hover:text-amber-500'
      }`}
    >
      {isFavorite ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.958c.3.921-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.197-1.538-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69l1.285-3.958z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.5a.56.56 0 011.04 0l2.125 5.111a.56.56 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.56.56 0 00-.182.557l1.285 5.385c.115.483-.41.868-.833.61l-4.725-2.885a.56.56 0 00-.586 0L6.99 20.53c-.424.258-.949-.127-.834-.61l1.285-5.385a.56.56 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.56.56 0 00.475-.345L11.48 3.5z" />
        </svg>
      )}
    </button>
  );
}
