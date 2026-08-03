'use client';

import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { trackEvent } from '../utils/analytics';

export interface TourStep {
  /** data-tour attribute of the element to spotlight. Omit for a plain card. */
  target?: string;
  title: string;
  body: string;
}

interface WhatsNewTourProps {
  steps: TourStep[];
  onFinish: () => void;
  /** Told which step is showing, so the page can open the filter panel. */
  onStepChange?: (step: TourStep | null) => void;
}

interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const CARD_WIDTH = 340;
const CARD_GAP = 14;

function findTarget(step: TourStep | undefined): HTMLElement | null {
  if (!step?.target) return null;
  return document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
}

export default function WhatsNewTour({ steps, onFinish, onStepChange }: WhatsNewTourProps) {
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Hole | null>(null);

  // Drop steps whose target is not on the page — the list view has no
  // restaurant cards, so pointing at "the heart on a restaurant" would be
  // instructions for something the visitor cannot see. Decided once at open so
  // the step count stays put while clicking through.
  const [visibleSteps] = useState(() =>
    steps.filter(s => !s.target || (typeof document !== 'undefined' && findTarget(s)))
  );

  const step = visibleSteps[index];
  const isLast = index === visibleSteps.length - 1;

  // Keep the page from scrolling out from under the spotlight
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    onStepChange?.(step ?? null);
  }, [step, onStepChange]);

  const measure = useCallback(() => {
    const element = findTarget(step);
    if (!element) {
      setHole(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    setHole({
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    });
  }, [step]);

  // Scroll the target into view, then measure.
  //
  // Re-measured a few times over the next half second rather than once: a step
  // can open the filter panel, which expands over a 300 ms transition, and a
  // single early measurement lands the spotlight on whatever used to occupy
  // that spot. Cheap enough to just re-align until things have settled.
  useLayoutEffect(() => {
    let cancelled = false;

    const align = () => {
      if (cancelled) return;
      const element = findTarget(step);
      if (element) element.scrollIntoView({ block: 'center', behavior: 'auto' });
      measure();
    };

    const raf = requestAnimationFrame(align);
    const timers = [120, 260, 420, 600].map(ms => window.setTimeout(align, ms));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const goNext = () => {
    if (isLast) {
      trackEvent('tour-complete', { steps: visibleSteps.length });
      onFinish();
      return;
    }
    const next = index + 1;
    setIndex(next);
    trackEvent('tour-step', { step: next + 1, id: visibleSteps[next]?.target ?? 'intro' });
  };

  const skip = () => {
    trackEvent('tour-skip', { step: index + 1, id: step?.target ?? 'intro' });
    onFinish();
  };

  if (!step) return null;

  // Card sits below the hole when there is room, otherwise above it. With no
  // hole at all (the intro) it is centred.
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

  let cardStyle: React.CSSProperties;
  if (!hole) {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  } else {
    const below = hole.top + hole.height + CARD_GAP;
    const roomBelow = viewportHeight - below > 210;
    const left = Math.min(
      Math.max(hole.left + hole.width / 2 - CARD_WIDTH / 2, 12),
      viewportWidth - CARD_WIDTH - 12
    );
    cardStyle = roomBelow
      ? { top: below, left }
      : { top: Math.max(hole.top - CARD_GAP - 200, 12), left };
  }

  return (
    <div className="fixed inset-0 z-[10001]" role="dialog" aria-modal="true" aria-label="Nyheter på luns.se">
      {/* Four panels around the hole rather than one box-shadow with a huge
          spread: a 9999px spread means a shadow surface of a few hundred
          million pixels, which browsers decline to rasterise fully — it paints
          as a partial band. Four rectangles are dull and correct.
          They also swallow clicks, so nothing behind the overlay reacts. */}
      {hole ? (
        <>
          <div className="absolute left-0 right-0 top-0 bg-black/70" style={{ height: Math.max(hole.top, 0) }} onClick={skip} />
          <div className="absolute left-0 right-0 bottom-0 bg-black/70" style={{ top: hole.top + hole.height }} onClick={skip} />
          <div className="absolute left-0 bg-black/70" style={{ top: hole.top, height: hole.height, width: Math.max(hole.left, 0) }} onClick={skip} />
          <div className="absolute right-0 bg-black/70" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }} onClick={skip} />
          <div
            className="absolute rounded-lg pointer-events-none ring-2 ring-white/70"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/70" onClick={skip} />
      )}

      <div
        className="absolute rounded-xl shadow-2xl border p-5 bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"
        style={{ ...cardStyle, width: CARD_WIDTH, maxWidth: 'calc(100vw - 24px)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-1.5 text-gray-800 dark:text-gray-100">{step.title}</h3>
        <p className="text-sm leading-relaxed mb-4 text-gray-600 dark:text-gray-300">{step.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Steg ${index + 1} av ${visibleSteps.length}`}>
            {visibleSteps.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i === index ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                onClick={skip}
                className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Hoppa över
              </button>
            )}
            <button
              onClick={goNext}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors active:scale-95"
            >
              {isLast ? 'Klar!' : 'Nästa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
