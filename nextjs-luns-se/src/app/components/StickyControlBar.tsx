'use client';

import React, { useEffect, useState, useRef } from 'react';

interface StickyControlBarProps {
  heroRef: React.RefObject<HTMLDivElement | null>;
  selectedDay: string;
  availableDays: string[];
  onDayChange: (day: string) => void;
  viewMode: 'sheets' | 'list';
  onViewModeChange: (mode: 'sheets' | 'list') => void;
  onFilterOpen: () => void;
  activeFilterCount: number;
}

export default function StickyControlBar({
  heroRef,
  selectedDay,
  availableDays,
  onDayChange,
  viewMode,
  onViewModeChange,
  onFilterOpen,
  activeFilterCount,
}: StickyControlBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Track view mode changes for analytics
  const handleViewModeChange = (mode: 'sheets' | 'list') => {
    onViewModeChange(mode);
    // Umami custom event
    if (typeof window !== 'undefined' && (window as any).umami) {
      (window as any).umami.track('view-mode-switch', { mode });
    }
  };

  // Show/hide based on hero visibility
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [heroRef]);

  if (!isVisible) return null;

  return (
    <div className="control-bar animate-control-bar-in">
      <div className="max-w-[750px] mx-auto px-5 h-full flex items-center justify-between">
        {/* Day Picker Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {availableDays.map((day) => (
            <button
              key={day}
              onClick={() => onDayChange(day)}
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

        {/* Right side: view toggle + filter */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-full border overflow-hidden text-xs" style={{ borderColor: 'var(--border)' }}>
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
            onClick={onFilterOpen}
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
        </div>
      </div>
    </div>
  );
}
