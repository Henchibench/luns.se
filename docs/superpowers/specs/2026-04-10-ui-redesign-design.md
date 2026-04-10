# Luns.se UI Redesign — Design Spec

## Overview

Redesign the luns.se lunch menu aggregator from a card-based layout to a full-bleed "paper stack" design with subtle parallax stacking, a slide-in filter drawer, a global day picker, and a uniformly darkened warm color palette. All existing functionality is preserved.

## Layout & Scroll Behavior

### Structure (top to bottom)

1. **Hero section** — Logo, InfoBanner (week number, weather, joke, countdown). Not sticky, scrolls away naturally. Future home of a location/area picker when the site expands beyond Lindholmen.
2. **Sticky control bar** — Pins to top once hero scrolls out of view. Contains global day picker (Mon–Fri pill buttons), view toggle (sheets/list), and filter button.
3. **Restaurant sheets** — Full-bleed sections, each representing one restaurant's menu.

### Stacking Mechanic

- The first 3 visible restaurant sheets use `position: sticky` with incremental `top` offsets (e.g. `top: 56px`, `top: 64px`, `top: 72px`) to create overlapping layers.
- Each sheet has a subtle top shadow (`box-shadow: 0 -4px 20px rgba(0,0,0,0.06)`) for depth.
- As the 4th sheet arrives, the 1st sheet releases from sticky and scrolls away normally. An `IntersectionObserver` manages which 3 are currently sticky.
- Stacked sheets get a very slight scale reduction (e.g. `scale(0.995)`) to sell perspective.

### Width

- Sheets stretch to full viewport width (with ~20px margin on each side on desktop for breathing room).
- Text content inside each sheet is constrained to a readable max-width (~700–750px), centered.

## Color Palette

Uniformly darkened from the current palette. Subtle shift — reduces eye strain while keeping the warm, earthy character.

| Token | Current | New | Description |
|-------|---------|-----|-------------|
| `--bg` | `#F5F0EB` | `#EBE5DE` | Warm sand, slightly deeper |
| `--surface` | `#FEFCFA` | `#F5F0EB` | Sheets/panels |
| `--accent` | `#C4613A` | `#B5532E` | Terracotta, richer |
| `--accent-hover` | `#A8512F` | `#984526` | Darker hover state |
| `--secondary` | `#7A8F6D` | `#6B8060` | Sage green, slightly deeper |
| `--text` | `#2C2520` | `#241E1A` | Near-black brown |
| `--text-muted` | `#6B5E54` | `#5E524A` | Muted brown, richer |
| `--border` | `#E0D8CF` | `#D4CBC1` | Warm gray border, deeper |
| `--footer-bg` | `#2C2520` | `#1E1915` | Footer, darker |

Stacked sheets use `--surface`. The contrast against `--bg` (visible in gaps/overlap areas) reinforces the layered paper effect.

## Sticky Control Bar

### Appearance

- Background: `--bg` at ~90% opacity with `backdrop-filter: blur(12px)` for a frosted-glass effect.
- Height: ~56px.
- Subtle bottom border using `--border`.

### Contents (left to right)

- **Day picker pills** — Mon through Fri. Active day: `--accent` background with white text. Inactive: `--bg` with `--text-muted`.
- **Spacer**
- **View toggle** — Small pill toggle for sheets/list view. Tracks user choice via Umami custom event for analytics (not visible to users).
- **Filter button** — Icon + "Filter" label. Badge count when filters active. Opens slide-in drawer.

### Behavior

- Hidden while hero is visible. Fades in with a slight slide-down once hero scrolls out of viewport, using `IntersectionObserver`.

## Filter Drawer

### Appearance

- Slides in from the right.
- Width: ~360px on desktop, full-width on mobile.
- Background: `--surface` with backdrop-blur.
- Transition: ~300ms ease-out slide. Semi-transparent overlay dims content behind.
- Close via: X button, clicking overlay, or pressing Escape.

### Contents (top to bottom)

1. **Header** — "Filter" title + close button.
2. **Search field** — Free-text dish search.
3. **Cravings** — Quick-pick pill buttons (Hamburgare, Pasta, Pommes, Mos).
4. **Food type pills** — Kött, Fisk, Vegetarisk, Sallad, etc. Multi-select.
5. **Restaurant checkboxes** — Select/deselect individual restaurants. "Välj alla" / "Välj inga" links.
6. **Footer** — "Rensa alla" and "Tillämpa" buttons, sticky at bottom of drawer.

Same filter functionality as today, rehoused in a drawer.

## Restaurant Sheets

### Each sheet contains

**Header area:**
- Restaurant name in `DM Serif Display`, left-aligned.
- Small accent underline bar.
- Action icons (map, website, Instagram) — right-aligned icon buttons, restyled for new palette.
- Restaurant info text (if any) below the name.

**Menu content:**
- Grouped by category (Kött, Fisk, Vegetarisk, etc.) with category name as a subtle heading.
- Each dish: single line of text, clean, no decoration.
- Categories separated by light dividers or whitespace.

**Sheet differentiation:**
- Alternating sheets get a very slight background variation — odd sheets use `--surface` (`#F5F0EB`), even sheets use `#F8F4EF` (midpoint between old `--surface` and new `--surface`). Distinguishes layers when overlapping.

**Empty state:**
- Restaurant has no menu for selected day: shows "Ingen meny för [day]" rather than hiding the sheet. Keeps scroll position stable.

**Map embed:**
- Same expand/collapse behavior as current. Map icon reveals Google Maps iframe within the sheet.

## Hero Section

- Logo centered, with generous vertical padding.
- InfoBanner below: week number, weather, Gothenburg joke, lunch countdown — same content, restyled with new palette.
- Space reserved below InfoBanner for future location/area picker (not implemented now).

## Footer

- Same content: credit ("Vibe kodad av Henkebus") + contact email.
- Background: `--footer-bg: #1E1915`.
- No structural changes.

## Animations & Transitions

All CSS-only — no animation library required.

- **Sheet entrance:** Fade-in + `translateY(15px)` → `0`, `opacity: 0` → `1`, ~400ms. Triggered by `IntersectionObserver`.
- **Sticky transition:** Shadow slightly intensifies when a sheet becomes sticky.
- **Sticky release:** Shadow fades back, sheet scrolls away normally.
- **Filter drawer:** Slide-in from right ~300ms ease-out, overlay fades in.
- **Day picker switch:** Menu content crossfades ~200ms.
- **Back-to-top button:** Same behavior, restyled to match new accent color.
- **Control bar appearance:** Fade-in + slight slide-down when hero exits viewport.

## List View

The compact list view (grouped by category) is retained as an alternative. Restyled to match the new palette and typography but structurally unchanged. View toggle in the sticky bar switches between sheet view and list view.

## Analytics

- Umami custom event fired when user switches view mode (sheets vs list). Lets the site owner track which layout is preferred to inform future design decisions.

## Existing Functionality Preserved

- All filter types (food type, restaurant, search, cravings)
- Day selection (now global instead of per-card)
- Map embeds per restaurant
- External links (website, Instagram, Google Maps)
- InfoBanner (week, weather, joke, countdown)
- Back-to-top button
- Loading and error states
- Search across all days
- Pier 11 recategorization logic
- Fade in/out animations for filtered restaurants

## Out of Scope

- Location/area picker (future feature, space reserved in hero)
- Backend/scraper changes
- New restaurants or data sources
- Dark mode
