# Luns.se UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign luns.se from card-based layout to full-bleed paper-stack design with parallax stacking, slide-in filter drawer, global day picker, and darkened color palette.

**Architecture:** The page is a single Next.js client component (`page.tsx`) with two child components (`ActionBar.tsx`, `InfoBanner.tsx`). We'll extract the current monolithic `page.tsx` into focused components: `StickyControlBar`, `FilterDrawer`, `RestaurantSheet`, `CompactListView`, and a `useStackingScroll` hook. The existing `ActionBar` is replaced entirely. `InfoBanner` is restyled in place.

**Tech Stack:** Next.js 15, React 18, Tailwind CSS 3, TypeScript. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-10-ui-redesign-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/globals.css` | Modify | Updated CSS variables, new animations, sheet/drawer styles |
| `src/app/page.tsx` | Rewrite | Slim orchestrator: hero, sticky bar, sheets/list, footer. Data fetching + filter logic stays here. |
| `src/app/components/StickyControlBar.tsx` | Create | Global day picker, view toggle, filter button. Sticky behavior via IntersectionObserver. |
| `src/app/components/FilterDrawer.tsx` | Create | Slide-in drawer with all filter controls. Replaces ActionBar's expandable panel. |
| `src/app/components/RestaurantSheet.tsx` | Create | Single restaurant full-bleed sheet with menu content, action icons, map embed. |
| `src/app/components/CompactListView.tsx` | Create | Extracted from page.tsx, restyled for new palette. |
| `src/app/components/InfoBanner.tsx` | Modify | Restyle for darkened palette, no structural changes. |
| `src/app/hooks/useStackingScroll.ts` | Create | IntersectionObserver hook managing which 3 sheets are sticky. |
| `src/app/components/ActionBar.tsx` | Delete | Replaced by StickyControlBar + FilterDrawer. |

---

### Task 1: Update Color Palette & CSS Foundations

**Files:**
- Modify: `nextjs-luns-se/src/app/globals.css`

- [ ] **Step 1: Update CSS custom properties**

Replace the `:root` block in `globals.css`:

```css
:root {
  --bg: #EBE5DE;
  --surface: #F5F0EB;
  --surface-alt: #F8F4EF;
  --accent: #B5532E;
  --accent-hover: #984526;
  --secondary: #6B8060;
  --text: #241E1A;
  --text-muted: #5E524A;
  --border: #D4CBC1;
  --footer-bg: #1E1915;
}
```

- [ ] **Step 2: Add new animation keyframes and utility classes**

Replace the existing animation keyframes section (everything from `@keyframes slideInUp` through `.animate-fade-out-scale`) with:

```css
/* Sheet entrance animation */
@keyframes sheetReveal {
  0% {
    opacity: 0;
    transform: translateY(15px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Control bar slide-down */
@keyframes controlBarIn {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Menu content crossfade */
@keyframes contentFade {
  0% { opacity: 0.4; }
  100% { opacity: 1; }
}

/* Filter overlay fade */
@keyframes overlayFadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* Filter drawer slide */
@keyframes drawerSlideIn {
  0% { transform: translateX(100%); }
  100% { transform: translateX(0); }
}

@keyframes drawerSlideOut {
  0% { transform: translateX(0); }
  100% { transform: translateX(100%); }
}

.animate-sheet-reveal {
  animation: sheetReveal 0.4s ease-out forwards;
}

.animate-control-bar-in {
  animation: controlBarIn 0.3s ease-out forwards;
}

.animate-content-fade {
  animation: contentFade 0.2s ease-out forwards;
}
```

- [ ] **Step 3: Add sheet and drawer base styles**

Append to `globals.css`:

```css
/* Restaurant sheet base */
.restaurant-sheet {
  width: 100%;
  margin: 0 auto;
  padding: 0 20px;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.restaurant-sheet.is-sticky {
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
}

.restaurant-sheet.is-behind {
  transform: scale(0.995);
}

.restaurant-sheet-inner {
  max-width: 750px;
  margin: 0 auto;
}

/* Sticky control bar */
.control-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  height: 56px;
  background-color: rgba(235, 229, 222, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

/* Filter drawer */
.filter-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.3);
  animation: overlayFadeIn 0.2s ease-out forwards;
}

.filter-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 51;
  width: 360px;
  max-width: 100vw;
  background-color: var(--surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: drawerSlideIn 0.3s ease-out forwards;
  overflow-y: auto;
}

.filter-drawer.closing {
  animation: drawerSlideOut 0.3s ease-in forwards;
}

@media (max-width: 640px) {
  .filter-drawer {
    width: 100vw;
  }

  .restaurant-sheet {
    padding: 0 12px;
  }
}
```

- [ ] **Step 4: Update the body::after radial gradient to use new accent**

Replace the `body::after` gradient opacity value from `rgba(196, 97, 58, 0.06)` to `rgba(181, 83, 46, 0.06)` to match new `--accent`.

- [ ] **Step 5: Verify the app still builds**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds. The app will look slightly different (new colors) but should be functional with existing components.

- [ ] **Step 6: Commit**

```bash
git add nextjs-luns-se/src/app/globals.css
git commit -m "style: update color palette and add sheet/drawer CSS foundations"
```

---

### Task 2: Create useStackingScroll Hook

**Files:**
- Create: `nextjs-luns-se/src/app/hooks/useStackingScroll.ts`

- [ ] **Step 1: Create the hooks directory**

```bash
mkdir -p nextjs-luns-se/src/app/hooks
```

- [ ] **Step 2: Write the stacking scroll hook**

Create `nextjs-luns-se/src/app/hooks/useStackingScroll.ts`:

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const STICKY_OFFSET_BASE = 56; // height of control bar
const STICKY_INCREMENT = 8;    // offset between stacked sheets
const MAX_STICKY = 3;          // max sheets sticky at once

interface StackingState {
  stickyIndices: Set<number>;
  offsets: Map<number, number>;
}

export function useStackingScroll(sheetCount: number) {
  const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [stackingState, setStackingState] = useState<StackingState>({
    stickyIndices: new Set(),
    offsets: new Map(),
  });
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const setSheetRef = useCallback((index: number, el: HTMLDivElement | null) => {
    sheetRefs.current[index] = el;
  }, []);

  // Entrance reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-sheet-index'));
            if (!isNaN(index)) {
              setRevealedIndices((prev) => {
                if (prev.has(index)) return prev;
                const next = new Set(prev);
                next.add(index);
                return next;
              });
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    sheetRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sheetCount]);

  // Stacking scroll observer
  useEffect(() => {
    const handleScroll = () => {
      const controlBarBottom = STICKY_OFFSET_BASE;
      const visibleSheets: number[] = [];

      sheetRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Sheet is considered "at the sticky zone" when its top is near or above the control bar
        if (rect.top <= controlBarBottom + STICKY_INCREMENT * MAX_STICKY && rect.bottom > controlBarBottom) {
          visibleSheets.push(index);
        }
      });

      // Take the first MAX_STICKY sheets that are in the sticky zone
      const stickySet = new Set(visibleSheets.slice(0, MAX_STICKY));
      const offsetMap = new Map<number, number>();

      let offsetIndex = 0;
      stickySet.forEach((sheetIndex) => {
        offsetMap.set(sheetIndex, STICKY_OFFSET_BASE + offsetIndex * STICKY_INCREMENT);
        offsetIndex++;
      });

      setStackingState({ stickyIndices: stickySet, offsets: offsetMap });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sheetCount]);

  const getSheetStyle = (index: number): React.CSSProperties => {
    const isSticky = stackingState.stickyIndices.has(index);
    const offset = stackingState.offsets.get(index);
    const stickyArray = Array.from(stackingState.stickyIndices);
    const positionInStack = stickyArray.indexOf(index);
    const isBehind = isSticky && positionInStack < stickyArray.length - 1;

    return {
      position: isSticky ? 'sticky' : 'relative',
      top: isSticky && offset !== undefined ? `${offset}px` : undefined,
      zIndex: isSticky ? 20 + positionInStack : 10,
      transform: isBehind ? 'scale(0.995)' : undefined,
    };
  };

  const getSheetClassName = (index: number): string => {
    const isSticky = stackingState.stickyIndices.has(index);
    const stickyArray = Array.from(stackingState.stickyIndices);
    const positionInStack = stickyArray.indexOf(index);
    const isBehind = isSticky && positionInStack < stickyArray.length - 1;
    const isRevealed = revealedIndices.has(index);

    const classes = ['restaurant-sheet'];
    if (isSticky) classes.push('is-sticky');
    if (isBehind) classes.push('is-behind');
    if (isRevealed) classes.push('animate-sheet-reveal');

    return classes.join(' ');
  };

  return { setSheetRef, getSheetStyle, getSheetClassName, revealedIndices };
}
```

- [ ] **Step 3: Verify build**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds (hook is not imported yet, but should have no syntax errors).

- [ ] **Step 4: Commit**

```bash
git add nextjs-luns-se/src/app/hooks/useStackingScroll.ts
git commit -m "feat: add useStackingScroll hook for paper-stack parallax"
```

---

### Task 3: Create FilterDrawer Component

**Files:**
- Create: `nextjs-luns-se/src/app/components/FilterDrawer.tsx`

- [ ] **Step 1: Create FilterDrawer component**

Create `nextjs-luns-se/src/app/components/FilterDrawer.tsx`:

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface FilterState {
  selectedFoodTypes: string[];
  selectedRestaurants: string[];
  searchTerm: string;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: string[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const FOOD_TYPES = [
  { id: 'Kött', label: 'Kött' },
  { id: 'Fisk', label: 'Fisk' },
  { id: 'Vegetarisk', label: 'Vegetarisk' },
  { id: 'Sallad', label: 'Sallad' },
  { id: 'Veckans', label: 'Veckans' },
  { id: 'Asiatisk', label: 'Asiatisk' },
  { id: 'Indisk', label: 'Indisk' },
  { id: 'Thai', label: 'Thai' },
  { id: 'Världen', label: 'Världens Kök' },
];

const CRAVINGS = [
  { id: 'hamburgare', label: 'Hamburgare' },
  { id: 'pasta', label: 'Pasta' },
  { id: 'pommes', label: 'Pommes' },
  { id: 'mos', label: 'Mos' },
];

export default function FilterDrawer({ isOpen, onClose, restaurants, filters, onFiltersChange }: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [isClosing, setIsClosing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Sync local state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
      setIsClosing(false);
    }
  }, [isOpen, filters]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    handleClose();
  };

  const handleCravingSearch = (label: string) => {
    setLocalFilters(prev => ({ ...prev, searchTerm: label.toLowerCase() }));
  };

  const toggleFoodType = (foodType: string) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedFoodTypes: prev.selectedFoodTypes.includes(foodType)
        ? prev.selectedFoodTypes.filter(t => t !== foodType)
        : [...prev.selectedFoodTypes, foodType],
    }));
  };

  const toggleRestaurant = (restaurant: string) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedRestaurants: prev.selectedRestaurants.includes(restaurant)
        ? prev.selectedRestaurants.filter(r => r !== restaurant)
        : [...prev.selectedRestaurants, restaurant],
    }));
  };

  const clearAll = () => {
    setLocalFilters({
      selectedFoodTypes: [],
      selectedRestaurants: restaurants,
      searchTerm: '',
    });
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="filter-drawer-overlay"
        onClick={handleClose}
        style={isClosing ? { opacity: 0, transition: 'opacity 0.28s ease-in' } : undefined}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`filter-drawer ${isClosing ? 'closing' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>Filter</h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 pb-28">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Sök rätter
            </label>
            <input
              type="text"
              placeholder="t.ex. kyckling, pasta..."
              value={localFilters.searchTerm}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full px-4 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Cravings */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Cravings
            </label>
            <div className="flex flex-wrap gap-2">
              {CRAVINGS.map((craving) => (
                <button
                  key={craving.id}
                  onClick={() => handleCravingSearch(craving.label)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                  style={{
                    borderColor: localFilters.searchTerm === craving.label.toLowerCase() ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: localFilters.searchTerm === craving.label.toLowerCase() ? 'var(--accent)' : 'var(--bg)',
                    color: localFilters.searchTerm === craving.label.toLowerCase() ? 'white' : 'var(--text)',
                  }}
                >
                  {craving.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food Types */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Matyp
            </label>
            <div className="flex flex-wrap gap-2">
              {FOOD_TYPES.map((foodType) => {
                const isActive = localFilters.selectedFoodTypes.includes(foodType.id);
                return (
                  <button
                    key={foodType.id}
                    onClick={() => toggleFoodType(foodType.id)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={{
                      borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: isActive ? 'var(--accent)' : 'var(--bg)',
                      color: isActive ? 'white' : 'var(--text)',
                    }}
                  >
                    {foodType.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Restaurants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                Restauranger ({localFilters.selectedRestaurants.length} av {restaurants.length})
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setLocalFilters(prev => ({ ...prev, selectedRestaurants: [] }))}
                  className="text-xs font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  Välj inga
                </button>
                <button
                  onClick={() => setLocalFilters(prev => ({ ...prev, selectedRestaurants: restaurants }))}
                  className="text-xs font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  Välj alla
                </button>
              </div>
            </div>
            <div className="space-y-1 rounded-lg p-3" style={{ backgroundColor: 'var(--bg)' }}>
              {restaurants.map((restaurant) => {
                const isSelected = localFilters.selectedRestaurants.includes(restaurant);
                return (
                  <div
                    key={restaurant}
                    className="flex items-center gap-2 cursor-pointer rounded p-2 transition-colors"
                    onClick={() => toggleRestaurant(restaurant)}
                    style={{ color: 'var(--text)' }}
                  >
                    <div
                      className="w-4 h-4 border-2 rounded flex items-center justify-center transition-all flex-shrink-0"
                      style={{
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                        backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{restaurant}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 p-6 border-t flex gap-3"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <button
            onClick={clearAll}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            Rensa alla
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Tillämpa
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds. Component is not imported yet.

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/components/FilterDrawer.tsx
git commit -m "feat: add FilterDrawer slide-in component"
```

---

### Task 4: Create StickyControlBar Component

**Files:**
- Create: `nextjs-luns-se/src/app/components/StickyControlBar.tsx`

- [ ] **Step 1: Create the StickyControlBar component**

Create `nextjs-luns-se/src/app/components/StickyControlBar.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify build**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/components/StickyControlBar.tsx
git commit -m "feat: add StickyControlBar with global day picker and filter button"
```

---

### Task 5: Create RestaurantSheet Component

**Files:**
- Create: `nextjs-luns-se/src/app/components/RestaurantSheet.tsx`

- [ ] **Step 1: Create RestaurantSheet component**

Create `nextjs-luns-se/src/app/components/RestaurantSheet.tsx`:

```tsx
'use client';

import React, { useState } from 'react';

interface MenuItem {
  day: string;
  category: string;
  description: string;
  original: string;
}

interface RestaurantLocation {
  name: string;
  area: string;
  website?: string;
  maps?: string;
  instagram?: string;
  has_menu: boolean;
}

interface Restaurant {
  name: string;
  items: MenuItem[];
  info: string[];
  location?: RestaurantLocation;
}

interface RestaurantSheetProps {
  restaurant: Restaurant;
  allItems: string[];
  selectedDay: string;
  isEven: boolean;
  hasActiveSearch: boolean;
  availableDays: string[];
}

function parseRestaurantInfo(items: string[], day: string): string[] {
  return items
    .filter(item => item.startsWith(`INFO:${day}`))
    .map(item => item.replace(/^INFO:[^-]*-\s*Restaurant Info:\s*/, ''))
    .map(item => item.trim());
}

export default function RestaurantSheet({
  restaurant,
  allItems,
  selectedDay,
  isEven,
  hasActiveSearch,
  availableDays,
}: RestaurantSheetProps) {
  const [showMap, setShowMap] = useState(false);

  const displayedItems = hasActiveSearch
    ? restaurant.items
    : restaurant.items.filter(item => item.day === selectedDay);

  const todaysInfo = parseRestaurantInfo(allItems, selectedDay);

  const groupedItems = hasActiveSearch
    ? displayedItems.reduce((acc, item) => {
        if (!acc[item.day]) acc[item.day] = {};
        if (!acc[item.day][item.category]) acc[item.day][item.category] = [];
        acc[item.day][item.category].push(item);
        return acc;
      }, {} as Record<string, Record<string, MenuItem[]>>)
    : displayedItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, MenuItem[]>);

  const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

  return (
    <div
      className="py-8 border-b"
      style={{
        backgroundColor: isEven ? 'var(--surface-alt)' : 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="restaurant-sheet-inner">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>
              {restaurant.name}
            </h2>
            <div className="w-8 h-0.5 mt-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
          </div>

          {/* Action Icons */}
          <div className="flex gap-1.5 ml-4">
            {restaurant.location?.maps && (
              <button
                onClick={() => setShowMap(!showMap)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                title="Visa karta"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {restaurant.location?.website && (
              <a
                href={restaurant.location.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                title="Hemsida"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {restaurant.location?.instagram && (
              <a
                href={restaurant.location.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                title="Instagram"
              >
                <img src="/instagram.svg" alt="Instagram" className="w-4 h-4 opacity-60" />
              </a>
            )}
          </div>
        </div>

        {/* Info */}
        {todaysInfo.length > 0 && (
          <div className="mb-4 space-y-1">
            {todaysInfo.map((info, index) => (
              <div key={index} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {info}
              </div>
            ))}
          </div>
        )}

        {hasActiveSearch && (
          <div className="mb-4 px-3 py-1.5 rounded-full text-xs font-medium inline-block" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
            Sökresultat &mdash; visar alla dagar
          </div>
        )}

        {/* Map */}
        {restaurant.location?.maps && (
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showMap ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
              <iframe
                src={`https://maps.google.com/maps?q=lindholmen+${encodeURIComponent(restaurant.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-72 border-none"
                allowFullScreen
              />
              <div className="p-3">
                <a
                  href={restaurant.location.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Öppna i Google Maps
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Menu Content */}
        <div className="animate-content-fade">
          {Object.entries(groupedItems).length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Ingen meny för {selectedDay.toLowerCase()}
              </p>
            </div>
          ) : hasActiveSearch ? (
            <div className="space-y-4">
              {Object.entries(groupedItems as Record<string, Record<string, MenuItem[]>>)
                .filter(([day]) => availableDays.includes(day))
                .sort(([dayA], [dayB]) => DAYS.indexOf(dayA) - DAYS.indexOf(dayB))
                .map(([day, categories]) => (
                  <div key={day} className="space-y-2">
                    <h3 className="font-display text-base pb-1 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                      {day}
                    </h3>
                    {Object.entries(categories).map(([category, items]) => (
                      <div key={category} className="ml-2 space-y-0.5">
                        <h4 className="text-sm font-medium" style={{ color: 'var(--text)' }}>{category}</h4>
                        {items.map((item, idx) => (
                          <p key={idx} className="text-sm leading-relaxed ml-2" style={{ color: 'var(--text-muted)' }}>
                            {item.description}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedItems as Record<string, MenuItem[]>).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium pb-1 mb-1 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                    {category}
                  </h3>
                  {items.map((item, idx) => (
                    <p key={idx} className="text-sm leading-relaxed py-0.5" style={{ color: 'var(--text-muted)' }}>
                      {item.description}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/components/RestaurantSheet.tsx
git commit -m "feat: add RestaurantSheet full-bleed component"
```

---

### Task 6: Extract CompactListView Component

**Files:**
- Create: `nextjs-luns-se/src/app/components/CompactListView.tsx`

- [ ] **Step 1: Create CompactListView as a standalone component**

Create `nextjs-luns-se/src/app/components/CompactListView.tsx`. This extracts the existing `CompactListView` from `page.tsx`, but takes `selectedDay` as a prop (global day picker) instead of having its own local day state:

```tsx
'use client';

import React from 'react';

interface MenuItem {
  day: string;
  category: string;
  description: string;
  original: string;
}

interface Restaurant {
  name: string;
  items: MenuItem[];
  info: string[];
  location?: {
    name: string;
    area: string;
    website?: string;
    maps?: string;
    instagram?: string;
    has_menu: boolean;
  };
}

interface CompactListViewProps {
  restaurants: Restaurant[];
  selectedDay: string;
  availableDays: string[];
  hasActiveSearch: boolean;
}

const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

function groupMenuItemsByCategory(restaurants: Restaurant[], selectedDay: string): Record<string, Array<MenuItem & { restaurantName: string }>> {
  const groupedItems: Record<string, Array<MenuItem & { restaurantName: string }>> = {};

  restaurants.forEach(restaurant => {
    const dayItems = restaurant.items.filter(item => item.day === selectedDay);
    dayItems.forEach(item => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push({ ...item, restaurantName: restaurant.name });
    });
  });

  return groupedItems;
}

export default function CompactListView({ restaurants, selectedDay, availableDays, hasActiveSearch }: CompactListViewProps) {
  const groupedItems = hasActiveSearch
    ? restaurants.reduce((acc, restaurant) => {
        restaurant.items.forEach(item => {
          if (!acc[item.day]) acc[item.day] = {};
          if (!acc[item.day][item.category]) acc[item.day][item.category] = [];
          acc[item.day][item.category].push({ ...item, restaurantName: restaurant.name });
        });
        return acc;
      }, {} as Record<string, Record<string, Array<MenuItem & { restaurantName: string }>>>)
    : groupMenuItemsByCategory(restaurants, selectedDay);

  const isEmpty = hasActiveSearch
    ? Object.keys(groupedItems).length === 0
    : Object.keys(groupedItems as Record<string, Array<MenuItem & { restaurantName: string }>>).length === 0;

  return (
    <div className="mx-5 md:mx-auto max-w-[750px]">
      <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>
            Kompakt lista &mdash; {hasActiveSearch ? 'Sökresultat' : selectedDay}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {hasActiveSearch
              ? 'Alla rätter grupperade efter dag och typ'
              : 'Alla rätter grupperade efter typ'}
          </p>
          {hasActiveSearch && (
            <div className="mt-3 px-3 py-1.5 rounded-full text-xs font-medium inline-block" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
              Sökresultat &mdash; visar alla dagar
            </div>
          )}
        </div>

        {isEmpty ? (
          <div className="p-8 text-center">
            <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
              {hasActiveSearch ? 'Inga sökresultat' : `Inga rätter för ${selectedDay.toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {hasActiveSearch ? (
              Object.entries(groupedItems as Record<string, Record<string, Array<MenuItem & { restaurantName: string }>>>)
                .filter(([day]) => availableDays.includes(day))
                .sort(([dayA], [dayB]) => DAYS.indexOf(dayA) - DAYS.indexOf(dayB))
                .map(([day, categories]) => (
                  <div key={day} className="space-y-3">
                    <h2 className="font-display text-lg pb-2 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                      {day}
                    </h2>
                    <div className="space-y-3 ml-2">
                      {Object.entries(categories).map(([category, items]) => (
                        <div key={category} className="space-y-1">
                          <h3 className="font-display text-base" style={{ color: 'var(--text)' }}>{category}</h3>
                          <div className="space-y-1 ml-2">
                            {items.map((item, idx) => (
                              <div key={`${item.restaurantName}-${idx}`} className="flex justify-between items-start py-2 px-3 rounded-lg">
                                <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                                <span className="ml-4 flex-shrink-0 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                                  {item.restaurantName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              Object.entries(groupedItems as Record<string, Array<MenuItem & { restaurantName: string }>>).map(([category, items]) => (
                <div key={category}>
                  <h3 className="font-display text-base mb-2 pb-1 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {items.map((item, idx) => (
                      <div key={`${item.restaurantName}-${idx}`} className="flex justify-between items-start py-2 px-3 rounded-lg">
                        <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                        <span className="ml-4 flex-shrink-0 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                          {item.restaurantName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/components/CompactListView.tsx
git commit -m "feat: extract CompactListView as standalone component with global day picker"
```

---

### Task 7: Restyle InfoBanner

**Files:**
- Modify: `nextjs-luns-se/src/app/components/InfoBanner.tsx`

- [ ] **Step 1: Update InfoBanner styles**

The InfoBanner content and logic stays the same. The only change is ensuring it renders well in the new hero section context. Update the outer wrapper div from:

```tsx
<div className="space-y-3 mb-2">
```

to:

```tsx
<div className="space-y-3">
```

This removes the bottom margin since the hero section will handle spacing. No other changes needed — the component already uses CSS variables which will pick up the new palette automatically.

- [ ] **Step 2: Verify build**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/components/InfoBanner.tsx
git commit -m "style: adjust InfoBanner spacing for hero section"
```

---

### Task 8: Rewrite page.tsx — Wire Everything Together

This is the largest task. It replaces the current `page.tsx` with the new orchestrator that uses all the new components.

**Files:**
- Rewrite: `nextjs-luns-se/src/app/page.tsx`
- Delete: `nextjs-luns-se/src/app/components/ActionBar.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire contents of `nextjs-luns-se/src/app/page.tsx` with:

```tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import InfoBanner from './components/InfoBanner';
import StickyControlBar from './components/StickyControlBar';
import FilterDrawer, { FilterState } from './components/FilterDrawer';
import RestaurantSheet from './components/RestaurantSheet';
import CompactListView from './components/CompactListView';
import { useStackingScroll } from './hooks/useStackingScroll';

interface MenuItem {
  day: string;
  category: string;
  description: string;
  original: string;
}

interface RestaurantLocation {
  name: string;
  area: string;
  website?: string;
  maps?: string;
  instagram?: string;
  has_menu: boolean;
}

interface Restaurant {
  name: string;
  items: MenuItem[];
  info: string[];
  location?: RestaurantLocation;
}

interface ApiResponse {
  menus: Record<string, string[]>;
  metadata: {
    total_restaurants: number;
    current_day_index: number;
    is_weekend: boolean;
    filters_applied: any;
  };
}

const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

function getCurrentDayIndex(): number {
  const today = new Date().getDay();
  const mondayBasedDay = today === 0 ? 6 : today - 1;
  if (mondayBasedDay > 4) return 0;
  return mondayBasedDay;
}

const CURRENT_DAY = DAYS[getCurrentDayIndex()];

function getAvailableDays(): string[] {
  return DAYS.slice(getCurrentDayIndex());
}

const CRAVING_VARIATIONS: Record<string, string[]> = {
  'hamburgare': ['burger', 'hamburgare', 'högrevsburgare', 'cheeseburger', 'veggieburger', 'veganburger', 'halloumiburger', 'kycklingburgare', 'smashed burger'],
  'pasta': ['pasta', 'spaghetti', 'penne', 'carbonara', 'bolognese', 'marinara', 'nudlar'],
  'pommes': ['pommes', 'fries', 'wedges', 'pommes frites', 'pommes frite'],
  'mos': ['mos', 'potatismos', 'potatispure', 'potatispuré', 'smashed potatoes', 'krossad potatis'],
};

function parseMenuItem(item: string): MenuItem | null {
  if (item.startsWith('INFO:')) return null;
  const parts = item.split('|');
  if (parts.length < 2) return null;
  const day = parts[0];
  const content = parts[1];
  const strongMatch = content.match(/<strong>(.*?)<\/strong>/);
  const category = strongMatch ? strongMatch[1] : 'Okänd';
  const description = content.replace(/<strong>.*?<\/strong>\s*-?\s*/, '').trim();
  return { day, category, description, original: item };
}

function recategorizePier11Items(restaurants: Restaurant[]): Restaurant[] {
  return restaurants.map(restaurant => {
    if (!restaurant.name.includes('Pier 11')) return restaurant;

    const itemsByDay: Record<string, MenuItem[]> = {};
    restaurant.items.forEach(item => {
      if (!itemsByDay[item.day]) itemsByDay[item.day] = [];
      itemsByDay[item.day].push(item);
    });

    const recategorizedItems: MenuItem[] = [];

    Object.entries(itemsByDay).forEach(([day, dayItems]) => {
      const dagensItems = dayItems.filter(item => item.category === 'Dagens');
      const otherItems = dayItems.filter(item => item.category !== 'Dagens');

      if (dagensItems.length > 0) {
        const itemsPerCategory = Math.ceil(dagensItems.length / 3);
        dagensItems.forEach((item, index) => {
          let newCategory = 'Dagens';
          if (index < itemsPerCategory) newCategory = 'Vegetarisk';
          else if (index < itemsPerCategory * 2) newCategory = 'Fisk';
          else newCategory = 'Kött';
          recategorizedItems.push({ ...item, category: newCategory });
        });
      }

      recategorizedItems.push(...otherItems);
    });

    return { ...restaurant, items: recategorizedItems };
  });
}

export default function MenuPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [rawMenus, setRawMenus] = useState<Record<string, string[]>>({});
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState(CURRENT_DAY);
  const availableDays = getAvailableDays();

  const [filters, setFilters] = useState<FilterState>({
    selectedFoodTypes: [],
    selectedRestaurants: [],
    searchTerm: '',
  });
  const [viewMode, setViewMode] = useState<'sheets' | 'list'>('sheets');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isNearFooter, setIsNearFooter] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { setSheetRef, getSheetStyle, getSheetClassName } = useStackingScroll(filteredRestaurants.length);

  // Apply filters
  useEffect(() => {
    if (restaurants.length === 0) {
      setFilteredRestaurants([]);
      return;
    }

    let result = restaurants.filter(r => filters.selectedRestaurants.includes(r.name));

    result = result.map(restaurant => {
      let filteredItems = restaurant.items;

      if (filters.searchTerm.trim()) {
        const searchLower = filters.searchTerm.toLowerCase();
        const searchTerms = CRAVING_VARIATIONS[searchLower] || [searchLower];
        filteredItems = filteredItems.filter(item =>
          searchTerms.some(term =>
            item.description.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term)
          )
        );
      }

      if (filters.selectedFoodTypes.length > 0) {
        filteredItems = filteredItems.filter(item =>
          item.day === CURRENT_DAY &&
          filters.selectedFoodTypes.some(foodType =>
            item.category.includes(foodType) || item.description.includes(foodType)
          )
        );
      }

      return { ...restaurant, items: filteredItems };
    }).filter(restaurant => restaurant.items.length > 0);

    setFilteredRestaurants(result);
  }, [restaurants, filters]);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setShowBackToTop(scrollTop > 400);
      setIsNearFooter(docHeight - scrollTop < 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/data/menus.json').then(r => r.json()),
      fetch('/data/restaurants.json').then(r => r.json()),
    ])
      .then(([menusData, restaurantsData]: [ApiResponse, any]) => {
        const parsed: Restaurant[] = Object.entries(menusData.menus).map(([name, items]) => ({
          name,
          items: items.map(parseMenuItem).filter((item): item is MenuItem => item !== null),
          info: [],
          location: restaurantsData.restaurants[name],
        }));

        const recategorized = recategorizePier11Items(parsed);
        setRawMenus(menusData.menus);
        setRestaurants(recategorized);
        setFilters(prev => ({ ...prev, selectedRestaurants: parsed.map(r => r.name) }));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const activeFilterCount =
    filters.selectedFoodTypes.length +
    (filters.searchTerm ? 1 : 0) +
    (filters.selectedRestaurants.length < restaurants.length ? 1 : 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
          </div>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Laddar menyer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8 rounded-xl shadow-sm border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="font-display text-xl mb-2" style={{ color: 'var(--text)' }}>Något gick fel</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Hero Section */}
      <div ref={heroRef} className="relative z-10">
        <div className="max-w-[750px] mx-auto px-5 pt-12 pb-8">
          <div className="text-center mb-6">
            <img
              src="/luns-logo-transparent.png"
              alt="Luns.se"
              className="w-full max-w-sm md:max-w-xl mx-auto"
            />
          </div>
          <InfoBanner />

          {/* Inline day picker for hero (visible before sticky bar takes over) */}
          <div className="flex items-center gap-2 mt-6 justify-center">
            {availableDays.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className="px-4 py-2 text-sm font-medium rounded-full transition-colors"
                style={{
                  backgroundColor: selectedDay === day ? 'var(--accent)' : 'var(--surface)',
                  color: selectedDay === day ? 'white' : 'var(--text-muted)',
                }}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Control Bar */}
      <StickyControlBar
        heroRef={heroRef}
        selectedDay={selectedDay}
        availableDays={availableDays}
        onDayChange={setSelectedDay}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFilterOpen={() => setIsFilterOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        restaurants={restaurants.map(r => r.name)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Content */}
      <div className="relative z-10">
        {filteredRestaurants.length === 0 ? (
          <div className="max-w-[750px] mx-auto px-5 py-16">
            <div className="text-center py-16 rounded-xl shadow-sm border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="font-display text-xl mb-2" style={{ color: 'var(--text)' }}>Inga resultat</h3>
              <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Prova att justera dina filter för att se fler alternativ.</p>
              <button
                onClick={() => setFilters({
                  selectedFoodTypes: [],
                  selectedRestaurants: restaurants.map(r => r.name),
                  searchTerm: '',
                })}
                className="px-4 py-2 rounded-full text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Rensa alla filter
              </button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="py-4">
            <CompactListView
              restaurants={filteredRestaurants}
              selectedDay={selectedDay}
              availableDays={availableDays}
              hasActiveSearch={!!filters.searchTerm.trim()}
            />
          </div>
        ) : (
          <div>
            {filteredRestaurants.map((restaurant, index) => (
              <div
                key={restaurant.name}
                ref={(el) => setSheetRef(index, el)}
                data-sheet-index={index}
                className={getSheetClassName(index)}
                style={getSheetStyle(index)}
              >
                <RestaurantSheet
                  restaurant={restaurant}
                  allItems={rawMenus[restaurant.name] || []}
                  selectedDay={selectedDay}
                  isEven={index % 2 === 0}
                  hasActiveSearch={!!filters.searchTerm.trim()}
                  availableDays={availableDays}
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="relative z-50 mt-16 py-12" style={{ backgroundColor: 'var(--footer-bg)' }}>
          <div className="max-w-[750px] mx-auto px-5 text-center">
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Vibe kodad av Henkebus
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Frågor eller förbättringsförslag?{' '}
              <a
                href="mailto:luns.se@outlook.com"
                className="underline transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                luns.se@outlook.com
              </a>
            </p>
          </div>
        </footer>
      </div>

      {/* Back to Top */}
      {showBackToTop && (
        <div className={`fixed ${isNearFooter ? 'bottom-32' : 'bottom-6'} right-6 z-50 transition-all duration-500 transform ${
          showBackToTop ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <button
            onClick={scrollToTop}
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Delete old ActionBar**

```bash
rm nextjs-luns-se/src/app/components/ActionBar.tsx
```

- [ ] **Step 3: Verify build**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds with no errors. All imports resolve.

- [ ] **Step 4: Commit**

```bash
git add nextjs-luns-se/src/app/page.tsx nextjs-luns-se/src/app/components/InfoBanner.tsx
git add nextjs-luns-se/src/app/components/ActionBar.tsx
git commit -m "feat: rewrite page.tsx with paper-stack layout, global day picker, and filter drawer

Replaces card-based layout with full-bleed restaurant sheets.
Removes ActionBar in favor of StickyControlBar + FilterDrawer.
Day selection is now global via sticky control bar."
```

---

### Task 9: Manual Testing & Polish

**Files:**
- Potentially modify any of the above files based on testing findings.

- [ ] **Step 1: Start dev server and test**

Run: `cd nextjs-luns-se && npm run dev`

Test the following in the browser at `http://localhost:3000`:

1. **Hero section** — Logo and InfoBanner visible. Day picker pills work.
2. **Scroll down** — Sticky control bar appears with fade-in animation.
3. **Stacking** — First 3 restaurant sheets stack with subtle overlap and shadows. 4th sheet pushes 1st away.
4. **Day picker** — Switching days in sticky bar updates all sheets simultaneously.
5. **Filter drawer** — Opens from right, filters work (search, cravings, food types, restaurants). Escape/overlay close works.
6. **View toggle** — Switching between Stack and Lista works.
7. **Mobile** — Responsive at 375px width. Drawer goes full-width. Sheets have smaller padding.
8. **Map embeds** — Map icon on a restaurant expands the iframe.
9. **External links** — Website and Instagram links open in new tabs.
10. **Empty states** — Filter to a restaurant with no menu for selected day, verify "Ingen meny" message.
11. **Colors** — Verify the new darker palette is applied throughout. No bright whites remaining.

- [ ] **Step 2: Fix any issues found**

Address any visual or functional issues discovered during testing. Common things to watch for:
- Z-index conflicts between sticky bar and filter drawer
- Sheet stacking not releasing properly
- Backdrop blur not working on certain browsers (fallback to solid bg)

- [ ] **Step 3: Verify production build**

Run: `cd nextjs-luns-se && npm run build`
Expected: Build succeeds with no errors or warnings.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A nextjs-luns-se/src/
git commit -m "fix: polish and fixes from manual testing"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Color palette & CSS foundations | `globals.css` |
| 2 | Stacking scroll hook | `hooks/useStackingScroll.ts` |
| 3 | Filter drawer component | `components/FilterDrawer.tsx` |
| 4 | Sticky control bar component | `components/StickyControlBar.tsx` |
| 5 | Restaurant sheet component | `components/RestaurantSheet.tsx` |
| 6 | Extract compact list view | `components/CompactListView.tsx` |
| 7 | Restyle InfoBanner | `components/InfoBanner.tsx` |
| 8 | Wire everything in page.tsx | `page.tsx`, delete `ActionBar.tsx` |
| 9 | Manual testing & polish | All files |
