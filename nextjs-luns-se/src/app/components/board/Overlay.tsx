'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Måste stämma med .luns-overlay-out i globals.css. */
const EXIT_MS = 240;

/**
 * Stänger rutan med animationen påslagen.
 *
 * Knapparna som stänger sitter inne i innehållet, inte i Overlay, och deras
 * onClose kommer från sidan. Anropas den rakt av försvinner rutan direkt och
 * utgången hoppas över. Kroken ger dem samma väg ut som Escape och klick
 * utanför.
 */
const CloseContext = createContext<() => void>(() => {});

export function useOverlayClose() {
  return useContext(CloseContext);
}

/**
 * Skärmen bakom sajtens tre rutor: platsvalet, integritetsinfon och
 * statistiken.
 *
 * Rutan renderas i document.body och inte där den står i trädet. Appskalet
 * har `backdrop-filter: blur(30px)` för glaseffekten, och ett element med
 * backdrop-filter blir en egen bakgrundsrot. Allt som målas inuti den ligger
 * utanför vad barnens backdrop-filter kan nå, så låg rutan kvar i skalet
 * suddades bara mesh-gradienten längst bak medan menytexten stod knivskarp.
 * Utanför skalet gäller suddet hela sidan.
 *
 * Portalen skapas först efter montering. Servern har ingen document.body att
 * rendera in i, och sajten är en statisk export.
 *
 * Utgången kräver att komponenten lever kvar medan den spelas. React river
 * den i samma ögonblick som sidans state slås av, så stängningen sker i två
 * steg: först en flagga som byter till utgångsanimationen, sedan sidans
 * onClose när den hunnit spelas färdigt.
 */
export default function Overlay({
  onClose,
  onCloseStart,
  labelledBy,
  children,
}: {
  /** Utelämnas när rutan inte får stängas, som förstagångsvalet av plats. */
  onClose?: () => void;
  /**
   * Går när stängningen inleds, inte när den är klar. Den som vill öppna något
   * annat i samma andetag behöver det: onClose kommer först när utgången spelat
   * färdigt, och en ruta som öppnas då tonar in sitt sudd från noll mot en
   * bakgrund som redan hunnit bli skarp. Härifrån korsar de två animationerna
   * varandra i stället, som när rutan öppnades.
   */
  onCloseStart?: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const requestClose = useCallback(() => {
    if (!onClose || closing) return;
    onCloseStart?.();

    // Utan rörelse finns ingen animation att vänta in.
    const stillhet = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (stillhet) {
      onClose();
      return;
    }

    setClosing(true);
    timer.current = setTimeout(onClose, EXIT_MS);
  }, [onClose, onCloseStart, closing]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, requestClose]);

  if (!mounted) return null;

  return createPortal(
    <CloseContext.Provider value={requestClose}>
      <div
        className={`luns-overlay ${closing ? 'luns-overlay-out' : ''} fixed inset-0 z-[60] flex items-center justify-center p-4`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={requestClose}
      >
        {children}
      </div>
    </CloseContext.Provider>,
    document.body
  );
}
