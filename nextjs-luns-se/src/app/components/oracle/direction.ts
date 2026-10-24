export type OraclePhase = 'loading' | 'arrival' | 'invitation' | 'ritual' | 'verdict' | 'declined';
export type VoiceCue = 'call' | 'cosmos' | 'lunch' | 'invitation' | 'ritual' | 'verdict' | 'declined';
export const ARRIVAL_MS = 11000;
export const RITUAL_MS = 8000;
export const VERDICT_VOICE_DELAY_MS = 1500;
export const ORACLE_SCRIPT = {
  arrival: 'Du har kallat på Lunsoraklet. Jag har sett stjärnor födas. Imperier falla. Och dig vela över vad du ska äta.',
  invitation: 'Överlämna ditt lunchöde. Trotsa domen, och må ditt kaffe vara ljummet i sju år.',
  ritual: 'Tystnad. Universum överväger din lunch.',
  verdict: 'Det är avgjort. Universum har tallrikt.',
  declined: 'Ditt beslut har noterats. Av vem är oklart.',
};

/** Durations come from decoded recordings, so a slow delivery is never cut short. */
export function oracleTiming(durations: Partial<Record<VoiceCue, number>> = {}) {
  const callAt = 1200;
  const cosmosAt = callAt + (durations.call ?? 2.3) * 1000 + 650;
  const lunchAt = cosmosAt + (durations.cosmos ?? 3.4) * 1000 + 800;
  return {
    callAt, cosmosAt, lunchAt,
    arrivalMs: Math.max(ARRIVAL_MS, lunchAt + (durations.lunch ?? 3) * 1000 + 700),
    ritualMs: Math.max(RITUAL_MS, (durations.ritual ?? 3) * 1000 + 2800),
    declinedMs: Math.max(3200, (durations.declined ?? 3) * 1000 + 1100),
  };
}

/** The same visible time drives phase changes and the 3D camera. */
export function createOracleClock(now: () => number = () => performance.now()) {
  let started = now(), saved = 0, paused = false;
  return {
    elapsed: () => saved + (paused ? 0 : Math.max(0, now() - started)),
    reset() { saved = 0; started = now(); },
    pause() { if (!paused) { saved += Math.max(0, now() - started); paused = true; } },
    resume() { if (paused) { started = now(); paused = false; } },
  };
}
export const smooth = (x: number) => { const t=Math.max(0,Math.min(1,x)); return t*t*(3-2*t); };

/** Visual timing is deterministic. A phase change never jumps a rotation angle. */
export function direction(phase: OraclePhase, elapsed: number, reduced: boolean) {
  const locked = phase === 'verdict' || phase === 'declined';
  if(phase==='loading') return {reveal:0,travel:0,energy:0,alignment:0,flash:0};
  if(reduced) return {reveal:1,travel:1,energy:0,alignment:locked?1:0,flash:0};
  if(phase==='arrival') return {
    reveal:smooth((elapsed-2.5)/5),travel:smooth(elapsed/9),energy:0.2,alignment:0,flash:0,
  };
  if(phase==='ritual') {
    const alignment=smooth((elapsed-5.6)/(RITUAL_MS/1000-5.6));
    return {reveal:1,travel:1,energy:smooth(elapsed/5)*(1-alignment),alignment,flash:0};
  }
  return {reveal:1,travel:1,energy:0,alignment:locked?1:0,flash:phase==='verdict'?Math.exp(-Math.max(0,elapsed)*3.6)*0.65:0};
}
