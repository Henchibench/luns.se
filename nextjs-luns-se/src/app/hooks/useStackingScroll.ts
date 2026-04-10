'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const STICKY_OFFSET_BASE = 56; // height of control bar
const STICKY_INCREMENT = 8;    // offset between stacked sheets
const MAX_STICKY = 3;          // max sheets sticky at once

interface StackingState {
  stickyIndices: Set<number>;
  offsets: Map<number, number>;
}

export function useStackingScroll(sheetCount: number) {
  const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [stackingState, setStackingState] = useState<StackingState>({
    stickyIndices: new Set(),
    offsets: new Map(),
  });
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const setSheetRef = useCallback((index: number, el: HTMLDivElement | null) => {
    sheetRefs.current[index] = el;
  }, []);

  // Entrance reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-sheet-index'));
            if (!isNaN(index)) {
              setRevealedIndices((prev) => {
                if (prev.has(index)) return prev;
                const next = new Set(prev);
                next.add(index);
                return next;
              });
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    sheetRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sheetCount]);

  // Stacking scroll observer
  useEffect(() => {
    const handleScroll = () => {
      const controlBarBottom = STICKY_OFFSET_BASE;
      const visibleSheets: number[] = [];

      sheetRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Sheet is considered "at the sticky zone" when its top is near or above the control bar
        if (rect.top <= controlBarBottom + STICKY_INCREMENT * MAX_STICKY && rect.bottom > controlBarBottom) {
          visibleSheets.push(index);
        }
      });

      // Take the first MAX_STICKY sheets that are in the sticky zone
      const stickySet = new Set(visibleSheets.slice(0, MAX_STICKY));
      const offsetMap = new Map<number, number>();

      let offsetIndex = 0;
      stickySet.forEach((sheetIndex) => {
        offsetMap.set(sheetIndex, STICKY_OFFSET_BASE + offsetIndex * STICKY_INCREMENT);
        offsetIndex++;
      });

      setStackingState({ stickyIndices: stickySet, offsets: offsetMap });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sheetCount]);

  const getSheetStyle = (index: number): React.CSSProperties => {
    const isSticky = stackingState.stickyIndices.has(index);
    const offset = stackingState.offsets.get(index);
    const stickyArray = Array.from(stackingState.stickyIndices);
    const positionInStack = stickyArray.indexOf(index);
    const isBehind = isSticky && positionInStack < stickyArray.length - 1;

    return {
      position: isSticky ? 'sticky' : 'relative',
      top: isSticky && offset !== undefined ? `${offset}px` : undefined,
      zIndex: isSticky ? 20 + positionInStack : 10,
      transform: isBehind ? 'scale(0.995)' : undefined,
    };
  };

  const getSheetClassName = (index: number): string => {
    const isSticky = stackingState.stickyIndices.has(index);
    const stickyArray = Array.from(stackingState.stickyIndices);
    const positionInStack = stickyArray.indexOf(index);
    const isBehind = isSticky && positionInStack < stickyArray.length - 1;
    const isRevealed = revealedIndices.has(index);

    const classes = ['restaurant-sheet'];
    if (isSticky) classes.push('is-sticky');
    if (isBehind) classes.push('is-behind');
    if (isRevealed) classes.push('animate-sheet-reveal');

    return classes.join(' ');
  };

  return { setSheetRef, getSheetStyle, getSheetClassName, revealedIndices };
}
