/** Local sound design: filtered air, harmonic resonance, stereo space and a low impact. */
export function createOracleSound() {
  const context=new AudioContext();
  const master=context.createGain(); master.gain.value=.28;
  const limiter=context.createDynamicsCompressor();
  limiter.threshold.value=-12;limiter.ratio.value=8;master.connect(limiter);limiter.connect(context.destination);
  const room=context.createConvolver();
  const impulse=context.createBuffer(2,context.sampleRate*3.5,context.sampleRate);
  for(let channel=0;channel<2;channel++) {
    const data=impulse.getChannelData(channel);
    for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)*.4;
  }
  room.buffer=impulse;const wet=context.createGain();wet.gain.value=.35;room.connect(wet);wet.connect(master);
  const nodes=new Set<AudioScheduledSourceNode>();
  const ambience=context.createGain();ambience.gain.value=0;ambience.connect(master);ambience.connect(room);
  let muted=false,disposed=false;
  function track(source:AudioScheduledSourceNode,gain:GainNode) {
    nodes.add(source);source.onended=()=>{nodes.delete(source);source.disconnect();gain.disconnect();};
  }
  const noise=context.createBuffer(2,context.sampleRate*5,context.sampleRate);
  for(let channel=0;channel<2;channel++) {
    const data=noise.getChannelData(channel);let last=0;
    for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*4;}
  }
  function air(duration:number,volume:number,rise:boolean) {
    if(disposed)return;
    const now=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=noise;source.loop=true;filter.type='bandpass';filter.Q.value=.55;
    filter.frequency.setValueAtTime(rise?120:450,now);filter.frequency.exponentialRampToValueAtTime(rise?2200:90,now+duration);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+duration*.65);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(master);gain.connect(room);track(source,gain);
    source.addEventListener('ended',()=>filter.disconnect());source.start();source.stop(now+duration);
  }
  function impact() {
    const now=context.currentTime;
    for(const hz of [44,65,104]) {
      const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.frequency.setValueAtTime(hz*1.8,now);oscillator.frequency.exponentialRampToValueAtTime(hz,now+.2);
      gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(hz===44?.8:.2,now+.02);gain.gain.exponentialRampToValueAtTime(.001,now+2.8);
      oscillator.connect(gain);gain.connect(master);gain.connect(room);track(oscillator,gain);oscillator.start();oscillator.stop(now+3);
    }
    air(1.6,.25,false);
  }
  const ambientSource=context.createBufferSource(),lowpass=context.createBiquadFilter();
  ambientSource.buffer=noise;ambientSource.loop=true;lowpass.type='lowpass';lowpass.frequency.value=340;
  ambientSource.connect(lowpass);lowpass.connect(ambience);nodes.add(ambientSource);ambientSource.start();
  void context.resume().catch(()=>{});
  return {
    arrival(){if(disposed)return;ambience.gain.setTargetAtTime(.32,context.currentTime,2);air(7,.35,true);},
    ritual(){if(disposed)return;void context.resume().catch(()=>{});air(6.6,.75,true);ambience.gain.setTargetAtTime(.5,context.currentTime,1);},
    silence(){if(disposed)return;ambience.gain.setTargetAtTime(0,context.currentTime,.12);},
    verdict(){if(!disposed)impact();},
    mute(value:boolean){if(disposed)return;muted=value;master.gain.setTargetAtTime(value?0:.28,context.currentTime,.08);if(!value&&!document.hidden)void context.resume().catch(()=>{});},
    pause(){if(!disposed)void context.suspend().catch(()=>{});},
    resume(){if(!disposed&&!muted)void context.resume().catch(()=>{});},
    dispose(){if(disposed)return;disposed=true;nodes.forEach(node=>{try{node.stop();}catch{/* Already stopped. */}});lowpass.disconnect();room.disconnect();master.disconnect();limiter.disconnect();void context.close().catch(()=>{});},
  };
}
export type OracleSound = ReturnType<typeof createOracleSound>;
