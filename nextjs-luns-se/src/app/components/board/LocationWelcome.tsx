'use client';

import React from 'react';
import Overlay from './Overlay';
import type { LunsLocation } from '../../lib/menu';

/**
 * Förstagångsvalet, och sajtens första intryck.
 *
 * Designen har bara väljaren i headern, men utan det här landar alla i
 * Linköping på Lindholmen och tror att sajten är fel. Visas en gång; sedan
 * sköter väljaren i headern resten.
 *
 * Rutan hälsar också välkommen. Vid nylanseringen är det här det första de
 * som känner sajten sedan tidigare möter, och de förtjänar ett besked om
 * varför allt ser annorlunda ut. Rundan tar därför inte upp det igen: den
 * inleds med vad som är nytt, inte med att något är nytt.
 */
export default function LocationWelcome({
  locations,
  onSelect,
}: {
  locations: LunsLocation[];
  onSelect: (id: string) => void;
}) {
  return (
    <Overlay labelledBy="luns-welcome-title">
      <div className="luns-panel w-full max-w-sm rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)] p-7">
        {/* Ordmärket står redan i headern bakom rutan, och rubriken säger
            luns.se i klartext. Loggan får bära igenkänningen ensam.

            Plattan finns för ljust läge. Loggan har vit text inbakad i
            bilden, och mot en nästan vit panel försvinner "LUNS MENU" medan
            maten står kvar. Tonen är mörka lägets panelfärg, alltså exakt
            den yta loggan är ritad för — i mörkt läge blir plattan därmed
            osynlig av sig själv och behöver inte stängas av. */}
        <div className="inline-flex rounded-2xl bg-[#04252E] p-2.5 dark:bg-transparent dark:p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/luns-logo-transparent.png"
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] object-contain"
          />
        </div>

        <h2
          id="luns-welcome-title"
          className="mt-4 mb-2 font-heading text-2xl font-bold leading-[1.15] tracking-[-.02em] text-[var(--ink)]"
        >
          Välkommen till nya luns.se
        </h2>
        <p className="mb-6 text-[13px] leading-[1.55] text-[var(--ink2)]">
          Sidan är ombyggd från grunden. Samma menyer som förut, men lättare att läsa, med karta,
          favoriter och en matprofil som minns vad du gillar.
        </p>

        <h3 className="mb-1 font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">
          VAR ÄTER DU LUNCH?
        </h3>
        <p className="mb-3 text-[12px] leading-[1.5] text-[var(--mut)]">
          Vi kommer ihåg valet till nästa gång.
        </p>

        <div className="flex flex-col gap-2">
          {locations.map(location => (
            <button
              key={location.id}
              onClick={() => onSelect(location.id)}
              className="flex w-full items-baseline justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--chip)] px-4 py-3 text-left cursor-pointer transition-colors hover:bg-[var(--hi)]"
            >
              <span className="text-[16px] font-semibold text-[var(--ink)]">{location.label}</span>
              <span className="font-mono text-[10px] text-[var(--mut)] whitespace-nowrap">
                {location.city} · {location.restaurantCount ?? 0} st
              </span>
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
