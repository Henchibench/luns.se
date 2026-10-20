'use client';

import React from 'react';
import Overlay, { useOverlayClose } from './Overlay';
import WatchedDishes from './WatchedDishes';
import type { FavoriteDish } from '../../hooks/useDishFavorites';

/**
 * En dörr in till allt som inte är dagens lunch.
 *
 * Statistiken och integritetsinfon låg som två understrukna tioradersord
 * längst ner i vänsterspalten, bortom listans scroll. Den som inte redan
 * visste att de fanns hittade dem aldrig. Nu ligger de bakom kugghjulet i
 * headern, tillsammans med rundan och de val som gäller till nästa besök.
 *
 * Platsen står kvar i headern: den byts under besöket, av samma person som
 * äter på två ställen. Temat väljs en gång och rörs sedan aldrig, så det hör
 * hemma här och inte bland dagflikarna.
 */

/** Samma adress som gamla sajten hade i sidfoten, så den som mejlat förr känner igen den. */
const FEEDBACK_ADDRESS = 'luns.se@outlook.com';

interface Props {
  onClose: () => void;
  startWithFavorites: boolean;
  onToggleStartWithFavorites: (value: boolean) => void;
  favoriteCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  largeText: boolean;
  onToggleLargeText: (value: boolean) => void;
  /** Bevakade rätter, som bara går att ta bort härifrån de dagar de inte serveras. */
  watchedDishes: FavoriteDish[];
  onRemoveWatched: (restaurant: string, signature: string) => void;
  onRestartTour: () => void;
  onOpenNews: () => void;
  /** Prickens tvilling: samma oläst-läge som kugghjulet bär, en rad in. */
  newsUnread: boolean;
  onOpenStats: () => void;
  onOpenPrivacy: () => void;
  onOpenContact?: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-mono text-10 tracking-[.15em] text-[var(--mut)]">{children}</h3>
  );
}

/**
 * Reglaget är en knapp och inte en kryssruta. En checkbox hade behövt både egen normalisering och egen fokusstil för att
 * se ut som resten.
 */
function Switch({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  /** Utelämnas när rubriken räcker. Mörkt läge behöver ingen förklaring. */
  hint?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3.5 rounded-xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3.5 text-left cursor-pointer transition-colors hover:bg-[var(--hi)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-13 font-semibold text-[var(--ink)]">{title}</span>
        {hint && (
          <span className="mt-0.5 block text-12 leading-[1.5] text-[var(--mut)]">{hint}</span>
        )}
      </span>

      <span
        aria-hidden="true"
        className="mt-0.5 flex h-[22px] w-[38px] flex-none items-center rounded-full p-[3px] transition-colors"
        style={{ background: checked ? 'var(--acc)' : 'var(--line)' }}
      >
        <span
          className="h-4 w-4 rounded-full bg-[var(--bg)] transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'none' }}
        />
      </span>
    </button>
  );
}

/** En rad som öppnar något annat. Samma yta som reglaget, utan reglaget. */
function LinkRow({
  title,
  hint,
  dot,
  onClick,
}: {
  title: string;
  hint: string;
  /** Liten markör framför rubriken, samma betydelse som pricken på kugghjulet. */
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3.5 text-left cursor-pointer transition-colors hover:bg-[var(--hi)]"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-13 font-semibold text-[var(--ink)]">
          {/* Pricken sitter före rubriken och inte efter: den ska hittas av
              blicken som just följt pricken på kugghjulet hit, inte letas upp
              i slutet av en rad vars längd varierar. */}
          {dot && (
            <span
              aria-hidden="true"
              className="h-[7px] w-[7px] flex-none rounded-full bg-[var(--acc)]"
            />
          )}
          {title}
        </span>
        <span className="mt-0.5 block text-12 leading-[1.5] text-[var(--mut)]">{hint}</span>
      </span>
      <span aria-hidden="true" className="flex-none text-13 text-[var(--mut)]">
        →
      </span>
    </button>
  );
}

/** Mejladressen finns kvar som alternativ när formuläret är avstängt. */
function MailRow({ address }: { address: string }) {
  return (
    <a
      href={`mailto:${address}?subject=${encodeURIComponent('Om luns.se')}`}
      className="flex w-full items-center gap-3.5 rounded-xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3.5 text-left no-underline cursor-pointer transition-colors hover:bg-[var(--hi)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-13 font-semibold text-[var(--ink)]">
          Tyck till om sajten
        </span>
        <span className="mt-0.5 block text-12 leading-[1.5] text-[var(--mut)]">
          Saknas en restaurang, eller är något fel? Mejla {address}.
        </span>
      </span>
      <span aria-hidden="true" className="flex-none text-13 text-[var(--mut)]">
        ↗
      </span>
    </a>
  );
}

function CloseButton() {
  const close = useOverlayClose();
  return (
    <button
      onClick={close}
      autoFocus
      className="min-h-11 shrink-0 rounded-lg border-0 bg-[var(--acc)] px-4 py-2 text-12 font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
    >
      Stäng
    </button>
  );
}

/**
 * Raderna som öppnar en annan ruta stänger den här först, men väntar inte in
 * utgången. De två animationerna korsar varandra med flit: entrén tonar in
 * suddet från blur(0), så en ruta som öppnas efter att den förra tagits bort
 * hade blinkat fram den skarpa sidan mellan sig. Överlappet håller bakgrunden
 * täckt hela vägen.
 */
function Rows({
  onRestartTour,
  onOpenNews,
  newsUnread,
  onOpenStats,
  onOpenPrivacy,
}: Pick<Props, 'onRestartTour' | 'onOpenNews' | 'newsUnread' | 'onOpenStats' | 'onOpenPrivacy'>) {
  const close = useOverlayClose();
  const handoff = (open: () => void) => () => {
    close();
    open();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Överst i avsnittet: det är den enda raden här som kan ha ändrats
          sedan besökaren var här sist, och den enda pricken pekar på. */}
      <LinkRow
        title="Nytt på luns.se"
        hint="Det som tillkommit sedan sist, med det senaste överst."
        dot={newsUnread}
        onClick={handoff(onOpenNews)}
      />
      <LinkRow
        title="Visa rundan igen"
        hint="Genomgången av vad som är nytt och var sakerna sitter."
        onClick={handoff(onRestartTour)}
      />
      <LinkRow
        title="Så används sajten"
        hint="Öppen statistik: när på dygnet folk kollar och vad de väljer."
        onClick={handoff(onOpenStats)}
      />
      <LinkRow
        title="Integritetsinfo"
        hint="Vad som sparas i webbläsaren och vad som skickas vidare."
        onClick={handoff(onOpenPrivacy)}
      />
    </div>
  );
}

export default function SettingsOverlay({
  onClose,
  startWithFavorites,
  onToggleStartWithFavorites,
  favoriteCount,
  theme,
  onToggleTheme,
  largeText,
  onToggleLargeText,
  watchedDishes,
  onRemoveWatched,
  onRestartTour,
  onOpenNews,
  newsUnread,
  onOpenStats,
  onOpenPrivacy,
  onOpenContact,
}: Props) {
  return (
    <Overlay onClose={onClose} labelledBy="luns-settings-title">
      <div
        className="luns-panel luns-settings-panel relative grid w-full max-w-md grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)] wide:grid-rows-[auto_minmax(0,1fr)_auto]"
        onClick={e => e.stopPropagation()}
      >
        <div className="col-span-2 row-start-1 min-w-0 border-b border-[var(--line)] p-4 wide:px-7">
          <span className="flex min-h-11 items-center pr-24 font-mono text-10 tracking-[.15em] text-[var(--mut)] wide:min-h-0 wide:pr-0">LUNS.SE</span>
          <h2 id="luns-settings-title" className="mt-2 font-heading text-20 font-bold tracking-[-.02em] text-[var(--ink)] wide:mt-1 wide:text-24">
            Inställningar och info
          </h2>
        </div>
        <div className="absolute top-4 right-4 flex items-start justify-end wide:static wide:col-span-2 wide:row-start-3 wide:border-t wide:border-[var(--line)] wide:px-7 wide:py-4">
          <CloseButton />
        </div>

        <div className="luns-scroll col-span-2 row-start-2 min-h-0 overflow-y-auto overscroll-contain p-4 wide:p-7">
          <SectionLabel>INSTÄLLNINGAR</SectionLabel>
          <div className="flex flex-col gap-2">
            <Switch checked={theme === 'dark'} onChange={onToggleTheme} title="Mörkt läge" />

            {/* Reglaget står näst överst, ovanför favoritvalet: den som letar
                efter det gör det för att texten är för liten att leta i. */}
            <Switch
              checked={largeText}
              onChange={onToggleLargeText}
              title="Större text"
              hint="Rätter, namn och etiketter växer ett steg. Listan rymmer lika många restauranger — det är bokstäverna som blir större, inte raderna."
            />

            <div>
              <Switch
                checked={startWithFavorites}
                onChange={onToggleStartWithFavorites}
                title="Börja med favoriterna"
                hint="Sajten öppnas med favoritfiltret på, så bara de hjärtmarkerade restaurangerna syns. Filtret går att stänga av som vanligt sedan."
              />
              {favoriteCount === 0 && (
                <p className="mt-2 mb-0 text-12 leading-[1.5] text-[var(--mut)]">
                  Det finns inga favoriter än. Hjärtat bredvid en restaurang sparar den, och då börjar
                  inställningen gälla.
                </p>
              )}
            </div>
          </div>

          {/* Egen rubrik inbakad, så ingen SectionLabel här. Avsnittet finns
              inte alls när ingenting bevakas. */}
          {watchedDishes.length > 0 && (
            <div className="mt-6">
              <WatchedDishes dishes={watchedDishes} onRemove={onRemoveWatched} />
            </div>
          )}

          <div className="mt-6">
            <SectionLabel>INFORMATION</SectionLabel>
            <Rows
              onRestartTour={onRestartTour}
              onOpenNews={onOpenNews}
              newsUnread={newsUnread}
              onOpenStats={onOpenStats}
              onOpenPrivacy={onOpenPrivacy}
            />
          </div>

          {/* Egen rubrik, inte en fjärde rad under INFORMATION. Den här leder ut
              ur sajten och handlar om att säga något, inte om att läsa något. */}
          <div className="mt-6">
            <SectionLabel>KONTAKT</SectionLabel>
            {onOpenContact ? <LinkRow title="Tjôta med Luns" hint="Tipsa om ett lunchställe, rapportera ett fel eller skicka en idé. E-post är valfritt." onClick={onOpenContact} /> : <MailRow address={FEEDBACK_ADDRESS} />}
          </div>

        </div>
      </div>
    </Overlay>
  );
}
