import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useLocation, useNavigate } from "react-router-dom";
import FadeIn from "../ui/FadeIn";
import { useSound } from "../utils/SoundManager";

export default function Viewer() {
  const mountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { image, modelUrl, overlayUrl, persona, compareModelUrl } = location.state || {};
  const errorRef = useRef(null);
  useSound();
  const [split, setSplit] = useState(!!compareModelUrl);
  const [flipY, setFlipY] = useState(false);
  const [rot180, setRot180] = useState(false);
  const [wow, setWow] = useState(true);
  const [alignX, setAlignX] = useState(0.0);
  const [alignY, setAlignY] = useState(0.0);
  const [zoom, setZoom] = useState(1.0);
  const [creative, setCreative] = useState(false);
  const [tool, setTool] = useState("cube");
  const [brushActive, setBrushActive] = useState(false);
  const [webcam, setWebcam] = useState(false);
  const videoRef = useRef(null);
  const handReadyRef = useRef(false);
  const stateRef = useRef({ tool, creative, brushActive });
  const voxelDataRef = useRef([]);
  const apiRef = useRef(null);

  useEffect(() => {
    stateRef.current = { tool, creative, brushActive };
  }, [tool, creative, brushActive]);

  useEffect(() => {
    if (location.state && location.state.creative) {
      setCreative(true);
    }
    if (!image && !modelUrl && !(location.state && location.state.creative)) {
      navigate('/upload');
      return;
    }
    if (!mountRef.current) return;
    
    let api = null;
    const init = async () => { 
      api = await renderHologram({ image, modelUrl, overlayUrl, persona, onError: (msg) => { if (errorRef.current) errorRef.current.textContent = msg; }, compareModelUrl, flipY, rot180, wow, alignX, alignY, zoom, stateRef, voxelDataRef }, mountRef.current); 
      apiRef.current = api;
    };
    init();
    
    return () => { 
      if (api && api.dispose) api.dispose();
      else if (apiRef.current && apiRef.current.dispose) apiRef.current.dispose();
    };
  }, [image, modelUrl, overlayUrl, persona, compareModelUrl, flipY, rot180, wow, alignX, alignY, zoom, navigate]); // removed stateRef deps to avoid re-init on tool change


  return (
    <div style={{ height: "100vh", position: "relative", background: "black" }}>
      
      <button 
        onClick={() => navigate('/upload')}
        style={{
          position: 'absolute', top: 20, left: 20, zIndex: 10,
          background: 'none', border: '1px solid rgba(255,255,255,0.2)', 
          color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '20px',
          cursor: 'pointer', fontSize: '12px'
        }}
      >
        ← Upload New
      </button>
      <div style={{ position: 'absolute', top: 20, left: 140, zIndex: 10, display: 'flex', gap: 8 }}>
        <button 
          onClick={() => setCreative(c => !c)}
          style={{ background: creative ? '#6EC1FF' : 'none', border: '1px solid rgba(255,255,255,0.2)', color: creative ? '#000' : 'rgba(255,255,255,0.8)', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}
        >{creative ? 'Exit Space' : 'Creative Space'}</button>
        <button 
          onClick={() => setWebcam(w => !w)}
          style={{ background: webcam ? '#6EC1FF' : 'none', border: '1px solid rgba(255,255,255,0.2)', color: webcam ? '#000' : 'rgba(255,255,255,0.8)', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}
        >{webcam ? 'Disable Webcam' : 'Use Webcam'}</button>
        {creative && (
          <>
            <select value={tool} onChange={(e) => setTool(e.target.value)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 12px', borderRadius: '20px' }}>
              <option value="cube">Cube</option>
              <option value="voxel">Voxel</option>
              <option value="sphere">Sphere</option>
              <option value="model">Model</option>
              <option value="brush">Brush</option>
            </select>
            <button 
              onClick={() => setBrushActive(b => !b)}
              style={{ background: brushActive ? '#6EC1FF' : 'none', border: '1px solid rgba(255,255,255,0.2)', color: brushActive ? '#000' : 'rgba(255,255,255,0.8)', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}
            >Stroke</button>
          </>
        )}
      </div>

      {/* HOLOGRAM STAGE */}
      <div
        ref={mountRef}
        style={{
          height: "100%",
          width: "100%",
        }}
      />

      {/* CONTROLS */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 32,
          color: "var(--muted)",
          fontSize: 13,
          pointerEvents: "none" // keeps UI calm
        }}
      >
        <FadeIn delay={600}>Glow</FadeIn>
        <FadeIn delay={800}>Depth</FadeIn>
        <FadeIn delay={1000}>Motion</FadeIn>
      </div>
      {compareModelUrl && (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 12 }}>
          <button 
            onClick={() => setSplit(s => !s)}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.2)', 
              color: 'rgba(255,255,255,0.8)', padding: '8px 12px', borderRadius: '20px',
              cursor: 'pointer', fontSize: '12px'
            }}
          >
            {split ? 'Single View' : 'Compare View'}
          </button>
        </div>
      )}
      <div style={{ position: 'absolute', top: 60, right: 20, zIndex: 10, display: 'flex', gap: 8 }}>
        <button 
          onClick={() => setFlipY(f => !f)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Flip</button>
        <button 
          onClick={() => setRot180(r => !r)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Rotate 180°</button>
        <button 
          onClick={() => setWow(w => !w)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: wow ? '#6EC1FF' : 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Impress</button>
        <button 
          onClick={() => setAlignY(v => v - 0.01)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Face ↑</button>
        <button 
          onClick={() => setAlignY(v => v + 0.01)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Face ↓</button>
        <button 
          onClick={() => setAlignX(v => v - 0.01)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Face ←</button>
        <button 
          onClick={() => setAlignX(v => v + 0.01)}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Face →</button>
        <button 
          onClick={() => setZoom(z => Math.min(2.0, z + 0.05))}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Zoom In</button>
        <button 
          onClick={() => setZoom(z => Math.max(0.5, z - 0.05))}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Zoom Out</button>
        <button 
          onClick={() => { setAlignX(0); setAlignY(-0.12); setZoom(1.2); }}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#6EC1FF', padding: '6px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
        >Auto Face</button>
      </div>
      <div
        ref={errorRef}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          color: "#ff6666",
          fontSize: 12
        }}
      />
    </div>
  );
}
function playVoiceSkin(p) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = p === "self" ? "triangle" : "sine";
    o.frequency.value = p === "self" ? 420 : 340;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    const target = p === "self" ? 0.06 : 0.04;
    g.gain.exponentialRampToValueAtTime(target, ctx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    o.stop(ctx.currentTime + 0.85);
  } catch {}
}
async function renderHologram({ image, modelUrl, overlayUrl, persona, onError, compareModelUrl, flipY, rot180, wow, alignX, alignY, zoom, stateRef, voxelDataRef }, mount) {
  mount.innerHTML = "";
  const voxelMeshes = [];
  
  const scene = new THREE.Scene();
  // scene.fog = new THREE.Fog(0x000000, 1.5, 6);

  const camera = new THREE.PerspectiveCamera(
    45,
    mount.clientWidth / mount.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 3.0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);
  const hiddenVideo = document.createElement('video');
  hiddenVideo.style.display = 'none';
  hiddenVideo.setAttribute('playsinline', 'true');
  mount.appendChild(hiddenVideo);
  videoRef.current = hiddenVideo;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;
  controls.enablePan = false;

  scene.add(new THREE.HemisphereLight(0x6EC1FF, 0x000000, 1.4));
  if (wow) {
    const backLight = new THREE.DirectionalLight(0x66ccff, 1.0);
    backLight.position.set(-2, 2.5, 1.5);
    scene.add(backLight);
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const ctx2 = c.getContext('2d');
    ctx2.fillStyle = 'rgba(0,0,0,0)';
    ctx2.fillRect(0,0,1024,1024);
    ctx2.globalAlpha = 0.06;
    ctx2.fillStyle = '#ffffff';
    for (let y = 0; y < 1024; y += 6) ctx2.fillRect(0, y, 1024, 1);
    ctx2.globalAlpha = 1.0;
    const scanTex = new THREE.CanvasTexture(c);
    scanTex.colorSpace = THREE.SRGBColorSpace;
    const sGeom = new THREE.PlaneGeometry(6, 3.5);
    const sMat = new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    const scanPlane = new THREE.Mesh(sGeom, sMat);
    scanPlane.position.z = -0.2;
    scene.add(scanPlane);
  }

  let model, model2;
  if (modelUrl) {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(modelUrl);
      model = gltf.scene;
      playVoiceSkin(persona || "neon");
      // center+fit and fix texture orientation
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      model.position.sub(center);
      const fov = camera.fov * (Math.PI / 180);
      const camZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * 1.35;
      camera.position.set(0, 0, camZ);
      controls.target.set(0, 0, 0);
      controls.update();
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          const keys = ['map','emissiveMap','roughnessMap','metalnessMap','normalMap'];
          for (const k of keys) {
            const t = child.material[k];
            if (t) {
              t.center.set(0.5, 0.5);
              const repX = 1 / zoom;
              const repY = (flipY ? -1 : 1) / zoom;
              t.repeat.set(repX, repY);
              t.rotation = rot180 ? Math.PI : 0;
              t.offset.x = 0.5 - (repX * 0.5) + alignX;
              t.offset.y = 0.5 - (repY * 0.5) + alignY;
              t.rotation = rot180 ? Math.PI : 0;
              t.needsUpdate = true;
            }
          }
        }
      });
      if (rot180) model.rotation.z = Math.PI;
      if (compareModelUrl) {
        try {
          const gltf2 = await loader.loadAsync(compareModelUrl);
          model2 = gltf2.scene;
          const box2 = new THREE.Box3().setFromObject(model2);
          const center2 = box2.getCenter(new THREE.Vector3());
          model2.position.sub(center2);
          model2.traverse((child) => {
            if (child.isMesh && child.material) {
              const keys = ['map','emissiveMap','roughnessMap','metalnessMap','normalMap'];
              for (const k of keys) {
                const t = child.material[k];
                if (t) {
                  t.center.set(0.5, 0.5);
                  const repX = 1 / zoom;
                  const repY = (flipY ? -1 : 1) / zoom;
                  t.repeat.set(repX, repY);
                  t.rotation = rot180 ? Math.PI : 0;
                  t.offset.x = 0.5 - (repX * 0.5) + alignX;
                  t.offset.y = 0.5 - (repY * 0.5) + alignY;
                  t.rotation = rot180 ? Math.PI : 0;
                  t.needsUpdate = true;
                }
              }
            }
          });
          if (rot180) model2.rotation.z = Math.PI;
        } catch {}
      }
      if (compareModelUrl && model2) {
        model.position.x = -0.7;
        model2.position.x = 0.7;
        scene.add(model);
        scene.add(model2);
      } else {
        scene.add(model);
      }
    } catch (e) {
      console.error("GLB load failed", e);
      if (onError) onError("Model load failed");
    }
  }

  if (!model && image) {
    const textureURL = URL.createObjectURL(image);
    const texture = new THREE.TextureLoader().load(textureURL);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.center.set(0.5, 0.5);
    const repX = 1 / zoom;
    const repY = (flipY ? -1 : 1) / zoom;
    texture.repeat.set(repX, repY);
    texture.rotation = rot180 ? Math.PI : 0;
    texture.offset.x = 0.5 - (repX * 0.5) + alignX;
    texture.offset.y = 0.5 - (repY * 0.5) + alignY;
    texture.needsUpdate = true;
    const iw = texture.image?.width || 1024;
    const ih = texture.image?.height || 1024;
    const ar = iw / ih;
    const geometry = new THREE.PlaneGeometry(1.2, 1.2 / ar);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      emissive: new THREE.Color(0x6EC1FF),
      emissiveIntensity: 0.9,
      metalness: 0.6,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    model = new THREE.Mesh(geometry, material);
    if (rot180) model.rotation.z = Math.PI;
    scene.add(model);
    playVoiceSkin(persona || "neon");
  }

  // Overlay glow plane (if provided)
  if (overlayUrl) {
    const olTex = await new Promise((resolve) => {
      new THREE.TextureLoader().load(overlayUrl, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.center.set(0.5, 0.5);
        const repX = 1 / zoom;
        const repY = (flipY ? -1 : 1) / zoom;
        t.repeat.set(repX, repY);
        t.rotation = rot180 ? Math.PI : 0;
        t.offset.x = 0.5 - (repX * 0.5) + alignX;
        t.offset.y = 0.5 - (repY * 0.5) + alignY;
        t.needsUpdate = true;
        resolve(t);
      }, undefined, () => resolve(null));
    });
    if (olTex) {
      let w = 1.3, h = 1.3;
      if (model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        w = Math.max(1.0, size.x * 1.05);
        h = Math.max(1.0, size.y * 1.05);
      }
      const oGeom = new THREE.PlaneGeometry(w, h);
      const oMat = new THREE.MeshBasicMaterial({
        map: olTex,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const overlayPlane = new THREE.Mesh(oGeom, oMat);
      overlayPlane.position.z = 0.001;
      scene.add(overlayPlane);
    }
  }
  if (wow) {
    const pCount = 400;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 1.4 + Math.random() * 0.6;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x66ccff, size: 0.02, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geom, mat);
    scene.add(points);
  }
  let raf;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ visible: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  scene.add(floor);

  const objects = [floor];

  const grid = new THREE.GridHelper(10, 20, 0x335577, 0x223344);
  grid.position.y = -0.6;
  scene.add(grid);

  const rollOverGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
  const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
  rollOverMesh.visible = false;
  scene.add(rollOverMesh);
  
  const voxelGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const voxelMaterial = new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness: 0.3, metalness: 0.2 });

  // Restore existing voxels
  if (voxelDataRef && voxelDataRef.current) {
    voxelDataRef.current.forEach(pos => {
      const voxel = new THREE.Mesh(voxelGeo, voxelMaterial);
      voxel.position.copy(pos);
      scene.add(voxel);
      objects.push(voxel);
      voxelMeshes.push(voxel);
    });
  }

  function placeAtPointer() {
    const { tool } = stateRef?.current || {};
    
    if (tool === "voxel") {
      if (rollOverMesh.visible) {
        const voxel = new THREE.Mesh(voxelGeo, voxelMaterial);
        voxel.position.copy(rollOverMesh.position);
        scene.add(voxel);
        objects.push(voxel);
        voxelMeshes.push(voxel);
        if (voxelDataRef) voxelDataRef.current.push(voxel.position.clone());
      }
      return;
    }

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([floor], false);
    if (hits.length) {
      const p = hits[0].point;
      if (tool === "cube") {
        const geom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: new THREE.Color(0x113355), roughness: 0.3, metalness: 0.2 });
        const m = new THREE.Mesh(geom, mat);
        m.position.copy(p);
        scene.add(m);
      } else if (tool === "sphere") {
        const geom = new THREE.SphereGeometry(0.28, 24, 24);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff66aa, emissive: new THREE.Color(0x331122), roughness: 0.25, metalness: 0.3 });
        const m = new THREE.Mesh(geom, mat);
        m.position.copy(p);
        scene.add(m);
      } else if (tool === "model") {
        const loader = new GLTFLoader();
        loader.load("http://localhost:5000/public/head_template.glb", (gltf) => {
          const m = gltf.scene;
          m.position.copy(p);
          m.scale.set(0.25, 0.25, 0.25);
          scene.add(m);
        });
      }
    }
  }
  const brushGeom = new THREE.BufferGeometry();
  const brushPositions = [];
  const brushMat = new THREE.LineBasicMaterial({ color: 0x6EC1FF, linewidth: 2 });
  let brushLine = null;
  function updateBrush() {
    if (!brushLine) {
      brushLine = new THREE.Line(brushGeom, brushMat);
      scene.add(brushLine);
    }
    brushGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(brushPositions.flat()), 3));
    brushGeom.computeBoundingSphere();
  }
  function brushAtPointer() {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([floor], false);
    if (hits.length) {
      const p = hits[0].point;
      brushPositions.push([p.x, p.y + 0.01, p.z]);
      if (brushPositions.length % 4 === 0) updateBrush();
    }
  }
  renderer.domElement.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    const { tool, creative, brushActive } = stateRef?.current || {};

    if (creative && tool === "voxel") {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(objects, false);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        rollOverMesh.visible = true;
        rollOverMesh.position.copy(intersect.point).add(intersect.face.normal.multiplyScalar(0.25));
        rollOverMesh.position.divideScalar(0.5).floor().multiplyScalar(0.5).addScalar(0.25);
      } else {
        rollOverMesh.visible = false;
      }
    } else {
      rollOverMesh.visible = false;
    }

    if (creative && brushActive && tool === "brush") brushAtPointer();
  });
  renderer.domElement.addEventListener('click', () => {
    const { creative } = stateRef?.current || {};
    if (creative) placeAtPointer();
  });
  async function loadHands() {
    if (handReadyRef.current) return;
    const s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    const s2 = document.createElement('script');
    s2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
    await new Promise((r) => { s1.onload = r; document.body.appendChild(s1); });
    await new Promise((r) => { s2.onload = r; document.body.appendChild(s2); });
    handReadyRef.current = true;
  }
  async function startWebcam() {
    try {
      await loadHands();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const hands = new window.Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
      hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
      hands.onResults((res) => {
        const lm = res.multiHandLandmarks && res.multiHandLandmarks[0];
        if (lm && lm[8]) {
          const x = lm[8].x;
          const y = lm[8].y;
          mouse.x = x * 2 - 1;
          mouse.y = -(y * 2 - 1);
          if (creative && brushActive && tool === "brush") brushAtPointer();
        }
      });
      async function loop() {
        if (videoRef.current.readyState >= 2) {
          await hands.send({ image: videoRef.current });
        }
        requestAnimationFrame(loop);
      }
      loop();
    } catch {}
  }
  if (webcam) startWebcam();
  function animate() {
    if (model) {
      model.rotation.y += 0.002;
      model.position.y = Math.sin(Date.now() * 0.002) * 0.04;
    }
    if (model2) {
      model2.rotation.y -= 0.0018;
      model2.position.y = Math.sin(Date.now() * 0.002 + 0.8) * 0.04;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  animate();

  const handleResize = () => {
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
  };
  window.addEventListener('resize', handleResize);

  const clearVoxels = () => {
    voxelMeshes.forEach(v => {
      scene.remove(v);
      const i = objects.indexOf(v);
      if (i > -1) objects.splice(i, 1);
    });
    voxelMeshes.length = 0;
  };

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      mount.innerHTML = "";
      window.removeEventListener('resize', handleResize);
    },
    clearVoxels
  };
}
