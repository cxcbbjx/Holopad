import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import '../styles/theme.css';

export default function FuturePage() {
  const containerRef = useRef(null);
  const mountRef = useRef(null);

  // EXPERT THREE.JS: PARTICLE TIME TUNNEL
  useEffect(() => {
    if (!mountRef.current) return;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // COMPOSER
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.85
    );
    composer.addPass(bloomPass);

    // PARTICLES
    const count = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const speeds = [];

    for (let i = 0; i < count; i++) {
      positions.push((Math.random() - 0.5) * 400); // x
      positions.push((Math.random() - 0.5) * 400); // y
      positions.push((Math.random() - 0.5) * 400); // z
      speeds.push(Math.random() * 2 + 0.5);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSpeed', new THREE.Float32BufferAttribute(speeds, 1));

    // CUSTOM SHADER FOR PARTICLES (WARP SPEED)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00aaff) }
      },
      vertexShader: `
        attribute float aSpeed;
        varying float vSpeed;
        uniform float uTime;
        void main() {
          vSpeed = aSpeed;
          vec3 pos = position;
          
          // Move towards camera (z+)
          pos.z = mod(position.z + uTime * 50.0 * aSpeed, 400.0) - 200.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (200.0 / -mvPosition.z) * aSpeed;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vSpeed;
        void main() {
          if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
          gl_FragColor = vec4(uColor, 1.0) * vSpeed * 0.5;
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ANIMATION
    const clock = new THREE.Clock();
    
    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      
      material.uniforms.uTime.value = time;
      camera.rotation.z = time * 0.05; // Gentle spin
      
      composer.render();
    };
    
    animate();

    // RESIZE
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".back-nav", { x: -20, opacity: 0, duration: 0.8, ease: "power2.out" })
      .from(".hero-title", { scale: 0.8, opacity: 0, duration: 1, ease: "power3.out" }, "-=0.6")
      .from(".hero-subtitle", { y: 20, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.6")
      .from(".timeline-line", { height: 0, duration: 1.5, ease: "power2.inOut" }, "-=0.4")
      .from(".timeline-item", { 
        x: -50, 
        opacity: 0, 
        duration: 0.8, 
        stagger: 0.3, 
        ease: "power2.out" 
      }, "-=1.0");

    // Ambient background movement
    gsap.to(".glow-orb", {
      x: "random(-100, 100)",
      y: "random(-100, 100)",
      scale: "random(0.8, 1.2)",
      duration: "random(10, 20)",
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

  }, { scope: containerRef });

  return (
    <div className="page-container" ref={containerRef} style={{ overflowX: 'hidden', position: 'relative' }}>
      
      {/* 3D Background */}
      <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }} />

      {/* Ambient Background - Removed static orbs, replaced with particles */}

      <div className="back-nav" style={{ marginBottom: '40px' }}>
        <Link to="/" className="glass-panel" style={{ padding: '10px 20px', textDecoration: 'none', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          <span>←</span> <span className="mono-label">RETURN_MAIN</span>
        </Link>
      </div>

      <section className="hero" style={{ textAlign: 'center', marginBottom: '80px' }}>
        <h1 className="hero-title" style={{ fontSize: '4rem', marginBottom: '10px', background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          THE_ROADMAP
        </h1>
        <p className="hero-subtitle mono-label" style={{ fontSize: '1.2rem', color: 'var(--holo-blue)' }}>
          FROM_SIMULATION_TO_REALITY
        </p>
      </section>

      <div className="timeline-container" style={{ position: 'relative', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
        {/* Vertical Line */}
        <div className="timeline-line" style={{ 
          position: 'absolute', left: '20px', top: 0, bottom: 0, width: '2px', 
          background: 'linear-gradient(to bottom, var(--holo-blue), transparent)' 
        }} />

        {/* Timeline Items */}
        <div className="timeline-item" style={{ position: 'relative', paddingLeft: '60px', marginBottom: '60px' }}>
          <div className="node" style={{ 
            position: 'absolute', left: '11px', top: '0', width: '20px', height: '20px', 
            background: '#000', border: '2px solid var(--holo-blue)', borderRadius: '50%', zIndex: 1 
          }} />
          <div className="glass-panel tech-border" style={{ padding: '30px' }}>
            <span className="mono-label" style={{ color: 'var(--holo-blue)' }}>PHASE_01</span>
            <h2 style={{ margin: '10px 0' }}>Holobands</h2>
            <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
              The first step into hardware. Holobands are lightweight wrist wearables that emit modulated 
              light fields. They serve as both a tracking anchor for the Holopad system and a haptic feedback 
              device for the user.
            </p>
          </div>
        </div>

        <div className="timeline-item" style={{ position: 'relative', paddingLeft: '60px', marginBottom: '60px' }}>
          <div className="node" style={{ 
            position: 'absolute', left: '11px', top: '0', width: '20px', height: '20px', 
            background: '#000', border: '2px solid var(--holo-blue)', borderRadius: '50%', zIndex: 1 
          }} />
          <div className="glass-panel tech-border" style={{ padding: '30px' }}>
            <span className="mono-label" style={{ color: 'var(--holo-blue)' }}>PHASE_02</span>
            <h2 style={{ margin: '10px 0' }}>Wearable Spatial Interfaces</h2>
            <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
              We are moving beyond screens. Our goal is to weave digital information into the fabric of daily life. 
              Future interfaces will be projected directly onto the retina or the environment, controlled by 
              micro-gestures detected by Holobands.
            </p>
          </div>
        </div>

        <div className="timeline-item" style={{ position: 'relative', paddingLeft: '60px', marginBottom: '60px' }}>
          <div className="node" style={{ 
            position: 'absolute', left: '11px', top: '0', width: '20px', height: '20px', 
            background: '#000', border: '2px solid var(--holo-blue)', borderRadius: '50%', zIndex: 1 
          }} />
          <div className="glass-panel tech-border" style={{ padding: '30px' }}>
            <span className="mono-label" style={{ color: 'var(--holo-blue)' }}>PHASE_03</span>
            <h2 style={{ margin: '10px 0' }}>Physical World Integration</h2>
            <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
              Holostage is the training ground. The algorithms we perfect in the browser today will drive the 
              operating systems of tomorrow's AR glasses and holographic displays. We are building the 
              software foundation before the hardware arrives.
            </p>
          </div>
        </div>

        <div className="timeline-item" style={{ position: 'relative', paddingLeft: '60px' }}>
          <div className="node" style={{ 
            position: 'absolute', left: '11px', top: '0', width: '20px', height: '20px', 
            background: '#000', border: '2px solid var(--holo-blue)', borderRadius: '50%', zIndex: 1 
          }} />
          <div className="glass-panel tech-border" style={{ padding: '30px' }}>
            <span className="mono-label" style={{ color: 'var(--holo-blue)' }}>ONGOING</span>
            <h2 style={{ margin: '10px 0' }}>Research Journey</h2>
            <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
              Our research focuses on three pillars: low-latency rendering, intuitive input mapping, and 
              context-aware computing. We are constantly iterating on prototypes, publishing our findings, 
              and pushing the boundaries of what's possible in the spatial web.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
