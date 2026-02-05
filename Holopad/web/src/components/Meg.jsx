import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Html } from '@react-three/drei';
import * as THREE from 'three';

export default function Meg({ position = [0, 0, 0], scale = 1, onHover, onLeave, glitch }) {
  const mesh = useRef();
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (mesh.current) {
      // Gentle pulsing
      const t = state.clock.getElapsedTime();
      
      // Look at cursor (simple version)
      const mouse = state.mouse;
      
      // Smooth rotation towards mouse
      mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, mouse.y * 0.5, 0.1);
      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, mouse.x * 0.5, 0.1);

      // Slight position follow
      mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, mouse.x * 0.5, 0.05);
      mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, mouse.y * 0.5, 0.05);
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh
        ref={mesh}
        onPointerOver={() => {
          setHover(true);
          if (onHover) onHover();
        }}
        onPointerOut={() => {
          setHover(false);
          if (onLeave) onLeave();
        }}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={hovered ? "#00F5FF" : "#1a1a1a"} // Cyan on hover, Obsidian otherwise
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0}
          metalness={0.9}
          roughness={0.1}
          distort={0.4} // Liquid effect
          speed={2}
        />
      </mesh>
      
      {/* Glitch Feedback Text */}
      {glitch && (
        <Html position={[1.5, 0, 0]} className="meg-glitch-text">
          <div style={{ 
            color: '#00F5FF', 
            fontFamily: 'monospace', 
            fontSize: '0.8rem',
            background: 'rgba(0,0,0,0.8)',
            padding: '4px 8px',
            border: '1px solid #00F5FF',
            width: '200px'
          }}>
            Are we building something today, or just staring at the void?
          </div>
        </Html>
      )}
    </group>
  );
}
