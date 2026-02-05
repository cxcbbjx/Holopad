import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const AIScene = ({ position }) => {
  const sphereRef = useRef();
  const groupRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (sphereRef.current) {
      // Pulse effect
      sphereRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
      
      // Look at mouse
      const x = state.pointer.x * 2;
      const y = state.pointer.y * 2;
      
      // Smoothly look at the mouse position
      sphereRef.current.lookAt(x, y, 5);
      
      // Add some chromatic aberration-like movement
      sphereRef.current.position.x = THREE.MathUtils.lerp(sphereRef.current.position.x, state.pointer.x * 0.5, 0.1);
      sphereRef.current.position.y = THREE.MathUtils.lerp(sphereRef.current.position.y, state.pointer.y * 0.5, 0.1);
    }

    // Rotate rings
    if (ring1Ref.current) {
        ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.2;
        ring1Ref.current.rotation.y = t * 0.2;
    }
    if (ring2Ref.current) {
        ring2Ref.current.rotation.x = Math.PI / 2 + Math.cos(t * 0.3) * 0.2;
        ring2Ref.current.rotation.y = -t * 0.15;
    }
  });

  return (
    <group position={position} ref={groupRef}>
      <Float speed={5} rotationIntensity={0.5} floatIntensity={0.2}>
        <Sphere args={[1.5, 64, 64]} ref={sphereRef}>
           <MeshDistortMaterial 
             color="#6600ff" 
             emissive="#5500ff"
             emissiveIntensity={1.2}
             roughness={0.1}
             metalness={1}
             distort={0.6}
             speed={3}
           />
        </Sphere>
      </Float>
      
      {/* Eyes / Sensors - these sparkles will follow the sphere */}
      <Sparkles count={200} scale={6} size={4} speed={0.4} opacity={0.5} color="cyan" />
      
      {/* Halo rings - thicker and more visible */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.05, 16, 100]} />
        <meshBasicMaterial color="cyan" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0.5, 0]}>
        <torusGeometry args={[3, 0.04, 16, 100]} />
        <meshBasicMaterial color="magenta" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default AIScene;
