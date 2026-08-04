'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/board/Header';
import Rail, { RailItem } from './components/board/Rail';
import MenuList, { Section } from './components/board/MenuList';
import MobileBar, { SheetKind } from './components/board/MobileBar';
import RestaurantMap, { MapPoint } from './components/board/RestaurantMap';
import LocationWelcome from './components/board/LocationWelcome';
import WelcomeTour, { type TourStep } from './components/board/WelcomeTour';
import PrivacyNote from './components/board/PrivacyNote';
import SettingsOverlay from './components/board/SettingsOverlay';
import StatsOverlay from './components/board/StatsOverlay';
import FoodProfile from './components/board/FoodProfile';
import { ChipSpec } from './components/board/Chips';
import { useFavorites } from './hooks/useFavorites';
import { useFoodProfile } from './hooks/useFoodProfile';
import { useDishFavorites } from './hooks/useDishFavorites';
import { useLocation } from './hooks/useLocation';
import { useTheme } from './hooks/useTheme';
import { useWeather } from './hooks/useWeather';
import { useWelcome } from './hooks/useWelcome';
import {
  DAYS,
  categoryColor,
  currentDay,
  currentDayIndex,
  dateForDay,
  loadMenuData,
  type LunsLocation,
  type Restaurant,
} from './lib/menu';
import {
  CRAVINGS,
  TYPE_FILTERS,
  boostByProfile,
  cravingTerms,
  hiddenByProfile,
  matchesCravings,
  matchesSearch,
  matchesTypes,
  searchTerms as expandSearch,
} from './lib/filters';
import { trackEvent } from './utils/analytics';

/** Avstånd från huvudytans topp där en sektion räknas som den aktiva. */
const SPY_OFFSET = 70;
/** Där en vald restaurang hamnar när man scrollar till den. */
const SCROLL_OFFSET = 52;
/** Hur nära toppen sista restaurangen får komma. */
const HARD_STOP = 56;
/**
 * Känner igen att skrapans inforad redan innehåller öppettider.
 *
 * Tiderna kan komma från två håll: lunch_hours i restaurangdatan och INFO-rader
 * från skrapan. Har en restaurang båda hamnar de på samma rad och tiderna står
 * två gånger, med var sin klocka. Skrapans version vinner — den kommer från
 * restaurangens egen sida och uppdateras av sig själv.
 *
 * Klockan är signalen som räknas: skraporna sätter 🕐 på tider och 💰 på priser,
 * och det är just klockan som skulle dubbleras. Orden finns med som reserv om
 * någon skrapa slutar sätta emoji.
 */
const INFO_STATES_HOURS = /🕐|öppet|öppettid|lunch\s+serveras/i;

/**
 * Rundan tar bara upp det som är nytt och inte går att gissa sig till.
 * Dagflikar, sökfält och platsväljare förklarar sig själva och skulle bara
 * lägga klick mellan besökaren och maten.
 *
 * Varje steg har flera kandidater: vänsterspalten finns inte på mobil, så
 * där pekar samma steg på knappen som öppnar den. Saknas alla hoppas steget
 * över och räknaren justeras.
 */
const TOUR_STEPS: TourStep[] = [
  {
    // Platsvalet har redan hälsat välkommen och sagt att sajten är ombyggd.
    // Att upprepa det direkt efteråt vore att säga samma sak två gånger i
    // rad, så steget går rakt på vad rundan faktiskt ska visa.
    title: 'Det som är nytt',
    body: 'Ta en halv minut så visar vi det som inte syns direkt.',
  },
  {
    targets: ['[data-tour="rail"]', '[data-tour="rail-mobile"]'],
    title: 'Alla restauranger på en gång',
    // Formulerad så den stämmer i båda vyerna: på mobil pekar steget på
    // knappen som öppnar listan, och där följer ingenting med när man
    // scrollar. Det är en detalj man upptäcker på bred skärm ändå.
    body: 'Hela listan finns här. Klicka på ett namn så hoppar du direkt dit i menyn.',
  },
  {
    targets: ['[data-tour="cravings"]', '[data-tour="filter-mobile"]'],
    title: 'Sugen på något särskilt?',
    body: 'Välj burgare, pasta eller pommes, flera samtidigt går bra. Sidan letar efter synonymer också, så pasta hittar även spaghetti och lasagne.',
  },
  {
    targets: ['[data-tour="profile"]', '[data-tour="filter-mobile"]'],
    title: 'Matprofilen ligger kvar',
    body: 'Lyft fram det du gillar och göm det du inte äter. Till skillnad från filtren ovanför gäller den även nästa gång du kommer hit.',
  },
  {
    targets: ['[data-tour="favorite"]'],
    title: 'Favoritmarkera stället',
    body: 'Hjärtat sparar en restaurang. Sedan kan du filtrera fram bara dina favoriter när du inte orkar läsa hela listan.',
  },
  {
    targets: ['[data-tour="star"]'],
    title: 'Bevaka en rätt',
    body: 'Stjärnmärk en rätt du vill äta igen, så säger vi till när den dyker upp, även om restaurangen skrivit om den lite.',
  },
  {
    // Inget mål: sista steget är en avrundning, som det första.
    title: 'Allt stannar hos dig',
    body: 'Favoriter, matprofil och bevakade rätter sparas i din egen webbläsare. Det finns inget konto och ingen databas hos oss, och det du skriver i matprofilen skickas aldrig vidare. Besöksstatistiken sköts av Umami, som är cookiefri och inte följer dig mellan sajter.',
  },
];

export default function LunchBoard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [locations, setLocations] = useState<LunsLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [day, setDay] = useState<string>(currentDay());
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCravings, setActiveCravings] = useState<string[]>([]);
  const [activeRest, setActiveRest] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [animFlip, setAnimFlip] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    favorites,
    isFavorite,
    toggleFavorite,
    showOnlyFavorites,
    setShowOnlyFavorites,
    startWithFavorites,
    setStartWithFavorites,
  } = useFavorites();
  const { dishes: watchedDishes, isDishFavorite, toggleDishFavorite, removeDishFavorite } =
    useDishFavorites();
  const { profile, toggleBoostType, addHideKeyword, removeHideKeyword } = useFoodProfile();
  const { selected: location, needsChoice, selectLocation } = useLocation(locations);
  // mounted behövs inte längre: temaväxlaren bor i inställningsrutan, som
  // aldrig renderas på servern och därför inte kan visa fel ikon vid hydrering.
  const { theme, toggle: toggleTheme } = useTheme();
  // Rundan väntar tills data finns och platsvalet är gjort — annars pekar
  // den på en tom sida bakom välkomstrutan.
  const welcome = useWelcome(loading || needsChoice || restaurants.length === 0);
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

  const terms = useMemo(
    () => [...expandSearch(search), ...cravingTerms(activeCravings)],
    [search, activeCravings]
  );

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
          matchesCravings(d, restaurant.name, activeCravings) &&
          !hiddenByProfile(d, profile.hideKeywords)
      );
      return boostByProfile(kept, profile.boostTypes);
    },
    [day, search, activeTypes, activeCravings, profile.hideKeywords, profile.boostTypes]
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
            matchesCravings(d, restaurant.name, activeCravings) &&
            hiddenByProfile(d, profile.hideKeywords)
        ).length,
      0
    );
  }, [atLocation, day, search, activeTypes, activeCravings, profile.hideKeywords]);

  const filtering =
    search.trim().length > 0 ||
    activeTypes.length > 0 ||
    activeCravings.length > 0 ||
    showOnlyFavorites;

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

        const info = (restaurant.info[day] ?? []).join('  ·  ');

        return {
          name: restaurant.name,
          meta: INFO_STATES_HOURS.test(info) ? '' : restaurant.meta.lunch_hours ?? '',
          info,
          description: restaurant.meta.description ?? '',
          // "Ingen meny idag" gäller bara när inget filter är på. Med filter
          // på betyder tomt "inget matchade", och då är raden bara brus.
          empty: !filtering && !hasDayDishes,
          dailyOnly: restaurant.meta.daily_menu_only === true,
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
      // Padding-bottom läses av i stället för att hårdkodas. Den skiljer sig
      // mellan mobil och desktop och ändras när mobilens knapprad flyttas —
      // en konstant här driver tyst isär från verkligheten.
      const padding = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      const height = Math.max(0, main.clientHeight - last.offsetHeight - HARD_STOP - padding);
      setSpacerHeight(prev => (Math.abs(prev - height) > 1 ? height : prev));
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sections, view]);

  const handleToggleStar = useCallback(
    (restaurant: string, description: string) => {
      const wasStarred = isDishFavorite(restaurant, description);
      toggleDishFavorite(restaurant, description);
      flash(wasStarred ? 'Bevakning borttagen' : 'Rätten bevakas, du ser det när den serveras igen');
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

  // Chipsen skrev förut till sökfältet, som bara rymmer ett värde åt gången.
  // Nu är de ett eget filter och går att kombinera — burgare och pasta
  // samtidigt visar båda.
  const cravingChips: ChipSpec[] = useMemo(
    () =>
      CRAVINGS.map(c => ({
        id: c.id,
        label: c.label,
        active: activeCravings.includes(c.id),
        onClick: () => {
          // Räknas ut här och inte inne i uppdateraren — React kör den två
          // gånger i StrictMode, och då hade varje klick blivit två.
          const on = !activeCravings.includes(c.id);
          // Bara id:t, aldrig etiketten — den bär emoji och versaler och
          // skulle se ut som skrik i statistikrutan.
          trackEvent('craving-toggle', { craving: c.id, active: on });
          setActiveCravings(prev =>
            on ? [...prev, c.id] : prev.filter(x => x !== c.id)
          );
        },
      })),
    [activeCravings]
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
        <p className="text-[16px] font-semibold text-[var(--ink)]">Kunde inte läsa menydata</p>
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
  const activeFilterCount =
    activeTypes.length + activeCravings.length + (showOnlyFavorites ? 1 : 0);

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
        view={view}
        onToggleView={() => setView(v => (v === 'map' ? 'list' : 'map'))}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="grid min-h-0 grid-cols-1 wide:grid-cols-[270px_1fr]">
        <Rail
          items={railItems}
          onSelect={scrollToRestaurant}
          typeChips={typeChips}
          cravingChips={cravingChips}
          foodProfile={<FoodProfile {...foodProfileProps} />}
        />

        {/* pt-8 skjuter innehållet förbi uttoningen. Masken är genomskinlig de
            första 44 pixlarna, och dagrubriken låg på 14–46 — alltså i princip
            helt inne i den, vilket fick den att se blek ut. */}
        <main
          ref={mainRef}
          className={`luns-scroll overflow-y-auto px-4 pt-8 pb-[calc(100px+env(safe-area-inset-bottom,0px))] wide:px-7 wide:pb-10 ${
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

          {/* Listan renderas inte alls i kartvyn. Att bara dölja den lämnade
              en utfälld restaurangkarta igång bakom helkartan — en osynlig
              Leaflet-instans som ritar tiles man aldrig ser. */}
          {view === 'list' && (
          <div>
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
            <div className="mt-2.5 mb-1 flex items-center gap-2.5 rounded-lg bg-[var(--accBg)] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--accStrong)]">
              <span className="text-[var(--star)]">★</span>
              Bevakad rätt idag: {starredToday.join(' · ')}
            </div>
          )}

          {isEmpty && (
            <div className="py-[70px] text-center text-[var(--mut)]">
              <p className="mb-1.5 text-[16px] font-semibold text-[var(--ink2)]">
                Inga rätter matchar
              </p>
              <p className="mb-4 text-[13px]">Prova en annan dag eller rensa sök och filter</p>
              <button
                onClick={() => {
                  setSearch('');
                  setActiveTypes([]);
                  setActiveCravings([]);
                  setShowOnlyFavorites(false);
                }}
                className="rounded-lg border border-[var(--line)] bg-[var(--chip)] px-4 py-2 text-[12px] font-semibold text-[var(--ink2)] cursor-pointer transition-colors hover:bg-[var(--hi)]"
              >
                Rensa allt
              </button>
            </div>
          )}

          <div className={animFlip ? 'luns-anim-a' : 'luns-anim-b'}>
            <MenuList
              sections={sections}
              dayOffset={(DAYS as readonly string[]).indexOf(day) - currentDayIndex()}
              day={day}
              searchTerms={terms}
              theme={theme}
              onToggleFavorite={toggleFavorite}
              onToggleStar={handleToggleStar}
            />
          </div>

          <div style={{ height: spacerHeight }} />
          </div>
          )}
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

      {welcome.open && <WelcomeTour steps={TOUR_STEPS} onClose={welcome.close} />}

      {settingsOpen && (
        <SettingsOverlay
          onClose={() => setSettingsOpen(false)}
          startWithFavorites={startWithFavorites}
          onToggleStartWithFavorites={setStartWithFavorites}
          favoriteCount={favorites.length}
          theme={theme}
          onToggleTheme={toggleTheme}
          onRestartTour={welcome.restart}
          onOpenStats={() => setStatsOpen(true)}
          onOpenPrivacy={() => setPrivacyOpen(true)}
        />
      )}

      {privacyOpen && <PrivacyNote onClose={() => setPrivacyOpen(false)} />}

      {statsOpen && <StatsOverlay onClose={() => setStatsOpen(false)} />}
    </div>
  );
}
