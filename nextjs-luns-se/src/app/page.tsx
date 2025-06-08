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

// A/B Test Toggle Component
function ABTestToggle({ isOldVersion, onToggle }: { isOldVersion: boolean; onToggle: (isOld: boolean) => void }) {
  const handleToggle = () => {
    const newVersion = !isOldVersion;
    // Store the new version in localStorage
    localStorage.setItem('lunsVersion', newVersion ? 'classic' : 'modern');
    // Reload the page to get fresh animation
    window.location.reload();
  };

  return (
    <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
      <span className={`text-sm font-medium transition-colors ${!isOldVersion ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
        Luns Experimental
      </span>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          isOldVersion ? 'bg-teal-600' : 'bg-blue-500 dark:bg-blue-600'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            isOldVersion ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={`text-sm font-medium transition-colors ${isOldVersion ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'}`}>
        Luns Classic
      </span>
    </div>
  );
}

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

function RestaurantCard({ restaurant, allItems, originalRestaurant, isOldVersion }: { 
  restaurant: Restaurant; 
  allItems: string[]; 
  originalRestaurant?: Restaurant;
  isOldVersion: boolean;
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

  const cardClasses = isOldVersion 
    ? "bg-white dark:bg-gray-200 rounded border border-gray-300 shadow-sm overflow-visible"
    : "bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-blue-200 dark:border-blue-700 overflow-visible";

  const headerClasses = isOldVersion
    ? "bg-gray-100 dark:bg-gray-300 p-4 text-black rounded-t border-b border-gray-300"
    : "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 p-6 text-black dark:text-white rounded-t-xl";

  return (
    <div className={cardClasses}>
      {/* Restaurant Header */}
      <div className={headerClasses}>
        <div className="flex items-start justify-between mb-4">
          <h2 className={`font-bold ${isOldVersion ? 'text-xl' : 'text-2xl'}`}>{restaurant.name}</h2>
          
          {/* Action Buttons */}
          <div className="flex space-x-2 ml-4">
            {restaurant.location?.maps && (
              <button
                onClick={() => setShowMap(!showMap)}
                className={`backdrop-blur-sm px-3 py-2 rounded text-sm font-medium transition-all duration-150 flex items-center space-x-1 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                  isOldVersion 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 rounded'
                    : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-gray-800'
                }`}
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
                className={`backdrop-blur-sm px-3 py-2 text-sm font-medium transition-all duration-150 flex items-center hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                  isOldVersion 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 rounded'
                    : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-gray-800'
                }`}
              >
                🏠
              </a>
            )}
            
            {restaurant.location?.instagram && (
              <a
                href={restaurant.location.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={`backdrop-blur-sm px-3 py-2 text-sm font-medium transition-all duration-150 flex items-center hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                  isOldVersion 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 rounded'
                    : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-gray-800'
                }`}
              >
                <img src="/instagram.svg" alt="Instagram" className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        
        <div className={`space-y-1 mb-4 ${isOldVersion ? 'text-gray-700' : 'text-gray-800 dark:text-gray-200'}`}>
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
              className={`px-3 py-2 mt-1 mb-1 text-sm font-medium whitespace-nowrap transition-all duration-150 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                selectedDay === day
                  ? isOldVersion
                    ? 'bg-white text-gray-800 border-2 border-gray-400 rounded'
                    : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border-2 border-white dark:border-gray-600 rounded-lg'
                  : isOldVersion
                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300 rounded'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Map Section - Same for both versions */}
      {showMap && restaurant.location?.maps && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <iframe
            src={restaurant.location.maps}
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full"
          />
        </div>
      )}

      {/* Menu Content */}
      <div className={`p-6 ${isOldVersion ? 'bg-white text-gray-800' : 'bg-white dark:bg-gray-800'}`}>
        <div className={`space-y-6 transition-opacity duration-400 ${isContentChanging ? 'opacity-50' : 'opacity-100'}`}>
          {Object.entries(groupedItems).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🍽️</div>
              <p className={`font-medium mb-1 ${isOldVersion ? 'text-gray-700' : 'text-gray-600 dark:text-gray-400'}`}>
                Ingen meny för {selectedDay.toLowerCase()}
              </p>
              <p className={`text-sm ${isOldVersion ? 'text-gray-600' : 'text-gray-500 dark:text-gray-500'}`}>
                Välj en annan dag eller kolla direkt med restaurangen
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className={`font-semibold ${isOldVersion ? 'text-lg text-gray-800 border-b border-gray-300 pb-1' : 'text-lg text-gray-900 dark:text-gray-100'}`}>
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`text-sm leading-relaxed ${isOldVersion ? 'text-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
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
  const [currentImageIndex] = useState(() => Math.floor(Math.random() * foodHeroImages.length));
  const [isOldVersion, setIsOldVersion] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedVersion = localStorage.getItem('lunsVersion');
      if (savedVersion) {
        return savedVersion === 'classic';
      }
    }
    return true; // Default to classic for new visitors
  });
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
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
        setHasInitiallyLoaded(true);
        setLastFetch(new Date());
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isOldVersion ? 'bg-[#002933]' : 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'}`}>
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
      <div className={`min-h-screen transition-colors duration-300 flex items-center justify-center ${isOldVersion ? 'bg-[#002933]' : 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'}`}>
        <div className={`text-center p-8 rounded-lg shadow-lg border ${isOldVersion ? 'bg-white border-gray-300' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
          <div className="text-4xl mb-4">❌</div>
          <h2 className={`text-xl font-semibold mb-2 ${isOldVersion ? 'text-gray-800' : 'text-gray-800 dark:text-gray-200'}`}>Något gick fel</h2>
          <p className={`${isOldVersion ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative transition-colors duration-500 ${isOldVersion ? 'bg-[#002933]' : 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'}`}>
      {/* Fixed Parallax Background - Only for modern version */}
      {!isOldVersion && (
        <>
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
        </>
      )}
      
             {/* Brand Title - Different for each version */}
       <div className="relative z-10">
         <div className="max-w-7xl mx-auto px-4 py-12">
           <div className="text-center">
             {isOldVersion ? (
               <img 
                 src="/luns-logo-transparent.png" 
                 alt="Luns.se" 
                 className={`h-64 mx-auto mb-0 ${hasInitiallyLoaded ? 'animate-title-to-top' : ''}`}
               />
             ) : (
               <h1 className={`text-6xl font-bold text-white drop-shadow-2xl tracking-wide mb-0 ${hasInitiallyLoaded ? 'animate-title-to-top' : ''}`}>
                 Luns.se
               </h1>
             )}
           </div>
         </div>
       </div>

      {/* Content Container - Scrolls up from below */}
      <div className="relative z-10 animate-scroll-up-content">
        {/* Header Section */}
        {/* <div className="relative">
          <div className="max-w-7xl mx-auto px-4 pb-6">
            <div className="text-center">
              <p className={`text-xl font-medium drop-shadow-lg opacity-90 animate-fade-in-delay -mt-1 ${isOldVersion ? 'text-white' : 'text-white'}`}>
                Lunch menyer för Lindholmen Science Park
              </p>
            </div>
          </div>
        </div> */}

                 {/* Dashboard Section - Info Banner with Controls */}
         <div className="max-w-4xl mx-auto px-4 py-2">
           <div className={`backdrop-blur-sm rounded-xl shadow-lg border p-6 ${
             isOldVersion 
               ? 'bg-white/95 border-gray-300' 
               : 'bg-gradient-to-br from-blue-50/95 to-indigo-100/95 dark:from-blue-900/95 dark:to-indigo-900/95 border-blue-200 dark:border-blue-700'
           }`}>
             <InfoBanner />
             
             {/* Action Bar and Version Toggle */}
             <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
               <div className="flex-1">
                 <ActionBar 
                   restaurants={restaurants.map(r => r.name)}
                   onFiltersChange={handleFiltersChange}
                 />
               </div>
               <div className="flex-shrink-0">
                 <ABTestToggle isOldVersion={isOldVersion} onToggle={setIsOldVersion} />
               </div>
             </div>
           </div>
         </div>

        {/* Restaurant Cards */}
        <div className="max-w-4xl mx-auto px-4 py-4">
          {filteredRestaurants.length === 0 && !isFiltering ? (
            <div className={`text-center py-16 rounded-xl shadow-lg border ${
              isOldVersion 
                ? 'bg-white border-gray-300' 
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
            }`}>
              <div className="text-6xl mb-4">🔍</div>
              <h3 className={`text-xl font-semibold mb-2 ${isOldVersion ? 'text-gray-800' : 'text-gray-800 dark:text-gray-200'}`}>Inga resultat</h3>
              <p className={`mb-4 ${isOldVersion ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>Prova att justera dina filter för att se fler alternativ.</p>
              <button 
                onClick={() => setFilters({
                  selectedFoodTypes: [],
                  selectedRestaurants: restaurants.map(r => r.name),
                  searchTerm: '',
                  todayOnly: false
                })}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isOldVersion 
                    ? 'bg-teal-600 text-white hover:bg-teal-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
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
                      isOldVersion={isOldVersion}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Status */}
        <footer className={`relative z-50 backdrop-blur-sm border-t py-6 mt-16 ${
          isOldVersion 
            ? 'bg-white/90 border-gray-300' 
            : 'bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className={`flex items-center space-x-6 text-sm mb-4 md:mb-0 ${isOldVersion ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
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
                <p className={`text-sm mb-2 ${isOldVersion ? 'text-gray-600' : 'text-gray-600 dark:text-gray-300'}`}>
                  Byggd med ❤️ för Lindholmen Science Park
                </p>
                {!isOldVersion && (
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
                )}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 