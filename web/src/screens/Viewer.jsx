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
  const { image, modelUrl } = location.state || {};

  useEffect(() => {
    if (!image && !modelUrl) {
      navigate('/upload');
      return;
    }
    if (!mountRef.current) return;
    let cleanup = () => {};
    const init = async () => { cleanup = await renderHologram({ image, modelUrl }, mountRef.current); };
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
    </div>
  );
}
async function renderHologram({ image, modelUrl }, mount) {
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
      scene.add(model);
    } catch (e) {
      console.error("GLB load failed", e);
    }
  }

  if (!model && image) {
    const textureURL = URL.createObjectURL(image);
    const texture = new THREE.TextureLoader().load(textureURL);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry(1.2, 1.6);
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

  return () => {
    cancelAnimationFrame(raf);
    renderer.dispose();
    mount.innerHTML = "";
  };
}
