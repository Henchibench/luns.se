'use client';

import React, { useState, useEffect, useRef } from 'react';
import { trackEvent } from '../utils/analytics';
import { LocationDropdown } from './LocationPicker';
import ThemeToggle from './ThemeToggle';
import type { LunsLocation } from '../hooks/useLocation';
import type { FoodProfile } from '../hooks/useFoodProfile';
import { dishDisplayName, type FavoriteDish } from '../hooks/useDishFavorites';

export interface FilterState {
  selectedFoodTypes: string[];
  selectedRestaurants: string[];
  searchTerm: string;
  todayOnly: boolean;
}

interface ActionBarProps {
  restaurants: string[];
  onFiltersChange: (filters: FilterState) => void;
  viewMode: 'cards' | 'list';
  onViewModeChange: (mode: 'cards' | 'list') => void;
  favoritesCount: number;
  showOnlyFavorites: boolean;
  onShowOnlyFavoritesChange: (value: boolean) => void;
  locations: LunsLocation[];
  selectedLocation: LunsLocation | null;
  onLocationChange: (id: string) => void;
  foodProfile: FoodProfile;
  onToggleBoostType: (type: string) => void;
  onAddHideKeyword: (keyword: string) => void;
  onRemoveHideKeyword: (keyword: string) => void;
  onCopyMenu: () => void;
  favoriteDishes: FavoriteDish[];
  onRemoveDishFavorite: (restaurant: string, signature: string) => void;
  /** Held open by the what's-new tour while it spotlights the panel. */
  forceFilterOpen?: boolean;
}

const FOOD_TYPES = [
  { id: 'Kött', label: 'Kött', emoji: '🥩' },
  { id: 'Fisk', label: 'Fisk', emoji: '🐟' },
  { id: 'Vegetarisk', label: 'Vegetarisk', emoji: '🥗' },
  { id: 'Sallad', label: 'Sallad', emoji: '🥬' },
  { id: 'Veckans', label: 'Veckans', emoji: '⭐' },
  { id: 'Asiatisk', label: 'Asiatisk', emoji: '🍜' },
  { id: 'Indisk', label: 'Indisk', emoji: '🍛' },
  { id: 'Thai', label: 'Thai', emoji: '🌶️' },
  { id: 'Världen', label: 'Världens Kök', emoji: '🌍' }
];

const CRAVINGS = [
  { 
    id: 'hamburgare', 
    label: 'Hamburgare', 
    emoji: '🍔',
    searchTerms: ['burger', 'hamburgare', 'högrevsburgare', 'cheeseburger', 'veggieburger', 'veganburger', 'halloumiburger', 'kyckling', 'beef']
  },
  { 
    id: 'pasta', 
    label: 'Pasta', 
    emoji: '🍝',
    searchTerms: ['pasta', 'spaghetti', 'penne', 'carbonara', 'bolognese', 'marinara', 'pesto', 'nudlar']
  },
  { 
    id: 'pommes', 
    label: 'Pommes', 
    emoji: '🍟',
    searchTerms: ['pommes', 'potatis', 'fries', 'klyftpotatis', 'potatisklyftorr', 'rostade potatisar', 'wedges']
  },
  { 
    id: 'mos', 
    label: 'Mos', 
    emoji: '🥔',
    searchTerms: ['mos', 'potatismos', 'potatispure', 'potatispuré', 'smashed potatoes', 'krossad potatis']
  }
];

export default function ActionBar({ restaurants, onFiltersChange, viewMode, onViewModeChange, favoritesCount, showOnlyFavorites, onShowOnlyFavoritesChange, locations, selectedLocation, onLocationChange, foodProfile, onToggleBoostType, onAddHideKeyword, onRemoveHideKeyword, onCopyMenu, favoriteDishes, onRemoveDishFavorite, forceFilterOpen = false }: ActionBarProps) {
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [hideKeywordInput, setHideKeywordInput] = useState('');
  
  // Filter panel state
  const [isFilterOpenState, setIsFilterOpen] = useState(false);
  // The tour can hold the panel open without disturbing the user's own toggle,
  // so it returns to whatever state it was in once the tour moves on.
  const isFilterOpen = isFilterOpenState || forceFilterOpen;

  // Below md the controls collapse behind a menu button. The tour needs it open
  // too — on a phone the food profile sits behind both this and the filter panel.
  const [isMobileMenuOpenState, setIsMobileMenuOpen] = useState(false);
  const isMobileMenuOpen = isMobileMenuOpenState || forceFilterOpen;

  // The view-mode dropdown is absolutely positioned, so it would be clipped by
  // the menu's overflow-hidden. Release the clip once the open transition has
  // finished — during it the clip is what makes the collapse look right.
  const [mobileMenuSettled, setMobileMenuSettled] = useState(false);
  useEffect(() => {
    if (!isMobileMenuOpen) { setMobileMenuSettled(false); return; }
    const timer = window.setTimeout(() => setMobileMenuSettled(true), 320);
    return () => clearTimeout(timer);
  }, [isMobileMenuOpen]);
  const [filters, setFilters] = useState<FilterState>({
    selectedFoodTypes: [],
    selectedRestaurants: restaurants,
    searchTerm: '',
    todayOnly: false
  });

  // Ref for the filter panel container
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Update parent when filters change
  React.useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  // Keep the restaurant selection in step with the list we are given. This
  // fires on load and whenever the location changes — selecting restaurants
  // from a city you just left would filter everything away. Keyed on the
  // joined names because the parent builds a fresh array on every render.
  const restaurantKey = restaurants.join('|');
  useEffect(() => {
    setFilters(prev => ({ ...prev, selectedRestaurants: restaurants }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantKey]);

  // Click outside to close filter panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setIsMobileMenuOpen(false);
      }
    }

    // Not while the tour holds them open — its overlay counts as "outside" and
    // would close the panel the instant it was opened.
    if ((isFilterOpen || isMobileMenuOpen) && !forceFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isFilterOpen, isMobileMenuOpen, forceFilterOpen]);

  // Handle craving search
  const handleCravingSearch = (craving: typeof CRAVINGS[0]) => {
    // Set the search term to the main craving term
    // The backend will handle the variations
    setFilters(prev => ({
      ...prev,
      searchTerm: craving.label.toLowerCase()
    }));
    trackEvent('craving-search', { craving: craving.id });
    // Close the filter panel to show results
    setIsFilterOpen(false);
  };

  const toggleFilterPanel = () => {
    if (!isFilterOpen) trackEvent('filter-open');
    setIsFilterOpen(!isFilterOpen);
  };

  const toggleMobileMenu = () => {
    if (!isMobileMenuOpen) trackEvent('mobile-menu-open');
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleViewModeChange = (mode: 'cards' | 'list') => {
    trackEvent('view-mode-switch', { mode });
    onViewModeChange(mode);
    setShowViewDropdown(false);
  };

  const toggleFoodType = (foodType: string) => {
    setFilters(prev => ({
      ...prev,
      selectedFoodTypes: prev.selectedFoodTypes.includes(foodType)
        ? prev.selectedFoodTypes.filter(type => type !== foodType)
        : [...prev.selectedFoodTypes, foodType]
    }));
  };

  const toggleRestaurant = (restaurant: string) => {
    const wasSelected = filters.selectedRestaurants.includes(restaurant);
    trackEvent('restaurant-toggle', { restaurant, selected: !wasSelected });
    setFilters(prev => ({
      ...prev,
      selectedRestaurants: prev.selectedRestaurants.includes(restaurant)
        ? prev.selectedRestaurants.filter(r => r !== restaurant)
        : [...prev.selectedRestaurants, restaurant]
    }));
  };

  const clearAllFilters = () => {
    trackEvent('filter-clear');
    setFilters({
      selectedFoodTypes: [],
      selectedRestaurants: restaurants,
      searchTerm: '',
      todayOnly: false
    });
  };

  const selectAllRestaurants = () => {
    setFilters(prev => ({
      ...prev,
      selectedRestaurants: restaurants
    }));
  };

  const profileCount = foodProfile.boostTypes.length + foodProfile.hideKeywords.length + favoriteDishes.length;

  const hasActiveFilters = filters.selectedFoodTypes.length > 0 ||
                          filters.selectedRestaurants.length < restaurants.length ||
                          filters.searchTerm.length > 0 ||
                          profileCount > 0;

  const submitHideKeyword = () => {
    const kw = hideKeywordInput.trim();
    if (!kw) return;
    onAddHideKeyword(kw);
    setHideKeywordInput('');
  };

  return (
    <div className="relative" ref={filterPanelRef}>
      {/* Action Buttons Row
          The controls are rendered once. On desktop the wrapper is inline and
          the row reads as before; below md it takes the full width, which drops
          it onto its own line, and collapses behind the menu button. Rendering
          two copies would have been simpler but would give every data-tour
          target a hidden twin, and the tour spotlights whichever it finds
          first. */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Location Picker — stays visible: it is also the answer to "which
            city am I looking at?" */}
        <LocationDropdown
          locations={locations}
          selected={selectedLocation}
          onSelect={onLocationChange}
        />

        <button
          onClick={toggleMobileMenu}
          aria-expanded={isMobileMenuOpen}
          aria-label="Visa kontroller"
          className={`md:hidden backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-2 border active:scale-95 ${
            isMobileMenuOpen
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'
          }`}
        >
          <span>☰</span>
          <span>Meny</span>
          {hasActiveFilters && !isMobileMenuOpen && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
              {filters.selectedFoodTypes.length + (filters.searchTerm ? 1 : 0) + profileCount}
            </span>
          )}
        </button>

        <div
          className={`w-full md:w-auto transition-all duration-300 ease-in-out md:max-h-none md:opacity-100 ${
            mobileMenuSettled ? 'overflow-visible' : 'overflow-hidden'
          } md:overflow-visible ${
            isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 pt-1 md:pt-0">
          {/* Filter Button */}
          <button
            onClick={toggleFilterPanel}
            className={`backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 hover:shadow-md active:scale-95 active:shadow-sm border transform hover:-translate-y-0.5 ${
              hasActiveFilters 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800'
            } ${isFilterOpen ? 'ring-2 ring-blue-300 dark:ring-blue-600 shadow-lg' : ''}`}
          >
            <span>🔍</span>
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                {filters.selectedFoodTypes.length + (filters.searchTerm ? 1 : 0) + profileCount}
              </span>
            )}
          </button>
          
          {/* Favoriter Button */}
          <button
            onClick={() => onShowOnlyFavoritesChange(!showOnlyFavorites)}
            aria-pressed={showOnlyFavorites}
            title={showOnlyFavorites ? 'Visa alla restauranger' : 'Visa endast favoriter'}
            className={`backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-2 hover:shadow-md active:scale-95 active:shadow-sm border transform hover:-translate-y-0.5 ${
              showOnlyFavorites
                ? 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600'
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            <span>{showOnlyFavorites ? '⭐' : '☆'}</span>
            <span>Favoriter</span>
            {favoritesCount > 0 && (
              <span className={`text-xs px-2 py-1 rounded-full shadow-sm ${
                showOnlyFavorites ? 'bg-white/25 text-white' : 'bg-yellow-500 text-white'
              }`}>
                {favoritesCount}
              </span>
            )}
          </button>
          
          {/* View Toggle Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-2 hover:shadow-md hover:bg-white dark:hover:bg-gray-800 active:scale-95 active:shadow-sm border border-gray-200 dark:border-gray-600 transform hover:-translate-y-0.5"
            >
              <span>{viewMode === 'cards' ? '📋' : '📄'}</span>
              <span>{viewMode === 'cards' ? 'Kort' : 'Lista'}</span>
              <span className="text-xs">▼</span>
            </button>
            
            {/* Dropdown Menu */}
            {showViewDropdown && (
              <div className="absolute top-12 left-0 z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 min-w-[140px]">
                <button
                  onClick={() => handleViewModeChange('cards')}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                    viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                  } first:rounded-t-lg`}
                >
                  <span>📋</span>
                  <span>Restaurangkort</span>
                  {viewMode === 'cards' && <span className="ml-auto">✓</span>}
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                    viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                  } last:rounded-b-lg`}
                >
                  <span>📄</span>
                  <span>Kompakt lista</span>
                  {viewMode === 'list' && <span className="ml-auto">✓</span>}
                </button>
              </div>
            )}
            
            {/* Backdrop for dropdown */}
            {showViewDropdown && (
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setShowViewDropdown(false)}
              />
            )}
          </div>

          {/* Copy today's menu */}
          <button
            data-tour="copy-menu"
            onClick={onCopyMenu}
            title="Kopiera dagens meny som text — klistra in i Teams eller Slack"
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-2 hover:shadow-md hover:bg-white dark:hover:bg-gray-800 active:scale-95 active:shadow-sm border border-gray-200 dark:border-gray-600 transform hover:-translate-y-0.5"
          >
            <span>📤</span>
            <span>Kopiera dagens meny</span>
          </button>

          {/* Theme — a preference you set once, so it lives with the other
              controls rather than floating over the page forever. */}
          <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Filter Panel - Normal flow below action bar */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isFilterOpen ? `${restaurants.length > 8 ? 'max-h-[640px]' : 'max-h-max'} opacity-100` : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 p-6 ${
          restaurants.length > 8 ? 'max-h-[600px] overflow-y-auto' : ''
        } transform transition-all duration-300 ease-in-out ${
          isFilterOpen ? 'translate-y-0 scale-100' : '-translate-y-4 scale-98'
        }`}>


          {/* Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sök rätter
            </label>
            <input
              type="text"
              placeholder="t.ex. kyckling, pasta..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-300 focus:shadow-lg focus:scale-102 transform"
              style={{
                animationDelay: '150ms',
                animation: isFilterOpen ? 'slideInUp 0.3s ease-out forwards' : 'none'
              }}
            />
          </div>

          {/* Cravings */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cravings
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {CRAVINGS.map((craving, index) => (
                <button
                  key={craving.id}
                  onClick={() => handleCravingSearch(craving)}
                  className="px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-out flex flex-col items-center space-y-1 shadow-lg hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-gray-200 dark:shadow-gray-900 hover:scale-102"
                  style={{
                    animationDelay: `${200 + index * 50}ms`,
                    animation: isFilterOpen ? 'slideInUp 0.3s ease-out forwards' : 'none'
                  }}
                >
                  <span className="text-lg">{craving.emoji}</span>
                  <span className="text-xs text-center">{craving.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Food Types */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Matyp
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {FOOD_TYPES.map((foodType, index) => (
                <button
                  key={foodType.id}
                  onClick={() => toggleFoodType(foodType.id)}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-out flex flex-col items-center space-y-1 shadow-lg hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                    filters.selectedFoodTypes.includes(foodType.id)
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-600 shadow-blue-200 dark:shadow-blue-900 scale-105 ring-2 ring-blue-200 dark:ring-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-gray-200 dark:shadow-gray-900 hover:scale-102'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: isFilterOpen ? 'slideInUp 0.3s ease-out forwards' : 'none'
                  }}
                >
                  <span className="text-lg">{foodType.emoji}</span>
                  <span className="text-xs text-center">{foodType.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Food profile — remembered across visits, unlike the filters above */}
          <div data-tour="food-profile" className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Min matprofil
            </label>
            <p className="text-xs mb-3 text-gray-500 dark:text-gray-400">
              Sparas till nästa besök — tillämpas automatiskt varje gång du öppnar sidan.
            </p>

            <span className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-300">
              Visa först
            </span>
            <div className="flex flex-wrap gap-2 mb-4">
              {FOOD_TYPES.map(foodType => (
                <button
                  key={foodType.id}
                  onClick={() => onToggleBoostType(foodType.id)}
                  aria-pressed={foodProfile.boostTypes.includes(foodType.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 flex items-center gap-1 border active:scale-95 ${
                    foodProfile.boostTypes.includes(foodType.id)
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{foodType.emoji}</span>
                  <span>{foodType.label}</span>
                </button>
              ))}
            </div>

            <span className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-300">
              Dölj rätter som innehåller
            </span>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={hideKeywordInput}
                onChange={e => setHideKeywordInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitHideKeyword(); } }}
                placeholder="t.ex. fläsk, skaldjur..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={submitHideKeyword}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors active:scale-95"
              >
                Lägg till
              </button>
            </div>
            {foodProfile.hideKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {foodProfile.hideKeywords.map(keyword => (
                  <span
                    key={keyword}
                    className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700"
                  >
                    {keyword}
                    <button
                      onClick={() => onRemoveHideKeyword(keyword)}
                      aria-label={`Ta bort ${keyword}`}
                      className="hover:text-red-600 dark:hover:text-red-100 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Watched dishes — starred from the menu, listed here so they can be cleared */}
          {favoriteDishes.length > 0 && (
            <div className="mb-6 p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bevakade rätter
              </label>
              <p className="text-xs mb-3 text-gray-500 dark:text-gray-400">
                Du får veta när de — eller något snarlikt — dyker upp igen.
              </p>
              <div className="flex flex-wrap gap-2">
                {favoriteDishes.map(dish => (
                  <span
                    key={`${dish.restaurant}-${dish.signature}`}
                    className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-amber-300 dark:border-amber-700"
                  >
                    <span>⭐</span>
                    <span>
                      {dishDisplayName(dish)}
                      <span className="opacity-60"> · {dish.restaurant}</span>
                    </span>
                    <button
                      onClick={() => onRemoveDishFavorite(dish.restaurant, dish.signature)}
                      aria-label={`Sluta bevaka ${dishDisplayName(dish)}`}
                      className="font-bold hover:text-red-600 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Restaurants */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Restauranger ({filters.selectedRestaurants.length} av {restaurants.length})
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, selectedRestaurants: [] }))}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                  Välj inga
                </button>
                <button
                  onClick={selectAllRestaurants}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Välj alla
                </button>
              </div>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${
              restaurants.length > 8 ? 'max-h-48 overflow-y-auto' : 'max-h-fit'
            } bg-gray-50 dark:bg-gray-700 rounded-lg p-3`}>
              {restaurants.map((restaurant, index) => {
                const isSelected = filters.selectedRestaurants.includes(restaurant);
                return (
                  <div 
                    key={restaurant} 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-white dark:hover:bg-gray-600 rounded p-2 transition-all duration-300 hover:shadow-sm transform hover:scale-102"
                    onClick={() => toggleRestaurant(restaurant)}
                    style={{
                      animationDelay: `${index * 30}ms`,
                      animation: isFilterOpen ? 'slideInUp 0.3s ease-out forwards' : 'none'
                    }}
                  >
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all duration-200 ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600 animate-bounce-checkbox' 
                        : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'
                    }`}
                    style={{
                      animation: isSelected ? 'checkboxBounce 0.3s ease-out' : 'none'
                    }}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">
                      {restaurant}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={clearAllFilters}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-150 shadow-lg hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 shadow-gray-200 dark:shadow-gray-900"
            >
              Rensa alla
            </button>
            <button
              onClick={() => {
                trackEvent('filter-apply', {
                  foodTypes: filters.selectedFoodTypes,
                  restaurantCount: filters.selectedRestaurants.length,
                  hasSearch: !!filters.searchTerm.trim(),
                });
                setIsFilterOpen(false);
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-150 shadow-lg hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 shadow-blue-200 dark:shadow-blue-900"
            >
              Tillämpa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 