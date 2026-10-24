/** Synthesized locally. No audio files, network calls or persistent sound. */
export function createOracleSound() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);
  const voices = new Set<OscillatorNode>();
  let muted = false;
  const tone = (frequency: number, duration: number, volume: number, end = frequency, delay = 0) => {
    if (context.state === 'closed') return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain); gain.connect(master);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now); oscillator.stop(now + duration + 0.1);
  };
  return {
    ritual() {
      void context.resume().catch(() => {});
      tone(48, 5.8, 0.65, 110); tone(72, 5.8, 0.3, 220);
      tone(180, 4.5, 0.15, 680, 1);
    },
    ping() { tone(1320, 1.5, 0.55); tone(1760, 0.8, 0.12); },
    mute(value: boolean) { muted = value; if (!muted && !document.hidden) void context.resume().catch(() => {}); master.gain.setTargetAtTime(muted ? 0 : 0.16, context.currentTime, 0.05); },
    pause() { voices.forEach(voice => { try { voice.stop(); } catch { /* Already stopped. */ } }); void context.suspend().catch(() => {}); },
    resume() { if (!muted) void context.resume().catch(() => {}); },
    dispose() { voices.forEach(voice => { try { voice.stop(); } catch { /* Already stopped. */ } }); void context.close().catch(() => {}); },
  };
}
