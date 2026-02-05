import React from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/website/Layout';

const Requirements = () => {
  return (
    <Layout>
      <div className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-[1000px] mx-auto">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-24"
          >
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-white mb-6">
              System Specifications
            </h1>
            <p className="text-xl text-gray-400 font-light">
              Hardware requirements for optimal spatial computing performance.
            </p>
          </motion.div>

          <div className="border-t border-white/10">
            <SpecRow 
              category="Processor" 
              min="Quad-core 2.0GHz" 
              rec="8-core 3.0GHz or Apple M1/M2" 
            />
            <SpecRow 
              category="Memory" 
              min="8 GB RAM" 
              rec="16 GB RAM or higher" 
            />
            <SpecRow 
              category="Graphics" 
              min="Integrated Graphics (WebGL 2.0)" 
              rec="Dedicated GPU (NVIDIA RTX / AMD Radeon)" 
            />
            <SpecRow 
              category="Storage" 
              min="500 MB available space" 
              rec="SSD storage recommended" 
            />
            <SpecRow 
              category="Camera" 
              min="Standard 720p Webcam" 
              rec="1080p Webcam or Depth Camera" 
            />
            <SpecRow 
              category="Network" 
              min="Broadband internet connection" 
              rec="Fiber / 5G for real-time collaboration" 
            />
          </div>

          <div className="mt-24 p-8 bg-[#0a0a0a] rounded-3xl border border-white/5">
            <h3 className="text-xl font-medium text-white mb-4">Browser Compatibility</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
              Holopad Web OS runs on all modern browsers with WebGL 2.0 support. 
              We recommend Google Chrome, Microsoft Edge, or Safari for the best experience. 
              Hardware acceleration should be enabled in your browser settings.
            </p>
          </div>

        </div>
      </div>
    </Layout>
  );
};

const SpecRow = ({ category, min, rec }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 py-8 border-b border-white/5 gap-4">
    <div className="col-span-1 text-gray-500 font-medium text-sm uppercase tracking-wider pt-1">
      {category}
    </div>
    <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <span className="block text-xs text-gray-600 mb-1 md:hidden">Minimum</span>
        <p className="text-white text-lg font-light">{min}</p>
      </div>
      <div>
        <span className="block text-xs text-gray-600 mb-1 md:hidden">Recommended</span>
        <p className="text-white text-lg font-light">{rec}</p>
      </div>
    </div>
  </div>
);

export default Requirements;
