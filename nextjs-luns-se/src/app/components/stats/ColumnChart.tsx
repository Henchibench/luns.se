'use client';

import React from 'react';

export interface Column {
  label: string;
  /** Kort etikett under stapeln. Utelämnas den skrivs ingenting ut. */
  tick?: string;
  value: number;
}

/**
 * Stående staplar. Används både till dygnets 24 timmar och till veckans sju
 * dagar, så bredden får komma från flex i stället för en fast kolumnbredd.
 *
 * Den högsta stapeln färgas starkare. Det är hela poängen med diagrammet —
 * man ska se toppen utan att läsa en enda siffra.
 */
export default function ColumnChart({
  columns,
  height = 132,
  unit,
}: {
  columns: Column[];
  height?: number;
  unit: string;
}) {
  const max = Math.max(...columns.map(column => column.value), 1);

  // items-stretch (förvalet) är avsiktligt. Med items-end krympte varje kolumn
  // till sin egen etikett, och staplarna inuti fick noll höjd att växa i —
  // diagrammet blev en tom ruta med siffror under.
  return (
    <div className="flex gap-[3px]" style={{ height }} role="img"
      aria-label={`Stapeldiagram: ${columns.map(c => `${c.label} ${c.value} ${unit}`).join(', ')}`}
    >
      {columns.map((column, i) => {
        const peak = column.value === max;
        return (
          <div key={`${column.label}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
            {/* Wrappern är full höjd så alla staplar står på samma golv;
                utan den bottnar korta staplar i mitten av raden. */}
            <div className="flex w-full flex-1 items-end">
              <div
                title={`${column.label}: ${column.value} ${unit}`}
                className="w-full rounded-t-[3px] transition-[height] duration-700 ease-out"
                style={{
                  // Nollvärden får ändå en hårstrå-hög stapel, annars ser det
                  // ut som att timmen saknas i stället för att vara tom.
                  height: `${Math.max(1.5, (column.value / max) * 100)}%`,
                  background: peak ? 'var(--acc)' : 'var(--accBg)',
                  borderTop: peak ? 'none' : '1px solid var(--line)',
                }}
              />
            </div>
            {/* Raden renderas även tom. Hoppade den över sig när ticken
                saknades fick den kolumnen mer höjd att växa på, och staplarna
                stod på två olika golv. */}
            <span className="h-3 flex-none font-mono text-[9px] leading-3 text-[var(--mut)]">
              {column.tick ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
