import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-24 pb-12">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-24">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2 pr-12">
            <Link to="/home" className="block text-xl font-semibold text-white tracking-tight mb-6">
              Holopad
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
              The spatial operating system for the open web. 
              Designed in San Francisco, built for the world.
            </p>
          </div>

          {/* Links Columns */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-2">Product</h4>
            <Link to="/features" className="text-gray-500 hover:text-white text-sm transition-colors">Features</Link>
            <Link to="/download" className="text-gray-500 hover:text-white text-sm transition-colors">Download</Link>
            <Link to="/requirements" className="text-gray-500 hover:text-white text-sm transition-colors">Specs</Link>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-2">Company</h4>
            <Link to="/about" className="text-gray-500 hover:text-white text-sm transition-colors">About</Link>
            <Link to="/contact" className="text-gray-500 hover:text-white text-sm transition-colors">Contact</Link>
            <Link to="/home" className="text-gray-500 hover:text-white text-sm transition-colors">Careers</Link>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-2">Legal</h4>
            <Link to="#" className="text-gray-500 hover:text-white text-sm transition-colors">Privacy</Link>
            <Link to="#" className="text-gray-500 hover:text-white text-sm transition-colors">Terms</Link>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">Copyright © 2026 Holopad Inc.</p>
          <div className="flex gap-6">
             <span className="text-gray-600 text-xs">United States</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
