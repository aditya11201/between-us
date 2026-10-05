export function createStage(canvas, THREE) {
  const { clamp, lerp } = THREE.MathUtils;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x04060b);
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 200);
  const getCameraZ = () => {
    const r = window.innerWidth / window.innerHeight;
    if (r < 0.7) return 19;
    if (r < 1.2) return 16;
    return 13;
  };
  camera.position.z = getCameraZ();
  const BLUE = new THREE.Color("#54b9ff");
  const WARM = new THREE.Color("#ff7a66");
  const PIXEL = renderer.getPixelRatio();
  function createHeartGeometry(count) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const scale = 2.4 / 16;
    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5;
      const fill = Math.random() < 0.38 ? 1 - Math.random() * 0.055 : Math.sqrt(Math.random());
      const depth = Math.sqrt(Math.max(0, 1 - fill * fill)) * 9.5;
      positions[i * 3] = (hx * fill + (Math.random() - 0.5) * 0.32) * scale;
      positions[i * 3 + 1] = (hy * fill + (Math.random() - 0.5) * 0.32) * scale;
      positions[i * 3 + 2] = ((Math.random() * 2 - 1) * depth + (Math.random() - 0.5) * 0.45) * scale;
      seeds[i] = Math.random();
      sizes[i] = 1.4 + Math.random() * 1.9;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return g;
  }
  const heartVS =
    "uniform float uTime,uPixel,uScale,uBeat;attribute float aSeed,aSize,aPhase;varying float vSeed,vTw,vShade,vMix;\nvoid main(){vec3 p=position+0.022*vec3(sin(uTime*.7+aPhase*7.0),cos(uTime*.6+aPhase*5.0),sin(uTime*.8+aPhase*4.0));\nfloat pulse=1.0+uBeat*.085;p*=uScale*pulse;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;\ngl_PointSize=aSize*uPixel*(10.0/max(1.0,-mv.z));vSeed=aSeed;vTw=.72+.28*sin(uTime*(1.0+aSeed*1.7)+aPhase);\nvShade=clamp(0.62+position.z*0.30,0.30,1.30);vMix=clamp(position.x*0.22+0.5,0.0,1.0);}";
  const heartFS =
    "uniform vec3 uColor,uColorB;uniform float uOpacity,uBeat,uMixAmt;varying float vSeed,vTw,vShade,vMix;\nvoid main(){float d=length(gl_PointCoord-vec2(.5));float a=smoothstep(.5,.03,d);a*=a;\nvec3 base=mix(uColor,uColorB,vMix*uMixAmt);\nvec3 c=mix(base,vec3(1.0),pow(a,4.0)*.38)*clamp(vShade,0.55,1.10);\ngl_FragColor=vec4(c,a*uOpacity*vTw*(.56+vSeed*.44)*(1.0+uBeat*.45));}";
  function createHeart(color, colorB, mixAmt, count) {
    const m = new THREE.ShaderMaterial({
      vertexShader: heartVS,
      fragmentShader: heartFS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixel: { value: PIXEL * 3.1 },
        uScale: { value: 1 },
        uBeat: { value: 0 },
        uColor: { value: color },
        uColorB: { value: colorB },
        uMixAmt: { value: mixAmt },
        uOpacity: { value: 0 },
      },
    });
    const h = new THREE.Points(createHeartGeometry(count || 3400), m);
    h.frustumCulled = false;
    scene.add(h);
    return h;
  }
  const heartA = createHeart(BLUE, BLUE, 0);
  const heartB = createHeart(WARM, WARM, 0);
  const heartMerged = createHeart(BLUE, WARM, 1);
  heartMerged.visible = false;
  const BRIDGE_COUNT = 1450;
  const bridgeT = new Float32Array(BRIDGE_COUNT);
  const bridgeSeed = new Float32Array(BRIDGE_COUNT);
  for (let i = 0; i < BRIDGE_COUNT; i++) {
    bridgeT[i] = Math.random();
    bridgeSeed[i] = Math.random();
  }
  const bridgeGeometry = new THREE.BufferGeometry();
  bridgeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(BRIDGE_COUNT * 3), 3));
  bridgeGeometry.setAttribute("aT", new THREE.BufferAttribute(bridgeT, 1));
  bridgeGeometry.setAttribute("aSeed", new THREE.BufferAttribute(bridgeSeed, 1));
  const bridgeMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixel: { value: PIXEL * 1.45 },
      uA: { value: new THREE.Vector3() },
      uB: { value: new THREE.Vector3() },
      uCold: { value: BLUE },
      uWarm: { value: WARM },
      uStrength: { value: 0 },
    },
    vertexShader:
      "uniform float uTime,uPixel,uStrength;uniform vec3 uA,uB;attribute float aT,aSeed;varying float vA,vM;\nvoid main(){float t=aT;vec3 p=mix(uA,uB,t);float e=sin(3.14159*t);p.y+=e*.42;\np.y+=(aSeed-.5)*mix(.45,.82,step(.84,aSeed))*e;p.z+=(fract(aSeed*19.0)-.5)*.95*e;\nvec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;\ngl_PointSize=(1.0+aSeed*2.25+step(.84,aSeed)*1.4)*uPixel*(8.0/max(1.0,-mv.z));vA=e*uStrength;vM=t;}",
    fragmentShader:
      "uniform vec3 uCold,uWarm;varying float vA,vM;\nvoid main(){float d=length(gl_PointCoord-vec2(.5));float a=smoothstep(.5,.02,d);a*=a;\nvec3 c=mix(mix(uCold,uWarm,vM),vec3(1.0),.28);gl_FragColor=vec4(c,a*vA*.9);}",
  });
  const bridge = new THREE.Points(bridgeGeometry, bridgeMaterial);
  bridge.frustumCulled = false;
  scene.add(bridge);
  const DUST_COUNT = 900;
  const dustPositions = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 55;
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 34;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 35 - 6;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0xcfe8ff,
    size: 0.035,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);
  const clock = new THREE.Clock();
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let dragX = null;
  let spinVel = 0;
  const onPointerMove = (e) => {
    mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    if (dragX !== null) {
      spinVel += (e.clientX - dragX) * 0.0015;
      dragX = e.clientX;
    }
  };
  const onPointerDown = (e) => {
    dragX = e.clientX;
  };
  const onPointerUp = () => {
    dragX = null;
  };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  let phase = "intro";
  let mergeStart = 0;
  let mergeDuration = 3.2;
  let mergeCallback = null;
  let mergeTimer = 0;
  let callbackCalled = false;
  let destroyed = false;
  let animationFrame = 0;
  let spinA = 0;
  let spinB = 0;
  let spinM = 0;
  let lastT = 0;
  const startA = new THREE.Vector3();
  const startB = new THREE.Vector3();
  const pulsePair = (t) => {
    if (t < 0 || t > 1.15) return 0;
    return Math.min(1, Math.exp(-Math.pow((t - 0.18) * 10.5, 2)) + 0.62 * Math.exp(-Math.pow((t - 0.47) * 11.5, 2)));
  };
  const flankX = () => (window.innerWidth / window.innerHeight < 0.8 ? 2.3 : 3.6);
  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", resize);
  function animate() {
    if (destroyed) return;
    const now = clock.getElapsedTime();
    const fadeIn = easeOut(clamp(now / 2.8, 0, 1));
    const dt = Math.min(0.05, Math.max(0, now - lastT));
    lastT = now;
    mouse.x = lerp(mouse.x, mouse.targetX, 0.045);
    mouse.y = lerp(mouse.y, mouse.targetY, 0.045);
    spinVel *= Math.pow(0.12, dt);
    const fx = flankX();
    const small = window.innerWidth / window.innerHeight < 0.72 ? 0.8 : 1;
    let mp = 0;
    let bs = 0.3;
    let mMix = 0;
    let beat = 0;
    let camDolly = 0;
    const revealBeat = pulsePair(now - 1.34);
    if (phase === "intro") {
      const sway = easeInOut(clamp((now - 0.35) / 6.8, 0, 1));
      heartA.position.set(-fx + Math.sin(now * 0.5) * 0.3 + mouse.x * 0.2, 1.15 + Math.sin(now * 0.7) * 0.25 - mouse.y * 0.12, 0);
      heartB.position.set(fx + Math.sin(now * 0.5 + Math.PI) * 0.3 + mouse.x * 0.2, -1.15 + Math.sin(now * 0.7 + Math.PI) * 0.25 - mouse.y * 0.12, 0);
      bs = lerp(0.06, 0.34, sway);
      spinA += dt * 0.8;
      spinB += dt * 0.8;
      spinM += spinVel;
      heartA.rotation.set(Math.sin(now * 0.6) * 0.18, spinA + spinM, 0);
      heartB.rotation.set(Math.sin(now * 0.6 + 1) * 0.18, -spinB - spinM, 0);
      beat = revealBeat;
    } else if (phase === "merge") {
      mp = clamp((now - mergeStart) / mergeDuration, 0, 1);
      const travel = easeInOut(clamp(mp / 0.55, 0, 1));
      const settle = easeInOut(clamp((mp - 0.75) / 0.25, 0, 1));
      heartA.position.set(
        lerp(startA.x, 0, travel) + Math.sin(now * 3) * 0.05 * (1 - travel),
        lerp(startA.y, 0.2, travel),
        lerp(startA.z, 0, travel)
      );
      heartB.position.set(
        lerp(startB.x, 0, travel) + Math.cos(now * 3) * 0.05 * (1 - travel),
        lerp(startB.y, 0.2, travel),
        lerp(startB.z, 0, travel)
      );
      bs =
        lerp(0.34, 1.5, easeInOut(clamp(mp / 0.6, 0, 1))) *
        (1 - settle * 0.6) *
        (1 - easeInOut(clamp((mp - 0.82) / 0.18, 0, 1)));
      mMix = easeInOut(clamp((mp - 0.5) / 0.4, 0, 1));
      spinM += dt * lerp(1.6, 2.2, mp) + spinVel;
      heartA.rotation.set(Math.sin(now * 0.6) * 0.18, spinM, 0);
      heartB.rotation.set(Math.sin(now * 0.6 + 1) * 0.18, spinM, 0);
      heartMerged.position.set(0, 0.2, 0);
      heartMerged.rotation.set(Math.sin(now * 0.6) * 0.18, spinM, 0);
      beat = Math.max(revealBeat, pulsePair(now - mergeStart - 0.9));
      camDolly = easeInOut(mp);
      if (mp >= 1) {
        phase = "done";
        heartA.visible = false;
        heartB.visible = false;
        heartMerged.visible = true;
      }
    } else {
      spinM += dt * 2.2 + spinVel;
      heartMerged.position.set(Math.sin(now * 0.5) * 0.15 + mouse.x * 0.2, 0.2 + Math.sin(now * 0.7) * 0.15 - mouse.y * 0.12, 0);
      heartMerged.rotation.set(Math.sin(now * 0.6) * 0.18, spinM, 0);
      mMix = 1;
      bs = 0.3;
      beat = pulsePair(now - mergeStart - mergeDuration - 0.4) * 0.5;
    }
    const hs = (phase === "intro" ? 1 : 1.3) * small;
    const soloOp = fadeIn * (1 - mMix * 0.96);
    const pairs = [
      [heartA, beat],
      [heartB, beat * 0.92],
    ];
    for (let k = 0; k < pairs.length; k++) {
      const heart = pairs[k][0];
      const bt = pairs[k][1];
      const u = heart.material.uniforms;
      const reveal = easeOut(clamp((now - 0.6) / 2.2, 0, 1));
      u.uTime.value = now;
      u.uScale.value = hs * Math.max(0.0001, reveal);
      u.uBeat.value = bt;
      u.uOpacity.value = soloOp;
    }
    const mu = heartMerged.material.uniforms;
    mu.uTime.value = now;
    mu.uScale.value = hs * (0.45 + 0.75 * mMix);
    mu.uBeat.value = beat;
    mu.uOpacity.value = fadeIn * mMix;
    heartMerged.visible = mMix > 0.001;
    bridgeMaterial.uniforms.uTime.value = now;
    if (phase === "done") {
      bridgeMaterial.uniforms.uA.value.set(heartMerged.position.x - 0.9, heartMerged.position.y, heartMerged.position.z);
      bridgeMaterial.uniforms.uB.value.set(heartMerged.position.x + 0.9, heartMerged.position.y, heartMerged.position.z);
    } else {
      bridgeMaterial.uniforms.uA.value.copy(heartA.position);
      bridgeMaterial.uniforms.uB.value.copy(heartB.position);
    }
    bridgeMaterial.uniforms.uStrength.value = bs * fadeIn;
    dust.rotation.y = mouse.x * 0.012;
    dust.rotation.x = -mouse.y * 0.008;
    dustMaterial.opacity = 0.1 + fadeIn * 0.1;
    for (let i = 0; i < floatingHearts.length; i++) {
      const sprite = floatingHearts[i];
      const d = sprite.userData;
      const life = clamp((now - 0.75) / 5.8, 0, 1);
      const arrival = easeOut(life);
      const fadeWindow = Math.sin(Math.PI * life);
      sprite.position.set(d.x + Math.sin(d.phase) * 0.18, d.y + arrival * (1.3 + d.speed), d.z);
      sprite.material.opacity = fadeIn * fadeWindow * 0.075;
      const size = d.size * (1 - life * 0.08);
      sprite.scale.set(size, size, 1);
    }
    const baseZ = getCameraZ();
    const cameraZ =
      phase === "intro" ? lerp(baseZ + 3.5, baseZ, easeOut(clamp(now / 6.5, 0, 1))) : baseZ - 1.8 * camDolly;
    camera.position.x = lerp(camera.position.x, mouse.x * 0.75, 0.04);
    camera.position.y = lerp(camera.position.y, -mouse.y * 0.45, 0.04);
    camera.position.z = lerp(camera.position.z, cameraZ, 0.04);
    camera.lookAt(0, 0.2, 0);
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }
  animate();
  return {
    merge(duration, callback) {
      if (phase !== "intro") return;
      phase = "merge";
      startA.copy(heartA.position);
      startB.copy(heartB.position);
      mergeStart = clock.getElapsedTime();
      mergeDuration = duration || 3.2;
      mergeCallback = callback;
      callbackCalled = false;
      mergeTimer = setTimeout(() => {
        if (!callbackCalled) {
          callbackCalled = true;
          phase = "done";
          heartA.visible = false;
          heartB.visible = false;
          heartMerged.visible = true;
          if (mergeCallback) mergeCallback();
        }
      }, Math.max(0, (mergeDuration || 3.2) * 1000 - 650));
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      clearTimeout(mergeTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    },
  };
}
