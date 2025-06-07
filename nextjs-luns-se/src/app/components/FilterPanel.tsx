'use client';

import React, { useState, useEffect } from 'react';

interface FilterPanelProps {
  restaurants: string[];
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  selectedFoodTypes: string[];
  selectedRestaurants: string[];
  searchTerm: string;
  todayOnly: boolean;
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

export default function FilterPanel({ restaurants, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    selectedFoodTypes: [],
    selectedRestaurants: restaurants,
    searchTerm: '',
    todayOnly: false
  });

  // Update parent when filters change
  useEffect(() => {
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
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/80 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-2 shadow-md hover:bg-white/60 hover:shadow-sm active:scale-95 border border-gray-200"
      >
        <span>🔍</span>
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {filters.selectedFoodTypes.length + (filters.searchTerm ? 1 : 0) + (filters.todayOnly ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Filter Panel - Positioned absolutely to not affect layout */}
      {isOpen && (
        <div className="absolute top-12 left-0 right-0 mt-4 bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-h-[600px] overflow-y-auto z-50">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Filter menyer</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          {/* Top Row: Search and Quick Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sök rätter
              </label>
              <input
                type="text"
                placeholder="t.ex. kyckling, pasta..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Quick Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Snabbfilter
              </label>
              <button
                onClick={() => setFilters(prev => ({ ...prev, todayOnly: !prev.todayOnly }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filters.todayOnly
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                📅 Endast idag
              </button>
            </div>
          </div>

          {/* Food Types */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Matyp
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {FOOD_TYPES.map(foodType => (
                <button
                  key={foodType.id}
                  onClick={() => toggleFoodType(foodType.id)}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center space-y-1 ${
                    filters.selectedFoodTypes.includes(foodType.id)
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
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
              <label className="block text-sm font-medium text-gray-700">
                Restauranger ({filters.selectedRestaurants.length} av {restaurants.length})
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, selectedRestaurants: [] }))}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Välj inga
                </button>
                <button
                  onClick={selectAllRestaurants}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Välj alla
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
              {restaurants.map(restaurant => {
                const isSelected = filters.selectedRestaurants.includes(restaurant);
                return (
                  <div 
                    key={restaurant} 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-white rounded p-2 transition-colors"
                                         onClick={() => toggleRestaurant(restaurant)}
                  >
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-700 flex-1">
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
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Rensa alla
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Tillämpa
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 