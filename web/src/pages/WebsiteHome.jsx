import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Layers, Cpu, Globe } from 'lucide-react';
import Layout from '../components/website/Layout';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

const MinimalBackground = () => (
  <div className="absolute inset-0 z-0 bg-[#050505]">
    <Canvas camera={{ position: [0, 0, 1] }}>
        <Suspense fallback={null}>
            <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
        </Suspense>
    </Canvas>
    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
  </div>
);

const WebsiteHome = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <MinimalBackground />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-6xl md:text-8xl font-semibold tracking-tighter text-white mb-8">
              Build in Air.
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
              The spatial operating system for the open web. <br className="hidden md:block" />
              Design, visualize, and collaborate in true depth.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
              <Link to="/intro">
                <button className="px-8 py-4 bg-white text-black rounded-full font-medium text-lg hover:bg-gray-200 transition-all transform hover:scale-[1.02] flex items-center gap-2">
                  Launch Web App <Globe size={18} />
                </button>
              </Link>
            </div>
            
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">
                v2.1.0 • WebGL 2.0 • Cloud Native
            </p>
          </motion.div>
        </div>
      </section>

      {/* Video / Demo Section */}
      <section className="py-32 bg-[#050505]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/5 relative group cursor-pointer">
             {/* Placeholder for Cinematic Video */}
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Play className="fill-white text-white ml-1" size={24} />
                </div>
             </div>
             <img 
                src="https://images.unsplash.com/photo-1626379953822-baec19c3accd?q=80&w=2070&auto=format&fit=crop" 
                alt="Holopad Interface" 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-700"
             />
             <div className="absolute bottom-8 left-8">
                <p className="text-white font-medium">Introducing Holopad 1.0</p>
                <p className="text-gray-500 text-sm">Watch the film (2:14)</p>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Apple Style */}
      <section className="py-32 bg-[#050505] border-t border-white/5">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              title="Spatial Design"
              description="Manipulate 3D objects with natural hand gestures. No controllers required."
              image="https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=2000&auto=format&fit=crop"
            />
            <FeatureCard 
              title="AI Native"
              description="Meg is deeply integrated into the OS. Just ask to build, modify, or deploy."
              image="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2000&auto=format&fit=crop"
            />
            <FeatureCard 
              title="Cloud Sync"
              description="Start on your phone, finish on your desktop. Your workspace is everywhere."
              image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000&auto=format&fit=crop"
            />
          </div>
        </div>
      </section>

      {/* Founder Story Snippet */}
      <section className="py-32 bg-[#050505] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-2xl md:text-4xl font-medium text-white leading-tight mb-8">
                "We believe the screen is a limitation. <br />
                Holopad is our attempt to break through the glass."
            </p>
            <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-full overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2000&auto=format&fit=crop" alt="Founder" />
                </div>
                <div className="text-left">
                    <p className="text-white text-sm font-medium">Alex Chen</p>
                    <p className="text-gray-500 text-xs">Founder & CEO</p>
                </div>
            </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-32 bg-[#050505] border-t border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
           <h2 className="text-5xl md:text-7xl font-semibold tracking-tighter text-white mb-8">
             Ready to dive in?
           </h2>
           <Link to="/intro">
             <button className="px-10 py-5 bg-white text-black rounded-full font-medium text-xl hover:bg-gray-200 transition-all transform hover:scale-[1.02]">
               Launch Holopad
             </button>
           </Link>
        </div>
      </section>

    </Layout>
  );
};

const FeatureCard = ({ title, description, image }) => (
  <div className="group relative aspect-[4/5] rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/5">
    <img 
        src={image} 
        alt={title} 
        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" 
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
    <div className="absolute bottom-0 left-0 p-8">
        <h3 className="text-2xl font-medium text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

export default WebsiteHome;
