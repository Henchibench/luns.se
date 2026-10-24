import * as THREE from 'three';

/** Procedural geometry keeps the secret independent of external models and textures. */
export function mountOracleScene(host: HTMLElement, reduced: boolean) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0, 0, 10);
  const god = new THREE.Group(); scene.add(god);
  const pearl = new THREE.MeshStandardMaterial({ color: 0xcedee6, metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xeac78a, metalness: 0.75, roughness: 0.23 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffe5b0 });
  const blue = new THREE.MeshBasicMaterial({ color: 0x78b9ce, transparent: true, opacity: 0.5 });
  const profile = [[0,0],[0.9,0],[1.12,0.08],[1.3,0.23],[1.55,0.28],[1.6,0.22],[1.3,0.16],[1.08,-0.02],[0,-0.08]];
  const plate = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x,y]) => new THREE.Vector2(x,y)), 80), pearl);
  plate.rotation.x = Math.PI / 2;
  god.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.022, 8, 100), gold);
  rim.position.z = 0.27; god.add(rim);
  // Two luminous almond eyes turn the plate into a mildly judgmental deity.
  for (const x of [-0.43, 0.43]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12), glow);
    eye.scale.set(1.3, 0.32, 0.6); eye.position.set(x, 0.12, 0.14);
    eye.rotation.z = x < 0 ? -0.14 : 0.14; god.add(eye);
  }
  const orbits = new THREE.Group(); scene.add(orbits);
  for (let i=0; i<3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05 + i * 0.23, 0.009, 6, 120), i === 1 ? gold : blue);
    ring.rotation.set(0.8 + i * 0.5, i * 0.65, i * 0.4); orbits.add(ring);
  }
  const utensils = new THREE.Group(); scene.add(utensils);
  for (let side=0; side<2; side++) {
    const utensil = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 1, 10), gold);
    utensil.add(handle);
    if (side === 0) {
      for(let tooth=0; tooth<4; tooth++) {
        const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 6), gold);
        tine.position.set((tooth-1.5)*0.085,0.69,0); utensil.add(tine);
      }
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.31,0.15,0.07), gold);
      neck.position.y=0.48; utensil.add(neck);
    } else {
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.22,20,12), gold);
      bowl.scale.set(0.8,1.3,0.3); bowl.position.y=0.7; utensil.add(bowl);
    }
    utensil.position.x=side === 0 ? -2.15 : 2.15;
    utensil.rotation.z=side === 0 ? -0.25 : 0.25;
    utensils.add(utensil);
  }
  const positions = new Float32Array(450 * 3);
  for(let i=0;i<positions.length;i++) positions[i]=(Math.random()-0.5)*28;
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const stars = new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:0xcfe8ef,size:0.035,transparent:true,opacity:0.8}));
  stars.position.z=-7; scene.add(stars);
  scene.add(new THREE.AmbientLight(0x7797b9,2));
  const key = new THREE.PointLight(0xffe6b6,65); key.position.set(-3,4,5); scene.add(key);
  const fill = new THREE.PointLight(0x4c9ddd,45); fill.position.set(3,-2,3); scene.add(fill);
  let ritual=false, disposed=false, frame=0, time=0, previous=0;
  const draw = (stamp: number) => {
    if(disposed || document.hidden) return;
    time += previous ? Math.min((stamp-previous)/1000,0.05) : 0; previous=stamp;
    if (!reduced) {
      god.rotation.y=Math.sin(time*0.55)*0.28;
      god.rotation.z=Math.sin(time*0.32)*0.07;
      god.position.y=Math.sin(time*0.8)*0.12;
      orbits.rotation.z=time*(ritual?0.9:0.1);
      orbits.rotation.y=time*(ritual?0.6:0.12);
      utensils.rotation.y=time*(ritual?1.5:0.22);
      stars.rotation.z=time*0.015;
    }
    renderer.render(scene,camera);
    if (!reduced) frame=requestAnimationFrame(draw);
  };
  const resize = () => {
    const {width,height}=host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width,height); camera.aspect=width/height;
    camera.position.z=camera.aspect<1 ? 11.8/camera.aspect : 10;
    camera.updateProjectionMatrix();
    if(reduced) renderer.render(scene,camera);
  };
  const observer=new ResizeObserver(resize); observer.observe(host); resize();
  const visibility=() => { cancelAnimationFrame(frame); previous=0; if(!document.hidden) frame=requestAnimationFrame(draw); };
  document.addEventListener('visibilitychange',visibility);
  frame=requestAnimationFrame(draw);
  return {
    ritual(value: boolean) { ritual=value; },
    dispose() {
      disposed=true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange',visibility);
      const geometries=new Set<THREE.BufferGeometry>(); const materials=new Set<THREE.Material>();
      scene.traverse(object => {
        const mesh=object as THREE.Mesh;
        if(mesh.geometry) geometries.add(mesh.geometry);
        if(mesh.material) (Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>materials.add(m));
      });
      geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
