import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useLocation, useNavigate } from "react-router-dom";
import FadeIn from "../ui/FadeIn";

export default function Viewer() {
  const mountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { image, modelUrl, overlayUrl } = location.state || {};
  const errorRef = useRef(null);

  useEffect(() => {
    if (!image && !modelUrl) {
      navigate('/upload');
      return;
    }
    if (!mountRef.current) return;
    let cleanup = () => {};
    const init = async () => { cleanup = await renderHologram({ image, modelUrl, onError: (msg) => { if (errorRef.current) errorRef.current.textContent = msg; } }, mountRef.current); };
    init();
    return () => { if (cleanup) cleanup(); };
  }, [image, modelUrl, navigate]);

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
async function renderHologram({ image, modelUrl, overlayUrl, onError }, mount) {
  mount.innerHTML = "";

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

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;
  controls.enablePan = false;

  scene.add(new THREE.HemisphereLight(0x6EC1FF, 0x000000, 1.4));

  let model;
  if (modelUrl) {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(modelUrl);
      model = gltf.scene;
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
              t.repeat.y = -1;
              t.offset.y = 1;
              t.needsUpdate = true;
            }
          }
        }
      });
      scene.add(model);
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
    texture.repeat.y = -1;
    texture.offset.y = 1;
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
    scene.add(model);
  }

  // Overlay glow plane (if provided)
  if (overlayUrl) {
    const olTex = await new Promise((resolve) => {
      new THREE.TextureLoader().load(overlayUrl, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.center.set(0.5, 0.5);
        t.repeat.y = -1;
        t.offset.y = 1;
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
  let raf;
  function animate() {
    if (model) {
      model.rotation.y += 0.002;
      model.position.y = Math.sin(Date.now() * 0.002) * 0.04;
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

  return () => {
    cancelAnimationFrame(raf);
    renderer.dispose();
    mount.innerHTML = "";
    window.removeEventListener('resize', handleResize);
  };
}
