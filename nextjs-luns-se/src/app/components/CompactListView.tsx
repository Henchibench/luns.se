'use client';

import React from 'react';

interface MenuItem {
  day: string;
  category: string;
  description: string;
  original: string;
}

interface Restaurant {
  name: string;
  items: MenuItem[];
  info: string[];
  location?: {
    name: string;
    area: string;
    website?: string;
    maps?: string;
    instagram?: string;
    has_menu: boolean;
  };
}

interface CompactListViewProps {
  restaurants: Restaurant[];
  selectedDay: string;
  availableDays: string[];
  hasActiveSearch: boolean;
  isFavorite: (name: string) => boolean;
  onToggleFavorite: (name: string) => void;
}

const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];

function groupMenuItemsByCategory(restaurants: Restaurant[], selectedDay: string): Record<string, Array<MenuItem & { restaurantName: string }>> {
  const groupedItems: Record<string, Array<MenuItem & { restaurantName: string }>> = {};

  restaurants.forEach(restaurant => {
    const dayItems = restaurant.items.filter(item => item.day === selectedDay);
    dayItems.forEach(item => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push({ ...item, restaurantName: restaurant.name });
    });
  });

  return groupedItems;
}

export default function CompactListView({ restaurants, selectedDay, availableDays, hasActiveSearch, isFavorite, onToggleFavorite }: CompactListViewProps) {
  const groupedItems = hasActiveSearch
    ? restaurants.reduce((acc, restaurant) => {
        restaurant.items.forEach(item => {
          if (!acc[item.day]) acc[item.day] = {};
          if (!acc[item.day][item.category]) acc[item.day][item.category] = [];
          acc[item.day][item.category].push({ ...item, restaurantName: restaurant.name });
        });
        return acc;
      }, {} as Record<string, Record<string, Array<MenuItem & { restaurantName: string }>>>)
    : groupMenuItemsByCategory(restaurants, selectedDay);

  const isEmpty = hasActiveSearch
    ? Object.keys(groupedItems).length === 0
    : Object.keys(groupedItems as Record<string, Array<MenuItem & { restaurantName: string }>>).length === 0;

  return (
    <div className="mx-5 md:mx-auto max-w-[750px]">
      <div className="rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>
            Kompakt lista &mdash; {hasActiveSearch ? 'Sökresultat' : selectedDay}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {hasActiveSearch
              ? 'Alla rätter grupperade efter dag och typ'
              : 'Alla rätter grupperade efter typ'}
          </p>
          {hasActiveSearch && (
            <div className="mt-3 px-3 py-1.5 rounded-full text-xs font-medium inline-block" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
              Sökresultat &mdash; visar alla dagar
            </div>
          )}
        </div>

        {isEmpty ? (
          <div className="p-8 text-center">
            <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
              {hasActiveSearch ? 'Inga sökresultat' : `Inga rätter för ${selectedDay.toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {hasActiveSearch ? (
              Object.entries(groupedItems as Record<string, Record<string, Array<MenuItem & { restaurantName: string }>>>)
                .filter(([day]) => availableDays.includes(day))
                .sort(([dayA], [dayB]) => DAYS.indexOf(dayA) - DAYS.indexOf(dayB))
                .map(([day, categories]) => (
                  <div key={day} className="space-y-3">
                    <h2 className="font-display text-lg pb-2 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                      {day}
                    </h2>
                    <div className="space-y-3 ml-2">
                      {Object.entries(categories).map(([category, items]) => (
                        <div key={category} className="space-y-1">
                          <h3 className="font-display text-base" style={{ color: 'var(--text)' }}>{category}</h3>
                          <div className="space-y-1 ml-2">
                            {items.map((item, idx) => (
                              <div key={`${item.restaurantName}-${idx}`} className="flex justify-between items-start py-2 px-3 rounded-lg">
                                <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                                <div className="ml-4 flex-shrink-0 flex items-center gap-1">
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                                    {item.restaurantName}
                                  </span>
                                  <button
                                    onClick={() => onToggleFavorite(item.restaurantName)}
                                    className="favorite-heart"
                                    style={{ color: isFavorite(item.restaurantName) ? 'var(--accent)' : 'var(--text-muted)' }}
                                  >
                                    {isFavorite(item.restaurantName) ? (
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                      </svg>
                                    )}
                                  </button>
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
              Object.entries(groupedItems as Record<string, Array<MenuItem & { restaurantName: string }>>).map(([category, items]) => (
                <div key={category}>
                  <h3 className="font-display text-base mb-2 pb-1 border-b" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {items.map((item, idx) => (
                      <div key={`${item.restaurantName}-${idx}`} className="flex justify-between items-start py-2 px-3 rounded-lg">
                        <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                        <div className="ml-4 flex-shrink-0 flex items-center gap-1">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                            {item.restaurantName}
                          </span>
                          <button
                            onClick={() => onToggleFavorite(item.restaurantName)}
                            className="favorite-heart"
                            style={{ color: isFavorite(item.restaurantName) ? 'var(--accent)' : 'var(--text-muted)' }}
                          >
                            {isFavorite(item.restaurantName) ? (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
