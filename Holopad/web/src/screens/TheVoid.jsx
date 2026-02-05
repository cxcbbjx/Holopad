import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Environment, Text, Image, Html } from '@react-three/drei';
import { EffectComposer, ChromaticAberration, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import Meg from '../components/Meg';
import UploadZone from '../ui/UploadZone';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../utils/SoundManager';

function SceneContent({ onFileDrop, isTransitioning }) {
  const scroll = useScroll();
  const megRef = useRef();
  const { width, height, camera } = useThree((state) => ({ 
    width: state.viewport.width, 
    height: state.viewport.height,
    camera: state.camera 
  }));
  const [megGlitch, setMegGlitch] = useState(false);
  
  useEffect(() => {
    let timeout;
    const resetIdle = () => {
      setMegGlitch(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => setMegGlitch(true), 5000); // 5 seconds idle
    };
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('scroll', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle();
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('scroll', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      clearTimeout(timeout);
    }
  }, []);
  
  useFrame((state, delta) => {
    // Camera Zoom Transition
    if (isTransitioning) {
      camera.position.lerp(new THREE.Vector3(0, 0, 0), delta * 2);
      // Fade out ambient light or something?
      return;
    }

    // Move Meg to corner during the first phase of scroll
    // We want her to reach the corner by the time we scroll past the hero section (approx 1/3)
    const moveProgress = THREE.MathUtils.clamp(scroll.scroll.current * 3.5, 0, 1);
    
    if (megRef.current) {
      const targetX = width / 2 - 2.5;
      const targetY = -height / 2 + 1.5;
      
      megRef.current.position.x = THREE.MathUtils.lerp(0, targetX, moveProgress);
      megRef.current.position.y = THREE.MathUtils.lerp(0, targetY, moveProgress);
      megRef.current.scale.setScalar(THREE.MathUtils.lerp(1.5, 0.5, moveProgress));
    }
  });

  return (
    <>
      <group ref={megRef}>
        <Meg glitch={megGlitch} />
      </group>
      
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00F5FF" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#F8F8F8" />
      
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.5} />
        <ChromaticAberration offset={[megGlitch ? 0.005 : 0, megGlitch ? 0.005 : 0]} />
      </EffectComposer>
    </>
  );
}

function HeroOverlay({ onFileDrop }) {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: '#F8F8F8',
      fontFamily: "'Inter', sans-serif",
      textAlign: 'center',
      pointerEvents: 'none' // Allow click through to canvas if needed, but we need pointer events for buttons
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        <h1 style={{ 
          fontFamily: "'Orbitron', sans-serif", 
          fontSize: '4rem', 
          letterSpacing: '0.2em',
          marginBottom: '1rem',
          textShadow: '0 0 20px rgba(0, 245, 255, 0.5)'
        }}>
          THE VOID
        </h1>
        <p style={{ 
          fontFamily: 'monospace', 
          fontSize: '1.2rem', 
          color: '#00F5FF',
          marginBottom: '3rem'
        }}>
          Turn images into light.
        </p>
        
        <UploadZone 
          onFileDrop={onFileDrop} 
          onMouseEnter={() => soundManager.playHover()}
          style={{ 
            width: '300px', 
            height: '150px', 
            margin: '0 auto',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ color: '#F8F8F8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Drop Image Here
          </div>
        </UploadZone>
      </div>
      
      {/* Meg's Greeting */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        color: '#00F5FF',
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderLeft: '2px solid #00F5FF'
      }}>
        [MEG_v1.0]: Connection established. Feed me an image.
      </div>
    </div>
  )
}

function InteractionOverlay() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'row',
      alignItems: 'center', 
      justifyContent: 'flex-start',
      paddingLeft: '10%',
      color: '#F8F8F8'
    }}>
      <div style={{ maxWidth: '400px' }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '2.5rem', color: '#00F5FF' }}>
          Meg's Neural Link
        </h2>
        <p style={{ lineHeight: '1.6', fontSize: '1.1rem' }}>
          She's not just a sphere. She's watching.
          <br/>
          <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>(Scroll down for features)</span>
        </p>
      </div>
    </div>
  )
}

function FeaturesOverlay() {
  const features = [
    { title: "Depth Casting", desc: "2D image exploding into layers of light." },
    { title: "Meg's Neural Link", desc: "AI nodes connecting to your work." },
    { title: "Spatial Physics", desc: "Objects reacting to digital gravity." }
  ];

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      color: '#F8F8F8'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '2rem',
        width: '80%',
        maxWidth: '1200px'
      }}>
        {features.map((f, i) => (
          <div key={i} style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: '2rem', 
            border: '1px solid rgba(0, 245, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s ease'
          }}>
            <h3 style={{ color: '#00F5FF', fontFamily: "'Orbitron', sans-serif", marginBottom: '1rem' }}>{f.title}</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TheVoid() {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleFileDrop = (file) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    // Simulate transition delay then navigate
    setTimeout(() => {
      navigate('/viewer', { state: { image: file } });
    }, 1500);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <Environment preset="city" />
        <ScrollControls pages={3} damping={0.2}>
          <SceneContent onFileDrop={handleFileDrop} isTransitioning={isTransitioning} />
          <Scroll html style={{ width: '100%' }}>
             <HeroOverlay onFileDrop={handleFileDrop} />
             <InteractionOverlay />
             <FeaturesOverlay />
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
}
