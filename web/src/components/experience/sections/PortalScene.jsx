import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Torus, Float, Text, MeshTransmissionMaterial } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';

const PortalScene = ({ position }) => {
  const torusRef = useRef();
  const navigate = useNavigate();

  useFrame((state) => {
    if (torusRef.current) {
      torusRef.current.rotation.z -= 0.01;
      torusRef.current.rotation.x += 0.005;
    }
  });

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Torus args={[2, 0.2, 16, 100]} ref={torusRef}>
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} toneMapped={false} />
        </Torus>
        
        {/* Inner glass disc */}
        <mesh onClick={() => navigate('/download')} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
           <circleGeometry args={[1.8, 32]} />
           <MeshTransmissionMaterial 
             backside
             samples={4}
             thickness={2}
             chromaticAberration={0.5}
             anisotropy={0.5}
             distortion={0.5}
             distortionScale={0.5}
             temporalDistortion={0.2}
             color="cyan"
           />
        </mesh>

        <Text 
          position={[0, 0, 0.5]} 
          fontSize={0.4} 
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          ENTER SYSTEM
        </Text>
      </Float>
    </group>
  );
};

export default PortalScene;
