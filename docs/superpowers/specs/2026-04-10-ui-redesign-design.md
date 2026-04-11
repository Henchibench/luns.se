# Luns.se UI/UX Redesign — Design Spec (v2)

## Overview

Three changes to luns.se: (1) move filter/search controls into the hero so they're accessible immediately on page load, (2) add dark/light mode with a persistent toggle, (3) add comprehensive Umami analytics across all interactive elements.

## 1. Hero & Unified Control Strip

### Current Hero Layout
1. Logo
2. InfoBanner (week, weather, joke, countdown)
3. Day picker pills

### New Hero Layout
1. Logo
2. InfoBanner (week, weather, countdown — **joke removed**)
3. **Unified control strip** — day picker | search input | view toggle | filter button

### Control Strip Behavior

The control strip is a single component rendered statically at the bottom of the hero. It contains:

- **Day picker pills** (left) — Mon–Fri, same styling as current
- **Search input** (center) — compact inline text field, filters menus in real-time as user types
- **View toggle** (right) — sheets/list pill toggle, same as current sticky bar
- **Filter button** (right) — opens existing FilterDrawer, same badge count behavior

When the control strip scrolls out of view, it transitions to `position: fixed` at the top with backdrop blur (same `rgba` background + `backdrop-filter: blur(12px)` as the current sticky bar). When scrolling back up, it returns to its static position in the hero.

This replaces the current `StickyControlBar` show/hide behavior — the bar is always visible, it just changes from static to sticky.

### Search State Sharing

The search input in the control strip and the search field in the FilterDrawer share the same `searchTerm` state in `FilterState`. Typing in the control strip updates the filter state directly (real-time filtering). Opening the drawer shows the current search term. Editing the term in the drawer updates it there; clicking "Tillämpa" syncs it back. This is the same state, not two separate search fields.

### InfoBanner Changes

- Remove the entire joke array and joke rendering
- Keep: week number, weather (temperature + condition), lunch countdown

## 2. Dark/Light Mode

### Toggle

A small fixed-position button in the top-right corner of the viewport (`position: fixed`). Always visible regardless of scroll. Circular button with sun/moon icon, styled similarly to the existing back-to-top button (bottom-right). Subtle, not attention-grabbing.

### Theme Implementation

CSS custom properties are already used everywhere. Add a `[data-theme="dark"]` selector on `<html>` that overrides `:root` variables.

**Dark palette:**

| Token | Light (current) | Dark |
|-------|-----------------|------|
| `--bg` | `#EBE5DE` | `#1A1714` |
| `--surface` | `#F5F0EB` | `#242019` |
| `--surface-alt` | `#F8F4EF` | `#2A2520` |
| `--accent` | `#B5532E` | `#B5532E` (unchanged) |
| `--accent-hover` | `#984526` | `#984526` (unchanged) |
| `--secondary` | `#6B8060` | `#6B8060` (unchanged) |
| `--text` | `#241E1A` | `#E8E0D8` |
| `--text-muted` | `#5E524A` | `#A89A8E` |
| `--border` | `#D4CBC1` | `#3D352D` |
| `--footer-bg` | `#1E1915` | `#0F0D0B` |

### Sticky Bar Backdrop

Currently hardcoded as `rgba(235, 229, 222, 0.9)` in CSS. Must change to a CSS variable so it adapts to the active theme. Add `--control-bar-bg` (light: `rgba(235, 229, 222, 0.9)`, dark: `rgba(26, 23, 20, 0.9)`).

### Theme Priority Chain

1. **localStorage** — user explicitly toggled (highest priority)
2. **`prefers-color-scheme`** — browser/OS setting (used on first visit)
3. **Light mode** — fallback

### Flash Prevention

Theme initialization must happen in a blocking `<script>` in `<head>` (before React hydrates) to avoid a flash of wrong theme on load. This script reads localStorage and prefers-color-scheme, then sets `data-theme` on `<html>`.

## 3. Umami Analytics Events

Extend the existing `window.umami.track()` pattern. All events fire through a small `trackEvent(name, data?)` helper that wraps `window.umami?.track()`.

| Event Name | Payload | Trigger |
|---|---|---|
| `day-select` | `{ day }` | Day picker pill clicked |
| `search-input` | `{ term }` | Search debounced (~500ms after typing stops) |
| `filter-open` | — | Filter drawer opened |
| `filter-apply` | `{ foodTypes, cravings, restaurantCount }` | "Tillämpa" clicked |
| `filter-clear` | — | "Rensa alla" clicked |
| `view-mode-switch` | `{ mode }` | Already exists, keep as-is |
| `restaurant-toggle` | `{ restaurant, selected }` | Restaurant checkbox toggled |
| `theme-toggle` | `{ theme }` | Dark/light toggled |
| `map-open` | `{ restaurant }` | Map button clicked |
| `external-link` | `{ restaurant, type }` | Website/Instagram clicked (`type`: "website" or "instagram") |
| `back-to-top` | — | Back-to-top button clicked |

## 4. Component Changes

### Modified

- **`page.tsx`** — Remove hero day picker. Replace with unified control strip at bottom of hero. Wire search input state.
- **`StickyControlBar.tsx`** — Refactor to dual-mode: static in hero, fixed on scroll. Add inline search input. Replace show/hide with static-to-sticky transition via IntersectionObserver.
- **`InfoBanner.tsx`** — Remove joke array and joke rendering. Keep week, weather, countdown.
- **`FilterDrawer.tsx`** — No structural changes. Add Umami events to apply, clear, and toggle actions.
- **`RestaurantSheet.tsx`** — Add Umami events to map, website, and Instagram clicks.
- **`globals.css`** — Add `[data-theme="dark"]` variable overrides. Add `--control-bar-bg` variable. Change sticky bar background to use the variable.
- **`layout.tsx`** — Add blocking theme init script in `<head>`.

### New

- **`ThemeToggle.tsx`** — Fixed-position sun/moon toggle button. Reads/writes localStorage, listens to prefers-color-scheme, fires `theme-toggle` analytics event.
- **`analytics.ts`** — `trackEvent(name, data?)` utility wrapping `window.umami?.track()`.

## 5. Existing Functionality Preserved

- All filter types (food type, restaurant, search, cravings)
- Day selection
- Map embeds per restaurant
- External links (website, Instagram, Google Maps)
- InfoBanner (week, weather, countdown)
- Back-to-top button
- Loading and error states
- Search across all days
- Pier 11 recategorization logic
- Sheet/list view toggle
- Alternating sheet backgrounds

## Out of Scope

- Location/area picker (future feature)
- Backend/scraper changes
- New restaurants or data sources
- Stacking parallax effect (removed in previous iteration)
