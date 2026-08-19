'use client';

import React, { useEffect, useMemo, useRef } from 'react';
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

/** Avstånd från prickens mitt till etiketten. */
const LABEL_GAP = 11;
/** Prickens radie, för att räkna ut vilken yta den upptar. */
const DOT_RADIUS = 8;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * De fyra hållen en etikett kan ta. `css` placerar den, `offset` säger var
 * dess låda hamnar räknat från prickens mitt.
 */
const PLACEMENTS = [
  {
    css: { left: `${LABEL_GAP}px`, top: '0px', transform: 'translateY(-50%)' },
    offset: (w: number, h: number) => ({ x: LABEL_GAP, y: -h / 2 }),
  },
  {
    css: { left: `${-LABEL_GAP}px`, top: '0px', transform: 'translate(-100%, -50%)' },
    offset: (w: number, h: number) => ({ x: -LABEL_GAP - w, y: -h / 2 }),
  },
  {
    css: { left: '0px', top: `${-LABEL_GAP}px`, transform: 'translate(-50%, -100%)' },
    offset: (w: number, h: number) => ({ x: -w / 2, y: -LABEL_GAP - h }),
  },
  {
    css: { left: '0px', top: `${LABEL_GAP}px`, transform: 'translate(-50%, 0)' },
    offset: (w: number, h: number) => ({ x: -w / 2, y: LABEL_GAP }),
  },
];

function overlapArea(a: Rect, b: Rect): number {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return x > 0 && y > 0 ? x * y : 0;
}

/** Hur stor del av lådan som hamnar utanför kartan. */
function outsideArea(r: Rect, width: number, height: number): number {
  const inside = overlapArea(r, { left: 0, top: 0, right: width, bottom: height });
  return (r.right - r.left) * (r.bottom - r.top) - inside;
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

  /**
   * Nålarna, med en identitet som håller så länge innehållet gör det.
   *
   * Båda anropsplatserna bygger sin points-array under renderingen: sidan
   * räknar fram sin efter komponentens tidiga returer, där en hook inte får
   * stå, och menylistan skriver sin rakt i JSX inuti en map(). Arrayen är
   * alltså ny vid varje omritning även när nålarna är exakt desamma, och med
   * den som beroende revs hela Leaflet-kartan och byggdes upp igen varje gång.
   * Ett tecken i sökfältet räckte, trots att sökningen inte rör nålarna.
   *
   * Signaturen jämför innehåll i stället, så kartan byggs om när den behöver
   * det: nya restauranger, flyttade nålar, eller ett annat antal rätter i
   * popupen.
   */
  const signature = points
    .map(point => `${point.name}@${point.latitude},${point.longitude}:${point.dishCount}`)
    .join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pins = useMemo(() => points, [signature]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pins.length === 0) return;

    let map: import('leaflet').Map | null = null;
    let cancelled = false;
    let settle: ReturnType<typeof setTimeout> | null = null;

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
      const placedLabels: Array<{ point: MapPoint; marker: import('leaflet').Marker }> = [];

      pins.forEach(point => {
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
        placedLabels.push({ point, marker });

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

      /**
       * Låter varje etikett välja det håll som krockar minst.
       *
       * Prickarna ligger fast, så de läggs in som hinder först — en etikett
       * som täcker en annan restaurangs prick döljer just det kartan är till
       * för. Sedan placeras etiketterna en i taget och blir själva hinder för
       * dem som kommer efter. Restauranger med meny idag går först, så det är
       * de mindre intressanta namnen som får vika undan när det är trångt.
       *
       * Girigt, inte optimalt. Att lösa det exakt är NP-svårt och skillnaden
       * syns inte på tjugo nålar.
       */
      const layoutLabels = () => {
        if (!map) return;
        const size = map.getSize();
        const obstacles: Rect[] = [];
        const positions = new Map<
          (typeof placedLabels)[number],
          { x: number; y: number }
        >();

        placedLabels.forEach(entry => {
          const p = map!.latLngToContainerPoint([
            entry.point.latitude,
            entry.point.longitude,
          ]);
          positions.set(entry, { x: p.x, y: p.y });
          obstacles.push({
            left: p.x - DOT_RADIUS,
            top: p.y - DOT_RADIUS,
            right: p.x + DOT_RADIUS,
            bottom: p.y + DOT_RADIUS,
          });
        });

        const ordered = [...placedLabels].sort(
          (a, b) =>
            b.point.dishCount - a.point.dishCount ||
            a.point.name.localeCompare(b.point.name, 'sv')
        );

        ordered.forEach(entry => {
          const element = entry.marker.getElement();
          const label = element?.querySelector<HTMLElement>('.luns-pin-label');
          const position = positions.get(entry);
          if (!label || !position) return;

          const w = label.offsetWidth;
          const h = label.offsetHeight;

          let best = PLACEMENTS[0];
          let bestRect: Rect | null = null;
          let bestScore = Infinity;

          for (const placement of PLACEMENTS) {
            const { x, y } = placement.offset(w, h);
            const rect: Rect = {
              left: position.x + x,
              top: position.y + y,
              right: position.x + x + w,
              bottom: position.y + y + h,
            };
            // Att hamna utanför kartkanten väger tyngre än att snudda en
            // granne — en avklippt etikett går inte att läsa alls.
            const score =
              obstacles.reduce((sum, o) => sum + overlapArea(rect, o), 0) +
              outsideArea(rect, size.x, size.y) * 3;

            if (score < bestScore) {
              bestScore = score;
              best = placement;
              bestRect = rect;
              if (score === 0) break;
            }
          }

          Object.assign(label.style, best.css);
          if (bestRect) obstacles.push(bestRect);
        });
      };

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [46, 46] });
      } else {
        map.setView(bounds[0], singleZoom);
      }

      map.on('zoomend', layoutLabels);
      map.on('moveend', layoutLabels);
      layoutLabels();

      // Kartan monteras ibland medan panelen fortfarande fälls ut, och mäter
      // då fel storlek. En omräkning när animationen är klar rättar det.
      settle = setTimeout(() => {
        map?.invalidateSize();
        layoutLabels();
      }, 260);
    });

    return () => {
      cancelled = true;
      // Timern måste stoppas, inte bara ignoreras. Fälls kartan ihop inom de
      // 260 millisekunderna hinner map.remove() köra först, och invalidateSize
      // läser då lägen ur en karta vars paneler är borta: "Cannot read
      // properties of undefined (reading '_leaflet_pos')". Att nolla map
      // efteråt gör dessutom layoutLabels tyst om något ändå hunnit köa.
      if (settle) clearTimeout(settle);
      map?.remove();
      map = null;
    };
  }, [pins, theme, singleZoom]);

  if (points.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-[var(--glassBrd)] ${className}`}
      >
        <span className="px-6 text-center font-mono text-10 leading-[1.6] tracking-[.1em] text-[var(--mut)]">
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
