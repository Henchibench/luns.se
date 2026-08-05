'use client';

import React, { useEffect, useState } from 'react';
import Overlay, { useOverlayClose } from './Overlay';
import BarList from '../stats/BarList';
import HourChart from '../stats/HourChart';
import { StatsFile, formatNumber, loadStats, peakHour } from '../../lib/stats';

/**
 * Öppen statistik, som ruta över sajten.
 *
 * Siffrorna är kuriosa man tittar på en stund och sedan lämnar. Att skicka
 * iväg besökaren till en egen adress och tillbaka igen vore en omväg för något
 * man ändå bara vill glutta på.
 *
 * Rutan var förut byggd som en instrumentpanel: inramade kort med rubrikfrågor
 * och en förklarande mening var. Den formen behöver mycket data för att bära
 * sig, och sajten har tre tal. Nu är den byggd som resten av gränssnittet i
 * stället — mono-versaler över tunna linjer, täta rader, accentfärgen för det
 * som ska ses först. Vänsterspalten och den här rutan ser ut att komma från
 * samma sajt igen.
 *
 * Ett ord om enheterna: totalen är besök, medan dygns- och veckokurvorna är
 * sidvisningar. Umami räknar dem olika och summorna går därför inte ihop. De
 * heter olika saker i rutan av just det skälet.
 *
 * stats.json hämtas först när rutan öppnas. De allra flesta besök rör aldrig
 * länken, och de ska inte betala för filen.
 */

function CloseButton({ label }: { label: string }) {
  const close = useOverlayClose();
  return (
    <button
      onClick={close}
      className="mt-1 flex-none rounded-lg border-0 bg-[var(--chip)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink2)] cursor-pointer transition-colors hover:bg-[var(--hi)]"
    >
      {label}
    </button>
  );
}

/** Rubriken över en tunn linje, samma grepp som grupperna i vänsterspalten. */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] pt-4">
      <h3 className="mb-3 font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">{label}</h3>
      {children}
    </section>
  );
}

/**
 * Talet stort, vad det betyder litet under. Tre bredvid varandra räcker som
 * sammanfattning, och den som bara öppnat rutan av nyfikenhet får svaret utan
 * att läsa ett diagram.
 */
function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="font-heading text-[24px] font-bold leading-none tracking-[-.02em] text-[var(--acc)]">
        {value}
      </div>
      <div className="mt-1.5 font-mono text-[10px] tracking-[.1em] text-[var(--mut)]">{label}</div>
    </div>
  );
}

export default function StatsOverlay({
  onClose,
  onCloseStart,
}: {
  onClose: () => void;
  /** Sätts när rutan öppnats från inställningarna och ska lämna tillbaka dit. */
  onCloseStart?: () => void;
}) {
  const [stats, setStats] = useState<StatsFile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadStats().then(setStats).catch(() => setFailed(true));
  }, []);

  const peak = stats ? peakHour(stats.hours) : 0;
  const busiestDay = stats ? [...stats.visits.weekdays].sort((a, b) => b.value - a.value)[0] : null;

  // Avsnitten som bygger på händelser står tomma tills den här versionen
  // legat live ett tag — den som är ute nu skickar bara sidvisningar.
  const hasChoices = Boolean(
    stats &&
      (stats.restaurants.length ||
        stats.dishes.length ||
        stats.locations.length ||
        stats.cravings.length)
  );

  /**
   * Söksiffran visas bara när det finns andra händelser att jämföra med.
   * "Ingen har sökt" och "vi samlar inte in det än" ser likadana ut som en
   * nolla, och det första påståendet är intressant medan det andra är fel.
   */
  const showSearches = stats?.searches !== undefined && (hasChoices || stats.searches > 0);

  return (
    <Overlay onClose={onClose} onCloseStart={onCloseStart} labelledBy="luns-stats-title">
      {/* Ingen padding på rullande behållaren — rubriken ska kunna klistras
          fast i toppen utan att texten glider in under en kant. */}
      <div
        className="luns-panel luns-scroll max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Rubriken måste vara helt täckande — innehållet rullar under den. */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--bg)] px-6 pb-4 pt-6">
          <div className="min-w-0">
            <span className="font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">LUNS.SE</span>
            <h2
              id="luns-stats-title"
              className="m-0 mt-1 font-heading text-2xl font-bold tracking-[-.02em] text-[var(--ink)]"
            >
              Så används sajten
            </h2>
          </div>
          {/* onCloseStart finns bara när rutan öppnades från inställningarna,
              och då leder knappen dit i stället för ut. Det ska stå på den
              innan man klickar, inte upptäckas efteråt. */}
          <CloseButton label={onCloseStart ? 'Tillbaka' : 'Stäng'} />
        </div>

        <div className="px-6 pb-6 pt-5">
          {failed && (
            <p className="m-0 text-[13px] text-[var(--ink2)]">
              Statistiken gick inte att hämta just nu.
            </p>
          )}

          {!stats && !failed && (
            <p className="m-0 font-mono text-[11px] tracking-[.15em] text-[var(--mut)]">
              HÄMTAR SIFFROR…
            </p>
          )}

          {stats && busiestDay && (
            <>
              {stats.sample && (
                <p className="mb-5 rounded-xl border border-[var(--star)] bg-[var(--chip)] px-4 py-3 text-[12px] leading-[1.5] text-[var(--ink2)]">
                  <strong className="text-[var(--ink)]">Exempeldata.</strong> Siffrorna nedan är
                  påhittade och finns bara för att visa hur rutan ser ut. De byts mot riktiga när
                  insamlingen är igång.
                </p>
              )}

              {/* Sammanfattningen står överst utan sektionslinje. Den är svaret,
                  resten av rutan är hur man kommer fram till det. */}
              <div className="mb-6 flex gap-4">
                <Figure value={formatNumber(stats.visits.total)} label="BESÖK" />
                {/* Kort etikett med flit. "Vanligaste tiden" bröt till två
                    rader på telefon och sköt den tredje siffran ur linje. */}
                <Figure value={`kl ${peak}`} label="TOPPTID" />
                <Figure value={busiestDay.label} label="MEST TRYCK" />
              </div>

              <div className="flex flex-col gap-6">
                <Section label={`DYGNET · ${stats.period.label.toUpperCase()}`}>
                  <HourChart hours={stats.hours} />
                </Section>

                <Section label="VECKAN">
                  <BarList items={stats.visits.weekdays} unit="sidvisningar" layout="inline" />
                </Section>

                {showSearches && (
                  <Section label="SÖK">
                    <p className="m-0 text-[13px] leading-[1.6] text-[var(--ink2)]">
                      {stats.searches === 0 ? (
                        'Ingen har använt sökfältet under perioden.'
                      ) : (
                        <>
                          Sökfältet användes{' '}
                          <span className="font-semibold text-[var(--ink)]">
                            {formatNumber(stats.searches as number)}
                          </span>{' '}
                          gånger.
                        </>
                      )}{' '}
                      <span className="text-[var(--mut)]">
                        Att fältet användes räknas, aldrig vad som skrevs i det.
                      </span>
                    </p>
                  </Section>
                )}

                {/* Varje lista är en egen sektion med mono-etikett, som DYGNET
                    och VECKAN ovanför. Samlade under en gemensam rubrik fick de
                    brödtextrubriker i stället, och rutan bytte formspråk halvvägs
                    ner. */}
                {stats.restaurants.length > 0 && (
                  <Section label="FAVORITMARKERADE STÄLLEN">
                    <BarList items={stats.restaurants} unit="klick" />
                  </Section>
                )}

                {stats.dishes.length > 0 && (
                  <Section label="BEVAKADE RÄTTER">
                    <BarList items={stats.dishes} unit="bevakningar" color="var(--star)" />
                  </Section>
                )}

                {(stats.locations.length > 0 || stats.cravings.length > 0) && (
                  <div className="grid gap-6 wide:grid-cols-2">
                    {stats.locations.length > 0 && (
                      <Section label="STADSDEL">
                        <BarList items={stats.locations} unit="val" color="var(--cBlue)" />
                      </Section>
                    )}
                    {stats.cravings.length > 0 && (
                      <Section label="SUGEN PÅ">
                        <BarList items={stats.cravings} unit="klick" color="var(--cGreen)" />
                      </Section>
                    )}
                  </div>
                )}

                {/* Att bara utelämna avsnittet var sämre: rutan såg klar ut med
                    tre tal, och den som undrade varför fick inget svar. */}
                {!hasChoices && (
                  <Section label="VAD FOLK VÄLJER">
                    <p className="m-0 text-[13px] leading-[1.6] text-[var(--ink2)]">
                      Här kommer det stå vilka restauranger som favoritmarkeras oftast, vilka rätter
                      som bevakas, vilka sugen på-filter som används och hur ofta någon söker. Det
                      kräver att någon hunnit klicka, och att siffrorna hämtats sedan dess.
                    </p>
                  </Section>
                )}
              </div>

              <p className="mb-0 mt-6 border-t border-[var(--line)] pt-4 text-[11px] leading-[1.6] text-[var(--mut)]">
                Allt är ihopräknat, ingen rad handlar om en enskild besökare. Siffrorna hämtas när
                sajten byggs och inte när rutan öppnas. Uppdaterad{' '}
                {new Date(stats.generated).toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                .
              </p>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}
