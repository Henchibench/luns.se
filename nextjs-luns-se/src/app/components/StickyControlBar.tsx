'use client';

import React from 'react';
import { trackEvent } from '../utils/analytics';

interface StickyControlBarProps {
  controlStripRef: React.RefObject<HTMLDivElement | null>;
  isSticky: boolean;
  selectedDay: string;
  availableDays: string[];
  onDayChange: (day: string) => void;
  viewMode: 'sheets' | 'list';
  onViewModeChange: (mode: 'sheets' | 'list') => void;
  onFilterOpen: () => void;
  activeFilterCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showOnlyFavorites: boolean;
  onToggleShowOnlyFavorites: () => void;
}

export default function StickyControlBar({
  controlStripRef,
  isSticky,
  selectedDay,
  availableDays,
  onDayChange,
  viewMode,
  onViewModeChange,
  onFilterOpen,
  activeFilterCount,
  searchTerm,
  onSearchChange,
  showOnlyFavorites,
  onToggleShowOnlyFavorites,
}: StickyControlBarProps) {
  const handleViewModeChange = (mode: 'sheets' | 'list') => {
    onViewModeChange(mode);
    trackEvent('view-mode-switch', { mode });
  };

  const handleDayChange = (day: string) => {
    onDayChange(day);
    trackEvent('day-select', { day });
  };

  const handleFilterOpen = () => {
    onFilterOpen();
    trackEvent('filter-open');
  };

  const barContent = (
    <div className="max-w-[750px] mx-auto px-5 flex flex-wrap items-center gap-2 py-2">
        {/* Day Picker Pills */}
        {availableDays.map((day) => (
          <button
            key={day}
            onClick={() => handleDayChange(day)}
            className="px-3 py-1.5 text-sm font-medium whitespace-nowrap rounded-full transition-colors"
            style={{
              backgroundColor: selectedDay === day ? 'var(--accent)' : 'transparent',
              color: selectedDay === day ? 'white' : 'var(--text-muted)',
            }}
          >
            {day.slice(0, 3)}
          </button>
        ))}

        {/* View Toggle */}
        <div className="flex rounded-full border overflow-hidden text-xs" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => handleViewModeChange('sheets')}
            className="px-2.5 py-1.5 font-medium transition-colors"
            style={{
              backgroundColor: viewMode === 'sheets' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'sheets' ? 'white' : 'var(--text-muted)',
            }}
          >
            Kort
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className="px-2.5 py-1.5 font-medium transition-colors"
            style={{
              backgroundColor: viewMode === 'list' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
            }}
          >
            Lista
          </button>
        </div>

        {/* Filter Button */}
        <button
          onClick={handleFilterOpen}
          className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 border"
          style={{
            borderColor: activeFilterCount > 0 ? 'var(--accent)' : 'var(--border)',
            backgroundColor: activeFilterCount > 0 ? 'var(--accent)' : 'transparent',
            color: activeFilterCount > 0 ? 'white' : 'var(--text)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="bg-white/25 text-xs px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Show-only-favorites toggle */}
        <button
          onClick={onToggleShowOnlyFavorites}
          className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 border favorite-heart"
          style={{
            borderColor: showOnlyFavorites ? 'var(--accent)' : 'var(--border)',
            backgroundColor: showOnlyFavorites ? 'var(--accent)' : 'transparent',
            color: showOnlyFavorites ? 'white' : 'var(--text)',
          }}
          title={showOnlyFavorites ? 'Visa alla' : 'Visa endast favoriter'}
          aria-pressed={showOnlyFavorites}
        >
          {showOnlyFavorites ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          )}
          <span>Favoriter</span>
        </button>
        {/* Search Input */}
        <div className="flex-1 basis-40">
          <input
            type="text"
            placeholder="Sök rätter..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-1.5 border rounded-full text-sm transition-all focus:outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
        </div>
    </div>
  );

  return (
    <>
      {/* Static version in hero — invisible when sticky takes over (keeps layout space) */}
      <div ref={controlStripRef as React.Ref<HTMLDivElement>} className={isSticky ? 'invisible' : ''}>
        <div className="max-w-[750px] mx-auto">
          {barContent}
        </div>
      </div>

      {/* Sticky version — fixed at top when scrolled past */}
      {isSticky && (
        <div className="control-bar">
          {barContent}
        </div>
      )}
    </>
  );
}
