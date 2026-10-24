export type OraclePhase = 'loading' | 'arrival' | 'invitation' | 'ritual' | 'verdict' | 'declined';
export type VoiceCue = 'call' | 'cosmos' | 'lunch' | 'invitation' | 'ritual' | 'verdict' | 'declined';
export const ARRIVAL_MS = 11000;
export const RITUAL_MS = 8000;
export const ORACLE_SCRIPT = {
  arrival: 'Du har kallat på Lunsoraklet. Jag har sett stjärnor födas. Imperier falla. Och dig vela mellan pasta och sushi.',
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
  if(phase==='loading') return {reveal:0,travel:0,energy:0,collapse:0,flash:0};
  if(reduced) return {reveal:1,travel:1,energy:0,collapse:0,flash:0};
  if(phase==='arrival') return {
    reveal:smooth((elapsed-2.5)/5),travel:smooth(elapsed/9),energy:0.2,collapse:0,flash:0,
  };
  if(phase==='ritual') return {
    reveal:1,travel:1,energy:smooth(elapsed/5),collapse:smooth((elapsed-5.6)/1.5),
    flash:Math.max(0,1-Math.abs(elapsed-7.3)/0.55)*0.6,
  };
  return {reveal:1,travel:1,energy:0,collapse:0,flash:phase==='verdict'?Math.max(0,0.4-elapsed):0};
}
