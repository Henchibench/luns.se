'use client';

import { useEffect, useState } from 'react';

const FALLBACK_LATITUDE = 57.7059;
const FALLBACK_LONGITUDE = 11.9359;

/** WMO-koder till emoji och svensk text. */
const WEATHER: Record<number, { emoji: string; description: string }> = {
  0: { emoji: '☀️', description: 'Klart' },
  1: { emoji: '🌤️', description: 'Mestadels klart' },
  2: { emoji: '⛅', description: 'Delvis molnigt' },
  3: { emoji: '☁️', description: 'Molnigt' },
  45: { emoji: '🌫️', description: 'Dimma' },
  48: { emoji: '🌫️', description: 'Rimfrost' },
  51: { emoji: '🌦️', description: 'Lätt duggregn' },
  53: { emoji: '🌦️', description: 'Duggregn' },
  55: { emoji: '🌧️', description: 'Kraftigt duggregn' },
  61: { emoji: '🌧️', description: 'Lätt regn' },
  63: { emoji: '🌧️', description: 'Regn' },
  65: { emoji: '🌧️', description: 'Kraftigt regn' },
  71: { emoji: '🌨️', description: 'Lätt snöfall' },
  73: { emoji: '❄️', description: 'Snöfall' },
  75: { emoji: '❄️', description: 'Kraftigt snöfall' },
  80: { emoji: '🌦️', description: 'Regnskurar' },
  81: { emoji: '🌧️', description: 'Kraftiga regnskurar' },
  95: { emoji: '⛈️', description: 'Åska' },
  96: { emoji: '⛈️', description: 'Åska med hagel' },
};

export interface Weather {
  emoji: string;
  /** "18°C", eller null innan svaret kommit. */
  temperature: string | null;
  description: string;
}

/**
 * Vädret för vald plats. Hämtas 500 ms efter montering så menyerna målas
 * först — det är dem man kom hit för.
 */
export function useWeather(latitude?: number, longitude?: number): Weather {
  const lat = latitude ?? FALLBACK_LATITUDE;
  const lon = longitude ?? FALLBACK_LONGITUDE;
  const [weather, setWeather] = useState<Weather>({
    emoji: '🌡️',
    temperature: null,
    description: '',
  });

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Europe/Stockholm`
        );
        const data = await response.json();
        if (cancelled || !data.current_weather) return;
        const info = WEATHER[data.current_weather.weathercode] ?? { emoji: '🌡️', description: '' };
        setWeather({
          emoji: info.emoji,
          temperature: `${Math.round(data.current_weather.temperature)}°C`,
          description: info.description,
        });
      } catch {
        // Vädret är utsmyckning. Misslyckas det får termometern stå kvar
        // utan temperatur i stället för att slänga upp ett fel.
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lat, lon]);

  return weather;
}
