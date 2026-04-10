'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import InfoBanner from './components/InfoBanner';
import ActionBar, { FilterState } from './components/ActionBar';

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

// Get current day index (0=Monday, 4=Friday)
// Weekends (Saturday/Sunday) default to Monday (0)
function getCurrentDayIndex(): number {
  const today = new Date().getDay(); // 0=Sunday, 6=Saturday
  const mondayBasedDay = today === 0 ? 6 : today - 1; // Convert to Monday=0, Sunday=6
  if (mondayBasedDay > 4) { // Weekend (Saturday=5, Sunday=6)
    return 0; // Default to Monday for weekends
  }
  return mondayBasedDay;
}

const CURRENT_DAY = DAYS[getCurrentDayIndex()];

// Get available days (today and future days only)
function getAvailableDays(): string[] {
  const currentDayIndex = getCurrentDayIndex();
  return DAYS.slice(currentDayIndex);
}

// Craving search variations to match ActionBar.tsx
const CRAVING_VARIATIONS: Record<string, string[]> = {
  'hamburgare': ['burger', 'hamburgare', 'högrevsburgare', 'cheeseburger', 'veggieburger', 'veganburger', 'halloumiburger', 'kycklingburgare', 'smashed burger'],
  'pasta': ['pasta', 'spaghetti', 'penne', 'carbonara', 'bolognese', 'marinara', 'nudlar'],
  'pommes': ['pommes', 'fries', 'wedges', 'pommes frites', 'pommes frite'],
  'mos': ['mos', 'potatismos', 'potatispure', 'potatispuré', 'smashed potatoes', 'krossad potatis']
};

function parseMenuItem(item: string): MenuItem | null {
  if (item.startsWith('INFO:')) {
    return null; // Handle info separately
  }

  const parts = item.split('|');
  if (parts.length < 2) return null;

  const day = parts[0];
  const content = parts[1];

  // Extract category from <strong> tags
  const strongMatch = content.match(/<strong>(.*?)<\/strong>/);
  const category = strongMatch ? strongMatch[1] : 'Okänd';

  // Extract description (everything after the category)
  const description = content.replace(/<strong>.*?<\/strong>\s*-?\s*/, '').trim();

  return {
    day,
    category,
    description,
    original: item
  };
}

function recategorizePier11Items(restaurants: Restaurant[]): Restaurant[] {
  return restaurants.map(restaurant => {
    // Only apply to Pier 11 and restaurants with "Dagens" category
    if (!restaurant.name.includes('Pier 11')) {
      return restaurant;
    }

    // Group items by day to process each day separately
    const itemsByDay: Record<string, MenuItem[]> = {};
    restaurant.items.forEach(item => {
      if (!itemsByDay[item.day]) {
        itemsByDay[item.day] = [];
      }
      itemsByDay[item.day].push(item);
    });

    const recategorizedItems: MenuItem[] = [];

    Object.entries(itemsByDay).forEach(([day, dayItems]) => {
      const dagensItems = dayItems.filter(item => item.category === 'Dagens');
      const otherItems = dayItems.filter(item => item.category !== 'Dagens');

      if (dagensItems.length > 0) {
        // Split Dagens items into 3 groups based on typical order: Vegetarisk, Fisk, Kött
        const itemsPerCategory = Math.ceil(dagensItems.length / 3);

        dagensItems.forEach((item, index) => {
          let newCategory = 'Dagens'; // fallback

          if (index < itemsPerCategory) {
            newCategory = 'Vegetarisk';
          } else if (index < itemsPerCategory * 2) {
            newCategory = 'Fisk';
          } else {
            newCategory = 'Kött';
          }

          recategorizedItems.push({
            ...item,
            category: newCategory
          });
        });
      }

      // Add other items as-is
      recategorizedItems.push(...otherItems);
    });

    return {
      ...restaurant,
      items: recategorizedItems
    };
  });
}

function parseRestaurantInfo(items: string[], day: string): string[] {
  return items
    .filter(item => item.startsWith(`INFO:${day}`))
    .map(item => item.replace(/^INFO:[^-]*-\s*Restaurant Info:\s*/, ''))
    .map(item => item.trim());
}

function groupMenuItemsByCategory(restaurants: Restaurant[], selectedDay: string): Record<string, Array<MenuItem & { restaurantName: string }>> {
  const groupedItems: Record<string, Array<MenuItem & { restaurantName: string }>> = {};

  restaurants.forEach(restaurant => {
    const dayItems = restaurant.items.filter(item => item.day === selectedDay);

    dayItems.forEach(item => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push({
        ...item,
        restaurantName: restaurant.name
      });
    });
  });

  return groupedItems;
}

function CompactListView({ restaurants, hasActiveSearch }: {
  restaurants: Restaurant[];
  hasActiveSearch?: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState(CURRENT_DAY);
  const availableDays = getAvailableDays();

  // When searching, group all items from all restaurants by day first, then category
  // When not searching, use the existing selectedDay logic
  const groupedItems = hasActiveSearch
    ? restaurants.reduce((acc, restaurant) => {
        restaurant.items.forEach(item => {
          if (!acc[item.day]) {
            acc[item.day] = {};
          }
          if (!acc[item.day][item.category]) {
            acc[item.day][item.category] = [];
          }
          acc[item.day][item.category].push({
            ...item,
            restaurantName: restaurant.name
          });
        });
        return acc;
      }, {} as Record<string, Record<string, Array<MenuItem & { restaurantName: string }>>>)
    : groupMenuItemsByCategory(restaurants, selectedDay);

  const isEmpty = hasActiveSearch
    ? Object.keys(groupedItems).length === 0
    : Object.keys(groupedItems as Record<string, Array<MenuItem & { restaurantName: string }>>).length === 0;

  const containerClasses = "bg-white dark:bg-gray-200 rounded border border-gray-300 shadow-sm";
  const headerClasses = "bg-gray-100 dark:bg-gray-300 p-4 text-black rounded-t border-b border-gray-300";

  if (isEmpty) {
    return (
      <div className={containerClasses}>
        <div className={headerClasses}>
          <h2 className="font-bold text-xl">
            Kompakt lista - {hasActiveSearch ? 'Sökresultat' : selectedDay}
          </h2>
        </div>
        <div className="p-6 text-center">
          <div className="text-4xl mb-2">🍽️</div>
          <p className="font-medium mb-1 text-gray-700">
            {hasActiveSearch ? 'Inga sökresultat' : `Inga rätter för ${selectedDay.toLowerCase()}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={headerClasses}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-xl">
              Kompakt lista - {hasActiveSearch ? 'Sökresultat' : selectedDay}
            </h2>
            <p className="text-sm mt-1 text-gray-600">
              {hasActiveSearch
                ? 'Alla rätter från alla restauranger grupperade efter dag och typ'
                : 'Alla rätter från alla restauranger grupperade efter typ'
              }
            </p>
          </div>
        </div>

        {/* Day Selector - Hidden when showing search results */}
        {!hasActiveSearch && (
          <div className="flex space-x-2 overflow-x-auto overflow-y-visible">
            {availableDays.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-2 mt-1 mb-1 text-sm font-medium whitespace-nowrap transition-all duration-150 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                  selectedDay === day
                    ? 'bg-white text-gray-800 border-2 border-gray-400 rounded'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300 rounded'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}

        {/* Search Results Indicator */}
        {hasActiveSearch && (
          <div className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700">
            🔍 Sökresultat - visar alla dagar
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {hasActiveSearch ? (
          // Search results: Group by Day → Category → Items
          // Sort days in correct weekday order and filter to only available days
          Object.entries(groupedItems as Record<string, Record<string, Array<MenuItem & { restaurantName: string }>>>)
            .filter(([day]) => availableDays.includes(day))
            .sort(([dayA], [dayB]) => {
              const dayIndexA = DAYS.indexOf(dayA);
              const dayIndexB = DAYS.indexOf(dayB);
              return dayIndexA - dayIndexB;
            })
            .map(([day, categories]) => (
            <div key={day} className="space-y-3">
              <h2 className="font-bold text-lg text-gray-800 border-b border-gray-300 pb-2">
                {day}
              </h2>
              <div className="space-y-3 ml-2">
                {Object.entries(categories).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-base text-gray-700">
                      {category}
                    </h3>
                    <div className="space-y-2 ml-2">
                      {items.map((item, idx) => (
                        <div
                          key={`${item.restaurantName}-${idx}`}
                          className="flex justify-between items-start py-2 px-3 rounded-lg transition-colors hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed text-gray-600">
                              {item.description}
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                              {item.restaurantName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          // Normal view: Group by Category → Items
          Object.entries(groupedItems as Record<string, Array<MenuItem & { restaurantName: string }>>).map(([category, items]) => (
            <div key={category}>
              <h3 className="font-semibold mb-2 pb-1 border-b text-base text-gray-800 border-gray-300">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={`${item.restaurantName}-${idx}`}
                    className="flex justify-between items-start py-2 px-3 rounded-lg transition-colors hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-gray-700">
                        {item.description}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                        {item.restaurantName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant, allItems, originalRestaurant, hasActiveSearch }: {
  restaurant: Restaurant;
  allItems: string[];
  originalRestaurant?: Restaurant;
  hasActiveSearch?: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState(CURRENT_DAY);
  const [showMap, setShowMap] = useState(false);
  const [isContentChanging, setIsContentChanging] = useState(false);
  const [contentKey, setContentKey] = useState('');
  const availableDays = getAvailableDays();

  // When there's an active search, show all items from restaurant.items (which are already filtered by search)
  // Otherwise, filter by the selected day as before
  const displayedItems = hasActiveSearch ? restaurant.items : restaurant.items.filter(item => item.day === selectedDay);
  const todaysInfo = parseRestaurantInfo(allItems, selectedDay);

  // Group items by category normally, or by day first when searching
  const groupedItems = hasActiveSearch
    ? displayedItems.reduce((acc, item) => {
        if (!acc[item.day]) {
          acc[item.day] = {};
        }
        if (!acc[item.day][item.category]) {
          acc[item.day][item.category] = [];
        }
        acc[item.day][item.category].push(item);
        return acc;
      }, {} as Record<string, Record<string, MenuItem[]>>)
    : displayedItems.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, MenuItem[]>);

  // Simplified content change detection
  useEffect(() => {
    const newContentKey = JSON.stringify(groupedItems);
    if (contentKey && newContentKey !== contentKey) {
      setIsContentChanging(true);
      setTimeout(() => {
        setIsContentChanging(false);
      }, 400);
    }
    setContentKey(newContentKey);
  }, [groupedItems, contentKey]);

  const cardClasses = "bg-white dark:bg-gray-200 rounded border border-gray-300 shadow-sm overflow-visible";
  const headerClasses = "bg-gray-100 dark:bg-gray-300 p-4 text-black rounded-t border-b border-gray-300";

  return (
    <div className={cardClasses}>
      {/* Restaurant Header */}
      <div className={headerClasses}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-xl">{restaurant.name}</h2>

          {/* Action Buttons */}
          <div className="flex space-x-2 ml-4">
            {restaurant.location?.maps && (
              <button
                onClick={() => setShowMap(!showMap)}
                className="backdrop-blur-sm px-3 py-2 rounded text-sm font-medium transition-all duration-150 flex items-center space-x-1 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <span>🗺️</span>
                <span>Hitta hit!</span>
              </button>
            )}

            {restaurant.location?.website && (
              <a
                href={restaurant.location.website}
                target="_blank"
                rel="noopener noreferrer"
                className="backdrop-blur-sm px-3 py-2 text-sm font-medium transition-all duration-150 flex items-center hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded"
              >
                🏠
              </a>
            )}

            {restaurant.location?.instagram && (
              <a
                href={restaurant.location.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="backdrop-blur-sm px-3 py-2 text-sm font-medium transition-all duration-150 flex items-center hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded"
              >
                <img src="/instagram.svg" alt="Instagram" className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-1 mb-4 text-gray-700">
          {todaysInfo.map((info, index) => (
            <div key={index} className="text-sm">
              {info}
            </div>
          ))}
        </div>

        {/* Day Selector in Header - Hidden when showing search results */}
        {!hasActiveSearch && (
          <div className="flex space-x-2 overflow-x-auto overflow-y-visible">
            {availableDays.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-2 mt-1 mb-1 text-sm font-medium whitespace-nowrap transition-all duration-150 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                  selectedDay === day
                    ? 'bg-white text-gray-800 border-2 border-gray-400 rounded'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300 rounded'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}

        {/* Search Results Indicator */}
        {hasActiveSearch && (
          <div className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700">
            🔍 Sökresultat - visar alla dagar
          </div>
        )}
      </div>

      {/* Map Section - Animated slide down */}
      {restaurant.location?.maps && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out border-b border-gray-200 dark:border-gray-700 ${
            showMap ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`p-6 bg-gray-50 dark:bg-gray-700 border-b border-blue-200 dark:border-blue-600 transform transition-all duration-300 ease-in-out ${
            showMap ? 'translate-y-0 scale-100' : '-translate-y-4 scale-98'
          }`}>
            <iframe
              src={`https://maps.google.com/maps?q=lindholmen+${encodeURIComponent(restaurant.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              className="w-full h-96 border-none rounded-lg mb-3"
              allowFullScreen
              style={{
                animationDelay: '150ms',
                animation: showMap ? 'slideInUp 0.3s ease-out forwards' : 'none'
              }}
            />
            <a
              href={restaurant.location.maps}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-150 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5"
              style={{
                animationDelay: '200ms',
                animation: showMap ? 'slideInUp 0.3s ease-out forwards' : 'none'
              }}
            >
              Öppna i Google Maps
            </a>
          </div>
        </div>
      )}

      {/* Menu Content */}
      <div className="p-6 bg-white text-gray-800">
        <div className={`space-y-4 transition-opacity duration-400 ${isContentChanging ? 'opacity-50' : 'opacity-100'}`}>
          {Object.entries(groupedItems).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="font-medium mb-1 text-gray-700">
                Ingen meny för {selectedDay.toLowerCase()}
              </p>
              <p className="text-sm text-gray-600">
                Välj en annan dag eller kolla direkt med restaurangen
              </p>
            </div>
          ) : hasActiveSearch ? (
            // Search results: Group by Day → Category → Items (filtered to available days)
            Object.entries(groupedItems as Record<string, Record<string, MenuItem[]>>)
              .filter(([day]) => availableDays.includes(day))
              .map(([day, categories]) => (
              <div key={day} className="space-y-3">
                <h2 className="font-bold text-lg text-gray-800 border-b border-gray-300 pb-2">
                  {day}
                </h2>
                <div className="space-y-3 ml-2">
                  {Object.entries(categories).map(([category, items]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-base text-gray-700">
                        {category}
                      </h3>
                      <div className="space-y-2 ml-2">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-sm leading-relaxed text-gray-600"
                          >
                            {item.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Normal view: Group by Category → Items
            Object.entries(groupedItems as Record<string, MenuItem[]>).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h3 className="font-semibold text-base text-gray-800 border-b border-gray-300 pb-1">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-sm leading-relaxed text-gray-700"
                    >
                      {item.description}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [rawMenus, setRawMenus] = useState<Record<string, string[]>>({});
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    selectedFoodTypes: [],
    selectedRestaurants: [],
    searchTerm: '',
    todayOnly: false
  });
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Back to top button state
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNearFooter, setIsNearFooter] = useState(false);

  // Animation state for restaurant cards
  const [displayedRestaurants, setDisplayedRestaurants] = useState<Restaurant[]>([]);
  const [exitingRestaurants, setExitingRestaurants] = useState<Set<string>>(new Set());
  const [isFiltering, setIsFiltering] = useState(false);
  const currentDisplayedRef = useRef<Restaurant[]>([]);

  // Filter restaurants based on current filter state
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // Scroll detection for back to top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const windowHeight = window.innerHeight;

      // Show button after scrolling past 400px (roughly past the filter section)
      setShowBackToTop(scrollTop > 400);

      // Calculate scroll progress (0-100%)
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(Math.min(progress, 100));

      // Check if we're near the footer (within 200px of bottom)
      const distanceFromBottom = docHeight - scrollTop;
      setIsNearFooter(distanceFromBottom < 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Apply filters with proper enter/exit animations
  useEffect(() => {
    if (restaurants.length === 0) {
      // Initial load - no animation
      setFilteredRestaurants(restaurants);
      setDisplayedRestaurants(restaurants);
      currentDisplayedRef.current = restaurants;
      return;
    }

    // Calculate what the new filtered results should be
    let newFiltered = restaurants;

    // Filter by selected restaurants (only show selected ones)
    newFiltered = newFiltered.filter(restaurant =>
      filters.selectedRestaurants.includes(restaurant.name)
    );

    // Apply filtering to each restaurant's items
    newFiltered = newFiltered.map(restaurant => {
      let filteredItems = restaurant.items;

      // If there's a search term, search across ALL days and ignore todayOnly filter
      if (filters.searchTerm.trim()) {
        const searchLower = filters.searchTerm.toLowerCase();

        // Check if the search term matches a craving, if so use all variations
        const searchTerms = CRAVING_VARIATIONS[searchLower] || [searchLower];

        filteredItems = filteredItems.filter(item =>
          searchTerms.some(term =>
            item.description.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term)
          )
        );
      }

      // Filter by food types (only show restaurants that serve this type TODAY)
      if (filters.selectedFoodTypes.length > 0) {
        filteredItems = filteredItems.filter(item =>
          // Only include items for the current day when filtering by food type
          item.day === CURRENT_DAY &&
          filters.selectedFoodTypes.some(foodType =>
            item.category.includes(foodType) || item.description.includes(foodType)
          )
        );
      }

      return {
        ...restaurant,
        items: filteredItems
      };
    }).filter(restaurant => restaurant.items.length > 0); // Only show restaurants with matching items

    // Determine which restaurants are exiting
    const currentRestaurantNames = new Set(currentDisplayedRef.current.map(r => r.name));
    const newRestaurantNames = new Set(newFiltered.map(r => r.name));
    const restaurantsToExit = Array.from(currentRestaurantNames).filter(name => !newRestaurantNames.has(name));

    if (restaurantsToExit.length > 0) {
      // Phase 1: Mark restaurants for exit animation
      setExitingRestaurants(new Set(restaurantsToExit));
      setIsFiltering(true);

      // Phase 2: After exit animation completes, update displayed restaurants
      setTimeout(() => {
        setDisplayedRestaurants(newFiltered);
        setFilteredRestaurants(newFiltered);
        currentDisplayedRef.current = newFiltered;
        setExitingRestaurants(new Set());
        setIsFiltering(false);
      }, 400); // Match fade-out animation duration
    } else {
      // No restaurants exiting, just show new ones (entering animation)
      setDisplayedRestaurants(newFiltered);
      setFilteredRestaurants(newFiltered);
      currentDisplayedRef.current = newFiltered;
      setIsFiltering(false);
    }
  }, [restaurants, filters]);

  useEffect(() => {
    Promise.all([
      fetch('/data/menus.json').then(r => r.json()),
      fetch('/data/restaurants.json').then(r => r.json())
    ])
      .then(([menusData, restaurantsData]: [ApiResponse, any]) => {
        const parsedRestaurants: Restaurant[] = Object.entries(menusData.menus).map(([name, items]) => ({
          name,
          items: items.map(parseMenuItem).filter((item): item is MenuItem => item !== null),
          info: [], // Will be computed per day
          location: restaurantsData.restaurants[name]
        }));

        // Apply Pier 11 recategorization
        const recategorizedRestaurants = recategorizePier11Items(parsedRestaurants);

        setRawMenus(menusData.menus);
        setRestaurants(recategorizedRestaurants);
        setFilters(prev => ({
          ...prev,
          selectedRestaurants: parsedRestaurants.map(r => r.name)
        }));
        setLoading(false);
        setLastFetch(new Date());
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#002933]">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/80"></div>
          </div>
          <p className="text-white text-lg">Laddar menyer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen transition-colors duration-300 flex items-center justify-center bg-[#002933]">
        <div className="text-center p-8 rounded-lg shadow-lg border bg-white border-gray-300">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Något gick fel</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

      return (
      <div className="min-h-screen relative bg-[#002933]">

      {/* Brand Title */}
       <div className="relative z-10">
         <div className="max-w-7xl mx-auto px-4 py-12">
           <div className="text-center">
             <img
               src="/luns-logo-transparent.png"
               alt="Luns.se"
               className="h-64 mx-auto mb-0"
             />
           </div>
         </div>
       </div>

      {/* Content Container */}
      <div className="relative z-10">
                 {/* Dashboard Section - Info Banner with Controls */}
         <div className="max-w-4xl mx-auto px-4 py-2 relative z-50">
           <div className="backdrop-blur-sm rounded-xl shadow-lg border p-6 bg-white/95 border-gray-300">
             <InfoBanner />

             {/* Action Bar */}
             <div className="mt-6">
               <ActionBar
                 restaurants={restaurants.map(r => r.name)}
                 onFiltersChange={handleFiltersChange}
                 viewMode={viewMode}
                 onViewModeChange={setViewMode}
               />
             </div>
           </div>
         </div>

        {/* Restaurant Cards or List View */}
        <div className="max-w-4xl mx-auto px-4 py-4">
          {filteredRestaurants.length === 0 && !isFiltering ? (
            <div className="text-center py-16 rounded-xl shadow-lg border bg-white border-gray-300">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Inga resultat</h3>
              <p className="mb-4 text-gray-600">Prova att justera dina filter för att se fler alternativ.</p>
              <button
                onClick={() => setFilters({
                  selectedFoodTypes: [],
                  selectedRestaurants: restaurants.map(r => r.name),
                  searchTerm: '',
                  todayOnly: false
                })}
                className="px-4 py-2 rounded-lg transition-colors bg-teal-600 text-white hover:bg-teal-700"
              >
                Rensa alla filter
              </button>
            </div>
          ) : viewMode === 'list' ? (
            <CompactListView
              restaurants={displayedRestaurants}
              hasActiveSearch={!!filters.searchTerm.trim()}
            />
          ) : (
            <div className="space-y-4">
              {displayedRestaurants.map((restaurant, index) => {
                const isExiting = exitingRestaurants.has(restaurant.name);
                const isNew = !exitingRestaurants.has(restaurant.name) && !isFiltering;

                return (
                  <div
                    key={restaurant.name}
                    className={`overflow-hidden ${
                      isExiting
                        ? 'animate-fade-out-scale'
                        : 'animate-fade-in-scale'
                    }`}
                    style={{
                      animationDelay: isNew ? `${index * 150}ms` : '0ms'
                    }}
                  >
                    <RestaurantCard
                      restaurant={restaurant}
                      allItems={rawMenus[restaurant.name] || []}
                      originalRestaurant={restaurants.find(r => r.name === restaurant.name)}
                      hasActiveSearch={!!filters.searchTerm.trim()}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Status */}
        <footer className="relative z-50 backdrop-blur-sm border-t py-6 mt-16 bg-white/90 border-gray-300">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-6 text-sm mb-4 md:mb-0 text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Aktiv</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Uppdaterat idag</span>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm mb-2 text-gray-600">
                  Vibe kodad av Henkebus ❤️
                </p>
                <p className="text-sm mb-2 text-gray-600">
                  Frågor eller förbättringsförslag? Hör av dig på{' '}
                  <a
                    href="mailto:luns.se@outlook.com"
                    className="underline transition-colors hover:text-gray-800"
                  >
                    luns.se@outlook.com
                  </a>
                </p>

              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Smart Contextual Back to Top Button */}
      {showBackToTop && (
        <div className={`fixed ${isNearFooter ? 'bottom-32' : 'bottom-6'} right-6 xl:right-[calc(50%-32rem-3rem)] z-50 transition-all duration-500 transform ${
          showBackToTop ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <button
            onClick={scrollToTop}
            className="relative backdrop-blur-sm p-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 transform hover:-translate-y-1 border bg-white/90 text-gray-700 border-gray-300 hover:bg-white"
          >
            {/* Scroll Progress Ring with SVG Arrow */}
            <div className="relative w-8 h-8">
              {/* Progress Ring */}
              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="opacity-20"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 14}`}
                  strokeDashoffset={`${2 * Math.PI * 14 * (1 - scrollProgress / 100)}`}
                  className="transition-all duration-150 ease-out text-blue-600 dark:text-blue-400"
                />
              </svg>
              {/* SVG Arrow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-current"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
