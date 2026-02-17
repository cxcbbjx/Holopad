import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';

// Holographic Memory Frame Component
const MemoryFrame = ({ position, rotation, color, label }) => {
  const mesh = useRef();
  
  // Create a simple gradient texture programmatically to avoid external image loading issues
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    // Add some "noise" lines for holographic effect
    context.strokeStyle = 'rgba(255,255,255,0.2)';
    for(let i=0; i<10; i++) {
        context.beginPath();
        context.moveTo(0, Math.random() * 256);
        context.lineTo(256, Math.random() * 256);
        context.stroke();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [color]);

  return (
    <group position={position} rotation={rotation}>
      {/* The Frame */}
      <mesh ref={mesh}>
        <boxGeometry args={[3, 2, 0.1]} />
        <meshPhysicalMaterial 
          map={texture}
          transparent
          opacity={0.8}
          roughness={0.2}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Label floating slightly in front */}
      <Text
        position={[-1.2, -0.8, 0.1]}
        fontSize={0.15}
        color="white"
        anchorX="left"
        anchorY="bottom"
      >
        {label}
      </Text>
    </group>
  );
};

const MemoryScene = ({ position }) => {
  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <MemoryFrame 
          position={[-2.5, 0, 1]} 
          rotation={[0, 0.3, 0]} 
          color="cyan" 
          label="01_GENESIS" 
        />
        <MemoryFrame 
          position={[2.5, 1, -1]} 
          rotation={[0, -0.3, 0]} 
          color="magenta" 
          label="02_STRUCTURE" 
        />
        <MemoryFrame 
          position={[0, -1.5, 0.5]} 
          rotation={[0.1, 0, 0]} 
          color="blue" 
          label="03_SYSTEM" 
        />
      </Float>
    </group>
  );
};

export default MemoryScene;
