// ===============================
// HOLOPAD – MASTER SCROLL CONTROLLER
// ===============================

let __bandCleanup = null;
let __holostageCleanup = null;

function init() {
  /* -------------------------------
     THREE.JS SCENE
  --------------------------------*/
  const canvas = document.getElementById("bg");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 4;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0x0a0f1e, 0.8));

  const keyLight = new THREE.PointLight(0x6aa9ff, 1.2);
  keyLight.position.set(3, 3, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0xb36bff, 0.8);
  fillLight.position.set(-3, -2, 3);
  scene.add(fillLight);

  /* -------------------------------
     ENTITY
  --------------------------------*/
  const geometry = new THREE.TorusKnotGeometry(1, 0.35, 200, 32);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x0b1c3f,
    metalness: 0.8,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    emissive: new THREE.Color(0x1a2a6c),
    emissiveIntensity: 0.12
  });

  const entity = new THREE.Mesh(geometry, material);
  scene.add(entity);

  const wireframe = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      wireframe: true,
      transparent: true,
      opacity: 0
    })
  );
  scene.add(wireframe);

  const haloGeo = new THREE.PlaneGeometry(6, 6);
  const haloMatA = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      color: { value: new THREE.Color(0x7aa0ff) },
      alpha: { value: 0.35 },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 color;
      uniform float alpha;
      uniform float time;
      float r = distance(vUv, vec2(0.5));
      float glow = smoothstep(0.6, 0.0, r);
      float ring = smoothstep(0.53, 0.5, r) - smoothstep(0.50, 0.47, r);
      float flicker = 0.9 + 0.1 * sin(time * 1.6);
      vec3 col = color * (glow * 0.8 + ring * 1.5 * flicker);
      gl_FragColor = vec4(col, (glow * 0.35 + ring * 0.5) * alpha);
    `
  });
  const haloA = new THREE.Mesh(haloGeo, haloMatA);
  haloA.position.z = -0.8;
  scene.add(haloA);

  const haloMatB = haloMatA.clone();
  haloMatB.uniforms = {
    color: { value: new THREE.Color(0xff7ad1) },
    alpha: { value: 0.25 },
    time: { value: 0 }
  };
  const haloB = new THREE.Mesh(haloGeo, haloMatB);
  haloB.position.z = -1.2;
  haloB.scale.set(1.15, 1.15, 1);
  scene.add(haloB);

  const starCount = 260;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3 + 0] = (Math.random() - 0.5) * 14;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
    starPos[i * 3 + 2] = -3 - Math.random() * 6;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x7aa0ff,
    size: 0.018,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const glintCount = 160;
  const glintGeo = new THREE.BufferGeometry();
  const glintPositions = new Float32Array(glintCount * 3);
  for (let i = 0; i < glintCount; i++) {
    const a = (i / glintCount) * Math.PI * 2;
    const r = 1.8 + Math.random() * 0.12;
    glintPositions[i * 3 + 0] = Math.cos(a) * r;
    glintPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    glintPositions[i * 3 + 2] = Math.sin(a) * r;
  }
  glintGeo.setAttribute("position", new THREE.BufferAttribute(glintPositions, 3));
  const glintMat = new THREE.PointsMaterial({
    color: 0x7aa0ff,
    size: 0.024,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  const glints = new THREE.Points(glintGeo, glintMat);
  scene.add(glints);

  /* -------------------------------
     DOM REFERENCES
  --------------------------------*/
  const statusEl = document.querySelector(".status");
  const textBlocks = document.querySelectorAll(".text-block");

  const architecture = document.querySelector(".architecture");
  const cityTour = document.querySelector(".city-tour");
  const futureProducts = document.querySelector(".future-products");

  const archNodes = document.querySelectorAll(".arch-node");
  const archLines = document.querySelectorAll(".arch-line");

  /* -------------------------------
     HELPERS
  --------------------------------*/
  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* -------------------------------
     SCROLL STATE
  --------------------------------*/
  let scrollProgress = 0;
  let smooth = 0;

  const onScroll = () => {
    const max = document.body.scrollHeight - window.innerHeight;
    scrollProgress = clamp(window.scrollY / max);
  };
  window.addEventListener("scroll", onScroll);

  /* -------------------------------
     ARCHITECTURE FLOW
  --------------------------------*/
  function updateArchitectureFlow(p) {
    if (!archNodes.length) return;

    const local = clamp((p - 0.30) / 0.20); // 30% → 50%
    const step = Math.floor(local * archNodes.length);

    archNodes.forEach((n, i) => {
      n.classList.toggle("active", i <= step);
    });

    archLines.forEach((l, i) => {
      l.classList.toggle("active", i < step);
    });
  }

  /* -------------------------------
     OVERLAY VISIBILITY
  --------------------------------*/
  function setOverlay(el, active) {
    if (!el) return;
    el.style.opacity = active ? 1 : 0;
    el.style.pointerEvents = active ? "auto" : "none";
    el.style.transform = active ? "translateY(0)" : "translateY(40px)";
  }

  /* -------------------------------
     ANIMATION LOOP
  --------------------------------*/
  function animate() {
    requestAnimationFrame(animate);

    smooth += (scrollProgress - smooth) * 0.08;

    /* ---- SCROLL PHASES ---- */
    const intro = smooth < 0.25;
    const architecturePhase = smooth >= 0.25 && smooth < 0.50;
    const cityPhase = smooth >= 0.50 && smooth < 0.70;
    const futurePhase = smooth >= 0.70 && smooth < 0.90;

    /* ---- TEXT ---- */
    textBlocks.forEach((b, i) => {
      b.classList.toggle(
        "active",
        (i === 0 && intro) ||
        (i === 1 && architecturePhase) ||
        (i === 2 && smooth >= 0.50)
      );
    });

    /* ---- STATUS ---- */
    if (statusEl) {
      statusEl.textContent =
        intro ? "Entity State: IDLE" :
        architecturePhase ? "Entity State: ANALYSIS" :
        "Entity State: LOCKED";
    }

    /* ---- ENTITY MOTION ---- */
    const damp = 1 - smooth;
    entity.rotation.x += 0.004 * damp;
    entity.rotation.y += 0.006 * damp;

    entity.position.z = lerp(0, -2.4, smooth);
    entity.scale.setScalar(lerp(1, 1.25, smooth));

    wireframe.material.opacity = architecturePhase ? smooth * 0.4 : 0;
    wireframe.position.copy(entity.position);
    wireframe.rotation.copy(entity.rotation);
    wireframe.scale.copy(entity.scale);

    material.emissiveIntensity +=
      ((0.12 + smooth * 0.4) - material.emissiveIntensity) * 0.08;

    haloMatA.uniforms.time.value += 0.016;
    haloMatB.uniforms.time.value += 0.016;
    haloA.rotation.z += 0.002;
    haloB.rotation.z -= 0.0015;
    stars.rotation.y += 0.0008;
    starMat.opacity = 0.12 + smooth * 0.16;

    glints.rotation.y += 0.002;
    glintMat.opacity = 0.25 + smooth * 0.45;

    /* ---- OVERLAYS ---- */
    setOverlay(architecture, architecturePhase);
    setOverlay(cityTour, cityPhase);
    setOverlay(futureProducts, futurePhase);

    if (architecturePhase) {
      updateArchitectureFlow(smooth);
    }

    renderer.render(scene, camera);
  }

  animate();

  /* -------------------------------
     RESIZE
  --------------------------------*/
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  /* -------------------------------
     FUTURE: HOLOBANDS 3D VIEWER
  --------------------------------*/
  const bandCanvas = document.getElementById("band3d");
  if (bandCanvas) {
    __bandCleanup = createBandViewer(bandCanvas);
  }

  /* -------------------------------
     GLOBAL CLEANUP
  --------------------------------*/
  __holostageCleanup = () => {
    try {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    } catch {}
    if (typeof __bandCleanup === "function") {
      try { __bandCleanup(); } catch {}
    }
  };
  window.holostageCleanup = __holostageCleanup;
}

/* -------------------------------
   SAFE INIT
--------------------------------*/
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* -------------------------------
   BAND VIEWER (THREE.JS)
--------------------------------*/
function createBandViewer(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0f1a, 0.9);

  const bg = new THREE.Color(0x0a0f1a);
  scene.background = null;

  const amb = new THREE.AmbientLight(0x222a44, 0.9);
  scene.add(amb);
  const key = new THREE.PointLight(0x79a9ff, 1.2);
  key.position.set(2.5, 2, 3);
  scene.add(key);
  const rim = new THREE.PointLight(0xff7ad1, 0.6);
  rim.position.set(-2, -1, -2);
  scene.add(rim);

  const bodyGeo = new THREE.TorusGeometry(1.12, 0.24, 64, 220);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x111317,
    metalness: 0.85,
    roughness: 0.35,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  scene.add(body);

  const stripeGeo = new THREE.TorusGeometry(1.15, 0.065, 32, 220);
  const stripeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1c3f,
    emissive: new THREE.Color(0x62a7ff),
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.2,
    transparent: true,
    opacity: 0.95
  });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.rotation.x = 0.12;
  scene.add(stripe);
  const stripeGlow = new THREE.Mesh(
    stripeGeo,
    new THREE.MeshBasicMaterial({
      color: 0x62a7ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    })
  );
  stripeGlow.rotation.x = stripe.rotation.x;
  scene.add(stripeGlow);

  const segGeo = new THREE.BoxGeometry(0.13, 0.06, 0.18);
  const segMat = new THREE.MeshStandardMaterial({
    color: 0x0d1016,
    metalness: 0.7,
    roughness: 0.45
  });
  const count = 14;
  const segments = new THREE.InstancedMesh(segGeo, segMat, count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = 0.95;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    m.identity();
    m.setPosition(x, 0.02, y);
    segments.setMatrixAt(i, m);
  }
  scene.add(segments);
  const screwGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 16);
  const screwMat = new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.8, roughness: 0.3 });
  const screws = new THREE.InstancedMesh(screwGeo, screwMat, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 1.02;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const mat = new THREE.Matrix4();
    mat.makeRotationX(Math.PI / 2);
    mat.setPosition(x, 0.07, z);
    screws.setMatrixAt(i, mat);
  }
  scene.add(screws);
  // Sparkle particles ring
  const pCount = 120;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const a = (i / pCount) * Math.PI * 2;
    const r = 1.55 + Math.random() * 0.06;
    pPositions[i*3+0] = Math.cos(a) * r;
    pPositions[i*3+1] = (Math.random() - 0.5) * 0.12;
    pPositions[i*3+2] = Math.sin(a) * r;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x7aa0ff,
    size: 0.02,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);
  // LED chase pulses
  const pulseCount = 6;
  const pulses = [];
  const pulseGeo = new THREE.SphereGeometry(0.045, 16, 16);
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0x86b7ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
  for (let i = 0; i < pulseCount; i++) {
    const s = new THREE.Mesh(pulseGeo, pulseMat);
    s.position.y = 0.05;
    pulses.push({ mesh: s, theta: (i / pulseCount) * Math.PI * 2 });
    scene.add(s);
  }

  camera.position.set(0.0, 0.35, 2.6);

  function resize() {
    const w = canvas.clientWidth || 640;
    const h = (canvas.clientHeight || 360);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const futureSection = document.querySelector(".section-future");
  let active = futureSection && futureSection.classList.contains("future-active-bands");
  const mo = new MutationObserver(() => {
    active = futureSection.classList.contains("future-active-bands");
  });
  if (futureSection) mo.observe(futureSection, { attributes: true, attributeFilter: ["class"] });

  let t = 0;
  let rafId = 0;
  let targetRX = 0.15;
  let targetRY = 0;
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    targetRY = (cx - 0.5) * 0.6;
    targetRX = 0.15 + (0.5 - cy) * 0.2;
  }
  canvas.addEventListener("pointermove", onMove);
  function animate() {
    rafId = requestAnimationFrame(animate);
    t += 0.01;
    body.rotation.x += (targetRX - body.rotation.x) * 0.08;
    body.rotation.y += 0.005 + (targetRY - body.rotation.y) * 0.08;
    stripe.rotation.y = body.rotation.y;
    stripe.rotation.x = body.rotation.x + 0.05;
    stripeMat.emissiveIntensity += ((active ? 2.2 : 1.2) - stripeMat.emissiveIntensity) * 0.05;
    stripeGlow.material.opacity = active ? 0.45 : 0.25;
    stripeGlow.rotation.y = stripe.rotation.y;
    stripeGlow.rotation.x = stripe.rotation.x;
    particles.rotation.y += 0.002;
    const op = 0.25 + Math.sin(t * 0.8) * 0.15;
    pMat.opacity = active ? 0.75 + op : 0.35 + op * 0.5;
    const chaseSpeed = active ? 0.03 : 0.015;
    pulses.forEach((p, i) => {
      p.theta += chaseSpeed;
      const r = 1.15;
      p.mesh.position.x = Math.cos(p.theta) * r;
      p.mesh.position.z = Math.sin(p.theta) * r;
      const base = 0.35 + Math.sin(t * 1.2 + i) * 0.15;
      p.mesh.material.opacity = active ? base : base * 0.6;
    });
    renderer.render(scene, camera);
  }
  animate();

  return function cleanup() {
    try { ro.disconnect(); } catch {}
    try { mo.disconnect(); } catch {}
    try { canvas.removeEventListener("pointermove", onMove); } catch {}
    try { cancelAnimationFrame(rafId); } catch {}
    try {
      bodyGeo.dispose();
      stripeGeo.dispose();
      segGeo.dispose();
      screwGeo.dispose();
      pGeo.dispose();
      pulseGeo.dispose();
      renderer.dispose();
    } catch {}
  };
}

