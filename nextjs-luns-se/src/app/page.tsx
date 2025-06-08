'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import InfoBanner from './components/InfoBanner';
import ActionBar from './components/ActionBar';
import { FilterState } from './components/FilterPanel';
import { cachedFetch } from './utils/cache';
import { InfoBannerSkeleton, FilterPanelSkeleton, RestaurantCardSkeleton } from './components/LoadingSkeleton';

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
const CURRENT_DAY = DAYS[0]; // Monday for now

// Food hero images with photographer credits
const foodHeroImages = [
  {
    src: '/food-hero-1.jpg',
    photographer: 'Eiliv Aceron',
    photographerUrl: 'https://unsplash.com/@shootdelicious?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash',
    imageUrl: 'https://unsplash.com/photos/cooked-food-on-black-bowl-ZuIDLSz3XLg?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash'
  },
  {
    src: '/food-hero-2.jpg',
    photographer: 'Casey Lee',
    photographerUrl: 'https://unsplash.com/@simplethemes?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash',
    imageUrl: 'https://unsplash.com/photos/cooked-food-awj7sRviVXo?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash'
  },
  {
    src: '/food-hero-3.jpg',
    photographer: 'Victoria Shes',
    photographerUrl: 'https://unsplash.com/@victoriakosmo?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash',
    imageUrl: 'https://unsplash.com/photos/grilled-meat-and-vegetable-on-the-table-UC0HZdUitWY?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash'
  },
  {
    src: '/food-hero-4.jpg',
    photographer: 'Chad Montano',
    photographerUrl: 'https://unsplash.com/@briewilly?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash',
    imageUrl: 'https://unsplash.com/photos/pizza-on-chopping-board-MqT0asuoIcU?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash'
  }
]

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

function parseRestaurantInfo(items: string[], day: string): string[] {
  return items
    .filter(item => item.startsWith(`INFO:${day}`))
    .map(item => item.replace(/^INFO:[^-]*-\s*Restaurant Info:\s*/, ''))
    .map(item => item.trim());
}

function RestaurantCard({ restaurant, allItems, originalRestaurant }: { 
  restaurant: Restaurant; 
  allItems: string[]; 
  originalRestaurant?: Restaurant;
}) {
  const [selectedDay, setSelectedDay] = useState(CURRENT_DAY);
  const [showMap, setShowMap] = useState(false);
  const [isContentChanging, setIsContentChanging] = useState(false);
  const [contentKey, setContentKey] = useState('');
  
  const todaysItems = restaurant.items.filter(item => item.day === selectedDay);
  const todaysInfo = parseRestaurantInfo(allItems, selectedDay);
  
  // Group items by category
  const groupedItems = todaysItems.reduce((acc, item) => {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-blue-200 dark:border-blue-700 overflow-visible">
      {/* Restaurant Header */}
      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 p-6 text-black dark:text-white rounded-t-xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">{restaurant.name}</h2>
          
          {/* Action Buttons */}
          <div className="flex space-x-2 ml-4">
            {restaurant.location?.maps && (
              <button
                onClick={() => setShowMap(!showMap)}
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-1 hover:shadow-md hover:bg-white dark:hover:bg-gray-800 active:scale-95 active:shadow-sm transform hover:-translate-y-0.5"
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
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center hover:shadow-md hover:bg-white dark:hover:bg-gray-800 active:scale-95 active:shadow-sm transform hover:-translate-y-0.5"
              >
                🏠
              </a>
            )}
            
            {restaurant.location?.instagram && (
              <a
                href={restaurant.location.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center hover:shadow-md hover:bg-white dark:hover:bg-gray-800 active:scale-95 active:shadow-sm transform hover:-translate-y-0.5"
              >
                <img src="/instagram.svg" alt="Instagram" className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        
        <div className="space-y-1 text-gray-800 dark:text-gray-200 mb-4">
          {todaysInfo.map((info, index) => (
            <div key={index} className="text-sm">
              {info}
            </div>
          ))}
        </div>
        
        {/* Day Selector in Header */}
        <div className="flex space-x-2 overflow-x-auto overflow-y-visible">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-2 mt-1 mb-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                selectedDay === day
                  ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border-2 border-white dark:border-gray-600'
                  : 'bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 border-2 border-transparent backdrop-blur-sm'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Google Maps Dropdown */}
      {showMap && restaurant.location?.maps && (
        <div className="p-6 bg-gray-50 dark:bg-gray-700 border-b border-blue-200 dark:border-blue-600">
          <iframe
            src={`https://maps.google.com/maps?q=lindholmen+${encodeURIComponent(restaurant.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            className="w-full h-96 border-none rounded-lg mb-3"
            allowFullScreen
          />
          <a
            href={restaurant.location.maps}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-150 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5"
          >
            Öppna i Google Maps
          </a>
        </div>
      )}

      {/* Menu Items */}
      <div className="p-6">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">🍽️</div>
            <p>Ingen meny tillgänglig för {selectedDay}</p>
          </div>
        ) : (
          <div 
            className={`space-y-6 transition-all duration-400 ease-out ${
              isContentChanging ? 'opacity-60 scale-98' : 'opacity-100 scale-100'
            }`}
          >
            {Object.entries(groupedItems).map(([category, items], categoryIndex) => (
              <div 
                key={category} 
                className="space-y-3"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-blue-200 dark:border-blue-600 pb-2">
                  {category}
                </h3>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={`${item.description}-${index}`}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
                    >
                      <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [currentImageIndex] = useState(() => Math.floor(Math.random() * foodHeroImages.length));
  const [filters, setFilters] = useState<FilterState>({
    selectedFoodTypes: [],
    selectedRestaurants: [],
    searchTerm: '',
    todayOnly: false
  });

  // Animation state for restaurant cards
  const [displayedRestaurants, setDisplayedRestaurants] = useState<Restaurant[]>([]);
  const [exitingRestaurants, setExitingRestaurants] = useState<Set<string>>(new Set());
  const [isFiltering, setIsFiltering] = useState(false);
  const currentDisplayedRef = useRef<Restaurant[]>([]);

  // Filter restaurants based on current filter state
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

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

      // Filter by today only
      if (filters.todayOnly) {
        filteredItems = filteredItems.filter(item => item.day === CURRENT_DAY);
      }

      // Filter by food types
      if (filters.selectedFoodTypes.length > 0) {
        filteredItems = filteredItems.filter(item =>
          filters.selectedFoodTypes.some(foodType => 
            item.category.includes(foodType) || item.description.includes(foodType)
          )
        );
      }

      // Filter by search term
      if (filters.searchTerm.trim()) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredItems = filteredItems.filter(item =>
          item.description.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower)
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
      cachedFetch('/api/menus'),
      cachedFetch('/api/restaurants')
    ])
      .then(([menusData, restaurantsData]: [ApiResponse, any]) => {
        const parsedRestaurants: Restaurant[] = Object.entries(menusData.menus).map(([name, items]) => ({
          name,
          items: items.map(parseMenuItem).filter((item): item is MenuItem => item !== null),
          info: [], // Will be computed per day
          location: restaurantsData.restaurants[name]
        }));
        
        setRawMenus(menusData.menus);
        setRestaurants(parsedRestaurants);
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
      <div className="min-h-screen relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Loading screen that matches main design */}
        <div 
          className="fixed top-0 left-0 w-full h-screen"
          style={{
            backgroundImage: `url("${foodHeroImages[currentImageIndex].src}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
          }}
        >
          {/* Subtle darkening for text readability */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Brand Title - Matches animation start size */}
        <div className="relative z-10 flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white drop-shadow-2xl tracking-wide mb-8 transform scale-[1.8]">
              Luns.se
            </h1>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/80"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Något gick fel</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Fixed Parallax Background - Blurs as content focuses in */}
      <div 
        className="fixed top-0 left-0 w-full h-screen animate-focus-blur"
        style={{
          backgroundImage: `url("${foodHeroImages[currentImageIndex].src}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Subtle darkening for text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Photo Credit - Back in natural bottom position */}
      <div className="fixed bottom-4 right-4 z-40 text-xs text-white/90 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg opacity-80 hover:opacity-100 transition-opacity">
        Photo by{' '}
        <a 
          href={foodHeroImages[currentImageIndex].photographerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          {foodHeroImages[currentImageIndex].photographer}
        </a>
        {' '}on{' '}
        <a 
          href={foodHeroImages[currentImageIndex].imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          Unsplash
        </a>
      </div>
      
      {/* Brand Title - Starts centered, moves to top */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white drop-shadow-2xl tracking-wide mb-0 animate-title-to-top">
              Luns.se
            </h1>
          </div>
        </div>
      </div>

      {/* Content Container - Scrolls up from below */}
      <div className="relative z-10 animate-scroll-up-content">
        {/* Header Section */}
                  <div className="relative">
            <div className="max-w-7xl mx-auto px-4 pb-6">
              <div className="text-center">
                <p className="text-white text-xl font-medium drop-shadow-lg opacity-90 animate-fade-in-delay -mt-1">
                  Lunch menyer för Lindholmen Science Park
                </p>
              </div>
            </div>
          </div>

      {/* Dashboard Section - Info Banner with Controls */}
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="bg-gradient-to-br from-blue-50/95 to-indigo-100/95 dark:from-blue-900/95 dark:to-indigo-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200 dark:border-blue-700 p-6">
          <InfoBanner />
          
          {/* Action Bar integrated in blue banner */}
          <div className="mt-6">
            <ActionBar 
              restaurants={restaurants.map(r => r.name)}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        </div>
      </div>

      {/* Restaurant Cards */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {filteredRestaurants.length === 0 && !isFiltering ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Inga resultat</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Prova att justera dina filter för att se fler alternativ.</p>
            <button 
              onClick={() => setFilters({
                selectedFoodTypes: [],
                selectedRestaurants: restaurants.map(r => r.name),
                searchTerm: '',
                todayOnly: false
              })}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Rensa alla filter
            </button>
          </div>
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
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

        {/* Footer with Status */}
        <footer className="relative z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 py-6 mt-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400 mb-4 md:mb-0">
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
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                  Byggd med ❤️ för Lindholmen Science Park
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Background photography by {foodHeroImages.map((img, index) => (
                    <span key={index}>
                      <a href={img.photographerUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700 dark:hover:text-gray-300">
                        {img.photographer}
                      </a>
                      {index < foodHeroImages.length - 1 && ', '}
                    </span>
                  ))} on Unsplash
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 