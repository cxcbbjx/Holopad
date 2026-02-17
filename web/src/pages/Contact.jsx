import React from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/website/Layout';
import { Mail, MessageSquare, Twitter, Github } from 'lucide-react';

const Contact = () => {
  return (
    <Layout>
      <div className="min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-[600px] mx-auto text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-white mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-400 font-light">
              Questions about enterprise licensing or partnerships?
            </p>
          </motion.div>

          <form className="text-left space-y-6 mb-16">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <input 
                type="email" 
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
              <textarea 
                rows={5}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                placeholder="Tell us what you're building..."
              />
            </div>
            <button className="w-full bg-white text-black font-medium py-4 rounded-full hover:bg-gray-200 transition-colors">
              Send Message
            </button>
          </form>

          <div className="flex justify-center gap-8">
            <SocialLink icon={Twitter} href="#" />
            <SocialLink icon={Github} href="#" />
            <SocialLink icon={MessageSquare} href="#" />
            <SocialLink icon={Mail} href="mailto:hello@holopad.com" />
          </div>

        </div>
      </div>
    </Layout>
  );
};

const SocialLink = ({ icon: Icon, href }) => (
  <a 
    href={href} 
    className="w-12 h-12 rounded-full bg-[#0a0a0a] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
  >
    <Icon size={20} />
  </a>
);

export default Contact;
