import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { direction, type OraclePhase } from './direction';

/** A cinematic illustration inside a real 3D astrolabe, dust field and camera move. */
export function mountOracleScene(host: HTMLElement, reduced: boolean) {
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.25));
  renderer.setClearColor(0x010305); renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1; host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,0.1,130);
  const composer=new EffectComposer(renderer);
  const renderPass=new RenderPass(scene,camera);
  const bloom=new UnrealBloomPass(new THREE.Vector2(512,512),0.65,0.8,0.85);
  const output=new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(output);
  let phase:OraclePhase='arrival', elapsed=0, time=0, previous=0, frame=0, disposed=false;
  let orbit=0, baseDistance=15, pointerX=0, pointerY=0;
  const world=new THREE.Group(); world.position.y=1.5; scene.add(world);
  const gold=new THREE.MeshStandardMaterial({color:0x967747,metalness:0.85,roughness:0.36});
  const lightGold=new THREE.MeshBasicMaterial({color:new THREE.Color(2.2,1.15,0.36)});
  const coldLight=new THREE.MeshBasicMaterial({color:new THREE.Color(0.24,0.65,0.8)});

  const astrolabe=new THREE.Group(); world.add(astrolabe);
  const bands:THREE.Group[]=[];
  for(let ringIndex=0;ringIndex<4;ringIndex++) {
    const band=new THREE.Group(); bands.push(band); astrolabe.add(band);
    const radius=3.2+ringIndex*0.36;
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(radius,0.045,8,160),gold); band.add(hoop);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(radius-0.11,0.012,6,160),ringIndex%2?coldLight:lightGold); band.add(inner);
    // Calibrated ticks and bronze glyph blocks make it read as an ancient instrument.
    const tickGeometry=new THREE.BoxGeometry(0.022,0.12,0.035);
    const ticks=new THREE.InstancedMesh(tickGeometry,gold,96);
    const dummy=new THREE.Object3D();
    for(let i=0;i<96;i++) {
      const a=i*Math.PI*2/96;
      dummy.position.set(Math.sin(a)*radius,Math.cos(a)*radius,0);
      dummy.rotation.z=-a; dummy.scale.set(1,i%8===0?2.5:1,1); dummy.updateMatrix(); ticks.setMatrixAt(i,dummy.matrix);
    }
    band.add(ticks);
    band.rotation.set(ringIndex*0.7,ringIndex*0.42,ringIndex*0.27);
  }

  // The portrait is an authored texture, not presented as a fully modelled head.
  const portraitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,depthTest:false,toneMapped:false});
  portraitMaterial.onBeforeCompile=shader=> {
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      #ifdef USE_MAP
        diffuseColor.a *= smoothstep(0.0,0.28,vMapUv.y);
      #endif`);
  };
  const portrait=new THREE.Mesh(new THREE.PlaneGeometry(5.6,6.72),portraitMaterial);
  portrait.renderOrder=3; portrait.position.set(0,0.7,0.7); world.add(portrait);
  const texture=new THREE.TextureLoader().load('/oracle/oracle-entity.webp',loaded=> {
    if(disposed) { loaded.dispose(); return; }
    loaded.colorSpace=THREE.SRGBColorSpace; portraitMaterial.map=loaded; portraitMaterial.needsUpdate=true;
    if(reduced) render(0);
  });

  const dustCount=1200;
  const dustPositions=new Float32Array(dustCount*3);
  const dustColors=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++) {
    const angle=Math.random()*Math.PI*2, radius=2+Math.random()*17;
    dustPositions[i*3]=Math.cos(angle)*radius;
    dustPositions[i*3+1]=Math.sin(angle)*radius;
    dustPositions[i*3+2]=Math.random()*70-40;
    const warm=i%4===0; dustColors.set(warm?[0.7,0.4,0.16]:[0.22,0.38,0.44],i*3);
  }
  const dustGeometry=new THREE.BufferGeometry();
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  dustGeometry.setAttribute('color',new THREE.BufferAttribute(dustColors,3));
  const dustMaterial=new THREE.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec3 vColor; void main(){vColor=color; vec4 p=modelViewMatrix*vec4(position,1.0); gl_PointSize=clamp(42.0/-p.z,1.0,4.0); gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 vColor; void main(){float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(vColor, smoothstep(0.5,0.05,d));}`,
  });
  const dust=new THREE.Points(dustGeometry,dustMaterial); scene.add(dust);

  // Animated fractal fog, with room for darkness around the character and captions.
  const fogMaterial=new THREE.ShaderMaterial({depthWrite:false,transparent:true,
    uniforms:{time:{value:0},intensity:{value:0}},
    vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vUv; uniform float time; uniform float intensity;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.02+7.1;a*=.5;}return n;}
      void main(){vec2 p=vUv*5.;float t=time*.025;float f=fbm(p+vec2(fbm(p+t),fbm(p-t)));float cloud=smoothstep(.25,.8,f);vec3 c=mix(vec3(.02,.09,.12),vec3(.18,.12,.055),vUv.x);float edge=1.-smoothstep(.1,.7,distance(vUv,vec2(.5,.6)));gl_FragColor=vec4(c*(.7+cloud*1.2),cloud*intensity*edge);}`,
  });
  const fog=new THREE.Mesh(new THREE.PlaneGeometry(55,40),fogMaterial); fog.position.set(0,0,-9); scene.add(fog);
  scene.add(new THREE.HemisphereLight(0x9ab6c2,0x16100a,1.5));
  const key=new THREE.PointLight(0xffb45f,130,50); key.position.set(-5,4,7); scene.add(key);
  const rim=new THREE.PointLight(0x408cae,140,50); rim.position.set(5,-1,4); scene.add(rim);
  const mouse=(event:PointerEvent)=> {pointerX=(event.clientX/window.innerWidth-.5)*.7;pointerY=(event.clientY/window.innerHeight-.5)*.35;};
  host.addEventListener('pointermove',mouse);
  const render=(stamp:number)=> {
    if(disposed||document.hidden) return;
    const dt=previous?Math.min((stamp-previous)/1000,0.05):0; previous=stamp;
    time+=dt; elapsed+=dt;
    const d=direction(phase,elapsed,reduced);
    portraitMaterial.opacity=d.reveal;
    astrolabe.scale.setScalar(1-d.collapse*.42);
    astrolabe.position.z=d.collapse*2;
    if(!reduced) {
      orbit+=dt*(.035+d.energy*.46);
      bands.forEach((band,i)=> {band.rotation.x=i*.7+orbit*(i%2?1:-1); band.rotation.y=i*.42+orbit*.7;band.rotation.z=i*.27+orbit*.25;});
      portrait.rotation.y=Math.sin(time*.16)*.035;
      world.position.y=1.5+Math.sin(time*.4)*.06;
      for(let i=0;i<dustCount;i++) {
        dustPositions[i*3+2]+=dt*(phase==='arrival'?(1-d.travel)*12+.5:d.energy*14+.3);
        if(dustPositions[i*3+2]>32) dustPositions[i*3+2]=-40;
      }
      dustGeometry.attributes.position.needsUpdate=true;
      camera.position.x+=(pointerX-camera.position.x)*.025;
      camera.position.y+=(pointerY-camera.position.y)*.025;
    }
    camera.position.z=baseDistance+(1-d.travel)*22-d.collapse*1.3;
    camera.lookAt(0,.8,0);
    fogMaterial.uniforms.time.value=time; fogMaterial.uniforms.intensity.value=.45+d.reveal*.5+d.energy*.4;
    bloom.strength=.55+d.energy*.3+d.flash*.7;
    renderer.toneMappingExposure=1.05+d.flash*.6;
    composer.render();
    if(!reduced) frame=requestAnimationFrame(render);
  };
  const resize=()=> {
    const {width,height}=host.getBoundingClientRect(); if(!width||!height)return;
    renderer.setSize(width,height);composer.setSize(width,height);
    camera.aspect=width/height; baseDistance=camera.aspect<.75?18:14;
    camera.updateProjectionMatrix(); if(reduced)render(0);
  };
  const observer=new ResizeObserver(resize); observer.observe(host); resize();
  const visibility=()=>{cancelAnimationFrame(frame);previous=0;if(!document.hidden)frame=requestAnimationFrame(render);};
  document.addEventListener('visibilitychange',visibility);frame=requestAnimationFrame(render);
  return {
    phase(next:OraclePhase){phase=next;elapsed=0;if(reduced)render(0);},
    dispose(){
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();host.removeEventListener('pointermove',mouse);
      document.removeEventListener('visibilitychange',visibility);
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>materials.add(m));});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();
      bloom.dispose();output.dispose();renderPass.dispose();composer.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    },
  };
}
