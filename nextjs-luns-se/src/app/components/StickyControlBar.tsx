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
    <div className="max-w-[750px] mx-auto px-5 h-full flex items-center gap-3">
      {/* Day Picker Pills */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
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
      </div>

      {/* Search Input */}
      <div className="flex-1 min-w-0">
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

      {/* View Toggle */}
      <div className="flex rounded-full border overflow-hidden text-xs flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => handleViewModeChange('sheets')}
          className="px-2.5 py-1.5 font-medium transition-colors"
          style={{
            backgroundColor: viewMode === 'sheets' ? 'var(--text)' : 'transparent',
            color: viewMode === 'sheets' ? 'white' : 'var(--text-muted)',
          }}
        >
          Stack
        </button>
        <button
          onClick={() => handleViewModeChange('list')}
          className="px-2.5 py-1.5 font-medium transition-colors"
          style={{
            backgroundColor: viewMode === 'list' ? 'var(--text)' : 'transparent',
            color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
          }}
        >
          Lista
        </button>
      </div>

      {/* Filter Button */}
      <button
        onClick={handleFilterOpen}
        className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 border flex-shrink-0"
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
    </div>
  );

  return (
    <>
      {/* Static version in hero — invisible when sticky takes over (keeps layout space) */}
      <div ref={controlStripRef as React.Ref<HTMLDivElement>} className={isSticky ? 'invisible' : ''}>
        <div className="max-w-[750px] mx-auto" style={{ height: '56px' }}>
          {barContent}
        </div>
      </div>

      {/* Sticky version — fixed at top when scrolled past */}
      {isSticky && (
        <div className="control-bar animate-control-bar-in">
          {barContent}
        </div>
      )}
    </>
  );
}
