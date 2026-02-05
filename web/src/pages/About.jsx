import React from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/website/Layout';

const About = () => {
  return (
    <Layout>
      <div className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-[800px] mx-auto">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-24 text-center"
          >
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-white mb-8">
              Breaking the Glass.
            </h1>
            <p className="text-xl text-gray-400 font-light leading-relaxed max-w-2xl mx-auto">
              We are building the first operating system designed for the post-screen era.
              Where digital objects inhabit physical space.
            </p>
          </motion.div>

          <div className="space-y-32">
             <TimelineItem 
               year="2024" 
               title="The Inception" 
               content="Holopad started as a research project at MIT Media Lab. The question was simple: Why are we still trapping 3D ideas behind 2D glass? The first prototype was built in a weekend using Three.js and a hacked Kinect."
               image="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop"
             />
             <TimelineItem 
               year="2025" 
               title="The Engine" 
               content="We developed the 'HologramEngine' core, enabling browser-based volumetric rendering with zero latency. This breakthrough allowed us to bring spatial computing to any device with a web browser."
               image="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop"
             />
             <TimelineItem 
               year="2026" 
               title="The Launch" 
               content="Holopad 1.0 is released to the world. A complete spatial OS with AI integration, hand tracking, and cloud synchronization. We are just getting started."
               image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000&auto=format&fit=crop"
             />
          </div>

          <div className="mt-32 pt-24 border-t border-white/5 text-center">
             <h2 className="text-3xl font-medium text-white mb-6">Join the Revolution</h2>
             <p className="text-gray-400 mb-8 max-w-lg mx-auto">
               We are a small team of engineers, designers, and dreamers. 
               If you believe in a spatial future, come build with us.
             </p>
             <a href="mailto:careers@holopad.com" className="inline-block px-8 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors">
               View Open Roles
             </a>
          </div>

        </div>
      </div>
    </Layout>
  );
};

const TimelineItem = ({ year, title, content, image }) => (
  <motion.div 
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8 }}
    className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
  >
    <div className="md:col-span-3">
      <span className="text-5xl font-bold text-white/10">{year}</span>
    </div>
    <div className="md:col-span-9">
       <div className="aspect-video rounded-2xl overflow-hidden bg-[#0a0a0a] mb-8 border border-white/5">
          <img src={image} alt={title} className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity duration-700" />
       </div>
       <h3 className="text-2xl font-medium text-white mb-4">{title}</h3>
       <p className="text-gray-400 font-light leading-relaxed text-lg">
         {content}
       </p>
    </div>
  </motion.div>
);

export default About;
