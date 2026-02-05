import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { useSound, soundManager } from "../utils/SoundManager";
import "../styles/theme.css";
import LiquidChrome from "../components/LiquidChrome";
import GradientBlinds from "../components/GradientBlinds";
import LiquidEther from "../components/Liqued Ether";
import Hyperspeed from "../components/HyperSpeed";
import Waves from "../components/Waves";



const vertexShader = `
varying vec2 vUv;
varying float vElevation;
uniform float uTime;
uniform vec2 uMouse;

void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  float elevation = sin(modelPosition.x * 2.0 + uTime * 0.5) *
                    sin(modelPosition.y * 2.0 + uTime * 0.5) * 0.2;
  float dist = distance(uv, uMouse);
  elevation += sin(dist * 10.0 - uTime * 2.0) * exp(-dist * 3.0) * 0.5;
  modelPosition.z += elevation;
  vElevation = elevation;
  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
`;

const fragmentShader = `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vElevation;
varying vec2 vUv;

void main() {
  float mixStrength = (vElevation + 0.25) * 2.0;
  vec3 color = mix(uColorA, uColorB, mixStrength);
  float grid = step(0.98, max(sin(vUv.x * 50.0), sin(vUv.y * 50.0)));
  color += grid * 0.5;
  gl_FragColor = vec4(color, 1.0);
}
`;

const FluidPlane = () => {
  const mesh = useRef();
  const { viewport, pointer } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color("#1a1a2e") },
      uColorB: { value: new THREE.Color("#e94560") }
    }),
    []
  );
  useFrame((state) => {
    const { clock } = state;
    if (mesh.current) {
      mesh.current.material.uniforms.uTime.value = clock.getElapsedTime();
      mesh.current.material.uniforms.uMouse.value.lerp(
        new THREE.Vector2(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5),
        0.1
      );
    }
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[viewport.width * 1.5, viewport.height * 1.5, 128, 128]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} side={THREE.DoubleSide} />
    </mesh>
  );
};

const SceneContent = () => {
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(time * 0.1) * 0.5;
    state.camera.position.y = Math.cos(time * 0.1) * 0.5;
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 5, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return (
    <>
      <FluidPlane />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </>
  );
};

const Overlay = () => {
  const titleRef = useRef();
  const subRef = useRef();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);
  useEffect(() => {
    (async () => {
      if (!window.customElements.get('model-viewer')) {
        await import('@google/model-viewer');
      }
    })();
    soundManager.startAmbient();
    gsap.fromTo(titleRef.current, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.5, ease: "power3.out", delay: 0.5 });
    gsap.fromTo(subRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.5, ease: "power3.out", delay: 0.8 });
  }, []);
  const onPickFile = () => {
    soundManager.playClick();
    fileInputRef.current?.click();
  };
  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", f);
      const r = await fetch("http://localhost:5000/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (j?.modelUrl) setModelUrl(j.modelUrl);
    } catch {}
    setLoading(false);
  };
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "white", zIndex: 10, mixBlendMode: "difference" }}>
      <h1 ref={titleRef} onMouseEnter={() => soundManager.playHover()} onClick={() => soundManager.playClick()} style={{ fontSize: "5rem", fontWeight: "bold", letterSpacing: "-0.05em", margin: 0, fontFamily: "'Helvetica Neue', sans-serif", pointerEvents: "auto", cursor: "pointer" }}>
        HOLOSTAGE
      </h1>
      <p ref={subRef} style={{ fontSize: "1.2rem", letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.8 }}>Immersive Experience</p>
      <div style={{ display: "flex", gap: "14px", marginTop: "18px", pointerEvents: "auto" }}>
        <button onClick={onPickFile} className="glass-panel" style={{ padding: "10px 20px", borderColor: "var(--holo-blue)", color: "var(--holo-blue)", cursor: "pointer" }}>
          GET START
        </button>
        {loading && <span className="mono-label" style={{ color: "var(--holo-blue)" }}>Uploading...</span>}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
      </div>
      {modelUrl && (
        <div style={{ position: "absolute", bottom: "30px", width: "80%", maxWidth: "900px", height: "380px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,240,255,0.2)", pointerEvents: "auto", background: "rgba(0,0,0,0.4)", boxShadow: "0 0 30px rgba(0,240,255,0.25)" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,240,255,0.06) 0px, rgba(0,240,255,0.06) 1px, transparent 6px)", pointerEvents: "none", mixBlendMode: "screen" }} />
          <model-viewer src={modelUrl} camera-controls auto-rotate tone-mapping="neutral" exposure="1.1" shadow-intensity="0.3" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 10px rgba(0,240,255,0.6))" }} />
        </div>
      )}
    </div>
  );
};

export default function SecondPage() {
  useSound();
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray(".sp-section").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" }
        }
      );
    });
  }, []);
  return (
    <div style={{ width: "100vw", background: "#000", position: "relative" }}>
      <section style={{ position: "relative", height: "100vh" }}>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 2, 20], fov: 45 }} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}>
          <SceneContent />
          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
            <ChromaticAberration offset={[0.002, 0.002]} blendFunction={BlendFunction.NORMAL} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Canvas>
        <Overlay />
      </section>
      <div style={{ position: "relative", zIndex: 1 }}>
        <section className="sp-section" style={{ position: "relative", padding: "120px 24px", maxWidth: "1200px", margin: "0 auto" }}>
          <LiquidChrome baseColor={[0.08, 0.12, 0.22]} amplitude={0.25} speed={0.15} />
          <h1 className="glow-text" style={{ fontSize: "3rem", marginBottom: "20px", textAlign: "center" }}>CORE ARCHITECTURE</h1>
          <p className="subtitle" style={{ textAlign: "center", color: "var(--holo-blue)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Data Flow & Rendering Pipeline
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "40px" }}>
            <div className="glass-panel">
              <h2>Frontend Stack</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="mono-label" style={{ color: "#61dafb" }}>REACT.JS</span>
                  UI component management and state orchestration.
                </li>
                <li style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="mono-label" style={{ color: "#ffffff" }}>THREE.JS</span>
                  Real-time WebGL rendering engine with custom shaders.
                </li>
                <li>
                  <span className="mono-label" style={{ color: "#bd00ff" }}>VITE</span>
                  High-performance build tooling and HMR.
                </li>
              </ul>
            </div>
            <div className="glass-panel">
              <h2>Interaction Layer</h2>
              <p>
                We map 2D pointer events to 3D raycasting vectors. This enables intent detection based on proximity and velocity,
                while scroll acts as a depth modifier.
              </p>
              <div style={{ marginTop: "20px", padding: "15px", background: "rgba(0, 240, 255, 0.05)", borderRadius: "8px", border: "1px solid rgba(0, 240, 255, 0.1)" }}>
                <span className="mono-label">SCALABILITY NOTE</span>
                <p style={{ fontSize: "0.9rem", margin: 0 }}>
                  Decoupled logic allows hot-swapping input methods (Hand Tracking, Eye Gaze) without core rewrites.
                </p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "30px" }}>
            <Link to="/architecture" className="glass-panel" style={{ padding: "12px 24px", display: "inline-block", borderColor: "var(--holo-blue)", color: "var(--holo-blue)" }}>
              OPEN ARCHITECTURE
            </Link>
          </div>
        </section>

        <section className="sp-section" style={{ position: "relative", padding: "120px 24px", maxWidth: "1200px", margin: "0 auto" }}>
          <h1 className="glow-text" style={{ fontSize: "3rem", marginBottom: "20px", textAlign: "center" }}>CITY TOUR</h1>
          <p className="subtitle" style={{ textAlign: "center", color: "var(--holo-blue)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Parametric City Scape Exploration
          </p>
          <div style={{ width: '100%', height: '600px', position: 'relative', marginBottom: '30px' }}>
            <LiquidEther colors={['#121a2b', '#3b82f6', '#06b6d4']} speed={0.25} intensity={0.28} />
            <GradientBlinds
              gradientColors={['#FF9FFC', '#5227FF']}
              angle={0}
              noise={0.3}
              blindCount={12}
              blindMinWidth={50}
              spotlightRadius={0.5}
              spotlightSoftness={1}
              spotlightOpacity={1}
              mouseDampening={0.15}
              distortAmount={0}
              shineDirection="left"
              mixBlendMode="lighten"
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 2, pointerEvents: 'none' }}>
              <h1 className="glow-text" style={{ fontSize: '3rem', margin: 0, textAlign: 'center' }}>COMING SOON</h1>
              
            </div>
          </div>
           
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "40px", marginTop: "40px", alignItems: "start" }}>
            <div className="glass-panel tech-border" style={{ padding: "30px" }}>
              <h2 style={{ margin: "10px 0" }}>Urban Simulation</h2>
              <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
                Procedural buildings, emissive accents, and temporal camera motion create a cinematic overview of city dynamics.
              </p>
              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <Link to="/screens/CityTourPage.jsx" className="glass-panel" style={{ padding: "12px 30px", cursor: "pointer", borderColor: "var(--holo-blue)", color: "var(--holo-blue)" }}>
                  Coming Soon!
                </Link>
               
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", justifyContent: "center" }}>
              <div className="glass-panel info-panel tech-border">
                <h3>Urban Planning</h3>
                <p style={{ fontSize: "0.9rem" }}>Visualize zoning changes and new developments in context.</p>
              </div>
              <div className="glass-panel info-panel tech-border">
                <h3>Tourism</h3>
                <p style={{ fontSize: "0.9rem" }}>Offer virtual tours of landmarks and historical sites.</p>
              </div>
              
            </div>
          </div>
        </section>
        
        
        <section className="sp-section" style={{ position: "relative", padding: "120px 24px", maxWidth: "1200px", margin: "0 auto" }}>
          <h1 className="glow-text" style={{ fontSize: "3rem", marginBottom: "20px", textAlign: "center" }}>FUTURE PRODUCTS</h1>
          <p className="subtitle" style={{ textAlign: "center", color: "var(--holo-blue)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Research Trajectory
          </p>
          <Hyperspeed
           effectOptions={{
           onSpeedUp: () => { },
           onSlowDown: () => { },
           distortion: 'turbulentDistortion',
            length: 400,
           roadWidth: 10,
           islandWidth: 2,
           lanesPerRoad: 4,
            fov: 90,
            fovSpeedUp: 150,
           speedUp: 2,
            carLightsFade: 0.4,
           totalSideLightSticks: 20,
            lightPairsPerRoadWay: 40,
            shoulderLinesWidthPercentage: 0.05,
            brokenLinesWidthPercentage: 0.1,
            brokenLinesLengthPercentage: 0.5,
            lightStickWidth: [0.12, 0.5],
            lightStickHeight: [1.3, 1.7],
           movingAwaySpeed: [60, 80],
           movingCloserSpeed: [-120, -160],
           carLightsLength: [400 * 0.03, 400 * 0.2],
           carLightsRadius: [0.05, 0.14],
           carWidthPercentage: [0.3, 0.5],
           carShiftX: [-0.8, 0.8],
           carFloorSeparation: [0, 5],
           colors: {
             roadColor: 0x080808,
             islandColor: 0x0a0a0a,
             background: 0x000000,
             shoulderLines: 0xFFFFFF,
             brokenLines: 0xFFFFFF,
             leftCars: [0xD856BF, 0x6750A2, 0xC247AC],
      rightCars: [0x03B3C3, 0x0E5EA5, 0x324555],
      sticks: 0x03B3C3,
    }
  }}
/>
          <Waves
  lineColor="#fff"
  backgroundColor="rgba(255, 255, 255, 0.2)"
  waveSpeedX={0.02}
  waveSpeedY={0.01}
  waveAmpX={40}
  waveAmpY={20}
  friction={0.9}
  tension={0.01}
  maxCursorMove={120}
  xGap={12}
  yGap={36}
  className="pointer-events-none"
  style={{ zIndex: 0 }}
/>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px", margin: "40px auto" }}>
            <div className="glass-panel tech-border" style={{ padding: "30px" }}>
              <span className="mono-label" style={{ color: "var(--holo-blue)" }}>PHASE_01</span>
              <h2 style={{ margin: "10px 0" }}>Browser Prototyping</h2>
              <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
                Real-time WebGL, shader-driven experiences, and interaction mapping form the foundation.
              </p>
            </div>
            <div className="glass-panel tech-border" style={{ padding: "30px" }}>
              <span className="mono-label" style={{ color: "var(--holo-blue)" }}>PHASE_02</span>
              <h2 style={{ margin: "10px 0" }}>Wearable Spatial Interfaces</h2>
              <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
                Moving beyond screens with micro-gesture input and environment projection.
              </p>
            </div>
            <div className="glass-panel tech-border" style={{ padding: "30px" }}>
              <span className="mono-label" style={{ color: "var(--holo-blue)" }}>ONGOING</span>
              <h2 style={{ margin: "10px 0" }}>Research Journey</h2>
              <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
                Low-latency rendering, intuitive input mapping, and context-aware computing push the spatial web forward.
              </p>
            </div>
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <Link to="/future" className="glass-panel" style={{ padding: "12px 24px", display: "inline-block", borderColor: "var(--holo-blue)", color: "var(--holo-blue)" }}>
                OPEN FUTURE PAGE
              </Link>
            </div>
            
          </div>
        </section>
      </div>
    </div>
  );
}
