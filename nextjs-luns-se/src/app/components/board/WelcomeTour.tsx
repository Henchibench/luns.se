'use client';

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export interface TourStep {
  /**
   * Kandidater i fallande ordning. Första som finns och syns används.
   * Vänsterspalten finns inte på mobil — där pekar samma steg i stället på
   * knappen som öppnar den. Hittas ingen kandidat hoppas steget över.
   */
  targets?: string[];
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Luft mellan markeringen och det den ramar in. */
const PADDING = 8;
/** Bubblans bredd, och minsta avstånd den håller till skärmkanten. */
const CARD_WIDTH = 320;
const EDGE = 14;

/**
 * Layouten hinner inte alltid landa när steget byts — spalten kan scrolla,
 * en panel fällas ut. Mätningen görs därför om några gånger i rad.
 */
const REMEASURE_AT = [0, 120, 260, 420];

function findTarget(selectors: string[] | undefined): HTMLElement | null {
  if (!selectors) return null;
  for (const selector of selectors) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const rect = el.getBoundingClientRect();
      // Nollstora element är dolda av en media query, inte bara tomma.
      if (rect.width > 0 && rect.height > 0) return el;
    }
  }
  return null;
}

export default function WelcomeTour({
  steps,
  onClose,
}: {
  steps: TourStep[];
  onClose: (atStep: number, total: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Steg vars mål saknas i den här vyn plockas bort innan rundan börjar, så
  // räknaren inte säger 5 när bara 4 går att visa.
  const [visibleSteps] = useState(() =>
    steps.filter(step => !step.targets || findTarget(step.targets) !== null)
  );

  const total = visibleSteps.length;
  const step = visibleSteps[index];

  const measure = useCallback(() => {
    const el = findTarget(step?.targets);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    });
  }, [step]);

  useLayoutEffect(() => {
    const timers = REMEASURE_AT.map(delay => setTimeout(measure, delay));
    window.addEventListener('resize', measure);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const finish = useCallback(() => onClose(index, total), [onClose, index, total]);
  const next = useCallback(() => {
    if (index >= total - 1) finish();
    else setIndex(i => i + 1);
  }, [index, total, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, next]);

  if (!step) return null;

  // Fyra paneler runt hålet i stället för en box-shadow. En shadow med
  // 9999px spridning täcker en yta webbläsaren vägrar rastrera, och blev
  // förra gången bara ett band över skärmen.
  const dim = 'fixed bg-[rgba(0,14,18,.55)] z-[70]';
  const panels = rect
    ? [
        { top: 0, left: 0, width: '100vw', height: `${Math.max(0, rect.top)}px` },
        { top: `${rect.top + rect.height}px`, left: 0, width: '100vw', bottom: 0 },
        { top: `${rect.top}px`, left: 0, width: `${Math.max(0, rect.left)}px`, height: `${rect.height}px` },
        { top: `${rect.top}px`, left: `${rect.left + rect.width}px`, right: 0, height: `${rect.height}px` },
      ]
    : [{ top: 0, left: 0, width: '100vw', height: '100vh' }];

  /*
   * Placering av bubblan. Under markeringen när det får plats, annars över.
   *
   * Höga mål — vänsterspalten är nästan skärmhög — får bubblan bredvid sig
   * i stället. Över eller under fanns det ändå ingen plats, och den lade sig
   * då ovanpå just det den skulle peka ut.
   */
  const vw = typeof window !== 'undefined' ? window.innerWidth : CARD_WIDTH;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const CARD_HEIGHT = 190;

  let cardTop: number | undefined;
  let cardLeft: number | undefined;

  if (rect) {
    const tall = rect.height > vh * 0.55;
    const clampX = (x: number) => Math.min(Math.max(EDGE, x), vw - CARD_WIDTH - EDGE);
    const clampY = (y: number) => Math.min(Math.max(EDGE, y), Math.max(EDGE, vh - CARD_HEIGHT - EDGE));

    if (tall) {
      const toTheRight = rect.left + rect.width + 14;
      const fitsRight = vw - toTheRight >= CARD_WIDTH + EDGE;
      cardLeft = clampX(fitsRight ? toTheRight : rect.left - CARD_WIDTH - 14);
      cardTop = clampY(rect.top + rect.height / 2 - CARD_HEIGHT / 2);
    } else {
      const below = rect.top + rect.height + 14;
      const fitsBelow = vh - below > CARD_HEIGHT;
      cardTop = clampY(fitsBelow ? below : rect.top - CARD_HEIGHT - 14);
      cardLeft = clampX(rect.left + rect.width / 2 - CARD_WIDTH / 2);
    }
  }

  return (
    <>
      {panels.map((style, i) => (
        <div key={i} className={dim} style={style} onClick={finish} aria-hidden="true" />
      ))}

      {rect && (
        <div
          className="pointer-events-none fixed z-[71] rounded-xl"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            border: '2px solid var(--acc)',
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        className="fixed z-[72] rounded-2xl border border-[var(--glassBrd)] bg-[var(--bg)] p-5 shadow-[0_18px_50px_rgba(0,10,14,.45)]"
        style={
          rect
            ? { top: cardTop, left: cardLeft, width: CARD_WIDTH }
            : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: CARD_WIDTH }
        }
      >
        <h2 className="m-0 mb-1.5 font-heading text-[18px] font-bold tracking-[-.01em] text-[var(--ink)]">
          {step.title}
        </h2>
        <p className="m-0 text-[13px] leading-[1.55] text-[var(--ink2)]">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[.15em] text-[var(--mut)]">
            {index + 1} / {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={finish}
              className="rounded-lg border-0 bg-transparent px-2 py-1.5 text-[12px] font-semibold text-[var(--mut)] cursor-pointer transition-colors hover:text-[var(--ink2)]"
            >
              Hoppa över
            </button>
            <button
              onClick={next}
              className="rounded-lg border-0 bg-[var(--acc)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--bg)] cursor-pointer transition-opacity hover:opacity-90"
            >
              {index >= total - 1 ? 'Klart' : 'Nästa'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
