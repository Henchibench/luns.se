'use client';

import React, { useState, useEffect } from 'react';

interface InfoBannerProps {}


function getWeekNumber(): number {
  const date = new Date();
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const jan4 = new Date(target.getFullYear(), 0, 4);
  const dayDiff = (target.getTime() - jan4.getTime()) / 86400000;
  return Math.ceil(dayDiff / 7) + 1;
}

function getLunchCountdown(): string {
  const now = new Date();
  const currentDay = now.getDay();

  let targetTime: Date;
  let daysToAdd = 0;

  if (currentDay === 0) { // Sunday
    daysToAdd = 1;
  } else if (currentDay === 6) { // Saturday
    daysToAdd = 2;
  } else { // Monday-Friday
    const todayLunchTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0);
    if (now <= todayLunchTime) {
      targetTime = todayLunchTime;
    } else {
      if (currentDay === 5) { // Friday
        daysToAdd = 3;
      } else {
        daysToAdd = 1;
      }
    }
  }

  if (daysToAdd > 0) {
    targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd, 11, 30, 0);
  }

  const diff = targetTime!.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    if (days === 1) {
      return `1 dag, ${hours} tim och ${minutes} min kvar att bestämma luns`;
    } else {
      return `${days} dagar, ${hours} tim och ${minutes} min kvar att bestämma luns`;
    }
  } else if (hours > 0) {
    return `${hours} tim och ${minutes} min kvar att bestämma luns`;
  } else if (minutes > 0) {
    return `${minutes} min kvar att bestämma luns`;
  } else {
    return "Dags att bestämma luns nu nu nu!";
  }
}

// Weather description from WMO code
function getWeatherDescription(weatherCode: number): string {
  const weatherMap: Record<number, string> = {
    0: 'Klart',
    1: 'Mestadels klart',
    2: 'Delvis molnigt',
    3: 'Molnigt',
    45: 'Dimma',
    48: 'Rimfrost',
    51: 'Lätt duggregn',
    53: 'Duggregn',
    55: 'Kraftigt duggregn',
    61: 'Lätt regn',
    63: 'Regn',
    65: 'Kraftigt regn',
    71: 'Lätt snöfall',
    73: 'Snöfall',
    75: 'Kraftigt snöfall',
    80: 'Regnskurar',
    81: 'Kraftiga regnskurar',
    95: 'Åska',
    96: 'Åska med hagel',
  };
  return weatherMap[weatherCode] || '';
}

export default function InfoBanner({}: InfoBannerProps) {
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [countdown, setCountdown] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [weatherCondition, setWeatherCondition] = useState<string>('');

  useEffect(() => {
    setCurrentWeek(getWeekNumber());

    const updateCountdown = () => setCountdown(getLunchCountdown());
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 60000);

    return () => clearInterval(countdownInterval);
  }, []);

  // Lazy load weather
  useEffect(() => {
    const getWeather = async () => {
      try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=57.7059&longitude=11.9359&current_weather=true&timezone=Europe/Stockholm');
        const data = await response.json();

        if (data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const desc = getWeatherDescription(data.current_weather.weathercode);
          setTemperature(`${temp}\u00B0`);
          setWeatherCondition(desc);
        }
      } catch (error) {
        console.log('Weather API error:', error);
      }
    };

    const weatherTimer = setTimeout(getWeather, 500);
    return () => clearTimeout(weatherTimer);
  }, []);

  return (
    <div className="space-y-3">
      {/* Week & Weather line */}
      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        <span className="font-medium">Vecka {currentWeek}</span>
        {temperature && (
          <>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span>{temperature} {weatherCondition && `\u2014 ${weatherCondition}`}</span>
          </>
        )}
      </div>

      {/* Countdown */}
      {countdown && (
        <p className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--accent)' }}>
          {countdown}
        </p>
      )}
    </div>
  );
}
