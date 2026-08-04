'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BarList from '../components/stats/BarList';
import ColumnChart from '../components/stats/ColumnChart';
import PrivacyNote from '../components/board/PrivacyNote';
import { StatsFile, formatNumber, loadStats, peakHour } from '../lib/stats';

/**
 * Öppen statistiksida.
 *
 * Rubrikerna är frågor och inte mätetal — "När på dagen kollar folk lunch?"
 * i stället för "event: day-select". Umamis egna vyer är begripliga för den
 * som byggt sajten och kryptiska för alla andra, och det är alla andra som
 * ska läsa den här sidan.
 *
 * Allt är ihopräknat. Det finns ingen rad här som handlar om en enskild
 * besökare, och sidan hämtar inget från någon analystjänst när den öppnas —
 * siffrorna ligger i en JSON-fil som skrivs vid bygget.
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
    <section className="rounded-2xl border border-[var(--glassBrd)] bg-[var(--glass2)] p-5">
      <h2 className="m-0 font-heading text-[17px] font-bold tracking-[-.01em] text-[var(--ink)]">
        {title}
      </h2>
      <p className="mb-4 mt-1 text-[12.5px] leading-[1.5] text-[var(--mut)]">{lead}</p>
      {children}
    </section>
  );
}

export default function StatistikPage() {
  const [stats, setStats] = useState<StatsFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    loadStats().then(setStats).catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-[14px] text-[var(--ink2)]">Statistiken gick inte att hämta just nu.</p>
        <Link href="/" className="text-[13px] text-[var(--acc)] underline underline-offset-2">
          Tillbaka till menyerna
        </Link>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="font-mono text-[11px] tracking-[.15em] text-[var(--mut)]">HÄMTAR SIFFROR…</p>
      </main>
    );
  }

  const peak = peakHour(stats.hours);
  const busiestDay = [...stats.visits.weekdays].sort((a, b) => b.value - a.value)[0];

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 pt-8">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-[.12em] text-[var(--mut)] transition-colors hover:text-[var(--acc)]"
      >
        ← LUNS.SE
      </Link>

      <h1 className="mb-2 mt-4 font-heading text-[30px] font-bold leading-[1.1] tracking-[-.02em] text-[var(--ink)] wide:text-[38px]">
        Så används luns.se
      </h1>
      <p className="m-0 mb-7 max-w-[62ch] text-[14px] leading-[1.6] text-[var(--ink2)]">
        Sajten räknar hur den används — vilken dag folk klickar sig till, vilka restauranger som
        favoritmarkeras, när på dygnet det händer. Det är roligt att titta på, så här står det
        öppet i stället för att ligga i en instrumentpanel bara jag ser.
      </p>

      {stats.sample && (
        <p className="mb-7 rounded-xl border border-[var(--star)] bg-[var(--chip)] px-4 py-3 text-[12.5px] leading-[1.5] text-[var(--ink2)]">
          <strong className="text-[var(--ink)]">Exempeldata.</strong> Siffrorna nedan är påhittade
          och finns bara för att visa hur sidan ser ut. De byts mot riktiga när insamlingen är
          igång.
        </p>
      )}

      <div className="mb-7 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border border-[var(--glassBrd)] bg-[var(--glass2)] px-5 py-4">
        <span className="font-heading text-[34px] font-bold leading-none tracking-[-.02em] text-[var(--acc)]">
          {formatNumber(stats.visits.total)}
        </span>
        <span className="text-[14px] text-[var(--ink2)]">besök {stats.period.label}</span>
      </div>

      <div className="flex flex-col gap-5">
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
            height={110}
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

        <div className="grid gap-5 wide:grid-cols-2">
          <Card title="Var folk letar" lead="Vald stadsdel i platsväljaren.">
            <BarList items={stats.locations} unit="val" color="var(--cBlue)" />
          </Card>

          <Card title="Sugen på…" lead="Vilka snabbfilter som används mest.">
            <BarList items={stats.cravings} unit="klick" color="var(--cGreen)" />
          </Card>
        </div>
      </div>

      <footer className="mt-8 flex flex-col items-start gap-1.5 border-t border-[var(--line)] pt-5">
        <span className="text-[11.5px] text-[var(--mut)]">
          Uppdaterad {new Date(stats.generated).toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          . Siffrorna hämtas när sajten byggs, inte när du öppnar sidan.
        </span>
        <button
          onClick={() => setPrivacyOpen(true)}
          className="border-0 bg-transparent p-0 text-[11.5px] text-[var(--mut)] underline underline-offset-2 cursor-pointer transition-colors hover:text-[var(--acc)]"
        >
          Integritetsinfo
        </button>
      </footer>

      {privacyOpen && <PrivacyNote onClose={() => setPrivacyOpen(false)} />}
    </main>
  );
}
