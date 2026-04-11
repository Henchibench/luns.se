'use client';

import React, { useState } from 'react';
import { trackEvent } from '../utils/analytics';

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

interface RestaurantSheetProps {
  restaurant: Restaurant;
  allItems: string[];
  selectedDay: string;
  isEven: boolean;
  hasActiveSearch: boolean;
  availableDays: string[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function parseRestaurantInfo(items: string[], day: string): string[] {
  return items
    .filter(item => item.startsWith(`INFO:${day}`))
    .map(item => item.replace(/^INFO:[^-]*-\s*Restaurant Info:\s*/, ''))
    .map(item => item.trim());
}

export default function RestaurantSheet({
  restaurant,
  allItems,
  selectedDay,
  isEven,
  hasActiveSearch,
  availableDays,
  isFavorite,
  onToggleFavorite,
}: RestaurantSheetProps) {
  const [showMap, setShowMap] = useState(false);

  const displayedItems = hasActiveSearch
    ? restaurant.items
    : restaurant.items.filter(item => item.day === selectedDay);

  const todaysInfo = parseRestaurantInfo(allItems, selectedDay);

  const groupedItems = hasActiveSearch
    ? displayedItems.reduce((acc, item) => {
        if (!acc[item.day]) acc[item.day] = {};
        if (!acc[item.day][item.category]) acc[item.day][item.category] = [];
        acc[item.day][item.category].push(item);
        return acc;
      }, {} as Record<string, Record<string, MenuItem[]>>)
    : displayedItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, MenuItem[]>);

  const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

  return (
    <div
      className="py-8 border-b"
      style={{
        backgroundColor: isEven ? 'var(--surface-alt)' : 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="restaurant-sheet-inner">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>
              {restaurant.name}
            </h2>
            <div className="w-8 h-0.5 mt-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
          </div>

          {/* Action Icons */}
          <div className="flex gap-1.5 ml-4">
            {/* Favorite heart */}
            <button
              onClick={onToggleFavorite}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors favorite-heart"
              style={{ backgroundColor: 'var(--bg)', color: isFavorite ? 'var(--accent)' : 'var(--text-muted)' }}
              title={isFavorite ? 'Ta bort favorit' : 'Lägg till favorit'}
            >
              {isFavorite ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              )}
            </button>
            {restaurant.location?.maps && (
              <button
                onClick={() => {
                  setShowMap(!showMap);
                  if (!showMap) trackEvent('map-open', { restaurant: restaurant.name });
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                title="Visa karta"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {restaurant.location?.website && (
              <a
                href={restaurant.location.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('external-link', { restaurant: restaurant.name, type: 'website' })}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                title="Hemsida"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {restaurant.location?.instagram && (
              <a
                href={restaurant.location.instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('external-link', { restaurant: restaurant.name, type: 'instagram' })}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                title="Instagram"
              >
                <img src="/instagram.svg" alt="Instagram" className="w-4 h-4 opacity-60" />
              </a>
            )}
          </div>
        </div>

        {/* Info */}
        {todaysInfo.length > 0 && (
          <div className="mb-4 space-y-1">
            {todaysInfo.map((info, index) => (
              <div key={index} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {info}
              </div>
            ))}
          </div>
        )}

        {hasActiveSearch && (
          <div className="mb-4 px-3 py-1.5 rounded-full text-xs font-medium inline-block" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
            Sökresultat &mdash; visar alla dagar
          </div>
        )}

        {/* Map */}
        {restaurant.location?.maps && (
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showMap ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
            <div style={{ backgroundColor: 'var(--bg)' }}>
              <iframe
                src={`https://maps.google.com/maps?q=lindholmen+${encodeURIComponent(restaurant.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-72 border-none"
                allowFullScreen
              />
              <div className="p-3">
                <a
                  href={restaurant.location.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Öppna i Google Maps
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Menu Content */}
        <div className="animate-content-fade">
          {Object.entries(groupedItems).length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Ingen meny för {selectedDay.toLowerCase()}
              </p>
            </div>
          ) : hasActiveSearch ? (
            <div className="space-y-4">
              {Object.entries(groupedItems as Record<string, Record<string, MenuItem[]>>)
                .filter(([day]) => availableDays.includes(day))
                .sort(([dayA], [dayB]) => DAYS.indexOf(dayA) - DAYS.indexOf(dayB))
                .map(([day, categories]) => (
                  <div key={day} className="space-y-2">
                    <h3 className="font-display text-base pb-1 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                      {day}
                    </h3>
                    {Object.entries(categories).map(([category, items]) => (
                      <div key={category} className="ml-2 space-y-0.5">
                        <h4 className="text-sm font-medium" style={{ color: 'var(--text)' }}>{category}</h4>
                        {items.map((item, idx) => (
                          <p key={idx} className="text-sm leading-relaxed ml-2" style={{ color: 'var(--text-muted)' }}>
                            {item.description}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedItems as Record<string, MenuItem[]>).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium pb-1 mb-1 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                    {category}
                  </h3>
                  {items.map((item, idx) => (
                    <p key={idx} className="text-sm leading-relaxed py-0.5" style={{ color: 'var(--text-muted)' }}>
                      {item.description}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
