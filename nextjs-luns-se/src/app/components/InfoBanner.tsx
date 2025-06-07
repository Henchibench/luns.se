'use client';

import React, { useState, useEffect } from 'react';

interface InfoBannerProps {}

const goteborgJokes = [
  "Varför kan en abborre och en mört inte få barn? För det blir abbört.",
  "Vad kallas de som jobbar extra inom Folktandvården? Vikaries.",
  "Båtmässan borde slås ihop med MC-mässan och byta namn till? Skepp O'hoj.",
  "Dom som äter fikon för magens skull kommer ju? Skita på sig när de upptäcker Microlax.",
  "Vad heter Finlands sämsta bärplockare? Maski Hallonen.",
  "Efter att man har undertecknat skilsmässopapperen får man? Varsitt ex.",
  "Vad blir det om man lagar bilen på en söndag? Söndagsbilaga.",
  "Körde i diket och väntar spänt på bärgningsbilen? Kan knappt bärga mig.",
  "Vad heter Rysslands snabbaste korvstoppare? Korv-ba'-tjoff.",
  "Vilket är det vanligaste dubbelnamnet i Kenya? Kenny-Jan.",
  "Vad får man om man kapar benen av en gås? S, eftersom den inte längre kan gå.",
  "Hade pengar att placera, startade då en rodeo för att få? Mycket avkastning.",
  "4 hundar och 1 dog. Vad heter din jycke? AB+, det är en blodhund.",
  "Vad sa engelsmannen när han klev in på klippoteket för en klippning? Are you free Sir?",
  "Vad heter Läderlappens utblottade kusin? Fattiglappen.",
  "Brittisk radioprogram? Engelska kanalen.",
  "Vad heter Läderlappens rika kusin? Tusenlappen.",
  "Dom planerar att bygga en lekplats för äldre med fotproblem! Du skojar, vad ska den lekplatsen heta då? Gikta!",
  "Varför finns det inga spårvagnar i London? De tycker det är trams.",
  "Vad heter McDonalds nya fiskburgare? Mc-rill.",
  "Vad gör tandläkaren på lunchen? Käkar.",
  "Vilket djur är jordens största? Eeeen-orm.",
  "Vad heter det när katten bajsar utanför kattlådan? Kissemiss."
];

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
      return `Nu har du 1 dag, ${hours} timmar och ${minutes} minuter på dig att bestämma luns`;
    } else {
      return `Nu har du ${days} dagar, ${hours} timmar och ${minutes} minuter på dig att bestämma luns`;
    }
  } else if (hours > 0) {
    return `Nu har du ${hours} timmar och ${minutes} minuter på dig att bestämma luns`;
  } else if (minutes > 0) {
    return `Nu har du ${minutes} minuter på dig att bestämma luns`;
  } else {
    return "Dags att bestämma luns nu nu nu!";
  }
}

export default function InfoBanner({}: InfoBannerProps) {
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [joke, setJoke] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('--°C');
  const [weatherCondition, setWeatherCondition] = useState<string>('');

  // Function to get weather emoji and description from WMO weather code
  const getWeatherInfo = (weatherCode: number) => {
    const weatherMap: { [key: number]: { emoji: string; description: string } } = {
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
      96: { emoji: '⛈️', description: 'Åska med hagel' }
    };
    
    return weatherMap[weatherCode] || { emoji: '🌡️', description: '' };
  };

  useEffect(() => {
    // Set week number
    setCurrentWeek(getWeekNumber());
    
    // Set random joke
    const randomJoke = goteborgJokes[Math.floor(Math.random() * goteborgJokes.length)];
    setJoke(randomJoke);
    
    // Update countdown immediately and then every minute
    const updateCountdown = () => setCountdown(getLunchCountdown());
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 60000);
    
    return () => {
      clearInterval(countdownInterval);
    };
  }, []);

  // Lazy load weather after main content loads
  useEffect(() => {
    const getWeather = async () => {
      try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=57.7059&longitude=11.9359&current_weather=true&timezone=Europe/Stockholm');
        const data = await response.json();
        
        if (data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const weatherCode = data.current_weather.weathercode;
          const weatherInfo = getWeatherInfo(weatherCode);
          
          setTemperature(`${temp}°C`);
          setWeatherCondition(`${weatherInfo.emoji} ${weatherInfo.description}`);
        }
      } catch (error) {
        console.log('Weather API error:', error);
        setTemperature('--°C');
        setWeatherCondition('🌡️');
      }
    };

    // Delay weather fetch by 500ms to not block main content
    const weatherTimer = setTimeout(getWeather, 500);
    
    return () => {
      clearTimeout(weatherTimer);
    };
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Week Number & Weather Combined */}
        <div className="flex items-center justify-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">📅 Vecka {currentWeek}</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{weatherCondition || '🌡️'} {temperature}</div>
          </div>
        </div>

        {/* Göteborg Joke */}
        <div className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
          <span className="text-2xl mr-2 flex-shrink-0">🤭</span>
          <div className="text-sm text-gray-700 dark:text-gray-200 leading-tight">
            {joke}
          </div>
        </div>

        {/* Lunch Countdown */}
        <div className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3">
          <span className="text-2xl mr-2 flex-shrink-0">⏰</span>
          <div className="text-sm text-gray-700 dark:text-gray-200 leading-tight">
            {countdown}
          </div>
        </div>

      </div>
    </div>
  );
} 