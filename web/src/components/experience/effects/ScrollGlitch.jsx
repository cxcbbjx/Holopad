import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import { ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';

const ScrollGlitch = () => {
  const scroll = useScroll();
  const aberrationRef = useRef();
  
  useFrame((state, delta) => {
    if (aberrationRef.current) {
      // scroll.delta is the change in scroll position this frame
      // We use it to drive the glitch intensity
      const scrollSpeed = Math.abs(scroll.delta) * 100; // Amplify small delta
      
      // Smoothly interpolate current offset to target based on speed
      const targetX = scrollSpeed * 0.05;
      const targetY = scrollSpeed * 0.05;
      
      // Manual Lerp for safety (avoiding .lerp is not function error)
      const currentX = aberrationRef.current.offset.x;
      const currentY = aberrationRef.current.offset.y;
      
      const nextX = currentX + (targetX - currentX) * 0.1;
      const nextY = currentY + (targetY - currentY) * 0.1;
      
      aberrationRef.current.offset.x = nextX;
      aberrationRef.current.offset.y = nextY;
    }
  });

  return (
    <ChromaticAberration 
      ref={aberrationRef}
      offset={[0, 0]} // Start at 0
      radialModulation={false}
      modulationOffset={0}
    />
  );
};

export default ScrollGlitch;
