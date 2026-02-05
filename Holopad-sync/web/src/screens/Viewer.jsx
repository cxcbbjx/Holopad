import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useLocation, useNavigate } from "react-router-dom";
import FadeIn from "../ui/FadeIn";

export default function Viewer() {
  const mountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const image = location.state?.image;

  useEffect(() => {
    if (!image) {
      navigate('/upload');
      return;
    }
    if (!mountRef.current) return;
    return renderHologram(image, mountRef.current);
  }, [image, navigate]);

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
function renderHologram(imageFile, mount) {
  mount.innerHTML = "";

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 1.5, 6);

  const camera = new THREE.PerspectiveCamera(
    40,
    mount.clientWidth / mount.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 2.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x6EC1FF, 0x000000, 1.4));

  const textureURL = URL.createObjectURL(imageFile);
  const texture = new THREE.TextureLoader().load(textureURL);
  texture.flipY = false;
  texture.encoding = THREE.sRGBEncoding;

  // HOLOGRAM PLANE (temporary – will upgrade next)
  const geometry = new THREE.PlaneGeometry(1.2, 1.6);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    opacity: 0.85,
    emissive: new THREE.Color(0x6EC1FF),
    emissiveIntensity: 0.8,
    metalness: 0.7,
    roughness: 0.3,
  });

  const hologram = new THREE.Mesh(geometry, material);
  scene.add(hologram);

  let raf;
  function animate() {
    hologram.rotation.y += 0.002;
    hologram.position.y = Math.sin(Date.now() * 0.002) * 0.04;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  animate();

  return () => {
    cancelAnimationFrame(raf);
    renderer.dispose();
    URL.revokeObjectURL(textureURL);
    mount.innerHTML = "";
  };
}
