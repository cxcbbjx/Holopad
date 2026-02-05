import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Link } from 'react-router-dom';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import '../styles/theme.css';

// --- Custom Shader Code ---
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Pulse effect: Displace vertices along their normal based on time and position
    float pulse = sin(uTime * 2.0 + position.x * 0.5 + position.y * 0.5) * 0.2;
    vec3 newPos = position + normal * pulse;
    
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);
    
    // Fresnel Effect (Rim Light)
    float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 3.0);
    
    // Moving Energy Pattern
    float pattern = sin(vUv.x * 20.0 + uTime * 3.0) * sin(vUv.y * 20.0 + uTime * 2.0);
    pattern = smoothstep(0.0, 1.0, pattern);
    
    // Base Color Mix
    vec3 color = mix(uColorA, uColorB, vUv.x + sin(uTime * 0.5));
    
    // Add Pattern
    color += uColorB * pattern * 0.5;
    
    // Add Fresnel Glow
    color += vec3(0.8, 0.9, 1.0) * fresnel * 2.0;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function TorusKnotPage() {
  const mountRef = useRef(null);
  const containerRef = useRef(null);
  
  // State for Torus Knot parameters
  const [params, setParams] = useState({
    radius: 10,
    tube: 3,
    tubularSegments: 128,
    radialSegments: 64, // Increased for smoother shader
    p: 2,
    q: 3
  });

  const meshRef = useRef(null);
  const composerRef = useRef(null);
  const rendererRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".back-nav", { x: -20, opacity: 0, duration: 0.8, ease: "power2.out" })
      .from(".overlay-title", { y: -50, opacity: 0, duration: 1, ease: "power3.out" }, "-=0.6")
      .from(".control-panel", { x: 50, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.6")
      .from(".info-card", { y: 50, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power2.out" }, "-=0.4");
      
  }, { scope: containerRef });

  useEffect(() => {
    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020202);
    // Fog for depth
    scene.fog = new THREE.FogExp2(0x020202, 0.015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    
    const container = mountRef.current;
    if (!container) return;

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Tone Mapping for Bloom
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Post-Processing Setup ---
    const renderScene = new RenderPass(scene, camera);
    
    // Bloom Pass: Resolution, Strength, Radius, Threshold
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.5,  // strength
      0.4,  // radius
      0.85  // threshold
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // Initial Geometry
    const geometry = new THREE.TorusKnotGeometry(
      params.radius, 
      params.tube, 
      params.tubularSegments, 
      params.radialSegments, 
      params.p, 
      params.q
    );
    
    // Custom Shader Material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0x0000ff) }, // Deep Blue
        uColorB: { value: new THREE.Color(0x00ffff) }  // Cyan
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true
    });

    // Wireframe Overlay (Subtle Tech Grid)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.05
    });

    const torusKnot = new THREE.Mesh(geometry, material);
    const wireframe = new THREE.Mesh(geometry, wireframeMaterial);
    
    torusKnot.add(wireframe);
    scene.add(torusKnot);
    meshRef.current = { mesh: torusKnot, wireframe: wireframe, material: material };

    // Particles (Floating Dust)
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 100;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 35;

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      
      const elapsedTime = clock.getElapsedTime();

      if (torusKnot) {
        torusKnot.rotation.x = elapsedTime * 0.1;
        torusKnot.rotation.y = elapsedTime * 0.15;
        
        // Update Shader Uniforms
        material.uniforms.uTime.value = elapsedTime;
      }
      
      // Rotate particles slowly
      particlesMesh.rotation.y = -elapsedTime * 0.05;
      
      // Use composer instead of renderer
      composer.render();
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      wireframeMaterial.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []); // Run once on mount

  // Effect to update geometry when params change
  useEffect(() => {
    if (meshRef.current) {
      const { mesh, wireframe } = meshRef.current;
      const newGeometry = new THREE.TorusKnotGeometry(
        params.radius, 
        params.tube, 
        params.tubularSegments, 
        params.radialSegments, 
        params.p, 
        params.q
      );
      
      mesh.geometry.dispose();
      wireframe.geometry.dispose();
      
      mesh.geometry = newGeometry;
      wireframe.geometry = newGeometry;
    }
  }, [params]);

  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  return (
    <div className="page-container" ref={containerRef} style={{ padding: 0, overflow: 'hidden' }}>
      
      {/* 3D Canvas Background */}
      <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />

      {/* Overlay UI */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', pointerEvents: 'none' }}>
        
        {/* Navigation */}
        <div className="back-nav" style={{ position: 'absolute', top: '40px', left: '40px', pointerEvents: 'auto' }}>
          <Link to="/" className="glass-panel" style={{ padding: '10px 20px', textDecoration: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>←</span> <span className="mono-label">RETURN_MAIN</span>
          </Link>
        </div>

        {/* Title */}
        <div className="overlay-title" style={{ position: 'absolute', top: '40px', right: '40px', textAlign: 'right' }}>
          <h1 style={{ fontSize: '3rem', margin: 0, textShadow: '0 0 20px rgba(0,255,255,0.5)' }}>QUANTUM_KNOT</h1>
          <p className="mono-label" style={{ color: 'var(--holo-blue)' }}>VISUAL_ENGINE_V2.0 // BLOOM_ENABLED</p>
        </div>

        {/* Controls */}
        <div className="control-panel glass-panel tech-border" style={{ 
          position: 'absolute', 
          top: '50%', 
          right: '40px', 
          transform: 'translateY(-50%)', 
          width: '300px', 
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h3 className="mono-label" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>PARAMETERS</h3>
          
          <div className="control-group">
            <label className="mono-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>RADIUS</span> <span>{params.radius}</span>
            </label>
            <input 
              type="range" min="5" max="20" step="0.1" 
              value={params.radius} 
              onChange={(e) => updateParam('radius', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--holo-blue)' }}
            />
          </div>

          <div className="control-group">
            <label className="mono-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TUBE</span> <span>{params.tube}</span>
            </label>
            <input 
              type="range" min="0.1" max="5" step="0.1" 
              value={params.tube} 
              onChange={(e) => updateParam('tube', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--holo-blue)' }}
            />
          </div>

          <div className="control-group">
            <label className="mono-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>P (WINDING)</span> <span>{params.p}</span>
            </label>
            <input 
              type="range" min="1" max="20" step="1" 
              value={params.p} 
              onChange={(e) => updateParam('p', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--holo-blue)' }}
            />
          </div>

          <div className="control-group">
            <label className="mono-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Q (LOOPS)</span> <span>{params.q}</span>
            </label>
            <input 
              type="range" min="1" max="20" step="1" 
              value={params.q} 
              onChange={(e) => updateParam('q', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--holo-blue)' }}
            />
          </div>
        </div>

        {/* Info Cards */}
        <div style={{ 
          position: 'absolute', 
          bottom: '40px', 
          left: '40px', 
          display: 'flex', 
          gap: '20px',
          maxWidth: '60%'
        }}>
          <div className="info-card glass-panel" style={{ flex: 1, pointerEvents: 'auto' }}>
            <h4 className="mono-label" style={{ color: 'var(--holo-blue)' }}>SHADER_CORE</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Running custom GLSL fragment shader with procedural noise and Fresnel rim lighting.
            </p>
          </div>
          <div className="info-card glass-panel" style={{ flex: 1, pointerEvents: 'auto' }}>
            <h4 className="mono-label" style={{ color: 'var(--holo-blue)' }}>POST_PROCESS</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              EffectComposer active: UnrealBloomPass for high-dynamic-range glow simulation.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
