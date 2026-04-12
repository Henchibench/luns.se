'use client';

import React, { useState, useEffect, useRef } from 'react';
import { trackEvent } from '../utils/analytics';
import ThemeToggle from './ThemeToggle';

export interface FilterState {
  selectedFoodTypes: string[];
  selectedRestaurants: string[];
  searchTerm: string;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: string[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const FOOD_TYPES = [
  { id: 'Kött', label: 'Kött' },
  { id: 'Fisk', label: 'Fisk' },
  { id: 'Vegetarisk', label: 'Vegetarisk' },
  { id: 'Sallad', label: 'Sallad' },
  { id: 'Veckans', label: 'Veckans' },
  { id: 'Asiatisk', label: 'Asiatisk' },
  { id: 'Indisk', label: 'Indisk' },
  { id: 'Thai', label: 'Thai' },
  { id: 'Världen', label: 'Världens Kök' },
];

const CRAVINGS = [
  { id: 'hamburgare', label: 'Hamburgare' },
  { id: 'pasta', label: 'Pasta' },
  { id: 'pommes', label: 'Pommes' },
  { id: 'mos', label: 'Mos' },
];

export default function FilterDrawer({ isOpen, onClose, restaurants, filters, onFiltersChange }: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [isClosing, setIsClosing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Sync local state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
      setIsClosing(false);
    }
  }, [isOpen, filters]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    trackEvent('filter-apply', {
      foodTypes: localFilters.selectedFoodTypes,
      cravings: localFilters.searchTerm || undefined,
      restaurantCount: localFilters.selectedRestaurants.length,
    });
    handleClose();
  };

  const handleCravingSearch = (label: string) => {
    setLocalFilters(prev => ({ ...prev, searchTerm: label.toLowerCase() }));
  };

  const toggleFoodType = (foodType: string) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedFoodTypes: prev.selectedFoodTypes.includes(foodType)
        ? prev.selectedFoodTypes.filter(t => t !== foodType)
        : [...prev.selectedFoodTypes, foodType],
    }));
  };

  const toggleRestaurant = (restaurant: string) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedRestaurants: prev.selectedRestaurants.includes(restaurant)
        ? prev.selectedRestaurants.filter(r => r !== restaurant)
        : [...prev.selectedRestaurants, restaurant],
    }));
    trackEvent('restaurant-toggle', {
      restaurant,
      selected: !localFilters.selectedRestaurants.includes(restaurant),
    });
  };

  const clearAll = () => {
    trackEvent('filter-clear');
    setLocalFilters({
      selectedFoodTypes: [],
      selectedRestaurants: restaurants,
      searchTerm: '',
    });
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="filter-drawer-overlay"
        onClick={handleClose}
        style={isClosing ? { opacity: 0, transition: 'opacity 0.28s ease-in' } : undefined}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`filter-drawer ${isClosing ? 'closing' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>Filter</h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 pb-28">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Sök rätter
            </label>
            <input
              type="text"
              placeholder="t.ex. kyckling, pasta..."
              value={localFilters.searchTerm}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full px-4 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Cravings */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Cravings
            </label>
            <div className="flex flex-wrap gap-2">
              {CRAVINGS.map((craving) => (
                <button
                  key={craving.id}
                  onClick={() => handleCravingSearch(craving.label)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                  style={{
                    borderColor: localFilters.searchTerm === craving.label.toLowerCase() ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: localFilters.searchTerm === craving.label.toLowerCase() ? 'var(--accent)' : 'var(--bg)',
                    color: localFilters.searchTerm === craving.label.toLowerCase() ? 'white' : 'var(--text)',
                  }}
                >
                  {craving.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food Types */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Matyp
            </label>
            <div className="flex flex-wrap gap-2">
              {FOOD_TYPES.map((foodType) => {
                const isActive = localFilters.selectedFoodTypes.includes(foodType.id);
                return (
                  <button
                    key={foodType.id}
                    onClick={() => toggleFoodType(foodType.id)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={{
                      borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: isActive ? 'var(--accent)' : 'var(--bg)',
                      color: isActive ? 'white' : 'var(--text)',
                    }}
                  >
                    {foodType.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Restaurants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
                Restauranger ({localFilters.selectedRestaurants.length} av {restaurants.length})
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setLocalFilters(prev => ({ ...prev, selectedRestaurants: [] }))}
                  className="text-xs font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  Välj inga
                </button>
                <button
                  onClick={() => setLocalFilters(prev => ({ ...prev, selectedRestaurants: restaurants }))}
                  className="text-xs font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  Välj alla
                </button>
              </div>
            </div>
            <div className="space-y-1 rounded-lg p-3" style={{ backgroundColor: 'var(--bg)' }}>
              {restaurants.map((restaurant) => {
                const isSelected = localFilters.selectedRestaurants.includes(restaurant);
                return (
                  <div
                    key={restaurant}
                    className="flex items-center gap-2 cursor-pointer rounded p-2 transition-colors"
                    onClick={() => toggleRestaurant(restaurant)}
                    style={{ color: 'var(--text)' }}
                  >
                    <div
                      className="w-4 h-4 border-2 rounded flex items-center justify-center transition-all flex-shrink-0"
                      style={{
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                        backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{restaurant}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Tema
            </label>
            <ThemeToggle />
          </div>
        </div>

        {/* Sticky Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 p-6 border-t flex gap-3"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <button
            onClick={clearAll}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            Rensa alla
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Tillämpa
          </button>
        </div>
      </div>
    </>
  );
}
