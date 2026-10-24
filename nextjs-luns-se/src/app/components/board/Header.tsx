'use client';

import React, { useEffect, useRef, useState } from 'react';
import { calendarWeek } from '../../lib/calendarWeek';
import LocationSelect from './LocationSelect';
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

  onOpenSettings: () => void;
  onOpenContact?: () => void;
  /** Finns det något oläst i nyhetslistan? Tänder pricken på kugghjulet. */
  newsUnread: boolean;
}

const CONTROL =
  'flex-none rounded-lg text-12 font-bold cursor-pointer whitespace-nowrap transition-colors';

/** Inställningsvalet har etikett på mobil och bara ikon på dator. */
const ICON_BUTTON =
  'flex-none min-h-11 w-full wide:h-[38px] wide:min-h-0 wide:w-[38px] rounded-lg border border-[var(--line)] bg-[var(--chip)] text-[var(--ink2)] cursor-pointer transition-colors hover:bg-[var(--hi)]';

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
  onOpenSettings,
  onOpenContact,
  newsUnread,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [week, setWeek] = useState<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const refresh = () => setWeek(calendarWeek());
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 760px)');
    const resize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', escape);
    desktop.addEventListener('change', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', escape);
      desktop.removeEventListener('change', resize);
    };
  }, [menuOpen]);

  const closeMenu = () => { setMenuOpen(false); menuButton.current?.focus(); };

  return (
    <header ref={headerRef} className="relative flex flex-wrap items-center gap-x-2 gap-y-2 px-3.5 pt-3 pb-2 wide:gap-x-3.5 wide:px-7 wide:pt-4 wide:pb-2.5">
      <div className="order-1 flex min-w-0 flex-1 items-center gap-2 wide:order-none wide:flex-none wide:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/luns-logo-transparent.png"
          alt="Luns"
          width={36}
          height={36}
          className="flex-none h-8 w-8 object-contain wide:h-9 wide:w-9"
        />
        <span className="hidden wide:inline font-mono text-16 font-semibold tracking-[.04em] text-[var(--acc)] wide:text-18">
          LUNS<span className="text-[var(--mut)]">.SE</span>
        </span>

        {locations.length > 1 && (
          <div className="min-w-0 flex-1 wide:order-2 wide:flex-none">
            <LocationSelect locations={locations} selected={selectedLocation}
              onSelect={id => { onSelectLocation(id); setMenuOpen(false); }} />
          </div>
        )}
        <div className="ml-auto flex flex-none flex-col items-end font-mono text-11 text-[var(--mut)] wide:ml-0 wide:flex-row wide:items-center wide:gap-2">
          <span className="whitespace-nowrap" title={weather.description}>
            {weather.emoji}{weather.temperature ? ` ${weather.temperature}` : ''}
          </span>
          {week !== null && <span className="whitespace-nowrap" title={`Aktuell kalendervecka: ${week}`} aria-label={`Aktuell vecka ${week}`}>v. {week}</span>}
        </div>
      </div>

      <button ref={menuButton} type="button" data-tour="settings"
        aria-label={menuOpen ? 'Stäng menyn' : (newsUnread ? 'Öppna menyn, något är nytt' : 'Öppna menyn')}
        aria-expanded={menuOpen} aria-controls="luns-header-tools"
        onClick={() => setMenuOpen(open => !open)}
        className="relative order-2 flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--chip)] text-[var(--ink2)] wide:hidden">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {menuOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
        {newsUnread && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--acc)]" />}
      </button>

      <div className="order-3 flex w-full flex-none gap-1.5 max-w-full wide:w-auto overflow-x-auto luns-scroll wide:order-none">
        {days.map(day => {
          const active = day === selectedDay;
          return (
            <button
              key={day}
              onClick={() => { onSelectDay(day); setMenuOpen(false); }}
              aria-pressed={active}
              className="min-h-11 flex-1 wide:min-h-0 wide:flex-none rounded-lg border px-[13px] py-[7px] text-12 cursor-pointer transition-colors"
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

      <div id="luns-header-tools"
        onBlur={event => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)
            && event.relatedTarget !== menuButton.current) setMenuOpen(false);
        }}
        className={`${menuOpen ? 'flex' : 'hidden'} absolute left-3.5 right-3.5 top-full z-40 max-h-[60dvh] flex-col gap-2 overflow-y-auto rounded-xl border border-[var(--glassBrd)] bg-[var(--bg)] p-3 shadow-lg wide:contents`}>
      <form role="search" className="flex min-w-0 gap-2 wide:flex-1 wide:basis-40"
        onSubmit={event => { event.preventDefault(); closeMenu(); }}>
      <input
        value={search}
        onChange={e => onSearch(e.target.value)}
        type="search" enterKeyHint="search"
        placeholder="Sök rätt eller restaurang…"
        aria-label="Sök rätt eller restaurang"
        className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--chip)] px-3 py-[9px] text-16 wide:text-13 text-[var(--ink)] outline-none focus:border-[var(--acc)] wide:order-none wide:basis-40 wide:px-3.5"
      />

        <button type="submit" className="min-h-11 rounded-lg bg-[var(--acc)] px-3 text-13 font-bold text-[var(--bg)] wide:hidden">Sök</button>
      </form>

      <button
        onClick={() => { onToggleView(); closeMenu(); }}
        title="Växla lista och karta"
        aria-pressed={view === 'map'}
        className={`${CONTROL} min-h-11 wide:min-h-0 border border-[var(--line)] px-3 py-[9px] wide:order-none wide:px-3.5`}
        style={{
          background: view === 'map' ? 'var(--accBg)' : 'var(--chip)',
          color: view === 'map' ? 'var(--accStrong)' : 'var(--ink2)',
        }}
      >
        <span className="wide:hidden">{view === 'map' ? 'Visa lunchlistan' : 'Visa karta'}</span>
        <span className="hidden wide:inline">{view === 'map' ? 'LISTA' : 'KARTA'}</span>
      </button>

      {onOpenContact && <button onClick={() => { closeMenu(); onOpenContact(); }} className={`${CONTROL} min-h-11 wide:min-h-0 border border-[var(--line)] bg-[var(--chip)] px-3 py-[9px] text-[var(--ink2)] hover:bg-[var(--hi)] wide:order-none`}>Tjôta med Luns</button>}

      <button
        onClick={() => { closeMenu(); onOpenSettings(); }}
        data-tour="settings"
        title={newsUnread ? 'Inställningar och info, något är nytt' : 'Inställningar och info'}
        aria-label={
          newsUnread ? 'Inställningar och info, något är nytt' : 'Inställningar och info'
        }
        className={`${ICON_BUTTON} relative inline-flex items-center justify-center gap-2`}
      >
        <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 3h5l.4 2.3 1.4.8 2.2-.8L21 9.7l-1.8 1.5v1.6l1.8 1.5-2.5 4.4-2.2-.8-1.4.8-.4 2.3h-5l-.4-2.3-1.4-.8-2.2.8L3 14.3l1.8-1.5v-1.6L3 9.7l2.5-4.4 2.2.8 1.4-.8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="text-12 font-bold wide:hidden">Inställningar och info</span>
        {newsUnread && (
          <span
            aria-hidden="true"
            className="absolute right-[5px] top-[5px] h-1.5 w-1.5 rounded-full bg-[var(--acc)]"
          />
        )}
      </button>
      </div>
      {search.trim() && (
        <div className="order-4 flex w-full items-center gap-2 rounded-lg bg-[var(--chip)] pl-3 text-12 text-[var(--ink2)] wide:hidden">
          <button onClick={() => setMenuOpen(true)} className="min-w-0 flex-1 truncate text-left" aria-label={`Ändra sökning: ${search}`}>Sök: {search}</button>
          <button onClick={() => onSearch('')} className="min-h-11 flex-none px-3 font-bold" aria-label="Rensa sökning">Rensa</button>
        </div>
      )}
    </header>
  );
}
