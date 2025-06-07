'use client';

import React, { useEffect, useState, useCallback } from 'react';
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

function RestaurantCard({ restaurant, allItems }: { restaurant: Restaurant; allItems: string[] }) {
  const [selectedDay, setSelectedDay] = useState(CURRENT_DAY);
  const [showMap, setShowMap] = useState(false);
  
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
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-blue-200 dark:border-blue-600 pb-2">
                  {category}
                </h3>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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
  const [filters, setFilters] = useState<FilterState>({
    selectedFoodTypes: [],
    selectedRestaurants: [],
    searchTerm: '',
    todayOnly: false
  });

  // Filter restaurants based on current filter state
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // Apply filters whenever restaurants or filters change
  useEffect(() => {
    let filtered = restaurants;

    // Filter by selected restaurants (only show selected ones)
    filtered = filtered.filter(restaurant => 
      filters.selectedRestaurants.includes(restaurant.name)
    );

    // Apply filtering to each restaurant's items
    filtered = filtered.map(restaurant => {
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

    setFilteredRestaurants(filtered);
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
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        {/* Header - Show immediately */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🍴</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Luns.se Modern</h1>
                <p className="text-gray-600 dark:text-gray-400">Lunch menyer för Lindholmen Science Park</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar - Show immediately */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Laddar...</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Uppdaterat idag</span>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                API v2.0.0
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton Content */}
        <div className="max-w-4xl mx-auto px-4 py-4">
          <InfoBannerSkeleton />
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-8">
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🍴</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Luns.se Modern</h1>
              <p className="text-gray-600 dark:text-gray-400">Lunch menyer för Lindholmen Science Park</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Aktiv</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Uppdaterat idag</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              API v2.0.0
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Section - Info Banner with Controls */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-700 p-6">
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {filteredRestaurants.length === 0 ? (
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
          <div className="space-y-8">
            {filteredRestaurants.map((restaurant, index) => (
              <RestaurantCard 
                key={index} 
                restaurant={restaurant} 
                allItems={rawMenus[restaurant.name] || []}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-300">
            Byggd med ❤️ för Lindholmen Science Park
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Modern version av luns.se • Powered by Next.js & FastAPI
          </p>
        </div>
      </div>
    </div>
  );
} 