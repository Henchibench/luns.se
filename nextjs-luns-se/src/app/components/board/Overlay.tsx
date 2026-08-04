'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Skärmen bakom sajtens tre rutor: platsvalet, integritetsinfon och
 * statistiken.
 *
 * Rutan renderas i document.body och inte där den står i trädet. Appskalet
 * har `backdrop-filter: blur(30px)` för glaseffekten, och ett element med
 * backdrop-filter blir en egen bakgrundsrot — allt som målas inuti den ligger
 * utanför vad barnens backdrop-filter kan nå. Låg rutan kvar i skalet
 * suddades därför bara mesh-gradienten längst bak, medan menytexten stod
 * knivskarp bakom rutan. Utanför skalet gäller suddet hela sidan.
 *
 * Portalen skapas först efter montering. Servern har ingen document.body att
 * rendera in i, och sajten är en statisk export.
 */
export default function Overlay({
  onClose,
  labelledBy,
  children,
}: {
  /** Utelämnas när rutan inte får stängas, som förstagångsvalet av plats. */
  onClose?: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="luns-overlay fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
    >
      {children}
    </div>,
    document.body
  );
}
