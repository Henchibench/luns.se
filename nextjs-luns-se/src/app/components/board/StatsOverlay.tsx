'use client';

import React, { useEffect, useState } from 'react';
import BarList from '../stats/BarList';
import ColumnChart from '../stats/ColumnChart';
import { StatsFile, formatNumber, loadStats, peakHour } from '../../lib/stats';

/**
 * Öppen statistik, som ruta över sajten.
 *
 * Samma glasbehandling som platsvalet och integritetsinfon. Siffrorna är
 * kuriosa man tittar på en stund och sedan lämnar — att skicka iväg besökaren
 * till en egen adress och tillbaka igen vore en omväg för något man ändå bara
 * vill glutta på.
 *
 * Rubrikerna är frågor och inte mätetal. Umamis egna vyer är begripliga för
 * den som byggt sajten och kryptiska för alla andra, och det är alla andra som
 * ska läsa det här.
 *
 * stats.json hämtas först när rutan öppnas. De allra flesta besök rör aldrig
 * länken, och de ska inte betala för filen.
 */

function Card({
  title,
  lead,
  children,
}: {
  title: string;
  /** En mening som säger vad diagrammet betyder, på svenska utan facktermer. */
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--glassBrd)] bg-[var(--glass2)] p-4">
      <h3 className="m-0 font-heading text-[15.5px] font-bold tracking-[-.01em] text-[var(--ink)]">
        {title}
      </h3>
      <p className="mb-3.5 mt-1 text-[12px] leading-[1.5] text-[var(--mut)]">{lead}</p>
      {children}
    </section>
  );
}

export default function StatsOverlay({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<StatsFile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadStats().then(setStats).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const peak = stats ? peakHour(stats.hours) : 0;
  const busiestDay = stats
    ? [...stats.visits.weekdays].sort((a, b) => b.value - a.value)[0]
    : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{
        background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(20px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="luns-stats-title"
      onClick={onClose}
    >
      {/* Ingen padding på rullande behållaren — rubriken ska kunna klistras
          fast i toppen utan att texten glider in under en kant.

          Ytan är nästan täckande, till skillnad från platsvalets och
          integritetsinfons rutor som använder --glass2. De är små och
          fåordiga; den här är bred, hög och full av småtext och tunna staplar,
          och då läser menyn bakom rakt igenom. Suddet utanför kanterna gör
          fortfarande jobbet. */}
      <div
        className="luns-scroll max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--glassBrd)]"
        style={{ background: 'color-mix(in srgb, var(--bg) 93%, transparent)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 pb-4 pt-6"
          style={{
            background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="min-w-0">
            <span className="font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">LUNS.SE</span>
            <h2
              id="luns-stats-title"
              className="m-0 mt-1 font-heading text-2xl font-bold tracking-[-.02em] text-[var(--ink)]"
            >
              Så används sajten
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 flex-none rounded-lg border-0 bg-[var(--chip)] px-3 py-1.5 text-xs font-semibold text-[var(--ink2)] cursor-pointer transition-colors hover:bg-[var(--hi)]"
          >
            Stäng
          </button>
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
              <p className="m-0 mb-5 max-w-[62ch] text-[13px] leading-[1.6] text-[var(--ink2)]">
                Sajten räknar hur den används — vilken dag folk klickar sig till, vilka restauranger
                som favoritmarkeras, när på dygnet det händer. Det är roligt att titta på, så det
                står öppet i stället för att ligga i en instrumentpanel bara jag ser.
              </p>

              {stats.sample && (
                <p className="mb-5 rounded-xl border border-[var(--star)] bg-[var(--chip)] px-4 py-3 text-[12.5px] leading-[1.5] text-[var(--ink2)]">
                  <strong className="text-[var(--ink)]">Exempeldata.</strong> Siffrorna nedan är
                  påhittade och finns bara för att visa hur rutan ser ut. De byts mot riktiga när
                  insamlingen är igång.
                </p>
              )}

              <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-heading text-[32px] font-bold leading-none tracking-[-.02em] text-[var(--acc)]">
                  {formatNumber(stats.visits.total)}
                </span>
                <span className="text-[13.5px] text-[var(--ink2)]">
                  besök {stats.period.label}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <Card
                  title="När på dygnet kollar folk lunch?"
                  lead={`En stapel per timme. Toppen ligger vid ${peak}-tiden — ungefär då hungern går från tanke till beslut.`}
                >
                  <ColumnChart
                    unit="besök"
                    columns={stats.hours.map((value, hour) => ({
                      label: `kl ${hour}`,
                      // Var tredje timme får siffra. Alla 24 blir gröt på telefon.
                      tick: hour % 3 === 0 ? String(hour) : undefined,
                      value,
                    }))}
                  />
                </Card>

                <Card
                  title="Vilken dag är det mest tryck?"
                  lead={`${busiestDay.label} vinner. Att intresset sjunker mot fredagen känns rimligt — då är fler redan bortbokade på lunch.`}
                >
                  <ColumnChart
                    unit="besök"
                    height={100}
                    columns={stats.visits.weekdays.map(day => ({
                      label: day.label,
                      tick: day.label.slice(0, 3),
                      value: day.value,
                    }))}
                  />
                </Card>

                <Card
                  title="Restaurangerna folk håller koll på"
                  lead="Antal gånger någon har favoritmarkerat stället med hjärtat i menylistan."
                >
                  <BarList items={stats.restaurants} unit="favoritmarkeringar" />
                </Card>

                <Card
                  title="Rätterna som bevakas"
                  lead="Stjärnmärkta rätter — de man vill få veta om när de dyker upp på menyn igen."
                >
                  <BarList items={stats.dishes} unit="bevakningar" color="var(--star)" />
                </Card>

                <div className="grid gap-4 wide:grid-cols-2">
                  <Card title="Var folk letar" lead="Vald stadsdel i platsväljaren.">
                    <BarList items={stats.locations} unit="val" color="var(--cBlue)" />
                  </Card>

                  <Card title="Sugen på…" lead="Vilka snabbfilter som används mest.">
                    <BarList items={stats.cravings} unit="klick" color="var(--cGreen)" />
                  </Card>
                </div>
              </div>

              <p className="mb-0 mt-5 text-[11.5px] leading-[1.5] text-[var(--mut)]">
                Allt är ihopräknat — ingen rad här handlar om en enskild besökare. Siffrorna hämtas
                när sajten byggs, inte när du öppnar rutan. Uppdaterad{' '}
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
    </div>
  );
}
