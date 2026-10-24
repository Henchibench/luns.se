'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { chooseOffering, type Offering } from '../../lib/oracle';
import type { OracleSound } from './sound';
import { ARRIVAL_MS, RITUAL_MS, type OraclePhase } from './direction';
import styles from './oracle.module.css';

interface Props { audio: OracleSound | null; offerings: Offering[]; context: string; onClose: () => void; onAccept: (restaurant: string) => void }

export default function LunchOracle({ audio, offerings, context, onClose, onAccept }: Props) {
  // Freeze the source at entry, including day and filters. No background reroll.
  const [pool] = useState(offerings);
  const [phase, setPhase] = useState<OraclePhase>('arrival');
  const [result, setResult] = useState<Offering | null>(null);
  const [muted, setMuted] = useState(false);
  const audioUnavailable = !audio;
  const [reduced, setReduced] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const sound = useRef(audio);
  const scene = useRef<{ phase: (value: OraclePhase) => void; dispose: () => void } | null>(null);
  const currentPhase = useRef(phase); currentPhase.current = phase;
  const close = useRef(onClose); close.current = onClose;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rolling = useRef(false);

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children).filter(node => node !== element && node instanceof HTMLElement) as HTMLElement[];
    const inertStates = siblings.map(node => node.inert);
    siblings.forEach(node => { node.inert = true; });
    document.body.style.overflow = 'hidden';
    element.focus();
    const keyboard = (event: KeyboardEvent) => {
      if(event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
      if(event.key !== 'Tab') return;
      const buttons = Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]'));
      const first=buttons[0], last=buttons[buttons.length-1];
      if(event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last?.focus(); }
      else if(!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first?.focus(); }
    };
    element.addEventListener('keydown', keyboard);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(motion.matches);
    if (!motion.matches) sound.current?.arrival();
    const arrival = setTimeout(() => setPhase('invitation'), motion.matches ? 0 : ARRIVAL_MS);
    let cancelled=false;
    import('./scene').then(module => {
      if(cancelled || !host.current) return;
      try {
        scene.current=module.mountOracleScene(host.current, motion.matches);
        scene.current.phase(currentPhase.current);
        setSceneReady(true);
      } catch { /* The illustrated fallback and the actual draw remain usable. */ }
    }).catch(() => {});
    const visibility = () => { if(document.hidden) sound.current?.pause(); else sound.current?.resume(); };
    document.addEventListener('visibilitychange',visibility);
    return () => {
      cancelled=true; clearTimeout(arrival); timers.current.forEach(clearTimeout);
      scene.current?.dispose(); sound.current?.dispose();
      document.removeEventListener('visibilitychange',visibility);
      element.removeEventListener('keydown',keyboard);
      siblings.forEach((node,i) => { node.inert=inertStates[i]; });
      document.body.style.overflow=previousOverflow;
      previousFocus?.focus({preventScroll:true});
    };
  }, []);

  useEffect(() => {
    // A phase change removes its CTA. Keep Escape and keyboard navigation in the dialog.
    if (dialog.current && !dialog.current.contains(document.activeElement)) dialog.current.focus();
    scene.current?.phase(phase);
  }, [phase]);

  const start = () => {
    if(rolling.current) return;
    const chosen=chooseOffering(pool);
    if(!chosen) return;
    rolling.current=true; setResult(chosen); setPhase('ritual');
    if(!reduced) sound.current?.ritual();
    timers.current.push(setTimeout(() => sound.current?.silence(), reduced ? 0 : 6600));
    timers.current.push(setTimeout(() => {
      setPhase('verdict');
      if(!document.hidden && !reduced) sound.current?.verdict();
    },reduced ? 100 : RITUAL_MS));
  };
  const decline = () => {
    setPhase('declined');
    timers.current.push(setTimeout(() => close.current(),2800));
  };

  return createPortal(
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="oracle-title" tabIndex={-1}
      className={`${styles.oracle} ${reduced ? styles.reduced : ''}`} data-phase={phase}>
      <div ref={host} className={styles.scene} aria-hidden="true"/>
      {!sceneReady && <div className={styles.backdrop} aria-hidden="true"/>}
      <div className={styles.veil} aria-hidden="true"/>
      <div className={styles.controls}>
        <span className={styles.signature}>Lunsoraklet</span>
        <button type="button" disabled={audioUnavailable} aria-pressed={!muted} onClick={() => {
          setMuted(value => { sound.current?.mute(!value); return !value; });
        }}>{audioUnavailable ? 'Ljud saknas' : muted ? 'Ljud av' : 'Ljud på'}</button>
        <button type="button" onClick={onClose}>Stäng</button>
      </div>
      <div className={styles.content}>
        <div className={styles.apparition} aria-hidden="true">

          {phase === 'ritual' && <div className={styles.offerings}>
            {pool.filter((_,i) => i % Math.max(1,Math.ceil(pool.length/6)) === 0).slice(0,6).map((dish,i) => <span key={i} style={{'--orbit':`${i*60}deg`, '--delay':`${i*-0.9}s`} as React.CSSProperties}>{dish.description}</span>)}
          </div>}
        </div>
        <div className={styles.words} aria-live="polite" aria-atomic="true">
          {phase === 'arrival' && <div className={styles.intro}>
            <p>Du har kallat på Lunsoraklet.</p>
            <h1 id="oracle-title">Jag har sett stjärnor födas.<br/>Imperier falla.</h1>
            <p>Och dig vela mellan pasta och sushi.</p>
          </div>}
          {phase === 'invitation' && <div className={styles.reveal}>
            <h1 id="oracle-title">Överlämna<br/>ditt lunchöde.</h1>
            {pool.length ? <>
              <p>Trotsa domen och må ditt kaffe vara ljummet i sju år.</p>
              <button type="button" className={styles.primary} onClick={start}>Låt oraklet välja</button>
              <p className={styles.context}>{context}<br/>{pool.length} {pool.length === 1 ? 'rätt' : 'rätter'}. Dina filter gäller även i rymden.</p>
            </> : <>
              <p>Även en rymdgud behöver en meny. Det finns inga aktuella rätter med dina val.</p>
              <p className={styles.context}>{context}</p>
              <button type="button" className={styles.primary} onClick={onClose}>Tillbaka och ändra mina val</button>
            </>}
          </div>}
          {phase === 'ritual' && <div className={styles.reveal}>
            <h1 id="oracle-title">Tystnad.</h1>
            <p className={styles.ritualText}>Universum överväger din lunch.</p>
          </div>}
          {phase === 'verdict' && result && <div className={styles.reveal}>
            <p className={styles.verdict}>Universum har tallrikt.</p>
            <p className={styles.category}>{result.category}</p>
            <h1 id="oracle-title" className={styles.dish}>{result.description}</h1>
            <p className={styles.restaurant}>{result.restaurant}{result.price ? ` · ${result.price}` : ''}</p>
            <p className={styles.context}>{context}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => onAccept(result.restaurant)}>Jag följer mitt öde</button>
              <button type="button" className={styles.secondary} onClick={decline}>Jag trotsar universum</button>
            </div>
          </div>}
          {phase === 'declined' && <div className={styles.reveal}>
            <h1 id="oracle-title">Ditt beslut har noterats.</h1><p>Av vem är oklart.</p>
          </div>}
        </div>
      </div>
    </div>,document.body
  );
}
