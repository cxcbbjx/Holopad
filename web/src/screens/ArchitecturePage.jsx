import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import '../styles/theme.css';

export default function ArchitecturePage() {
  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(".back-nav", { x: -20, opacity: 0, duration: 0.8, ease: "power2.out" })
      .from(".hero h1", { y: 50, opacity: 0, duration: 1, ease: "power3.out" }, "-=0.6")
      .from(".flow-node", { scale: 0.8, opacity: 0, duration: 0.5, stagger: 0.1, ease: "back.out(1.7)" }, "-=0.4")
      .from(".glass-panel", { y: 30, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power2.out" }, "-=0.2");
  }, { scope: containerRef });

  return (
    <div className="page-container" ref={containerRef}>
      <Link to="/home" className="back-nav">RETURN TO MAIN</Link>

      <section className="hero" style={{ textAlign: 'center', marginBottom: '80px' }}>
        <h1 className="glow-text" style={{ fontSize: '5rem', marginBottom: '20px' }}>CORE ARCHITECTURE</h1>
        <p className="subtitle" style={{ color: 'var(--holo-blue)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Data Flow & Rendering Pipeline
        </p>
      </section>

      {/* Visual Flow Diagram */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '20px', 
        marginBottom: '80px', 
        flexWrap: 'wrap' 
      }}>
        <div className="flow-node glass-panel" style={{ padding: '20px', textAlign: 'center', minWidth: '150px' }}>
          <span className="mono-label">SOURCE</span>
          <strong>INPUT LAYER</strong>
        </div>
        <div className="flow-node" style={{ color: 'var(--text-muted)' }}>→</div>
        <div className="flow-node glass-panel" style={{ padding: '20px', textAlign: 'center', minWidth: '150px', borderColor: 'var(--holo-blue)' }}>
          <span className="mono-label">LOGIC</span>
          <strong>STATE MACHINE</strong>
        </div>
        <div className="flow-node" style={{ color: 'var(--text-muted)' }}>→</div>
        <div className="flow-node glass-panel" style={{ padding: '20px', textAlign: 'center', minWidth: '150px' }}>
          <span className="mono-label">OUTPUT</span>
          <strong>RENDER LOOP</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        
        <div className="glass-panel">
          <h2>Frontend Stack</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="mono-label" style={{ color: '#61dafb' }}>REACT.JS</span>
              UI component management and state orchestration.
            </li>
            <li style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="mono-label" style={{ color: '#ffffff' }}>THREE.JS</span>
              Real-time WebGL rendering engine with custom shaders.
            </li>
            <li>
              <span className="mono-label" style={{ color: '#bd00ff' }}>VITE</span>
              High-performance build tooling and HMR.
            </li>
          </ul>
        </div>

        <div className="glass-panel">
          <h2>Interaction Layer</h2>
          <p>
            We map 2D pointer events to 3D raycasting vectors. This allows us to determine "intent" 
            based on proximity and velocity, rather than just direct clicks. The scroll wheel serves as a 
            depth modifier (Z-axis translation).
          </p>
          <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
            <span className="mono-label">SCALABILITY NOTE</span>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>
              Decoupled logic allows hot-swapping input methods (Hand Tracking, Eye Gaze) without core rewrites.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
