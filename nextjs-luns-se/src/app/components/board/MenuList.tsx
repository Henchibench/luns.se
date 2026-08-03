'use client';

import React, { useState } from 'react';
import Highlight from './Highlight';
import RestaurantMap from './RestaurantMap';

export interface SectionDish {
  key: string;
  category: string;
  categoryColor: string;
  description: string;
  price: string;
  starred: boolean;
}

export interface Section {
  name: string;
  /** Lunchtider, tom sträng när restaurangen inte publicerar några. */
  meta: string;
  /** Inforader för vald dag, ihopslagna. */
  info: string;
  /** Restaurangen finns med men har ingen meny för dagen. */
  empty: boolean;
  website?: string;
  maps?: string;
  instagram?: string;
  latitude?: number | null;
  longitude?: number | null;
  favorite: boolean;
  dishes: SectionDish[];
}

interface Props {
  sections: Section[];
  searchTerms: string[];
  theme: 'light' | 'dark';
  onToggleFavorite: (name: string) => void;
  onToggleStar: (restaurant: string, description: string) => void;
}

const LINK_CLASS = 'whitespace-nowrap transition-colors hover:text-[var(--acc)]';

export default function MenuList({
  sections,
  searchTerms,
  theme,
  onToggleFavorite,
  onToggleStar,
}: Props) {
  // Bara en karta åt gången. Flera utfällda kartor i samma lista blir både
  // rörigt och tungt — varje karta är en egen Leaflet-instans.
  const [openMap, setOpenMap] = useState<string | null>(null);

  return (
    <>
      {sections.map(section => (
        <div key={section.name} data-sec={section.name} className="flex flex-col">
          <div className="flex items-center gap-3 pt-4 pb-2">
            <button
              onClick={() => onToggleFavorite(section.name)}
              title={section.favorite ? 'Ta bort favorit' : 'Favoritmarkera'}
              aria-label={section.favorite ? `Ta bort ${section.name} som favorit` : `Favoritmarkera ${section.name}`}
              aria-pressed={section.favorite}
              className="flex-none border-0 bg-transparent p-0 text-sm leading-none cursor-pointer transition-transform active:scale-90"
              style={{ color: section.favorite ? 'var(--acc)' : 'var(--mut)' }}
            >
              {section.favorite ? '♥' : '♡'}
            </button>

            <span className="font-mono text-[11.5px] font-semibold tracking-[.12em] text-[var(--acc)]">
              {section.name.toUpperCase()}
            </span>

            {/* Linjen fyller ut raden så meta och länkar alltid ligger höger. */}
            <span className="flex-1 h-px bg-[var(--line)]" />

            {section.meta && (
              <span className="hidden wide:inline flex-none font-mono text-[10.5px] text-[var(--mut)] whitespace-nowrap">
                {section.meta}
              </span>
            )}

            <div className="flex flex-none gap-2.5 font-mono text-[10px] text-[var(--mut)]">
              {/* Kartan fälls ut här nere i stället för att kasta iväg
                  besökaren till Google Maps i en ny flik. */}
              <button
                onClick={() => setOpenMap(prev => (prev === section.name ? null : section.name))}
                aria-expanded={openMap === section.name}
                className={`${LINK_CLASS} border-0 bg-transparent p-0 font-mono text-[10px] cursor-pointer`}
                style={{ color: openMap === section.name ? 'var(--acc)' : undefined }}
              >
                KARTA {openMap === section.name ? '↑' : '↓'}
              </button>
              {section.website && (
                <a href={section.website} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  WWW ↗
                </a>
              )}
              {section.instagram && (
                <a href={section.instagram} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  INSTA ↗
                </a>
              )}
            </div>
          </div>

          {openMap === section.name && (
            <div className="mb-2 mt-1">
              {section.latitude != null && section.longitude != null ? (
                <RestaurantMap
                  points={[
                    {
                      name: section.name,
                      latitude: section.latitude,
                      longitude: section.longitude,
                      dishCount: section.dishes.length,
                    },
                  ]}
                  theme={theme}
                  className="h-[220px] w-full"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--glassBrd)] py-8">
                  <span className="font-mono text-[10.5px] tracking-[.1em] text-[var(--mut)]">
                    VI VET INTE VAR DEN LIGGER ÄN
                  </span>
                  {section.maps && (
                    <a
                      href={section.maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-[var(--acc)] hover:underline"
                    >
                      SÖK PÅ GOOGLE MAPS ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {section.info && (
            <p className="m-0 mb-1.5 text-[11.5px] text-[var(--mut)]">{section.info}</p>
          )}

          {section.empty && (
            <p className="mt-0.5 mb-2 text-[12.5px] italic text-[var(--mut)]">
              Ingen meny idag — kolla direkt med restaurangen via länkarna ovan
            </p>
          )}

          <div className="flex flex-col gap-0.5 pb-1.5">
            {section.dishes.map(dish => (
              <div
                key={dish.key}
                className="flex items-baseline gap-2 rounded-md px-2 py-[5px] transition-colors hover:bg-[var(--hi)] wide:gap-3.5"
              >
                {/* På bred skärm står kategorin i en egen 92px-kolumn. På mobil
                    äter den en tredjedel av raden, så där lägger den sig som
                    en etikett ovanför beskrivningen i stället. */}
                <div className="flex min-w-0 flex-1 flex-col wide:flex-row wide:items-baseline wide:gap-3.5">
                  <span
                    className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] tracking-[.08em] wide:w-[92px] wide:flex-none"
                    style={{ color: dish.categoryColor }}
                    title={dish.category}
                  >
                    {dish.category.toUpperCase()}
                  </span>

                  <span className="flex-1 text-[13.5px] leading-[1.55] text-[var(--ink2)]">
                    <Highlight text={dish.description} terms={searchTerms} />
                  </span>
                </div>

                <span className="flex-none w-9 text-right font-mono text-[11px] text-[var(--mut)] wide:w-14">
                  {dish.price}
                </span>

                <button
                  onClick={() => onToggleStar(section.name, dish.description)}
                  title={dish.starred ? 'Sluta bevaka rätten' : 'Bevaka rätt — du ser det direkt när den serveras igen'}
                  aria-label={dish.starred ? `Sluta bevaka ${dish.description}` : `Bevaka ${dish.description}`}
                  aria-pressed={dish.starred}
                  className="flex-none border-0 bg-transparent px-0.5 text-[13px] leading-none cursor-pointer transition-transform active:scale-90"
                  style={{ color: dish.starred ? 'var(--star)' : 'var(--mut)' }}
                >
                  {dish.starred ? '★' : '☆'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
