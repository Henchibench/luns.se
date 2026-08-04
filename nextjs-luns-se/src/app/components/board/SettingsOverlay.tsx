'use client';

import React from 'react';
import Overlay, { useOverlayClose } from './Overlay';

/**
 * En dörr in till allt som inte är dagens lunch.
 *
 * Statistiken och integritetsinfon låg som två understrukna tioradersord
 * längst ner i vänsterspalten, under matprofilen och bortom listans scroll.
 * Den som inte redan visste att de fanns hittade dem aldrig. Nu ligger de
 * bakom kugghjulet i headern, tillsammans med rundan och de val som gäller
 * till nästa besök.
 *
 * Platsen står kvar i headern: den byts under besöket, av samma person som
 * äter på två ställen. Temat väljs en gång och rörs sedan aldrig, så det hör
 * hemma här och inte bland dagflikarna.
 */

interface Props {
  onClose: () => void;
  startWithFavorites: boolean;
  onToggleStartWithFavorites: (value: boolean) => void;
  favoriteCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRestartTour: () => void;
  onOpenStats: () => void;
  onOpenPrivacy: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">{children}</h3>
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
  hint: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3.5 rounded-xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3.5 text-left cursor-pointer transition-colors hover:bg-[var(--hi)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-[1.5] text-[var(--mut)]">{hint}</span>
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
        <span className="block text-[13px] font-semibold text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-[1.5] text-[var(--mut)]">{hint}</span>
      </span>
      <span aria-hidden="true" className="flex-none text-[13px] text-[var(--mut)]">
        →
      </span>
    </button>
  );
}

function CloseButton() {
  const close = useOverlayClose();
  return (
    <button
      onClick={close}
      className="rounded-lg border-0 bg-[var(--acc)] px-4 py-2 text-[12px] font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90"
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
        <span className="font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">LUNS.SE</span>
        <h2
          id="luns-settings-title"
          className="mt-2 mb-5 font-heading text-2xl font-bold tracking-[-.02em] text-[var(--ink)]"
        >
          Inställningar och info
        </h2>

        <SectionLabel>INSTÄLLNINGAR</SectionLabel>
        <div className="flex flex-col gap-2">
          <Switch
            checked={theme === 'dark'}
            onChange={onToggleTheme}
            title="Mörkt läge"
            hint="Ljust läge är lättare att läsa i dagsljus, mörkt är snällare mot ögonen inomhus."
          />

          <div>
            <Switch
              checked={startWithFavorites}
              onChange={onToggleStartWithFavorites}
              title="Börja med favoriterna"
              hint="Sajten öppnas med favoritfiltret på, så bara de hjärtmarkerade restaurangerna syns. Filtret går att stänga av som vanligt sedan."
            />
            {favoriteCount === 0 && (
              <p className="mt-2 mb-0 text-[12px] leading-[1.5] text-[var(--mut)]">
                Det finns inga favoriter än. Hjärtat bredvid en restaurang sparar den, och då börjar
                inställningen gälla.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <SectionLabel>INFORMATION</SectionLabel>
          <Rows
            onRestartTour={onRestartTour}
            onOpenStats={onOpenStats}
            onOpenPrivacy={onOpenPrivacy}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <CloseButton />
        </div>
      </div>
    </Overlay>
  );
}
