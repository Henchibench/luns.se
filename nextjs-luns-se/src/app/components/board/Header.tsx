'use client';

import React from 'react';
import type { LunsLocation } from '../../lib/menu';
import type { Weather } from '../../hooks/useWeather';

interface Props {
  days: readonly string[];
  selectedDay: string;
  onSelectDay: (day: string) => void;

  locations: LunsLocation[];
  selectedLocation: string | null;
  onSelectLocation: (id: string) => void;

  search: string;
  onSearch: (value: string) => void;

  weather: Weather;

  view: 'list' | 'map';
  onToggleView: () => void;

  theme: 'light' | 'dark';
  themeMounted: boolean;
  onToggleTheme: () => void;
}

const CONTROL =
  'flex-none rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition-colors';

export default function Header({
  days,
  selectedDay,
  onSelectDay,
  locations,
  selectedLocation,
  onSelectLocation,
  search,
  onSearch,
  weather,
  view,
  onToggleView,
  theme,
  themeMounted,
  onToggleTheme,
}: Props) {
  return (
    <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-3.5 pt-3 pb-2 wide:px-7 wide:pt-4 wide:pb-2.5">
      {/* På mobil radbryter headern ändå, så ordningen styrs om till tre täta
          rader: logga + tema, dagflikar, sök + knappar. I bredd nollställs
          order och allt ligger som i källan, på en rad. */}
      {/* Med temperaturen på plats fattas det sju pixlar för att logga,
          namn, väder, platsväljare och temaknapp ska rymmas på en rad vid
          375px. Logga, mellanrum och ordmärke krymper något på mobil så att
          temaknappen slipper hamna först på dagraden. */}
      <div className="order-1 flex flex-1 items-center gap-2.5 wide:order-none wide:flex-none wide:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/luns-logo-transparent.png"
          alt="Luns"
          width={36}
          height={36}
          className="flex-none h-8 w-8 object-contain wide:h-9 wide:w-9"
        />
        <span className="font-mono text-[16px] font-semibold tracking-[.04em] text-[var(--acc)] wide:text-[18px]">
          LUNS<span className="text-[var(--mut)]">.SE</span>
        </span>

        {/* Vädret avgör om man går ut och äter, så det står bredvid namnet. */}
        <span
          className="flex-none font-mono text-[11px] text-[var(--mut)] whitespace-nowrap"
          title={weather.description}
        >
          {weather.emoji}
          {weather.temperature ? ` ${weather.temperature}` : ''}
        </span>

        {locations.length > 1 && (
          <select
            value={selectedLocation ?? ''}
            onChange={e => onSelectLocation(e.target.value)}
            aria-label="Välj plats"
            className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--chip)] px-2 py-1.5 font-mono text-[11px] text-[var(--ink2)]"
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="order-3 flex flex-none gap-1.5 max-w-full overflow-x-auto luns-scroll wide:order-none">
        {days.map(day => {
          const active = day === selectedDay;
          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              aria-pressed={active}
              className="flex-none rounded-lg border px-[13px] py-[7px] text-[12.5px] cursor-pointer transition-colors"
              style={{
                background: active ? 'var(--acc)' : 'transparent',
                color: active ? 'var(--bg)' : 'var(--ink2)',
                borderColor: active ? 'var(--acc)' : 'var(--line)',
                fontWeight: active ? 700 : 400,
              }}
            >
              {day.slice(0, 3).toUpperCase()}
            </button>
          );
        })}
      </div>

      <input
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="⌕  Sök rätt eller restaurang…"
        aria-label="Sök rätt eller restaurang"
        className="order-4 min-w-0 flex-1 basis-[110px] rounded-lg border border-[var(--line)] bg-[var(--chip)] px-3 py-[9px] text-[13px] text-[var(--ink)] outline-none focus:border-[var(--acc)] wide:order-none wide:basis-40 wide:px-3.5"
      />

      <button
        onClick={onToggleView}
        title="Växla lista och karta"
        aria-pressed={view === 'map'}
        className={`${CONTROL} order-6 border border-[var(--line)] px-3 py-[9px] wide:order-none wide:px-3.5`}
        style={{
          background: view === 'map' ? 'var(--accBg)' : 'var(--chip)',
          color: view === 'map' ? 'var(--accStrong)' : 'var(--ink2)',
        }}
      >
        {view === 'map' ? 'LISTA' : 'KARTA'}
      </button>

      <button
        onClick={onToggleTheme}
        title="Ljust eller mörkt läge"
        aria-label={theme === 'dark' ? 'Byt till ljust läge' : 'Byt till mörkt läge'}
        className="order-2 flex-none h-[38px] w-[38px] rounded-lg border border-[var(--line)] bg-[var(--chip)] text-sm text-[var(--ink2)] cursor-pointer transition-colors hover:bg-[var(--hi)] wide:order-none"
      >
        {/* Ikonen får inte renderas före hydrering — den skiljer sig mellan
            servern och en besökare som redan valt mörkt läge. Knappen håller
            sin plats ändå, så raden hoppar inte. */}
        {themeMounted ? (theme === 'dark' ? '☀' : '☾') : ''}
      </button>
    </header>
  );
}
