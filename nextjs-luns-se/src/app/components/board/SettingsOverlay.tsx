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
  onOpenStats: () => void;
  onOpenPrivacy: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-mono text-10 tracking-[.15em] text-[var(--mut)]">{children}</h3>
  );
}

/**
 * Reglaget är en knapp och inte en kryssruta. Sajten har inga formulär, och
 * en checkbox hade behövt både egen normalisering och egen fokusstil för att
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
  onClick,
}: {
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3.5 text-left cursor-pointer transition-colors hover:bg-[var(--hi)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-13 font-semibold text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-12 leading-[1.5] text-[var(--mut)]">{hint}</span>
      </span>
      <span aria-hidden="true" className="flex-none text-13 text-[var(--mut)]">
        →
      </span>
    </button>
  );
}

/**
 * Samma yta som raderna ovanför, men en länk som lämnar sajten.
 *
 * Ett formulär hade krävt någon som tar emot det, och sajten är en statisk
 * export utan server. Alternativet vore en tredjepartstjänst, alltså att
 * besökarens meddelande och IP går till någon annan — svårt att förena med
 * integritetsinfon två klick bort, som lovar att det som skrivs stannar i
 * webbläsaren. Mejlklienten är läsarens egen.
 *
 * Adressen står i klartext och inte bara bakom länken. Alla vill inte att en
 * mejlklient öppnar sig, en del vill kopiera den.
 */
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
      className="rounded-lg border-0 bg-[var(--acc)] px-4 py-2 text-12 font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90"
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
  onOpenStats,
  onOpenPrivacy,
}: Pick<Props, 'onRestartTour' | 'onOpenStats' | 'onOpenPrivacy'>) {
  const close = useOverlayClose();
  const handoff = (open: () => void) => () => {
    close();
    open();
  };

  return (
    <div className="flex flex-col gap-2">
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
  onOpenStats,
  onOpenPrivacy,
}: Props) {
  return (
    <Overlay onClose={onClose} labelledBy="luns-settings-title">
      <div
        className="luns-panel luns-scroll max-h-[86vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)] p-7"
        onClick={e => e.stopPropagation()}
      >
        <span className="font-mono text-10 tracking-[.15em] text-[var(--mut)]">LUNS.SE</span>
        <h2
          id="luns-settings-title"
          className="mt-2 mb-5 font-heading text-24 font-bold tracking-[-.02em] text-[var(--ink)]"
        >
          Inställningar och info
        </h2>

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
            onOpenStats={onOpenStats}
            onOpenPrivacy={onOpenPrivacy}
          />
        </div>

        {/* Egen rubrik, inte en fjärde rad under INFORMATION. Den här leder ut
            ur sajten och handlar om att säga något, inte om att läsa något. */}
        <div className="mt-6">
          <SectionLabel>KONTAKT</SectionLabel>
          <MailRow address={FEEDBACK_ADDRESS} />
        </div>

        <div className="mt-6 flex justify-end">
          <CloseButton />
        </div>
      </div>
    </Overlay>
  );
}
