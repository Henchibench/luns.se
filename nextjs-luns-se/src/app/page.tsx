'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/board/Header';
import Rail, { RailItem } from './components/board/Rail';
import MenuList, { Section } from './components/board/MenuList';
import MobileBar, { SheetKind } from './components/board/MobileBar';
import RestaurantMap, { MapPoint } from './components/board/RestaurantMap';
import LocationWelcome from './components/board/LocationWelcome';
import FoodProfile from './components/board/FoodProfile';
import { ChipSpec } from './components/board/Chips';
import { useFavorites } from './hooks/useFavorites';
import { useFoodProfile } from './hooks/useFoodProfile';
import { useDishFavorites } from './hooks/useDishFavorites';
import { useLocation } from './hooks/useLocation';
import { useTheme } from './hooks/useTheme';
import { useWeather } from './hooks/useWeather';
import {
  DAYS,
  categoryColor,
  currentDay,
  dateForDay,
  loadMenuData,
  type LunsLocation,
  type Restaurant,
} from './lib/menu';
import {
  CRAVINGS,
  TYPE_FILTERS,
  boostByProfile,
  hiddenByProfile,
  matchesSearch,
  matchesTypes,
  searchTerms as expandSearch,
} from './lib/filters';
import { buildMenuShareText, copyText } from './utils/shareMenu';
import { trackEvent } from './utils/analytics';

/** Avstånd från huvudytans topp där en sektion räknas som den aktiva. */
const SPY_OFFSET = 70;
/** Där en vald restaurang hamnar när man scrollar till den. */
const SCROLL_OFFSET = 52;
/** Hur nära toppen sista restaurangen får komma. */
const HARD_STOP = 56;
/** Huvudytans padding-bottom, som redan ingår i scrollHeight. */
const MAIN_PADDING_BOTTOM = 40;

export default function LunchBoard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [locations, setLocations] = useState<LunsLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [day, setDay] = useState<string>(currentDay());
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeRest, setActiveRest] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [animFlip, setAnimFlip] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isFavorite, toggleFavorite, showOnlyFavorites, setShowOnlyFavorites } = useFavorites();
  const { dishes: watchedDishes, isDishFavorite, toggleDishFavorite, removeDishFavorite } =
    useDishFavorites();
  const { profile, toggleBoostType, addHideKeyword, removeHideKeyword } = useFoodProfile();
  const { selected: location, needsChoice, selectLocation } = useLocation(locations);
  const { theme, toggle: toggleTheme, mounted: themeMounted } = useTheme();
  const weather = useWeather(location?.latitude, location?.longitude);

  useEffect(() => {
    loadMenuData()
      .then(({ restaurants: parsed, locations: places }) => {
        setRestaurants(parsed);
        setLocations(places);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const terms = useMemo(() => expandSearch(search), [search]);

  const atLocation = useMemo(
    () => (location ? restaurants.filter(r => r.area === location.id) : []),
    [restaurants, location]
  );

  /**
   * Rätter för vald dag som klarar sök, typfilter och matprofil. Profilens
   * valda kategorier lyfts till toppen, dess dolda ord filtreras bort.
   */
  const visibleDishes = useCallback(
    (restaurant: Restaurant) => {
      const kept = restaurant.dishes.filter(
        d =>
          d.day === day &&
          matchesSearch(d, restaurant.name, search) &&
          matchesTypes(d, activeTypes) &&
          !hiddenByProfile(d, profile.hideKeywords)
      );
      return boostByProfile(kept, profile.boostTypes);
    },
    [day, search, activeTypes, profile.hideKeywords, profile.boostTypes]
  );

  /** Hur många rätter matprofilen tar bort idag — annars försvinner de tyst. */
  const hiddenCount = useMemo(() => {
    if (profile.hideKeywords.length === 0) return 0;
    return atLocation.reduce(
      (sum, restaurant) =>
        sum +
        restaurant.dishes.filter(
          d =>
            d.day === day &&
            matchesSearch(d, restaurant.name, search) &&
            matchesTypes(d, activeTypes) &&
            hiddenByProfile(d, profile.hideKeywords)
        ).length,
      0
    );
  }, [atLocation, day, search, activeTypes, profile.hideKeywords]);

  const filtering = search.trim().length > 0 || activeTypes.length > 0 || showOnlyFavorites;

  const sections: Section[] = useMemo(() => {
    const list = showOnlyFavorites
      ? atLocation.filter(r => isFavorite(r.name))
      : atLocation;

    return list
      .map(restaurant => {
        const dishes = visibleDishes(restaurant).map((dish, i) => ({
          key: `${restaurant.name}-${i}-${dish.description}`,
          category: dish.category,
          categoryColor: categoryColor(dish.category),
          description: dish.description,
          price: dish.price,
          starred: isDishFavorite(restaurant.name, dish.description),
        }));

        const hasDayDishes = restaurant.dishes.some(d => d.day === day);

        return {
          name: restaurant.name,
          meta: restaurant.meta.lunch_hours ?? '',
          info: (restaurant.info[day] ?? []).join('  ·  '),
          // "Ingen meny idag" gäller bara när inget filter är på. Med filter
          // på betyder tomt "inget matchade", och då är raden bara brus.
          empty: !filtering && !hasDayDishes,
          website: restaurant.meta.website,
          maps: restaurant.meta.maps,
          instagram: restaurant.meta.instagram,
          latitude: restaurant.meta.latitude,
          longitude: restaurant.meta.longitude,
          favorite: isFavorite(restaurant.name),
          dishes,
        };
      })
      .filter(section => section.dishes.length > 0 || section.empty);
  }, [atLocation, showOnlyFavorites, isFavorite, visibleDishes, isDishFavorite, day, filtering]);

  const dishTotal = sections.reduce((sum, s) => sum + s.dishes.length, 0);

  const scrollToRestaurant = useCallback((name: string) => {
    setSheet(null);
    setView('list');
    // Vyn kan behöva målas om innan sektionen finns i DOM:en.
    setTimeout(() => {
      const main = mainRef.current;
      if (!main) return;
      const el = main.querySelector<HTMLElement>(`[data-sec="${CSS.escape(name)}"]`);
      if (!el) return;
      const top =
        el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - SCROLL_OFFSET;
      main.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, 60);
  }, []);

  const railItems: RailItem[] = useMemo(
    () =>
      atLocation.map(r => ({
        name: r.name,
        visibleCount: visibleDishes(r).length,
        favorite: isFavorite(r.name),
        active: activeRest === r.name,
      })),
    [atLocation, visibleDishes, isFavorite, activeRest]
  );

  // Scroll-spy: aktiv restaurang är den sista vars topp passerat SPY_OFFSET.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    let frame: number | null = null;
    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const mainTop = main.getBoundingClientRect().top;
        let found: string | null = null;
        main.querySelectorAll<HTMLElement>('[data-sec]').forEach(el => {
          if (el.getBoundingClientRect().top - mainTop <= SPY_OFFSET) {
            found = el.dataset.sec ?? null;
          }
        });
        setActiveRest(prev => (prev === found ? prev : found));
      });
    };

    onScroll();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [sections, view]);

  // Hard stop: tomrum efter sista sektionen så den kan nå toppen, men inte
  // scrollas förbi. Räknas om när innehållet eller fönstret ändras.
  useEffect(() => {
    const measure = () => {
      const main = mainRef.current;
      if (!main) return;
      const secs = main.querySelectorAll<HTMLElement>('[data-sec]');
      if (secs.length === 0) {
        setSpacerHeight(0);
        return;
      }
      const last = secs[secs.length - 1];
      const height = Math.max(
        0,
        main.clientHeight - last.offsetHeight - HARD_STOP - MAIN_PADDING_BOTTOM
      );
      setSpacerHeight(prev => (Math.abs(prev - height) > 1 ? height : prev));
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sections, view]);

  const handleCopy = useCallback(async () => {
    const text = buildMenuShareText(sections, day, location?.label);
    if (!text) {
      flash('Det finns inget att kopiera för den här dagen');
      return;
    }
    const ok = await copyText(text);
    trackEvent('copy-menu', { day, location: location?.id, restaurants: sections.length });
    flash(ok ? 'Dagens meny kopierad — klistra in i Teams eller Slack!' : 'Kunde inte kopiera i den här webbläsaren');
  }, [sections, day, location, flash]);

  const handleToggleStar = useCallback(
    (restaurant: string, description: string) => {
      const wasStarred = isDishFavorite(restaurant, description);
      toggleDishFavorite(restaurant, description);
      flash(wasStarred ? 'Bevakning borttagen' : 'Rätten bevakas — du ser det när den serveras igen');
    },
    [isDishFavorite, toggleDishFavorite, flash]
  );

  const typeChips: ChipSpec[] = useMemo(
    () => [
      {
        id: 'favs',
        label: '♥ FAVORITER',
        active: showOnlyFavorites,
        onClick: () => setShowOnlyFavorites(!showOnlyFavorites),
      },
      ...TYPE_FILTERS.map(t => ({
        id: t.id,
        label: t.label,
        active: activeTypes.includes(t.id),
        onClick: () =>
          setActiveTypes(prev =>
            prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
          ),
      })),
    ],
    [showOnlyFavorites, setShowOnlyFavorites, activeTypes]
  );

  const cravingChips: ChipSpec[] = useMemo(
    () =>
      CRAVINGS.map(c => ({
        id: c.id,
        label: c.label,
        active: search.trim().toLowerCase() === c.id,
        onClick: () => setSearch(prev => (prev.trim().toLowerCase() === c.id ? '' : c.id)),
      })),
    [search]
  );

  // Bevakade rätter som faktiskt serveras den valda dagen.
  const starredToday = useMemo(() => {
    const hits: string[] = [];
    atLocation.forEach(restaurant => {
      restaurant.dishes.forEach(dish => {
        if (dish.day !== day) return;
        if (!isDishFavorite(restaurant.name, dish.description)) return;
        const label = `${dish.description.slice(0, 60)} (${restaurant.name})`;
        if (!hits.includes(label)) hits.push(label);
      });
    });
    return hits;
  }, [atLocation, day, isDishFavorite]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="font-mono text-[11px] tracking-[.15em] text-[var(--mut)]">
          HÄMTAR MENYER…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-[15px] font-semibold text-[var(--ink)]">Kunde inte läsa menydata</p>
        <p className="text-[13px] text-[var(--mut)]">{error}</p>
      </div>
    );
  }

  // Nålar för helkartan. Restauranger vi inte kunnat placera hoppas över —
  // en nål på fel ställe är sämre än ingen nål.
  const mapPoints: MapPoint[] = atLocation
    .filter(r => r.meta.latitude != null && r.meta.longitude != null)
    .map(r => ({
      name: r.name,
      latitude: r.meta.latitude as number,
      longitude: r.meta.longitude as number,
      dishCount: r.dishes.filter(d => d.day === day).length,
    }));
  const unmappedCount = atLocation.length - mapPoints.length;

  const foodProfileProps = {
    profile,
    onToggleBoostType: toggleBoostType,
    onAddHideKeyword: addHideKeyword,
    onRemoveHideKeyword: removeHideKeyword,
    watchedDishes,
    onRemoveWatched: removeDishFavorite,
  };

  const heading = `${day} ${dateForDay(day).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  })}`;
  const isEmpty = restaurants.length > 0 && sections.length === 0;
  const activeFilterCount = activeTypes.length + (showOnlyFavorites ? 1 : 0);

  return (
    <div
      className="grid h-screen grid-rows-[auto_1fr] overflow-hidden text-[var(--ink)]"
      style={{ background: 'var(--glass)', backdropFilter: 'blur(30px) saturate(1.15)' }}
    >
      <Header
        days={DAYS}
        selectedDay={day}
        onSelectDay={next => {
          setDay(next);
          setAnimFlip(f => !f);
          trackEvent('day-select', { day: next });
        }}
        locations={locations}
        selectedLocation={location?.id ?? null}
        onSelectLocation={id => {
          selectLocation(id);
          setActiveRest(null);
        }}
        search={search}
        onSearch={setSearch}
        weather={weather}
        onCopy={handleCopy}
        view={view}
        onToggleView={() => setView(v => (v === 'map' ? 'list' : 'map'))}
        theme={theme}
        themeMounted={themeMounted}
        onToggleTheme={toggleTheme}
      />

      <div className="grid min-h-0 grid-cols-1 wide:grid-cols-[270px_1fr]">
        <Rail
          items={railItems}
          onSelect={scrollToRestaurant}
          typeChips={typeChips}
          cravingChips={cravingChips}
          foodProfile={<FoodProfile {...foodProfileProps} />}
        />

        <main
          ref={mainRef}
          className={`luns-scroll overflow-y-auto px-4 pb-[90px] wide:px-7 wide:pb-10 ${
            view === 'map' ? '' : 'luns-mask-main'
          }`}
        >
          {view === 'map' && (
            <div className="flex h-full flex-col gap-2 pt-1.5 pb-[18px]">
              <RestaurantMap
                points={mapPoints}
                theme={theme}
                onSelect={scrollToRestaurant}
                className="min-h-0 flex-1"
              />
              {unmappedCount > 0 && (
                <span className="flex-none font-mono text-[10px] text-[var(--mut)]">
                  {unmappedCount} restaurang{unmappedCount === 1 ? '' : 'er'} saknar position och
                  syns inte på kartan
                </span>
              )}
            </div>
          )}

          <div hidden={view === 'map'}>
          <div className="mb-1.5 flex items-baseline justify-between gap-4 pt-3.5 pb-2">
            <h1 className="m-0 font-heading text-2xl font-bold tracking-[-.02em] wide:text-[30px]">
              {heading}
            </h1>
            <span className="font-mono text-[11px] text-[var(--mut)] whitespace-nowrap">
              {dishTotal} RÄTTER
              {hiddenCount > 0 && ` · ${hiddenCount} DOLDA`}
            </span>
          </div>

          {starredToday.length > 0 && (
            <div className="mt-2.5 mb-1 flex items-center gap-2.5 rounded-lg bg-[var(--accBg)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[var(--accStrong)]">
              <span className="text-[var(--star)]">★</span>
              Bevakad rätt idag: {starredToday.join(' · ')}
            </div>
          )}

          {isEmpty && (
            <div className="py-[70px] text-center text-[var(--mut)]">
              <p className="mb-1.5 text-[15px] font-semibold text-[var(--ink2)]">
                Inga rätter matchar
              </p>
              <p className="mb-4 text-[13px]">Prova en annan dag eller rensa sök och filter</p>
              <button
                onClick={() => {
                  setSearch('');
                  setActiveTypes([]);
                  setShowOnlyFavorites(false);
                }}
                className="rounded-lg border border-[var(--line)] bg-[var(--chip)] px-4 py-2 text-xs font-semibold text-[var(--ink2)] cursor-pointer transition-colors hover:bg-[var(--hi)]"
              >
                Rensa allt
              </button>
            </div>
          )}

          <div className={animFlip ? 'luns-anim-a' : 'luns-anim-b'}>
            <MenuList
              sections={sections}
              searchTerms={terms}
              theme={theme}
              onToggleFavorite={toggleFavorite}
              onToggleStar={handleToggleStar}
            />
          </div>

          <div style={{ height: spacerHeight }} />
          </div>
        </main>
      </div>

      <MobileBar
        sheet={sheet}
        onOpen={setSheet}
        onClose={() => setSheet(null)}
        items={railItems}
        onSelectRestaurant={scrollToRestaurant}
        typeChips={typeChips}
        cravingChips={cravingChips}
        activeFilterCount={activeFilterCount}
        foodProfile={<FoodProfile {...foodProfileProps} size="touch" />}
      />

      {toast && (
        <div className="luns-toast fixed bottom-7 left-1/2 z-50 -translate-x-1/2 rounded-[10px] bg-[var(--ink)] px-[18px] py-2.5 text-[13px] font-semibold text-[var(--bg)] shadow-[0_8px_24px_rgba(0,0,0,.25)]">
          {toast}
        </div>
      )}

      {needsChoice && (
        <LocationWelcome locations={locations} onSelect={id => selectLocation(id, true)} />
      )}
    </div>
  );
}
