'use client';

import React, { useState, useEffect } from 'react';
import { FilterState } from './FilterPanel';

interface ActionBarProps {
  restaurants: string[];
  onFiltersChange: (filters: FilterState) => void;
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

export default function ActionBar({ restaurants, onFiltersChange }: ActionBarProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    selectedFoodTypes: [],
    selectedRestaurants: restaurants,
    searchTerm: '',
    todayOnly: false
  });

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      const isDark = JSON.parse(savedDarkMode);
      setIsDarkMode(isDark);
      // Apply to document
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Update parent when filters change
  React.useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);



  const toggleFoodType = (foodType: string) => {
    setFilters(prev => ({
      ...prev,
      selectedFoodTypes: prev.selectedFoodTypes.includes(foodType)
        ? prev.selectedFoodTypes.filter(type => type !== foodType)
        : [...prev.selectedFoodTypes, foodType]
    }));
  };

  const toggleRestaurant = (restaurant: string) => {
    setFilters(prev => ({
      ...prev,
      selectedRestaurants: prev.selectedRestaurants.includes(restaurant)
        ? prev.selectedRestaurants.filter(r => r !== restaurant)
        : [...prev.selectedRestaurants, restaurant]
    }));
  };

  const clearAllFilters = () => {
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

  const hasActiveFilters = filters.selectedFoodTypes.length > 0 || 
                          filters.selectedRestaurants.length < restaurants.length || 
                          filters.searchTerm.length > 0 || 
                          filters.todayOnly;

  return (
    <div>
      {/* Action Buttons Row */}
      <div className="flex items-center justify-between">
        {/* Left Side Buttons */}
        <div className="flex items-center space-x-3">
          {/* Filter Button */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
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
                {filters.selectedFoodTypes.length + (filters.searchTerm ? 1 : 0) + (filters.todayOnly ? 1 : 0)}
              </span>
            )}
          </button>
          
          {/* Favoriter Button */}
          <button className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-2 hover:shadow-md hover:bg-white dark:hover:bg-gray-800 active:scale-95 active:shadow-sm border border-gray-200 dark:border-gray-600 transform hover:-translate-y-0.5">
            <span>⭐</span>
            <span>Favoriter</span>
            {favoritesCount > 0 && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
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
              <span>📋</span>
              <span>{viewMode === 'cards' ? 'Kort' : 'Lista'}</span>
              <span className="text-xs">▼</span>
            </button>
            
            {/* Dropdown Menu */}
            {showViewDropdown && (
              <div className="absolute top-12 left-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 min-w-[120px]">
                <button
                  onClick={() => {
                    setViewMode('cards');
                    setShowViewDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                    viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                  } first:rounded-t-lg`}
                >
                  <span>📋</span>
                  <span>Kort</span>
                  {viewMode === 'cards' && <span className="ml-auto">✓</span>}
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    setShowViewDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                    viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                  } last:rounded-b-lg`}
                >
                  <span>📄</span>
                  <span>Lista</span>
                  {viewMode === 'list' && <span className="ml-auto">✓</span>}
                </button>
              </div>
            )}
            
            {/* Backdrop for dropdown */}
            {showViewDropdown && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowViewDropdown(false)}
              />
            )}
          </div>
        </div>

        {/* Right Side - Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-2 hover:shadow-md hover:bg-white dark:hover:bg-gray-800 active:scale-95 active:shadow-sm border border-gray-200 dark:border-gray-600 transform hover:-translate-y-0.5"
        >
          <span className="text-lg">{isDarkMode ? '☀️' : '🌙'}</span>
          <span>{isDarkMode ? 'Ljust' : 'Mörkt'}</span>
        </button>
      </div>

      {/* Filter Panel - Full width card below buttons with roller blind animation */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isFilterOpen ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 p-6 max-h-[600px] overflow-y-auto transform transition-all duration-300 ease-in-out ${
          isFilterOpen ? 'translate-y-0 scale-100' : '-translate-y-4 scale-98'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Filter menyer</h3>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>

          {/* Top Row: Search and Quick Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Search */}
            <div>
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

            {/* Quick Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Snabbfilter
              </label>
              <button
                onClick={() => setFilters(prev => ({ ...prev, todayOnly: !prev.todayOnly }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:shadow-md active:scale-95 active:shadow-sm transform hover:-translate-y-0.5 ${
                  filters.todayOnly
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-600 scale-105 ring-2 ring-blue-200 dark:ring-blue-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-102'
                }`}
                style={{
                  animationDelay: '200ms',
                  animation: isFilterOpen ? 'slideInUp 0.3s ease-out forwards' : 'none'
                }}
              >
                📅 Endast idag
              </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
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
              onClick={() => setIsFilterOpen(false)}
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