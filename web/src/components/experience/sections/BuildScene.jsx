import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Box, RoundedBox } from '@react-three/drei';

const BuildScene = ({ position }) => {
  const group = useRef();
  
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.002;
    }
  });

  return (
    <group position={position} ref={group}>
      <Float speed={4} rotationIntensity={1} floatIntensity={2}>
        <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.1} smoothness={4} position={[2, 0, 0]}>
          <meshPhysicalMaterial 
            roughness={0.1} 
            metalness={0.8} 
            color="#222" 
            clearcoat={1} 
            clearcoatRoughness={0.1}
          />
        </RoundedBox>
      </Float>

      <Float speed={2} rotationIntensity={2} floatIntensity={1}>
        <Box args={[1, 1, 1]} position={[-2, 1, 1]}>
          <meshStandardMaterial color="cyan" wireframe />
        </Box>
      </Float>
      
       <Float speed={3} rotationIntensity={1} floatIntensity={1}>
        <Box args={[0.5, 4, 0.5]} position={[-1, -1, -1]}>
           <meshPhysicalMaterial color="hotpink" transmission={0.5} roughness={0} thickness={2} />
        </Box>
      </Float>
    </group>
  );
};

export default BuildScene;
