import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useScroll, Scroll, Stars } from '@react-three/drei';
import * as THREE from 'three';
import EntryScene from './sections/EntryScene';
import BuildScene from './sections/BuildScene';
import MemoryScene from './sections/MemoryScene';
import AIScene from './sections/AIScene';
import PortalScene from './sections/PortalScene';
import GlobalParticles from './sections/GlobalParticles';

const Experience = () => {
  const { height, width } = useThree((state) => state.viewport);
  const scroll = useScroll();
  const lightRef = useRef();
  const fogRef = useRef();
  
  // Calculate responsive X offset for scenes
  // If width is small (mobile), we might not want to shift as much or stack vertically
  const isMobile = width < 5;
  const xOffset = isMobile ? 0 : width * 0.25;

  useFrame((state, delta) => {
    // Dynamic Lighting based on Scroll
    const offset = scroll.offset; // 0 to 1
    
    // Target colors for different sections
    // 0: Entry (Cyan/Blue)
    // 0.25: Build (Green/Teal)
    // 0.5: Memory (Purple/Pink)
    // 0.75: AI (Red/Orange)
    // 1: Portal (White/Blue)
    
    let targetColor = new THREE.Color('#000000');
    
    if (offset < 0.25) {
      targetColor.set('#001133'); // Deep Blue
    } else if (offset < 0.5) {
      targetColor.set('#002222'); // Deep Teal
    } else if (offset < 0.75) {
      targetColor.set('#220022'); // Deep Purple
    } else if (offset < 0.9) {
      targetColor.set('#220000'); // Deep Red
    } else {
      targetColor.set('#111111'); // White/Grey
    }

    // Smoothly interpolate fog color
    // We assume the parent Canvas has a fog attached, but we can't easily access it if it's not a ref.
    // Instead, let's just animate the point light color
    if (lightRef.current) {
        // We can mix colors for smoother gradients
        const color1 = new THREE.Color('#00ffff'); // Entry
        const color2 = new THREE.Color('#ff00ff'); // Memory
        const color3 = new THREE.Color('#ff3300'); // AI
        
        let finalColor = new THREE.Color();
        
        if (offset < 0.5) {
            finalColor.lerpColors(color1, color2, Math.min(offset * 2, 1));
        } else {
            finalColor.lerpColors(color2, color3, Math.min((offset - 0.5) * 2, 1));
        }
        
        lightRef.current.color.lerp(finalColor, 0.05);
        lightRef.current.intensity = 1 + offset * 2; // Getting brighter as we go deep
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight ref={lightRef} position={[0, 0, 5]} intensity={1} distance={20} decay={2} />
      
      {/* Replaced standard Stars with our custom Particles */}
      <GlobalParticles />
      
      {/* 3D Content that scrolls */}
      <Scroll>
        <EntryScene />
        <BuildScene position={[isMobile ? 0 : -xOffset, -height * 1, 0]} />
        <MemoryScene position={[isMobile ? 0 : xOffset, -height * 2, 0]} />
        <AIScene position={[isMobile ? 0 : -xOffset, -height * 3, 0]} />
        <PortalScene position={[0, -height * 4, 0]} />
      </Scroll>
    </>
  );
};

export default Experience;
