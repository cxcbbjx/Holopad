import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Loader, Scroll } from '@react-three/drei';
import Experience from '../components/experience/Experience';
import Overlay from '../components/experience/Overlay';
import ScrollGlitch from '../components/experience/effects/ScrollGlitch';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';

const FixedUI = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
       // This won't work with ScrollControls as it doesn't scroll window
       // We need to listen to the scroll container if possible, or just accept it's there for a bit
    };
    // ...
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50">
      <Link to="/classic" className="absolute top-8 right-8 pointer-events-auto text-white/50 hover:text-white transition-colors flex items-center gap-2">
         <span className="text-sm uppercase tracking-widest">Classic Site</span>
         <Menu size={20} />
      </Link>
    </div>
  );
};

const ExperimentalHome = () => {
  return (
    <>
      <div className="h-screen w-full bg-black relative">
        <FixedUI />
        <Canvas
          shadows
          camera={{ position: [0, 0, 5], fov: 40 }}
          dpr={[1, 1.5]} // Optimization for mid-range laptops
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        >
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000000', 5, 20]} />
          
          <Suspense fallback={null}>
            <ScrollControls pages={5} damping={0.2}>
              <Experience />
              
              <Scroll html style={{ width: '100%' }}>
                <Overlay />
              </Scroll>
              
              <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.6} />
                <Noise opacity={0.05} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
                <ScrollGlitch /> 
              </EffectComposer>
            </ScrollControls>
          </Suspense>
        </Canvas>
        <Loader 
          containerStyles={{ background: 'black' }} 
          innerStyles={{ background: '#333', height: '2px' }} 
          barStyles={{ background: 'white', height: '2px' }}
          dataInterpolation={(p) => `Loading Holopad OS ${p.toFixed(0)}%`}
        />
      </div>
    </>
  );
};

export default ExperimentalHome;
