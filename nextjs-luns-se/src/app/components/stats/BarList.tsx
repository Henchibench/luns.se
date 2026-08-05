'use client';

import React from 'react';
import { Bucket, formatNumber } from '../../lib/stats';

/**
 * Liggande stapellista — en rad per post, stapeln under etiketten.
 *
 * Etiketten står på egen rad i stället för till vänster om stapeln. Namn som
 * "Pulled pork med rotfrukter" är för långa för en kolumn på telefon, och
 * alternativet hade varit att klippa av dem.
 *
 * Staplarna skalas mot listans största värde, inte mot summan. Poängen är att
 * jämföra topplaceringarna med varandra; mot summan blir alla staplar korta så
 * fort listan är lång.
 */
export default function BarList({
  items,
  unit,
  color = 'var(--acc)',
  layout = 'stacked',
}: {
  items: Bucket[];
  /** Skrivs efter siffran i skärmläsartexten, t.ex. "favoritmarkeringar". */
  unit: string;
  color?: string;
  /**
   * Korta etiketter som veckodagar får plats till vänster om stapeln, och
   * raden blir hälften så hög. Rätter och restauranger måste ligga kvar
   * ovanför sin stapel: "Pulled pork med rotfrukter" ryms inte i en kolumn.
   */
  layout?: 'stacked' | 'inline';
}) {
  if (items.length === 0) {
    return <p className="m-0 text-[13px] text-[var(--mut)]">Inget att visa än.</p>;
  }

  const max = Math.max(...items.map(item => item.value), 1);

  /* Spåret bakom stapeln gör längden läsbar även när värdet är litet — utan
     det svävar en tunn stump i tomma intet. */
  const bar = (value: number, i: number) => (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--chip)]">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${Math.max(2, (value / max) * 100)}%`,
          background: color,
          // Toppen ska sticka ut utan att resten ser bortvald ut.
          opacity: 1 - Math.min(i, 5) * 0.11,
        }}
      />
    </div>
  );

  if (layout === 'inline') {
    return (
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item, i) => (
          <li
            key={`${item.label}-${i}`}
            aria-label={`${item.label}: ${item.value} ${unit}`}
            className="flex items-center gap-3"
          >
            {/* Hela etiketten, inte tre bokstäver. Komponenten ska inte veta
                att den råkar rita veckodagar. */}
            <span className="w-[58px] flex-none truncate font-mono text-[10px] tracking-[.08em] text-[var(--mut)]">
              {item.label.toUpperCase()}
            </span>
            {bar(item.value, i)}
            <span className="w-8 flex-none text-right font-mono text-[11px] text-[var(--ink2)]">
              {formatNumber(item.value)}
            </span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`} aria-label={`${item.label}: ${item.value} ${unit}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[13px] font-semibold text-[var(--ink)]">
              {item.label}
              {item.sub && (
                <span className="ml-2 text-[11px] font-normal text-[var(--mut)]">{item.sub}</span>
              )}
            </span>
            <span className="flex-none font-mono text-[12px] font-medium text-[var(--ink2)]">
              {formatNumber(item.value)}
            </span>
          </div>

          <div className="mt-1.5">{bar(item.value, i)}</div>
        </li>
      ))}
    </ol>
  );
}
