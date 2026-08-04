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
  /** Handskriven mening om vad stället är. */
  description: string;
  /** Restaurangen finns med men har ingen meny för dagen. */
  empty: boolean;
  /** Publicerar bara dagens meny. Tomma dagar är väntat, inte ett fel. */
  dailyOnly: boolean;
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
  /**
   * Vald dag i förhållande till idag: 0 är idag, positivt framåt i veckan,
   * negativt bakåt. Styr vad restauranger med endagsmeny får för tomrad —
   * "kom tillbaka på fredag" är fel besked på en dag som redan varit.
   */
  dayOffset: number;
  /** Vald dag, t.ex. "Fredag". Skrivs ut i beskedet till endagsrestauranger. */
  day: string;
  searchTerms: string[];
  theme: 'light' | 'dark';
  onToggleFavorite: (name: string) => void;
  onToggleStar: (restaurant: string, description: string) => void;
}

const LINK_CLASS = 'whitespace-nowrap transition-colors hover:text-[var(--acc)]';

/**
 * Texten när en restaurang saknar rätter för den valda dagen.
 *
 * Standardsvaret antar att menyn borde ha funnits där. För restauranger som
 * bara publicerar dagens meny stämmer inte det — tomheten är hur de fungerar,
 * inte ett tecken på att något gått sönder, och att be någon ringa dit för att
 * fråga om fredagens lunch på en tisdag hjälper ingen.
 */
function emptyMessage(section: Section, dayOffset: number, day: string): string {
  if (!section.dailyOnly || dayOffset === 0) {
    return 'Ingen meny idag. Kolla direkt med restaurangen via länkarna ovan';
  }

  // Alla svenska veckodagar slutar på -dag, så genitivformen blir -dagens.
  const lower = day.toLowerCase();

  if (dayOffset > 0) {
    return `${section.name} lägger bara ut dagens meny. Kom tillbaka på ${lower} 🙂`;
  }
  return `${section.name} lägger bara ut dagens meny, och ${lower}ens hann tas ner.`;
}

export default function MenuList({
  sections,
  dayOffset,
  day,
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
          {/* Raden får radbrytas på smal skärm. Utan det bröts långa namn
              mitt itu när de växte, och "STÅNGS MJÄRDEVI" stod på två rader
              medan länkarna satt kvar uppe till höger. Nu håller namnet ihop
              och länkarna flyttar ner i stället. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 pb-2">
            <button
              data-tour="favorite"
              onClick={() => onToggleFavorite(section.name)}
              title={section.favorite ? 'Ta bort favorit' : 'Favoritmarkera'}
              aria-label={section.favorite ? `Ta bort ${section.name} som favorit` : `Favoritmarkera ${section.name}`}
              aria-pressed={section.favorite}
              className="flex-none border-0 bg-transparent p-0 text-[14px] leading-none cursor-pointer transition-transform active:scale-90"
              style={{ color: section.favorite ? 'var(--acc)' : 'var(--mut)' }}
            >
              {section.favorite ? '♥' : '♡'}
            </button>

            {/* Namnet var mindre än rätterna under det, alltså listans minsta
                text trots att det är dess rubrik. Vid scroll gick gränsen
                mellan två restauranger obemärkt förbi. */}
            <span className="whitespace-nowrap font-mono text-[14px] font-semibold tracking-[.1em] text-[var(--acc)]">
              {section.name.toUpperCase()}
            </span>

            {/* Linjen fyller ut raden så meta och länkar alltid ligger höger. */}
            <span className="flex-1 h-px bg-[var(--line)]" />

            {/* Länkarna stod i --mut, samma dämpade ton som priser och
                allergener. De är saker man klickar på, inte fotnoter, så de
                får samma läsbarhet som rätterna. */}
            <div className="flex flex-none gap-3 font-mono text-[11px] font-medium text-[var(--ink2)]">
              {/* Kartan fälls ut här nere i stället för att kasta iväg
                  besökaren till Google Maps i en ny flik. */}
              <button
                onClick={() => setOpenMap(prev => (prev === section.name ? null : section.name))}
                aria-expanded={openMap === section.name}
                className={`${LINK_CLASS} border-0 bg-transparent p-0 font-mono text-[11px] font-medium cursor-pointer`}
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
                  <span className="font-mono text-[10px] tracking-[.1em] text-[var(--mut)]">
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

          {/* All information om restaurangen står här, aldrig uppe på
              rubrikraden. Först vad stället är, sedan det praktiska.

              Beskrivningen är skriven för hand och ändras aldrig; tider och
              priser kommer dels från restaurangdatan, dels från skrapan. För
              läsaren är det senare samma sak och står därför på samma rad,
              med klocka på tiderna så de matchar skrapans stil. */}
          {section.description && (
            <p className="m-0 mb-1 max-w-[70ch] text-[12px] leading-[1.5] text-[var(--ink2)]">
              {section.description}
            </p>
          )}

          {(section.meta || section.info) && (
            <p className="m-0 mb-1.5 text-[12px] text-[var(--mut)]">
              {[section.meta && `🕐 ${section.meta}`, section.info]
                .filter(Boolean)
                .join('  ·  ')}
            </p>
          )}

          {section.empty && (
            <p className="mt-0.5 mb-2 text-[12px] italic text-[var(--mut)]">
              {emptyMessage(section, dayOffset, day)}
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
                    en etikett ovanför beskrivningen i stället.

                    Kategorin bryts över flera rader i stället för att kapas.
                    Kolumnen rymmer ungefär tolv tecken, och restaurangerna
                    hittar egna längre namn — "Säsongens meny", "Grillen
                    serverar" — som blev "Säsongens me…". Att bredda kolumnen
                    så alla får plats hade stulit utrymme från rätterna på
                    varje rad, för de fåtal rader som behöver det. */}
                <div className="flex min-w-0 flex-1 flex-col wide:flex-row wide:items-baseline wide:gap-3.5">
                  <span
                    className="font-mono text-[10px] leading-[1.35] tracking-[.08em] hyphens-auto break-words wide:w-[92px] wide:flex-none"
                    lang="sv"
                    style={{ color: dish.categoryColor }}
                  >
                    {dish.category.toUpperCase()}
                  </span>

                  <span className="flex-1 text-[13px] leading-[1.55] text-[var(--ink2)]">
                    <Highlight text={dish.description} terms={searchTerms} />
                  </span>
                </div>

                <span className="flex-none w-9 text-right font-mono text-[11px] font-medium text-[var(--ink2)] wide:w-14">
                  {dish.price}
                </span>

                <button
                  data-tour="star"
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
