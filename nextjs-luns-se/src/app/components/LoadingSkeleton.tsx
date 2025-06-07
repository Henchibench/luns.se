'use client';

import React from 'react';

export function InfoBannerSkeleton() {
  return (
    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-xl p-4 mb-6 shadow-lg animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Week Number Skeleton */}
        <div className="flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg p-3">
          <div className="w-6 h-6 bg-gray-300 rounded mr-2"></div>
          <div>
            <div className="w-12 h-3 bg-gray-300 rounded mb-1"></div>
            <div className="w-8 h-5 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Joke Skeleton */}
        <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-lg p-3">
          <div className="w-6 h-6 bg-gray-300 rounded mr-2 flex-shrink-0"></div>
          <div className="space-y-1 flex-1">
            <div className="w-full h-3 bg-gray-300 rounded"></div>
            <div className="w-3/4 h-3 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Countdown Skeleton */}
        <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-lg p-3">
          <div className="w-6 h-6 bg-gray-300 rounded mr-2 flex-shrink-0"></div>
          <div className="space-y-1 flex-1">
            <div className="w-full h-3 bg-gray-300 rounded"></div>
            <div className="w-2/3 h-3 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Weather Skeleton */}
        <div className="flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg p-3">
          <div className="w-6 h-6 bg-gray-300 rounded mr-2"></div>
          <div>
            <div className="w-16 h-3 bg-gray-300 rounded mb-1"></div>
            <div className="w-12 h-5 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FilterPanelSkeleton() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-gray-200 animate-pulse">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <div className="w-12 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
        <div className="w-20 h-4 bg-gray-300 rounded animate-pulse"></div>
      </div>
    </div>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-48 h-8 bg-gray-300 rounded"></div>
          <div className="flex space-x-2">
            <div className="w-20 h-8 bg-gray-300 rounded"></div>
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="w-full h-3 bg-gray-300 rounded"></div>
          <div className="w-3/4 h-3 bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* Day Selector Skeleton */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((day) => (
            <div key={day} className="w-16 h-8 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>

      {/* Menu Items Skeleton */}
      <div className="p-6 space-y-6">
        {[1, 2].map((section) => (
          <div key={section}>
            <div className="w-24 h-6 bg-gray-300 rounded mb-3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-gray-300 rounded"></div>
                    <div className="w-2/3 h-4 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 