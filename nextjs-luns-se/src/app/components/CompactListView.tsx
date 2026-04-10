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

export default function CompactListView({ restaurants, selectedDay, availableDays, hasActiveSearch }: CompactListViewProps) {
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
                                <span className="ml-4 flex-shrink-0 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                                  {item.restaurantName}
                                </span>
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
                        <span className="ml-4 flex-shrink-0 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                          {item.restaurantName}
                        </span>
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
