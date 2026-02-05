import React from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/website/Layout';
import { Hand, Brain, Box, Cloud, Zap, Shield } from 'lucide-react';

const Features = () => {
  return (
    <Layout>
      <div className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-24"
          >
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-white mb-6">
              Beyond the Screen.
            </h1>
            <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
              A comprehensive suite of tools designed for the next generation of spatial computing.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureDetail 
              icon={Hand}
              title="Natural Input"
              desc="Forget controllers. Use pinch, grab, and swipe gestures to interact with holograms naturally."
            />
            <FeatureDetail 
              icon={Brain}
              title="Meg AI Core"
              desc="An assistant that understands context. Meg helps you build, organize, and optimize your spatial workspace."
            />
            <FeatureDetail 
              icon={Box}
              title="Volumetric Rendering"
              desc="Our custom HologramEngine renders millions of voxels in real-time directly in the browser."
            />
            <FeatureDetail 
              icon={Cloud}
              title="Spatial Cloud"
              desc="Your room persists in the cloud. Leave an object on your desk, find it there when you return."
            />
            <FeatureDetail 
              icon={Zap}
              title="Zero Latency"
              desc="Built on WebGPU and WebAssembly for native-like performance on standard web stacks."
            />
            <FeatureDetail 
              icon={Shield}
              title="Privacy First"
              desc="Your physical space is mapped locally. Only the holograms you choose to share leave your device."
            />
          </div>

        </div>
      </div>
    </Layout>
  );
};

const FeatureDetail = ({ icon: Icon, title, desc }) => (
  <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-colors">
    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-white">
      <Icon size={24} strokeWidth={1.5} />
    </div>
    <h3 className="text-xl font-medium text-white mb-3">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed font-light">
      {desc}
    </p>
  </div>
);

export default Features;
