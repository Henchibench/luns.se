'use client';

import React from 'react';

/**
 * Dygnets rytm som yta, inte som 24 staplar.
 *
 * Staplarna var fel form för datan. Arton av dygnets timmar är nära noll och
 * en sticker rakt upp, vilket gav ett fält av stumpar med en pinne i mitten.
 * En linje med fylld yta under läser man som en rörelse: platt på natten,
 * stiger mot förmiddagen, faller efter lunch. Det är vad diagrammet handlar
 * om.
 *
 * SVG:n sträcks i bredd med preserveAspectRatio="none". Linjen skulle då
 * sträckas med den, så den ritas med vector-effect: non-scaling-stroke och
 * håller sin tjocklek oavsett hur bred rutan blir.
 */

const VIEW_W = 720;
const VIEW_H = 150;
/** Luft över toppen så markören och dess text får plats innanför ytan. */
const TOP_PAD = 22;

export default function HourChart({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);
  const peak = hours.reduce((best, value, hour) => (value > hours[best] ? hour : best), 0);

  const x = (hour: number) => (hour / (hours.length - 1)) * VIEW_W;
  const y = (value: number) => VIEW_H - (value / max) * (VIEW_H - TOP_PAD);

  const line = hours.map((value, hour) => `${hour === 0 ? 'M' : 'L'}${x(hour)},${y(value)}`).join(' ');
  const area = `${line} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="block h-[150px] w-full"
          role="img"
          aria-label={`Sidvisningar per timme. Flest klockan ${peak}, med ${max} visningar.`}
        >
          <defs>
            <linearGradient id="luns-hour-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--acc)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <path d={area} fill="url(#luns-hour-fill)" />
          <path
            d={line}
            fill="none"
            stroke="var(--acc)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Golvet. Utan det svävar ytan och nattens nollor ser ut som
              saknad data i stället för som tomma timmar. */}
          <line
            x1="0"
            y1={VIEW_H}
            x2={VIEW_W}
            y2={VIEW_H}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Toppmarkören ligger utanför SVG:n. Inuti hade den sträckts på
            bredden tillsammans med allt annat och blivit en oval. */}
        <div
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
          style={{ left: `${(peak / (hours.length - 1)) * 100}%`, top: `${(y(max) / VIEW_H) * 100}%` }}
        >
          <span className="font-mono text-10 tracking-[.08em] whitespace-nowrap text-[var(--acc)]">
            KL {peak}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--acc)]" />
        </div>
      </div>

      {/* Tiderna står som text utanför SVG:n av samma skäl som markören, och
          placeras på sin egen timme i stället för att fördelas jämnt. Med
          justify-between hamnade varje siffra en bit från punkten den gällde,
          och toppmarkören ovanför stod då inte över sin egen tid. */}
      <div className="relative mt-1.5 h-3 font-mono text-10 text-[var(--mut)]">
        {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => (
          <span
            key={hour}
            className="absolute top-0"
            style={{
              left: `${(hour / (hours.length - 1)) * 100}%`,
              // Nollan skjuts inte in i mitten av sig själv, då hamnar halva
              // siffran utanför rutan.
              transform: hour === 0 ? 'none' : 'translateX(-50%)',
            }}
          >
            {String(hour).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  );
}
