# Favorites & Sticky Control Bar Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a favorites system with heart icons, localStorage persistence, and sort-to-top behavior; fix the broken sticky control bar.

**Architecture:** A `useFavorites()` hook manages favorites state and localStorage persistence. Heart icons are added to RestaurantSheet and CompactListView. The page sorts favorited restaurants to the top. The sticky bar bug is investigated and fixed separately.

**Tech Stack:** Next.js 15, React hooks, localStorage, CSS animations, Umami analytics

---

### Task 1: Create useFavorites hook

**Files:**
- Create: `nextjs-luns-se/src/app/hooks/useFavorites.ts`

- [ ] **Step 1: Create the hook file**

```ts
// nextjs-luns-se/src/app/hooks/useFavorites.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

const STORAGE_KEY = 'luns-favorites';

function readFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Read from localStorage on mount + fire analytics
  useEffect(() => {
    const stored = readFavorites();
    setFavorites(stored);
    if (stored.length > 0) {
      trackEvent('favorites-loaded', { favorites: stored, count: stored.length });
    }
  }, []);

  const isFavorite = useCallback(
    (name: string) => favorites.includes(name),
    [favorites]
  );

  const toggleFavorite = useCallback((name: string) => {
    setFavorites(prev => {
      const favorited = !prev.includes(name);
      const next = favorited
        ? [...prev, name]
        : prev.filter(n => n !== name);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      trackEvent('favorite-toggle', { restaurant: name, favorited });
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd nextjs-luns-se && npx tsc --noEmit src/app/hooks/useFavorites.ts 2>&1 || echo "Check errors above"`

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/hooks/useFavorites.ts
git commit -m "feat: add useFavorites hook with localStorage persistence"
```

---

### Task 2: Add heart pulse CSS animation

**Files:**
- Modify: `nextjs-luns-se/src/app/globals.css`

- [ ] **Step 1: Add the heart animation keyframes and class**

Add after the existing `.animate-control-bar-in` block (around line 132 in globals.css):

```css
.favorite-heart {
  cursor: pointer;
  transition: color 0.15s ease;
}

.favorite-heart:active {
  animation: heartPulse 0.25s ease;
}

@keyframes heartPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 2: Commit**

```bash
git add nextjs-luns-se/src/app/globals.css
git commit -m "feat: add heart pulse animation for favorites"
```

---

### Task 3: Add heart icon to RestaurantSheet

**Files:**
- Modify: `nextjs-luns-se/src/app/components/RestaurantSheet.tsx`

- [ ] **Step 1: Add `isFavorite` and `onToggleFavorite` props**

Update the `RestaurantSheetProps` interface (line 29-36) to:

```ts
interface RestaurantSheetProps {
  restaurant: Restaurant;
  allItems: string[];
  selectedDay: string;
  isEven: boolean;
  hasActiveSearch: boolean;
  availableDays: string[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
}
```

Update the function signature (line 45-52) to destructure the new props:

```ts
export default function RestaurantSheet({
  restaurant,
  allItems,
  selectedDay,
  isEven,
  hasActiveSearch,
  availableDays,
  isFavorite,
  onToggleFavorite,
}: RestaurantSheetProps) {
```

- [ ] **Step 2: Add heart icon button to the header action icons**

In the header section (line 86-141), add a heart button as the **first** item inside the `<div className="flex gap-1.5 ml-4">` (before the map button):

```tsx
          <div className="flex gap-1.5 ml-4">
            {/* Favorite heart */}
            <button
              onClick={onToggleFavorite}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors favorite-heart"
              style={{ backgroundColor: 'var(--bg)', color: isFavorite ? 'var(--accent)' : 'var(--text-muted)' }}
              title={isFavorite ? 'Ta bort favorit' : 'Lägg till favorit'}
            >
              {isFavorite ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              )}
            </button>
            {restaurant.location?.maps && (
```

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/components/RestaurantSheet.tsx
git commit -m "feat: add favorite heart icon to RestaurantSheet"
```

---

### Task 4: Add heart icon to CompactListView

**Files:**
- Modify: `nextjs-luns-se/src/app/components/CompactListView.tsx`

The CompactListView groups items by category, not by restaurant. Each item row shows a restaurant name badge. We add a small heart next to that badge.

- [ ] **Step 1: Add `isFavorite` and `onToggleFavorite` props**

Update the `CompactListViewProps` interface (line 26-31):

```ts
interface CompactListViewProps {
  restaurants: Restaurant[];
  selectedDay: string;
  availableDays: string[];
  hasActiveSearch: boolean;
  isFavorite: (name: string) => boolean;
  onToggleFavorite: (name: string) => void;
}
```

Update the function signature (line 51):

```ts
export default function CompactListView({ restaurants, selectedDay, availableDays, hasActiveSearch, isFavorite, onToggleFavorite }: CompactListViewProps) {
```

- [ ] **Step 2: Add heart icon to each item row**

There are two places where item rows are rendered — the search results view (line 109-114) and the normal view (line 130-133). In both, the row currently ends with a restaurant name badge `<span>`. Wrap the badge and a heart together.

Replace the normal view item row (lines 129-134):

```tsx
                    {items.map((item, idx) => (
                      <div key={`${item.restaurantName}-${idx}`} className="flex justify-between items-start py-2 px-3 rounded-lg">
                        <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                        <div className="ml-4 flex-shrink-0 flex items-center gap-1">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                            {item.restaurantName}
                          </span>
                          <button
                            onClick={() => onToggleFavorite(item.restaurantName)}
                            className="favorite-heart"
                            style={{ color: isFavorite(item.restaurantName) ? 'var(--accent)' : 'var(--text-muted)' }}
                          >
                            {isFavorite(item.restaurantName) ? (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
```

Apply the same pattern to the search results item row (lines 109-114) — same structure, just with the same heart + badge wrapper.

- [ ] **Step 3: Commit**

```bash
git add nextjs-luns-se/src/app/components/CompactListView.tsx
git commit -m "feat: add favorite heart icon to CompactListView"
```

---

### Task 5: Wire up favorites in page.tsx — sorting and prop passing

**Files:**
- Modify: `nextjs-luns-se/src/app/page.tsx`

- [ ] **Step 1: Import the hook and call it**

Add import (after the existing imports, around line 10):

```ts
import { useFavorites } from './hooks/useFavorites';
```

Inside `MenuPage()`, after the existing state declarations (around line 136), add:

```ts
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
```

- [ ] **Step 2: Sort filtered restaurants by favorites**

In the `useEffect` that computes `filteredRestaurants` (starts around line 139), add `favorites` to the dependency array and add a sort step before `setFilteredRestaurants`. After the `.filter(restaurant => restaurant.items.length > 0)` chain, add:

```ts
    // Sort favorites to top (stable sort preserves relative order within groups)
    result.sort((a, b) => {
      const aFav = favorites.includes(a.name) ? 0 : 1;
      const bFav = favorites.includes(b.name) ? 0 : 1;
      return aFav - bFav;
    });

    setFilteredRestaurants(result);
```

Update the dependency array from `[restaurants, filters]` to `[restaurants, filters, favorites]`.

- [ ] **Step 3: Pass favorite props to RestaurantSheet**

Update the RestaurantSheet render (around line 357) to pass the new props:

```tsx
                <RestaurantSheet
                  restaurant={restaurant}
                  allItems={rawMenus[restaurant.name] || []}
                  selectedDay={selectedDay}
                  isEven={index % 2 === 0}
                  hasActiveSearch={!!filters.searchTerm.trim()}
                  availableDays={availableDays}
                  isFavorite={isFavorite(restaurant.name)}
                  onToggleFavorite={() => toggleFavorite(restaurant.name)}
                />
```

- [ ] **Step 4: Pass favorite props to CompactListView**

Update the CompactListView render (around line 343) to pass the new props:

```tsx
            <CompactListView
              restaurants={filteredRestaurants}
              selectedDay={selectedDay}
              availableDays={availableDays}
              hasActiveSearch={!!filters.searchTerm.trim()}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
```

- [ ] **Step 5: Commit**

```bash
git add nextjs-luns-se/src/app/page.tsx
git commit -m "feat: wire up favorites sorting and prop passing"
```

---

### Task 6: Fix sticky control bar

**Files:**
- Modify: `nextjs-luns-se/src/app/components/StickyControlBar.tsx` (possibly)
- Modify: `nextjs-luns-se/src/app/page.tsx` (possibly)
- Modify: `nextjs-luns-se/src/app/globals.css` (possibly)

This is a bug investigation task. The sticky bar code looks correct in isolation, so the issue needs browser debugging.

- [ ] **Step 1: Run the dev server and test sticky behavior**

Run: `cd nextjs-luns-se && npm run dev`

Open the site in a browser. Scroll down and observe:
1. Does the control bar appear fixed at the top?
2. Open browser DevTools, check if `isSticky` state toggles (React DevTools or add a `console.log` temporarily)
3. Check if the `.control-bar` element exists in the DOM when scrolled
4. Check z-index stacking — inspect the computed z-index and stacking contexts

- [ ] **Step 2: Identify and fix the root cause**

Common fixes to try based on likely causes:

**If IntersectionObserver doesn't fire:** The ref might not be set when the effect runs. Fix by adding the ref element to the dependency or using a callback ref.

**If z-index layering is wrong:** The hero section uses `relative z-10` which creates a stacking context. The fixed bar at `z-index: 40` should be above it since fixed positioning creates its own stacking context at the viewport level. If not, remove unnecessary `z-10` from parent containers or bump the control bar z-index.

**If the bar renders but is invisible:** Check that `var(--control-bar-bg)` resolves correctly and that `backdrop-filter` isn't causing issues. Test by temporarily setting a solid background color.

- [ ] **Step 3: Verify the fix**

Scroll up and down on both desktop and mobile viewport sizes. The control bar should:
- Be visible in-place when not scrolled
- Stick to the top with blur background when scrolled past
- Transition smoothly (the `animate-control-bar-in` animation)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: sticky control bar not appearing on scroll"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Test favorites in card view**

1. Open the site, verify no hearts are filled initially
2. Click a heart on a restaurant — it should fill with accent color and pulse
3. Scroll away and back — heart stays filled
4. Refresh the page — heart is still filled, restaurant sorts to top
5. Click the filled heart — it unfills, restaurant moves back to original position

- [ ] **Step 2: Test favorites in list view**

1. Switch to "Lista" view
2. Hearts appear next to restaurant name badges
3. Toggling works the same as in card view
4. Switching back to "Kort" view preserves favorite state

- [ ] **Step 3: Test sticky bar**

1. Scroll down — control bar sticks to top
2. Change day, toggle view mode, open filter, type search — all work in sticky mode
3. Scroll back to top — bar returns to its in-page position

- [ ] **Step 4: Test analytics**

Check browser DevTools console/network for Umami events:
- `favorites-loaded` fires on page load when favorites exist
- `favorite-toggle` fires on each heart click with correct `restaurant` and `favorited` values

- [ ] **Step 5: Test dark mode**

Toggle dark mode — heart colors, sticky bar background, and animations should all work correctly in both themes.
