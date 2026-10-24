import { oracleTiming, type OraclePhase, type VoiceCue } from './direction';

const voices: VoiceCue[] = ['call', 'cosmos', 'lunch', 'invitation', 'ritual', 'verdict', 'declined'];
type Clip = VoiceCue | 'atmosphere' | 'riser' | 'impact';
const clips: Clip[] = [...voices, 'atmosphere', 'riser', 'impact'];

/** Authored recordings, fetched only after the fifth logo tap. No service calls or browser TTS. */
export function createOracleSound() {
  const context = new AudioContext();
  const master = context.createGain(); master.gain.value = .8;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 8; limiter.ratio.value = 12;
  limiter.attack.value = .003; limiter.release.value = .25;
  master.connect(limiter); limiter.connect(context.destination);
  const bed = context.createGain(); bed.gain.value = 0; bed.connect(master);
  const effects = context.createGain(); effects.gain.value = .6; effects.connect(master);
  const voice = context.createGain(); voice.gain.value = 1; voice.connect(master);
  const analyser = context.createAnalyser(); analyser.fftSize = 256; voice.connect(analyser);
  const waveform = new Uint8Array(analyser.fftSize);

  // A quiet, filtered room tail leaves the words clear and in front of the atmosphere.
  const room = context.createConvolver(), wet = context.createGain(), roomFilter = context.createBiquadFilter();
  const impulse = context.createBuffer(2, context.sampleRate * 2.4, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  }
  room.buffer = impulse; wet.gain.value = .1; roomFilter.type = 'lowpass'; roomFilter.frequency.value = 2400;
  voice.connect(room); room.connect(roomFilter); roomFilter.connect(wet); wet.connect(master);

  const buffers = new Map<Clip, AudioBuffer>();
  const sources = new Map<AudioBufferSourceNode, { gain: GainNode; persistent: boolean }>();
  const abort = new AbortController();
  let disposed = false, muted = false, ambientStarted = false;
  // Resume during the original gesture, before awaiting any downloads (including on iOS).
  const unlock = context.createBufferSource(); unlock.buffer = context.createBuffer(1, 1, context.sampleRate);
  unlock.connect(master); unlock.onended = () => unlock.disconnect(); unlock.start();
  void context.resume().catch(() => {});
  const timeout = window.setTimeout(() => abort.abort(), 10000);
  const ready = Promise.allSettled(clips.map(async name => {
    const response = await fetch(`/oracle/audio/${name}.mp3`, { signal: abort.signal });
    if (!response.ok) return;
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    if (!disposed) buffers.set(name, buffer);
  })).then(() => {
    clearTimeout(timeout);
    return buffers.size > 0;
  });

  function timing() {
    return oracleTiming(Object.fromEntries(voices.flatMap(name => {
      const buffer = buffers.get(name); return buffer ? [[name, buffer.duration]] : [];
    })));
  }

  function play(name: Clip, destination: AudioNode, delay = 0, loop = false, duration?: number) {
    const buffer = buffers.get(name);
    if (disposed || !buffer) return;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer; source.loop = loop;
    if (duration) source.playbackRate.value = buffer.duration / duration;
    source.connect(gain); gain.connect(destination);
    sources.set(source, { gain, persistent: loop });
    source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(context.currentTime + delay);
  }

  function narrate(name: VoiceCue, delay = 0) {
    const buffer = buffers.get(name); if (!buffer) return;
    const at = context.currentTime + delay, end = at + buffer.duration;
    // Duck only the supporting tracks; muting remains independent on the master bus.
    for (const [gain, quiet, normal] of [[bed.gain, .08, .2], [effects.gain, .22, .6]] as const) {
      gain.setValueAtTime(normal, Math.max(context.currentTime, at - .15));
      gain.linearRampToValueAtTime(quiet, at);
      gain.setValueAtTime(quiet, end);
      gain.linearRampToValueAtTime(normal, end + .5);
    }
    play(name, voice, delay);
  }

  function phase(next: OraclePhase, hasOfferings = true) {
    if (disposed) return;
    const now = context.currentTime;
    // Includes future voices, so an early click cannot leave a stray line.
    sources.forEach(({ gain, persistent }, source) => {
      if (persistent) return;
      gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, .008);
      try { source.stop(now + .04); } catch { /* Already ended. */ }
    });
    for (const [gain, value] of [[bed.gain, .2], [effects.gain, .6]] as const) {
      gain.cancelScheduledValues(now); gain.setTargetAtTime(value, now, .12);
    }
    if (!ambientStarted && next !== 'loading') { play('atmosphere', bed, 0, true); ambientStarted = true; }
    const score = timing();
    if (next === 'arrival') {
      narrate('call', score.callAt / 1000);
      narrate('cosmos', score.cosmosAt / 1000);
      narrate('lunch', score.lunchAt / 1000);
    } else if (next === 'invitation' && hasOfferings) narrate('invitation', .2);
    else if (next === 'ritual') {
      narrate('ritual', .1);
      play('riser', effects, 0, false, (score.ritualMs - 1400) / 1000);
    } else if (next === 'verdict') { play('impact', effects); narrate('verdict', .75); }
    else if (next === 'declined') narrate('declined', .2);
  }

  return {
    ready, timing, phase,
    level() {
      if (disposed || muted || context.state !== 'running') return 0;
      analyser.getByteTimeDomainData(waveform);
      let energy = 0; for (const value of waveform) energy += ((value - 128) / 128) ** 2;
      return Math.min(1, Math.sqrt(energy / waveform.length) * 5);
    },
    silence() {
      if (disposed) return;
      for (const gain of [bed.gain, effects.gain]) { gain.cancelScheduledValues(context.currentTime); gain.setTargetAtTime(0, context.currentTime, .06); }
    },
    mute(value: boolean) {
      if (disposed) return; muted = value;
      master.gain.setTargetAtTime(value ? 0 : .8, context.currentTime, .04);
      if (!document.hidden) void context.resume().catch(() => {});
    },
    pause() { if (!disposed) void context.suspend().catch(() => {}); },
    resume() { if (!disposed) void context.resume().catch(() => {}); },
    dispose() {
      if (disposed) return; disposed = true; abort.abort(); clearTimeout(timeout);
      sources.forEach(({ gain }, source) => {
        source.onended = null;
        try { source.stop(); } catch { /* Already ended. */ }
        source.disconnect(); gain.disconnect();
      });
      sources.clear();
      buffers.clear();
      for (const node of [bed, effects, voice, analyser, room, roomFilter, wet, master, limiter]) node.disconnect();
      void context.close().catch(() => {});
    },
  };
}
export type OracleSound = ReturnType<typeof createOracleSound>;
