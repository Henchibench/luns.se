# Favorites & Sticky Control Bar Fix — Design Spec

## Goal

Add a favorites system so users can mark preferred restaurants (persisted in localStorage), with favorited restaurants sorted to the top of the list. Also fix the broken sticky control bar so filters remain accessible while scrolling.

## Scope

Two changes:
1. **Favorites system** — heart icon on each restaurant, localStorage persistence, sort-to-top behavior
2. **Sticky control bar bug fix** — investigate and fix why the existing sticky behavior doesn't work

## Feature 1: Favorites

### Storage

- localStorage key: `"luns-favorites"`
- Value: JSON array of restaurant name strings, e.g. `["Bistrot", "Kooperativet"]`
- Missing key or empty array = no favorites set
- No server-side component, no accounts

### Hook: `useFavorites()`

New file: `src/app/hooks/useFavorites.ts`

Exposes:
- `favorites: string[]` — current list of favorited restaurant names
- `isFavorite(name: string): boolean` — check if a restaurant is favorited
- `toggleFavorite(name: string): void` — add/remove from favorites, updates localStorage immediately

On mount, reads from localStorage with SSR guard (`typeof window !== 'undefined'`). Uses `useState` + direct localStorage writes on toggle (no need for `useEffect` sync since writes are synchronous).

Fires `trackEvent('favorite-toggle', { restaurant, favorited: boolean })` on each toggle.

On mount, if the user has favorites, fires `trackEvent('favorites-loaded', { favorites: string[], count: number })` so aggregate favorite distributions can be tracked in Umami.

### Sorting

In `page.tsx`, after the existing filter logic computes `filteredRestaurants`, sort the array so that favorited restaurants appear first. Relative order within the favorites group and non-favorites group is preserved (stable sort).

This happens inside the existing `useEffect` that depends on `[restaurants, filters]` — add `favorites` to the dependency array.

### UI: Heart Icon

**RestaurantSheet (card view):**
- Small heart icon in the restaurant card header area, near the restaurant name
- Unfavorited: outline heart, colored `var(--text-muted)`
- Favorited: filled heart, colored `var(--accent)`
- On toggle: brief CSS scale pulse (scale 1 → 1.2 → 1 over ~200ms)

**CompactListView (list view):**
- Same heart icon at the end of each restaurant's header row
- Same styling and animation

No onboarding, no tooltip. The heart icon is universally understood.

### Default Behavior

- First visit (no favorites): all restaurants shown in default order
- With favorites: favorited restaurants sort to top, all others still visible below
- No "show only favorites" filter — keep it simple. Sort-to-top is sufficient.

## Feature 2: Sticky Control Bar Fix

### Current Implementation

- `page.tsx` creates a `controlStripRef` and an IntersectionObserver that sets `isSticky` when the ref element scrolls out of viewport
- `StickyControlBar` renders two copies: a static one (with the ref) and a fixed `.control-bar` div (shown when `isSticky` is true)
- CSS: `.control-bar` has `position: fixed; top: 0; z-index: 40;` with blur backdrop

### Likely Causes

1. IntersectionObserver timing — ref might not be attached when the effect runs
2. z-index stacking context — the hero's `relative z-10` might create a context that interferes with the fixed bar's `z-index: 40`
3. The static/invisible copy might not properly reserve layout space

### Fix Approach

Debug in browser during implementation, identify actual cause, fix. This is an investigation task, not a predetermined code change. The sticky pattern itself (IntersectionObserver + fixed bar) is sound and used widely.

## Analytics Events

| Event | Data | Trigger |
|-------|------|---------|
| `favorite-toggle` | `{ restaurant: string, favorited: boolean }` | Heart icon tap |
| `favorites-loaded` | `{ favorites: string[], count: number }` | Page load, when user has favorites |

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/hooks/useFavorites.ts` | Favorites hook with localStorage persistence |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/page.tsx` | Import hook, sort filteredRestaurants by favorites, pass props |
| `src/app/components/RestaurantSheet.tsx` | Add heart icon to card header |
| `src/app/components/CompactListView.tsx` | Add heart icon to list rows |
| `src/app/components/StickyControlBar.tsx` | Bug fix for sticky behavior |
| `src/app/globals.css` | Heart pulse animation, any sticky fix CSS |

## Out of Scope

- "Show only favorites" filter toggle
- Favorites export/import
- Server-side favorites storage
- Favorites count badge
- Reordering favorites
