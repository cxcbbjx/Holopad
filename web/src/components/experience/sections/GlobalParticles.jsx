import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random';

const GlobalParticles = (props) => {
  const ref = useRef();
  // Generate 2000 random points in a sphere of radius 10
  const sphere = random.inSphere(new Float32Array(3000), { radius: 12 });

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 15;
      ref.current.rotation.y -= delta / 20;
      
      // Gentle pulsation
      const s = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      ref.current.scale.set(s, s, s);
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points key={sphere.length} ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#00f0ff"
          size={0.015}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6}
        />
      </Points>
    </group>
  );
};

export default GlobalParticles;
