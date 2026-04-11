# UI/UX Redesign v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move filter/search controls into the hero for immediate access, add dark/light mode with persistent toggle, and add comprehensive Umami analytics across all interactions.

**Architecture:** A unified control strip component renders statically in the hero and transitions to `position: fixed` on scroll via IntersectionObserver. Dark mode uses CSS custom property overrides on `[data-theme="dark"]` with localStorage persistence and `prefers-color-scheme` fallback. Analytics uses a thin `trackEvent` wrapper around Umami's `window.umami.track()`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, CSS custom properties, Umami analytics

**Spec:** `docs/superpowers/specs/2026-04-10-ui-redesign-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `nextjs-luns-se/src/app/utils/analytics.ts` | `trackEvent()` wrapper around Umami |
| Create | `nextjs-luns-se/src/app/components/ThemeToggle.tsx` | Fixed sun/moon toggle, localStorage + prefers-color-scheme |
| Modify | `nextjs-luns-se/src/app/globals.css` | Dark theme variables, `--control-bar-bg` variable |
| Modify | `nextjs-luns-se/src/app/layout.tsx` | Blocking theme init script in `<head>` |
| Modify | `nextjs-luns-se/src/app/components/InfoBanner.tsx` | Remove joke array and rendering |
| Modify | `nextjs-luns-se/src/app/components/StickyControlBar.tsx` | Refactor to dual-mode (static/sticky), add search input |
| Modify | `nextjs-luns-se/src/app/page.tsx` | Replace hero day picker with control strip, wire search, add ThemeToggle |
| Modify | `nextjs-luns-se/src/app/components/FilterDrawer.tsx` | Add analytics events |
| Modify | `nextjs-luns-se/src/app/components/RestaurantSheet.tsx` | Add analytics events |

---

## Task 1: Analytics Utility

**Files:**
- Create: `nextjs-luns-se/src/app/utils/analytics.ts`

- [ ] **Step 1: Create the analytics helper**

```ts
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && (window as any).umami) {
    (window as any).umami.track(name, data);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add nextjs-luns-se/src/app/utils/analytics.ts
git commit -m "feat: add trackEvent analytics utility"
```

---

## Task 2: Dark Theme CSS Variables

**Files:**
- Modify: `nextjs-luns-se/src/app/globals.css`

- [ ] **Step 1: Add `--control-bar-bg` to `:root`**

In `:root` (after `--footer-bg`), add:

```css
  --control-bar-bg: rgba(235, 229, 222, 0.9);
```

- [ ] **Step 2: Add `[data-theme="dark"]` block**

After the `:root` block, add:

```css
[data-theme="dark"] {
  --bg: #1A1714;
  --surface: #242019;
  --surface-alt: #2A2520;
  --accent: #B5532E;
  --accent-hover: #984526;
  --secondary: #6B8060;
  --text: #E8E0D8;
  --text-muted: #A89A8E;
  --border: #3D352D;
  --footer-bg: #0F0D0B;
  --control-bar-bg: rgba(26, 23, 20, 0.9);
}
```

- [ ] **Step 3: Update `.control-bar` to use the variable**

Change the `.control-bar` rule's `background-color` from `rgba(235, 229, 222, 0.9)` to `var(--control-bar-bg)`.

```css
.control-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  height: 56px;
  background-color: var(--control-bar-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 4: Verify visually**

Run: `cd nextjs-luns-se && npm run dev`

Open the site. It should look identical (light mode is default). Manually add `data-theme="dark"` to the `<html>` element in browser devtools — the entire page should switch to dark colors.

- [ ] **Step 5: Commit**

```bash
git add nextjs-luns-se/src/app/globals.css
git commit -m "feat: add dark theme CSS variables and control-bar-bg"
```

---

## Task 3: Theme Init Script & Layout

**Files:**
- Modify: `nextjs-luns-se/src/app/layout.tsx`

- [ ] **Step 1: Add blocking theme script in `<head>`**

Add a `<script>` tag after the Umami script. This is a static string literal (no user input) used to read localStorage and set the theme attribute before React hydrates, preventing a flash of wrong theme. Add after the Umami `<script>`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        var theme = localStorage.getItem('theme');
        if (!theme) {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        if (theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      })();
    `,
  }}
/>
```

- [ ] **Step 2: Verify no flash**

Run the dev server. Set browser to dark mode in OS settings. Clear localStorage. Reload. The page should load in dark mode without a light flash.

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/layout.tsx
git commit -m "feat: add blocking theme init script to prevent flash"
```

---

## Task 4: ThemeToggle Component

**Files:**
- Create: `nextjs-luns-se/src/app/components/ThemeToggle.tsx`
- Modify: `nextjs-luns-se/src/app/page.tsx`

- [ ] **Step 1: Create ThemeToggle component**

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { trackEvent } from '../utils/analytics';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    trackEvent('theme-toggle', { theme: newTheme });
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors"
      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
      title={theme === 'light' ? 'Byt till mörkt läge' : 'Byt till ljust läge'}
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Add ThemeToggle to page.tsx**

Add import at the top of `nextjs-luns-se/src/app/page.tsx`:

```tsx
import ThemeToggle from './components/ThemeToggle';
```

Add the component inside the root div, right after the opening `<div className="min-h-screen relative" ...>`:

```tsx
<ThemeToggle />
```

- [ ] **Step 3: Verify**

Run dev server. The sun/moon toggle should appear in the top-right corner. Clicking it should toggle between light and dark themes. Reload the page — the chosen theme should persist.

- [ ] **Step 4: Commit**

```bash
git add nextjs-luns-se/src/app/components/ThemeToggle.tsx nextjs-luns-se/src/app/page.tsx
git commit -m "feat: add dark/light mode toggle with persistence"
```

---

## Task 5: Remove Joke from InfoBanner

**Files:**
- Modify: `nextjs-luns-se/src/app/components/InfoBanner.tsx`

- [ ] **Step 1: Remove the joke array**

Delete the entire `goteborgJokes` array (lines 7–121 approximately — the array from `const goteborgJokes = [` through the closing `];`).

- [ ] **Step 2: Remove joke state and logic**

In the component, remove the `joke` state variable:

```tsx
// DELETE this line:
const [joke, setJoke] = useState<string>('');
```

In the first `useEffect`, remove the joke selection:

```tsx
// DELETE these lines:
const randomJoke = goteborgJokes[Math.floor(Math.random() * goteborgJokes.length)];
setJoke(randomJoke);
```

- [ ] **Step 3: Remove joke rendering**

Delete the joke JSX block:

```tsx
// DELETE this block:
{joke && (
  <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
    &ldquo;{joke}&rdquo;
  </p>
)}
```

- [ ] **Step 4: Verify**

Run dev server. InfoBanner should show week number, weather, and countdown — no joke.

- [ ] **Step 5: Commit**

```bash
git add nextjs-luns-se/src/app/components/InfoBanner.tsx
git commit -m "feat: remove joke from InfoBanner"
```

---

## Task 6: Refactor StickyControlBar to Dual-Mode

**Files:**
- Modify: `nextjs-luns-se/src/app/components/StickyControlBar.tsx`

This is the biggest change. The component goes from "hidden until scroll" to "always rendered, transitions from static to sticky."

- [ ] **Step 1: Rewrite the component**

Replace the entire file contents with:

```tsx
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
      <div ref={controlStripRef} className={isSticky ? 'invisible' : ''}>
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd nextjs-luns-se && npx tsc --noEmit`

Expected: No errors related to StickyControlBar (page.tsx will error since we haven't updated it yet — that's fine).

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/components/StickyControlBar.tsx
git commit -m "feat: refactor StickyControlBar to dual-mode static/sticky with search"
```

---

## Task 7: Wire Up page.tsx

**Files:**
- Modify: `nextjs-luns-se/src/app/page.tsx`

- [ ] **Step 1: Add analytics import**

Add at the top:

```tsx
import { trackEvent } from './utils/analytics';
```

- [ ] **Step 2: Replace heroRef with controlStripRef and add sticky state**

Replace:

```tsx
const heroRef = useRef<HTMLDivElement>(null);
```

With:

```tsx
const controlStripRef = useRef<HTMLDivElement>(null);
const [isSticky, setIsSticky] = useState(false);
```

- [ ] **Step 3: Add IntersectionObserver for sticky behavior**

Add a new `useEffect` after the scroll detection one:

```tsx
// Sticky control strip detection
useEffect(() => {
  const el = controlStripRef.current;
  if (!el) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      setIsSticky(!entry.isIntersecting);
    },
    { threshold: 0 }
  );

  observer.observe(el);
  return () => observer.disconnect();
}, []);
```

- [ ] **Step 4: Add debounced search analytics**

Add a new `useEffect` for search tracking:

```tsx
// Track search input with debounce
useEffect(() => {
  if (!filters.searchTerm.trim()) return;
  const timer = setTimeout(() => {
    trackEvent('search-input', { term: filters.searchTerm.trim() });
  }, 500);
  return () => clearTimeout(timer);
}, [filters.searchTerm]);
```

- [ ] **Step 5: Add back-to-top analytics**

Replace the `scrollToTop` function:

```tsx
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  trackEvent('back-to-top');
};
```

- [ ] **Step 6: Create search change handler**

Add after the `scrollToTop` function:

```tsx
const handleSearchChange = (term: string) => {
  setFilters(prev => ({ ...prev, searchTerm: term }));
};
```

- [ ] **Step 7: Replace the hero section JSX**

Replace the entire hero section (from `{/* Hero Section */}` through the closing `</div>` of the hero, and the `{/* Sticky Control Bar */}` section) with:

```tsx
{/* Hero Section */}
<div className="relative z-10">
  <div className="max-w-[750px] mx-auto px-5 pt-12 pb-4">
    <div className="text-center mb-6">
      <img
        src="/luns-logo-transparent.png"
        alt="Luns.se"
        className="w-full max-w-sm md:max-w-xl mx-auto"
      />
    </div>
    <InfoBanner />
  </div>
</div>

{/* Unified Control Strip */}
<div className="relative z-10 mt-4 mb-2">
  <StickyControlBar
    controlStripRef={controlStripRef}
    isSticky={isSticky}
    selectedDay={selectedDay}
    availableDays={availableDays}
    onDayChange={setSelectedDay}
    viewMode={viewMode}
    onViewModeChange={setViewMode}
    onFilterOpen={() => setIsFilterOpen(true)}
    activeFilterCount={activeFilterCount}
    searchTerm={filters.searchTerm}
    onSearchChange={handleSearchChange}
  />
</div>
```

This removes:
- The inline day picker pills from the hero
- The old `heroRef` reference
- The old `StickyControlBar` invocation with `heroRef`

- [ ] **Step 8: Verify everything compiles and works**

Run: `cd nextjs-luns-se && npx tsc --noEmit`

Then run the dev server and verify:
1. Control strip is visible in the hero on page load (day picker, search, view toggle, filter button)
2. Scrolling down causes the bar to stick to the top
3. Scrolling back up returns it to the hero
4. Search input filters menus in real-time
5. Filter button opens the drawer
6. Dark mode toggle still works

- [ ] **Step 9: Commit**

```bash
git add nextjs-luns-se/src/app/page.tsx
git commit -m "feat: wire unified control strip into hero with sticky behavior"
```

---

## Task 8: Add Analytics to FilterDrawer

**Files:**
- Modify: `nextjs-luns-se/src/app/components/FilterDrawer.tsx`

- [ ] **Step 1: Add import**

Add at the top:

```tsx
import { trackEvent } from '../utils/analytics';
```

- [ ] **Step 2: Add analytics to handleApply**

In the `handleApply` function, after `onFiltersChange(localFilters)`, add:

```tsx
trackEvent('filter-apply', {
  foodTypes: localFilters.selectedFoodTypes,
  cravings: localFilters.searchTerm || undefined,
  restaurantCount: localFilters.selectedRestaurants.length,
});
```

- [ ] **Step 3: Add analytics to clearAll**

In the `clearAll` function, add at the top:

```tsx
trackEvent('filter-clear');
```

- [ ] **Step 4: Add analytics to toggleRestaurant**

In the `toggleRestaurant` function, after the state update, add:

```tsx
trackEvent('restaurant-toggle', {
  restaurant,
  selected: !localFilters.selectedRestaurants.includes(restaurant),
});
```

- [ ] **Step 5: Commit**

```bash
git add nextjs-luns-se/src/app/components/FilterDrawer.tsx
git commit -m "feat: add Umami analytics to FilterDrawer"
```

---

## Task 9: Add Analytics to RestaurantSheet

**Files:**
- Modify: `nextjs-luns-se/src/app/components/RestaurantSheet.tsx`

- [ ] **Step 1: Add import**

Add at the top:

```tsx
import { trackEvent } from '../utils/analytics';
```

- [ ] **Step 2: Add analytics to map button**

Replace the map button's `onClick`:

```tsx
onClick={() => {
  setShowMap(!showMap);
  if (!showMap) trackEvent('map-open', { restaurant: restaurant.name });
}}
```

- [ ] **Step 3: Add analytics to website link**

Add an `onClick` handler to the website `<a>` tag:

```tsx
onClick={() => trackEvent('external-link', { restaurant: restaurant.name, type: 'website' })}
```

- [ ] **Step 4: Add analytics to Instagram link**

Add an `onClick` handler to the Instagram `<a>` tag:

```tsx
onClick={() => trackEvent('external-link', { restaurant: restaurant.name, type: 'instagram' })}
```

- [ ] **Step 5: Commit**

```bash
git add nextjs-luns-se/src/app/components/RestaurantSheet.tsx
git commit -m "feat: add Umami analytics to RestaurantSheet"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full type check**

Run: `cd nextjs-luns-se && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 2: Dev server smoke test**

Run the dev server and verify all features:

1. **Control strip in hero:** Day picker, search input, view toggle, filter button all visible on page load
2. **Sticky behavior:** Scroll down — bar sticks to top. Scroll up — returns to hero position.
3. **Search:** Type in the search input — menus filter in real-time. Open filter drawer — same search term is shown.
4. **Dark mode:** Click toggle — page switches to dark theme. Reload — persists. Clear localStorage, set OS to dark mode, reload — auto-detects dark.
5. **Analytics:** Open browser devtools Network tab, filter for "umami". Click various controls — verify events fire (day-select, search-input, filter-open, filter-apply, theme-toggle, view-mode-switch, map-open, external-link, back-to-top).
6. **No joke:** InfoBanner shows week, weather, countdown. No joke text.
7. **Filter drawer:** Still works as before — food types, cravings, restaurant toggles, apply/clear.

- [ ] **Step 3: Commit any remaining fixes**

If anything needed fixing, commit:

```bash
git add -A
git commit -m "fix: address issues from final verification"
```
