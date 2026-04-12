'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import InfoBanner from './components/InfoBanner';
import StickyControlBar from './components/StickyControlBar';
import FilterDrawer, { FilterState } from './components/FilterDrawer';
import RestaurantSheet from './components/RestaurantSheet';
import CompactListView from './components/CompactListView';
import ThemeToggle from './components/ThemeToggle';
import { trackEvent } from './utils/analytics';
import { useFavorites } from './hooks/useFavorites';


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

  const controlStripRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  const { favorites, isFavorite, toggleFavorite, showOnlyFavorites, setShowOnlyFavorites } = useFavorites();

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

    if (showOnlyFavorites) {
      result = result.filter(r => favorites.includes(r.name));
    }

    setFilteredRestaurants(result);
  }, [restaurants, filters, favorites, showOnlyFavorites]);

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
  }, [loading]);

  // Track search input with debounce
  useEffect(() => {
    if (!filters.searchTerm.trim()) return;
    const timer = setTimeout(() => {
      trackEvent('search-input', { term: filters.searchTerm.trim() });
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    trackEvent('back-to-top');
  };

  const handleSearchChange = (term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
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
      <ThemeToggle />
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
      <div className="relative z-50 mt-4 mb-2">
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
          showOnlyFavorites={showOnlyFavorites}
          onToggleShowOnlyFavorites={() => setShowOnlyFavorites(!showOnlyFavorites)}
        />
      </div>

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
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </div>
        ) : (
          <div>
            {filteredRestaurants.map((restaurant, index) => (
              <div
                key={restaurant.name}
                className="restaurant-sheet"
              >
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
