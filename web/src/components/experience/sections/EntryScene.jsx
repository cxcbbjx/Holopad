import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text, MeshDistortMaterial } from '@react-three/drei';

const EntryScene = () => {
  return (
    <group position={[0, 0, 0]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[2, 1, -2]} scale={1.5}>
          <icosahedronGeometry args={[1, 0]} />
          <MeshDistortMaterial color="#333" speed={2} distort={0.4} roughness={0.2} />
        </mesh>
      </Float>
      
      <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
        <mesh position={[-2, -1, -3]} scale={1}>
          <octahedronGeometry />
          <meshStandardMaterial color="#1a1a1a" wireframe />
        </mesh>
      </Float>

      {/* Volumetric-like light beam */}
      <spotLight position={[0, 10, 0]} intensity={2} penumbra={1} color="cyan" distance={20} />
    </group>
  );
};

export default EntryScene;
