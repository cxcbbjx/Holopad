import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';
import { useSound, soundManager } from '../utils/SoundManager';
import '../styles/theme.css';
// import cityVideo from '../../the second page/city.mp4';

export default function CityTourPage() {
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  useSound();

  // EXPERT THREE.JS: PROCEDURAL CYBERPUNK CITY
  useEffect(() => {
    soundManager.startAmbient();

    if (!mountRef.current) return;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.002);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Mobile Optimization: Reduce pixel ratio and skip heavy effects
    const isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // COMPOSER
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    let ssaoPass;
    if (!isMobile) {
      ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
      ssaoPass.kernelRadius = 16;
      ssaoPass.minDistance = 0.005;
      ssaoPass.maxDistance = 0.1;
      composer.addPass(ssaoPass);
    }

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2, 0.5, 0.1
    );
    composer.addPass(bloomPass);
    
    const filmPass = new FilmPass(0.35, 0.025, 648, false);
    composer.addPass(filmPass);

    // CITY GENERATION
    const buildingCount = 800;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0); // Pivot at bottom

    // CUSTOM SHADER FOR BUILDINGS
    const buildingMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorTop: { value: new THREE.Color(0x00aaff) },
        uColorBot: { value: new THREE.Color(0x001133) }
      },
      vertexShader: `
        #include <common>
        
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          #ifdef USE_INSTANCING
            worldPosition = instanceMatrix * vec4(position, 1.0);
          #endif
          
          vPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;
        uniform vec3 uColorTop;
        uniform vec3 uColorBot;

        float myRandom(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
          float timeStep = floor(uTime * 0.5);
          // Windows Logic
          float windowX = step(0.4, fract(vUv.x * 10.0));
          float windowY = step(0.4, fract(vUv.y * 20.0));
          float windows = windowX * windowY;
          
          vec2 cell = floor(vec2(vUv.x * 10.0, vUv.y * 20.0));
          float noise = myRandom(cell + vec2(timeStep, timeStep)); 
          if(noise < 0.7) windows = 0.0;

          // Gradient based on height (y is up)
          vec3 baseColor = mix(uColorBot, uColorTop, clamp(vPosition.y * 0.02, 0.0, 1.0));
          vec3 finalColor = mix(baseColor, vec3(0.8, 0.9, 1.0), windows * 2.0); 
          
          // Scanline effect
          float scanHeight = 10.0 + sin(uTime * 0.5) * 50.0 + 50.0;
          float scan = 1.0 - smoothstep(0.0, 5.0, abs(vPosition.y - scanHeight));
          finalColor += vec3(0.0, 1.0, 1.0) * scan * 2.0;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const mesh = new THREE.InstancedMesh(geometry, buildingMaterial, buildingCount);
    
    const dummy = new THREE.Object3D();
    const width = 200;
    const depth = 200;

    for(let i=0; i<buildingCount; i++) {
      dummy.position.x = (Math.random() - 0.5) * width;
      dummy.position.z = (Math.random() - 0.5) * depth - 50;
      dummy.position.y = 0;
      
      const scaleY = Math.random() * 40 + 5;
      const scaleXZ = Math.random() * 3 + 2;
      
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    
    scene.add(mesh);

    // GROUND PLANE
    const planeGeo = new THREE.PlaneGeometry(500, 500);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.8 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.1;
    scene.add(plane);
    
    const grid = new THREE.GridHelper(500, 50, 0x111111, 0x111111);
    scene.add(grid);

    // ANIMATION
    const clock = new THREE.Clock();
    
    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      
      buildingMaterial.uniforms.uTime.value = time;
      
      camera.position.z = 100 - Math.sin(time * 0.1) * 20;
      camera.position.x = Math.sin(time * 0.15) * 30;
      camera.lookAt(0, 10, -50);
      
      composer.render();
    };
    
    animate();

    // RESIZE
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      if (ssaoPass) ssaoPass.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      planeGeo.dispose();
      buildingMaterial.dispose();
      planeMat.dispose();
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".back-nav", { x: -20, opacity: 0, duration: 0.8, ease: "power2.out" })
      .from(".immersive-video-bg", { opacity: 0, scale: 1.1, duration: 1.5, ease: "power2.out" }, "-=0.4")
      .from(".hero-overlay", { y: 30, opacity: 0, duration: 1, ease: "power3.out" }, "-=1")
      .from(".info-panel", { x: 50, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power2.out" }, "-=0.6");
  }, { scope: containerRef });

  return (
    <div ref={containerRef} style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <Link to="/home" className="back-nav" style={{ position: 'fixed', top: '40px', left: '40px', zIndex: 20 }}>RETURN TO MAIN</Link>

      {/* Immersive Video Background */}
      <div className="immersive-video-bg" ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {/* <video 
          src={cityVideo} 
          autoPlay 
          muted 
          loop 
          playsInline 
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
        /> */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #050505 0%, transparent 50%, #050505 100%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #050505 0%, transparent 20%, transparent 80%, #050505 100%)', pointerEvents: 'none' }}></div>
      </div>

      <div className="page-container" style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 400px', gap: '60px' }}>
          
          {/* Hero Content */}
          <div className="hero-overlay">
            <span className="mono-label glow-text">EXP_03 // URBAN_EXPLORATION</span>
            <h1 style={{ fontSize: '5rem', lineHeight: 0.9, marginBottom: '24px' }}>
              CITY<br/><span style={{ color: 'transparent', WebkitTextStroke: '1px #fff' }}>REIMAGINED</span>
            </h1>
            <p className="subtitle" style={{ maxWidth: '500px', marginBottom: '40px' }}>
              Transforming static map data into immersive, navigable 3D experiences. 
              Fly through streets, inspect buildings, and visualize urban data layers in real-time.
            </p>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <button className="glass-panel" style={{ padding: '12px 30px', cursor: 'pointer', borderColor: 'var(--holo-blue)', color: 'var(--holo-blue)' }}>
                START TOUR
              </button>
              <button className="glass-panel" style={{ padding: '12px 30px', cursor: 'pointer' }}>
                VIEW DATA
              </button>
            </div>
          </div>

          {/* Info Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
            <div className="glass-panel info-panel tech-border">
              <h3>Urban Planning</h3>
              <p style={{ fontSize: '0.9rem' }}>Visualize zoning changes and new developments in context.</p>
            </div>
            <div className="glass-panel info-panel tech-border">
              <h3>Tourism</h3>
              <p style={{ fontSize: '0.9rem' }}>Offer virtual tours of landmarks and historical sites.</p>
            </div>
            <div className="glass-panel info-panel tech-border">
              <h3>Real Estate</h3>
              <p style={{ fontSize: '0.9rem' }}>Show properties and their surrounding neighborhoods realistically.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
