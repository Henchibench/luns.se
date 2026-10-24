export type OraclePhase = 'arrival' | 'invitation' | 'ritual' | 'verdict' | 'declined';
export const ARRIVAL_MS = 11000;
export const RITUAL_MS = 8000;
export const ORACLE_SCRIPT = {
  arrival: 'Du har kallat på Lunsoraklet. Jag har sett stjärnor födas. Imperier falla. Och dig vela mellan pasta och sushi.',
  invitation: 'Överlämna ditt lunchöde. Trotsa domen, och må ditt kaffe vara ljummet i sju år.',
  ritual: 'Tystnad. Universum överväger din lunch.',
  verdict: 'Det är avgjort. Universum har tallrikt.',
  declined: 'Ditt beslut har noterats. Av vem är oklart.',
};
export const smooth = (x: number) => { const t=Math.max(0,Math.min(1,x)); return t*t*(3-2*t); };

/** Visual timing is deterministic. A phase change never jumps a rotation angle. */
export function direction(phase: OraclePhase, elapsed: number, reduced: boolean) {
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
