'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  name: string;
  latitude: number;
  longitude: number;
  /** Rätter för vald dag. Visas i popupen. */
  dishCount: number;
}

interface Props {
  points: MapPoint[];
  theme: 'light' | 'dark';
  /** Klick på "Visa meny →" i popupen. Utelämnas i den lilla kortvyn. */
  onSelect?: (name: string) => void;
  /** Zoomnivå när det bara finns en nål. */
  singleZoom?: number;
  className?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Leaflet-karta med CARTO:s basemaps på OpenStreetMap-data.
 *
 * Handoffen bäddade in kartan som en iframe med postMessage tillbaka till
 * föräldern. Här är den en vanlig komponent i stället: samma utseende, men
 * data och tema kommer via props och klicken via en callback — ingen andra
 * datainläsning och ingen synk mellan två dokument.
 *
 * Leaflet importeras dynamiskt eftersom det rör window direkt, vilket inte
 * går vid den statiska exporten.
 */
export default function RestaurantMap({
  points,
  theme,
  onSelect,
  singleZoom = 16,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Callbacken ligger i en ref så en ny funktionsidentitet inte river kartan.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || points.length === 0) return;

    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    import('leaflet').then(mod => {
      const L = mod.default ?? mod;
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });

      const style = theme === 'dark' ? 'dark_all' : 'light_all';
      L.tileLayer(`https://basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`, {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 20,
      }).addTo(map);

      const bounds: [number, number][] = [];
      points.forEach(point => {
        const coords: [number, number] = [point.latitude, point.longitude];
        bounds.push(coords);

        // Pricken sitter på koordinaten, namnet bredvid. Med namnet centrerat
        // över punkten döljer etiketten precis det den ska peka ut.
        const marker = L.marker(coords, {
          icon: L.divIcon({
            className: 'luns-pin',
            html: `<i class="luns-pin-dot"></i><span class="luns-pin-label">${escapeHtml(point.name)}</span>`,
            iconSize: undefined,
          }),
          title: point.name,
        }).addTo(map!);

        if (!onSelectRef.current) return;

        const popup = document.createElement('div');
        const name = document.createElement('p');
        name.className = 'luns-pp-name';
        name.textContent = point.name;
        const meta = document.createElement('p');
        meta.className = 'luns-pp-meta';
        meta.textContent =
          point.dishCount > 0 ? `${point.dishCount} RÄTTER IDAG` : 'INGEN MENY IDAG';
        const button = document.createElement('button');
        button.className = 'luns-pp-btn';
        button.textContent = 'Visa meny →';
        button.onclick = () => onSelectRef.current?.(point.name);
        popup.append(name, meta, button);
        marker.bindPopup(popup);
      });

      if (bounds.length > 1) {
        // Etiketten växer åt höger från sin prick, så nålar längst österut
        // behöver mer luft på den sidan än på den västra.
        map.fitBounds(bounds, {
          paddingTopLeft: [24, 46],
          paddingBottomRight: [180, 46],
        });
      } else {
        map.setView(bounds[0], singleZoom);
      }

      // Kartan monteras ibland medan panelen fortfarande fälls ut, och mäter
      // då fel storlek. En omräkning när animationen är klar rättar det.
      setTimeout(() => map?.invalidateSize(), 260);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, theme, singleZoom]);

  if (points.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-[var(--glassBrd)] ${className}`}
      >
        <span className="px-6 text-center font-mono text-[10.5px] leading-[1.6] tracking-[.1em] text-[var(--mut)]">
          VI VET INTE VAR DEN LIGGER ÄN
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`luns-map rounded-2xl border border-[var(--glassBrd)] ${className}`}
    />
  );
}
