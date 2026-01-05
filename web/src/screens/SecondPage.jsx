import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { useSound, soundManager } from "../utils/SoundManager";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, DepthOfField } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useTexture, useProgress, Environment } from "@react-three/drei";
import "../../the second page/style.css";
import logoUrl from "../assets/logo.png";

export default function SecondPage() {
  const mountRef = useRef(null);
  const titleRef = useRef(null);
  const subRef = useRef(null);
  const cta1Ref = useRef(null);
  const cta2Ref = useRef(null);
  const createdTriggersRef = useRef([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [bloomIntensity, setBloomIntensity] = useState(1.2);
  const [envFiles, setEnvFiles] = useState(null);
  const [envPreset, setEnvPreset] = useState("city");
  useSound(); // Initialize sound

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    soundManager.startAmbient();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { root: null, threshold: 0.2 }
    );
    document.querySelectorAll(".section").forEach((el) => observer.observe(el));
    if (titleRef.current) {
      gsap.fromTo(titleRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", delay: 0.2 });
    }
    if (subRef.current) {
      gsap.fromTo(subRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.0, ease: "power3.out", delay: 0.5 });
    }
    if (cta1Ref.current) {
      gsap.fromTo(cta1Ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.8 });
    }
    if (cta2Ref.current) {
      gsap.fromTo(cta2Ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 1.0 });
    }
    const hoverMagnet = (el) => {
      if (!el) return;
      const qx = gsap.quickTo(el, "x", { duration: 0.3, ease: "power2.out" });
      const qy = gsap.quickTo(el, "y", { duration: 0.3, ease: "power2.out" });
      const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.05;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.05;
        qx(dx);
        qy(dy);
      };
      const onLeave = () => { qx(0); qy(0); };
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      return () => {
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("mouseleave", onLeave);
      };
    };
    const clean1 = hoverMagnet(cta1Ref.current);
    const clean2 = hoverMagnet(cta2Ref.current);
    const label = document.querySelector(".center-label");
    const qxLabel = label ? gsap.quickTo(label, "x", { duration: 0.4, ease: "power2.out" }) : null;
    const qyLabel = label ? gsap.quickTo(label, "y", { duration: 0.4, ease: "power2.out" }) : null;
    const onLabelMove = (e) => {
      if (!label || !qxLabel || !qyLabel) return;
      const rect = label.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.02;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.02;
      qxLabel(dx);
      qyLabel(dy);
    };
    label && label.addEventListener("mousemove", onLabelMove);
    const pinTrigger = ScrollTrigger.create({
      trigger: ".section-holostage",
      start: "top top",
      end: "+=150%",
      scrub: true,
      pin: true,
      onUpdate: (self) => setScrollProgress(self.progress)
    });
    createdTriggersRef.current.push(pinTrigger);
    const bloomObj = { v: 1.2 };
    const bloomTrigger = ScrollTrigger.create({
      trigger: ".section-holostage",
      start: "top top",
      end: "+=150%",
      scrub: true,
      onUpdate: (self) => {
        bloomObj.v = 1.2 + self.progress * 1.3;
        setBloomIntensity(bloomObj.v);
      }
    });
    createdTriggersRef.current.push(bloomTrigger);
    const controller = new AbortController();
    fetch("/textures/studio.hdr", { method: "GET", headers: { Accept: "application/octet-stream" }, signal: controller.signal })
      .then((res) => {
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (res.ok && !ct.includes("text/html")) {
          setEnvFiles("/textures/studio.hdr");
          setEnvPreset(null);
        } else {
          setEnvFiles(null);
          setEnvPreset("city");
        }
      })
      .catch(() => {
        setEnvFiles(null);
        setEnvPreset("city");
      });
    return () => {
      try { window.holostageCleanup && window.holostageCleanup(); } catch {}
      observer.disconnect();
      clean1 && clean1();
      clean2 && clean2();
      label && label.removeEventListener("mousemove", onLabelMove);
      createdTriggersRef.current.forEach((t) => t && t.kill());
      createdTriggersRef.current = [];
      controller.abort();
    };
  }, []);

  const vertexShader = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uAmp;
    void main() {
      vUv = uv;
      vec3 p = position;
      float w = sin(p.x * 2.0 + uTime * 0.6) * cos(p.y * 2.0 + uTime * 0.6);
      p.z += w * uAmp;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    void main() {
      float g = smoothstep(0.0, 1.0, vUv.y);
      vec3 base = mix(uColorA, uColorB, g);
      float grid = step(0.98, max(sin(vUv.x * 60.0), sin(vUv.y * 60.0)));
      vec3 col = base + vec3(0.6, 0.1, 1.0) * grid * 0.25;
      float scan = 0.5 + 0.5 * sin(uTime * 1.5 + vUv.y * 30.0);
      col += vec3(0.05, 0.08, 0.12) * scan;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function LogoPlane({ progress }) {
    const tex = useTexture(logoUrl);
    const mesh = useRef(null);
    const mat = useRef(null);
    useFrame((state) => {
      const t = state.clock.getElapsedTime();
      if (!mesh.current) return;
      mesh.current.rotation.z = THREE.MathUtils.lerp(mesh.current.rotation.z, 0.1 + Math.sin(t * 0.2) * 0.05, 0.05);
      mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, 0.4 + progress * 0.6, 0.06);
      mesh.current.scale.setScalar(0.8 + progress * 0.6);
      if (mat.current) {
        const target = 0.8 + progress * 1.4;
        mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity || target, target, 0.06);
      }
    });
    return (
      <mesh ref={mesh} position={[0, 0.4, 0]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshStandardMaterial ref={mat} map={tex} transparent emissive={"#6fa3ff"} blending={THREE.AdditiveBlending} />
      </mesh>
    );
  }

  function GlowOrbs({ progress }) {
    const inst = useRef(null);
    const { viewport } = useThree();
    const count = 120;
    const dummy = new THREE.Object3D();
    const positions = useRef([]);
    const speeds = useRef([]);
    const color = new THREE.Color("#6fa3ff");
    useEffect(() => {
      positions.current = Array.from({ length: count }, () => [
        (Math.random() - 0.5) * viewport.width * 1.5,
        (Math.random() - 0.5) * viewport.height * 1.5,
        -0.5 - Math.random()
      ]);
      speeds.current = Array.from({ length: count }, () => 0.2 + Math.random() * 0.8);
      for (let i = 0; i < count; i++) {
        dummy.position.set(...positions.current[i]);
        dummy.scale.setScalar(0.12 + Math.random() * 0.25);
        dummy.updateMatrix();
        inst.current.setMatrixAt(i, dummy.matrix);
      }
      inst.current.instanceMatrix.needsUpdate = true;
    }, []);
    useFrame((state) => {
      const t = state.clock.getElapsedTime();
      if (!inst.current || positions.current.length !== count || speeds.current.length !== count) return;
      for (let i = 0; i < count; i++) {
        const p = positions.current[i];
        const s = speeds.current[i];
        if (!p) continue;
        p[0] += Math.sin(t * 0.5 + i) * 0.0008 * (1.0 + progress);
        p[1] += Math.cos(t * 0.4 + i) * 0.0012 * (1.0 + progress);
        dummy.position.set(p[0], p[1], p[2]);
        const base = 0.12;
        const scale = base + Math.sin(t * s + i) * 0.08 + progress * 0.2;
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        inst.current.setMatrixAt(i, dummy.matrix);
      }
      inst.current.instanceMatrix.needsUpdate = true;
    });
    return (
      <instancedMesh ref={inst} args={[null, null, count]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8 + progress * 1.2} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </instancedMesh>
    );
  }

  function LiquidBackdrop({ progress }) {
    const mesh = useRef(null);
    const { viewport } = useThree();
    const uniforms = useRef({
      uTime: { value: 0 },
      uAmp: { value: 0.35 },
      uColorA: { value: new THREE.Color("#0c1022") },
      uColorB: { value: new THREE.Color("#1f3b73") }
    });
    useFrame((state) => {
      uniforms.current.uTime.value = state.clock.getElapsedTime();
      const a = new THREE.Color("#0c1022");
      const b = new THREE.Color("#1f3b73");
      uniforms.current.uAmp.value = 0.35 + progress * 0.65;
      uniforms.current.uColorA.value.lerpColors(a, b, progress * 0.5);
      uniforms.current.uColorB.value.lerpColors(b, new THREE.Color("#6fa3ff"), progress * 0.6);
    });
    return (
      <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[viewport.width * 2.0, viewport.height * 2.0, 128, 128]} />
        <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms.current} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  function bezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    const p = new THREE.Vector3();
    p.add(p0.clone().multiplyScalar(uuu));
    p.add(p1.clone().multiplyScalar(3 * uu * t));
    p.add(p2.clone().multiplyScalar(3 * u * tt));
    p.add(p3.clone().multiplyScalar(ttt));
    return p;
  }

  function SceneFX({ progress, bloom, envFiles, envPreset }) {
    const { camera } = useThree();
    const p0 = new THREE.Vector3(0, 1.5, 4);
    const p1 = new THREE.Vector3(-1.0, 2.2, 3.0);
    const p2 = new THREE.Vector3(1.2, 1.0, 2.0);
    const p3 = new THREE.Vector3(0.0, 1.2, 1.2);
    useFrame(() => {
      const t = progress;
      const target = bezier(p0, p1, p2, p3, t);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, target.x, 0.06);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, target.y, 0.06);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, target.z, 0.06);
      camera.lookAt(0, 0, 0);
    });
    return (
      <>
        <ambientLight intensity={0.6} />
        <pointLight position={[6, 6, 6]} intensity={1.2} />
        {envFiles ? <Environment files={envFiles} /> : <Environment preset={envPreset} />}
        <LiquidBackdrop progress={progress} />
        <LogoPlane progress={progress} />
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={1.0} mipmapBlur intensity={bloom} />
          <ChromaticAberration offset={[0.002 * progress, 0.002 * progress]} blendFunction={BlendFunction.NORMAL} />
          <DepthOfField focusDistance={0.02 + progress * 0.08} focalLength={0.02 + progress * 0.06} bokehScale={2.5 + progress * 1.5} />
          <Noise opacity={0.04} />
          <Vignette eskil={false} offset={0.12} darkness={1.05} />
        </EffectComposer>
      </>
    );
  }

  function BrandLoader() {
    const { progress, active } = useProgress();
    return (
      <div className="loader-overlay" style={{ opacity: active ? 1 : 0, pointerEvents: active ? "all" : "none" }}>
        <div className="loader-text">Initializing Holostage // {Math.round(progress)}%</div>
        <div className="loader-bar-bg">
          <div className="loader-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="holostage" style={{ position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 1.5, 4], fov: 50 }} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}>
          <SceneFX progress={scrollProgress} bloom={bloomIntensity} envFiles={envFiles} envPreset={envPreset} />
        </Canvas>
      </div>
      <BrandLoader />
      <section className="section section-holostage">
        <div className="ui">
          <div className="header">
            <span>HOLO✦PAD</span>
            <span className="status">Holostage · Simulation Mode</span>
          </div>
          <div className="center-label">
            <h1 ref={titleRef} className="holo-title">Holostage</h1>
            <p ref={subRef} className="holo-sub">Spatial Interface Prototype v0.1</p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px', pointerEvents: 'auto' }}>
              <Link ref={cta1Ref} to="/holostage" className="cta-btn" style={{ textDecoration: 'none', fontSize: '14px', pointerEvents: 'auto' }}>About Holostage</Link>
              <Link ref={cta2Ref} to="/geometry/torus-knot" className="cta-btn" style={{ textDecoration: 'none', fontSize: '14px', background: 'rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>View Geometry</Link>
            </div>
            <p className="holo-note">UNDER-MAINTAINANCE</p>
          </div>
          
        </div>
      </section>
    </div>
  );
}
