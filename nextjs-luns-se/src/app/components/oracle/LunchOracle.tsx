'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { chooseOffering, type Offering } from '../../lib/oracle';
import type { OracleSound } from './sound';
import { createOracleClock, oracleTiming, RITUAL_MS, type OraclePhase } from './direction';
import styles from './oracle.module.css';

interface Props { audio: OracleSound | null; offerings: Offering[]; context: string; onClose: () => void; onAccept: (restaurant: string) => void }

export default function LunchOracle({ audio, offerings, context, onClose, onAccept }: Props) {
  // Freeze the source at entry, including day and filters. No background reroll.
  const [pool] = useState(offerings);
  const [phase, setPhase] = useState<OraclePhase>('loading');
  const [result, setResult] = useState<Offering | null>(null);
  const [muted, setMuted] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(!audio);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(() => oracleTiming());
  const [sceneReady, setSceneReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const sound = useRef(audio);
  const scene = useRef<{ phase: (value: OraclePhase) => void; dispose: () => void } | null>(null);
  const currentPhase = useRef(phase); currentPhase.current = phase;
  const close = useRef(onClose); close.current = onClose;
  const clock = useRef(createOracleClock());
  const timing = useRef(score);
  const lifetime = useRef(0);
  const silenced = useRef(false);
  const rolling = useRef(false);

  const enter = (next: OraclePhase) => {
    clock.current.reset(); currentPhase.current = next; setPhase(next);
    sound.current?.phase(next, pool.length > 0);
  };

  useEffect(() => {
    const lease = ++lifetime.current;
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
    let cancelled=false, frame=0;
    const tick = () => {
      if (cancelled || document.hidden) return;
      const elapsed = clock.current.elapsed(), current = currentPhase.current;
      if (current === 'arrival' && elapsed >= timing.current.arrivalMs) enter('invitation');
      else if (current === 'ritual') {
        if (!silenced.current && elapsed >= timing.current.ritualMs - 1400) { sound.current?.silence(); silenced.current = true; }
        if (elapsed >= timing.current.ritualMs) enter('verdict');
      } else if (current === 'declined' && elapsed >= timing.current.declinedMs) { close.current(); return; }
      frame = requestAnimationFrame(tick);
    };
    void (sound.current?.ready ?? Promise.resolve(false)).then(available => {
      if (cancelled) return;
      timing.current = sound.current?.timing() ?? oracleTiming();
      setScore(timing.current); setAudioUnavailable(!available);
      enter(motion.matches ? 'invitation' : 'arrival');
    });
    import('./scene').then(module => {
      if(cancelled || !host.current) return;
      try {
        scene.current=module.mountOracleScene(host.current, motion.matches, () => ({
          phase: currentPhase.current,
          elapsed: clock.current.elapsed() / 1000 * (currentPhase.current === 'ritual' ? RITUAL_MS / timing.current.ritualMs : 1),
          voice: sound.current?.level() ?? 0,
        }));
        scene.current.phase(currentPhase.current);
        setSceneReady(true);
      } catch { /* The illustrated fallback and the actual draw remain usable. */ }
    }).catch(() => {});
    const visibility = () => {
      cancelAnimationFrame(frame); setPaused(document.hidden);
      if (document.hidden) { clock.current.pause(); sound.current?.pause(); }
      else { clock.current.resume(); sound.current?.resume(); frame = requestAnimationFrame(tick); }
    };
    document.addEventListener('visibilitychange',visibility);
    visibility();
    return () => {
      cancelled=true; cancelAnimationFrame(frame); clock.current.pause();
      scene.current?.dispose(); sound.current?.pause();
      // React's development effect replay immediately takes a new lease on the same audio.
      queueMicrotask(() => { if (lifetime.current === lease) sound.current?.dispose(); });
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
    rolling.current=true; setResult(chosen); silenced.current=false;
    enter(reduced ? 'verdict' : 'ritual');
  };
  const decline = () => {
    enter('declined');
  };

  return createPortal(
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="oracle-title" tabIndex={-1}
      className={`${styles.oracle} ${reduced ? styles.reduced : ''}`} data-phase={phase} data-paused={paused}
      style={{'--call-at':`${score.callAt}ms`, '--cosmos-at':`${score.cosmosAt}ms`, '--lunch-at':`${score.lunchAt}ms`, '--ritual-orbit':`${score.ritualMs - 1300}ms`} as React.CSSProperties}>
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
          {phase === 'loading' && <div className={styles.loading}><h1 id="oracle-title">Något vaknar.</h1><p>Lyssna.</p></div>}
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
