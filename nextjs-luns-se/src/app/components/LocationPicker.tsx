'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { LunsLocation } from '../hooks/useLocation';

interface LocationPickerProps {
  locations: LunsLocation[];
  selected: LunsLocation | null;
  onSelect: (id: string) => void;
}

/**
 * Dropdown variant — sits in the ActionBar next to Filter, styled to match
 * the view-mode dropdown beside it.
 */
export function LocationDropdown({ locations, selected, onSelect }: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // With a single location there is nothing to switch between — show it as a
  // plain label rather than a dropdown that opens onto one option.
  const isSwitchable = locations.length > 1;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => isSwitchable && setIsOpen(!isOpen)}
        disabled={!isSwitchable}
        title={isSwitchable ? 'Byt plats' : selected ? `Visar ${selected.label}` : undefined}
        className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-2 border border-gray-200 dark:border-gray-600 ${
          isSwitchable
            ? 'hover:shadow-md hover:bg-white dark:hover:bg-gray-800 active:scale-95 active:shadow-sm transform hover:-translate-y-0.5'
            : 'cursor-default opacity-90'
        }`}
      >
        <span>📍</span>
        <span>{selected ? selected.label : 'Välj plats'}</span>
        {isSwitchable && <span className="text-xs">▼</span>}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-12 left-0 z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 min-w-[200px]">
            {locations.map((location, index) => {
              const isSelected = selected?.id === location.id;
              return (
                <button
                  key={location.id}
                  onClick={() => {
                    onSelect(location.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-200'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${index === locations.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  <span>📍</span>
                  <span className="flex-1">
                    {location.label}
                    <span className="block text-xs opacity-70">{location.city}</span>
                  </span>
                  {isSelected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Welcome variant — a blocking overlay shown on the first visit, before any
 * menus are rendered, so the visitor picks where they eat before seeing a
 * city's worth of lunches that may not be theirs.
 */
export function LocationWelcome({ locations, onSelect }: Omit<LocationPickerProps, 'selected'>) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#002933]/95 dark:bg-[#00171d]/95 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl shadow-2xl border p-6 bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📍</div>
          <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100">Var äter du lunch?</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Välj din plats så visar vi menyerna där. Vi kommer ihåg valet till nästa gång.
          </p>
        </div>

        <div className="space-y-2">
          {locations.map(location => (
            <button
              key={location.id}
              onClick={() => onSelect(location.id)}
              className="w-full text-left px-4 py-3 rounded-lg border transition-all duration-150 flex items-center space-x-3 hover:shadow-md active:scale-95 transform hover:-translate-y-0.5 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <span className="text-2xl">📍</span>
              <span className="flex-1">
                <span className="block font-medium">{location.label}</span>
                <span className="block text-xs opacity-70">
                  {location.city} · {location.restaurantCount} restauranger
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-center mt-5 text-gray-500 dark:text-gray-400">
          Du kan byta plats när som helst uppe i kontrollraden.
        </p>
      </div>
    </div>
  );
}
