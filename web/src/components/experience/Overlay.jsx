import React, { useState, useEffect, useRef } from 'react';

// --- Reusable Scramble Text Component ---
const ScrambleText = ({ text, className }) => {
  const [display, setDisplay] = useState(text);
  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~';
  const intervalRef = useRef(null);

  const scramble = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((letter, index) => {
            if (index < iteration) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        clearInterval(intervalRef.current);
      }

      iteration += 1 / 3;
    }, 30);
  };

  useEffect(() => {
    scramble();
    return () => clearInterval(intervalRef.current);
  }, [text]);

  return (
    <span 
      className={className} 
      onMouseEnter={scramble}
      style={{ cursor: 'default' }}
    >
      {display}
    </span>
  );
};

const Overlay = () => {
  return (
    <>
      {/* Page 1: Entry */}
      <Section opacity={1}>
        <h1 className="text-[12vw] font-bold text-white tracking-tighter leading-none mix-blend-difference">
          <ScrambleText text="HOLOPAD" />
        </h1>
        <p className="text-xl text-gray-400 mt-4 tracking-[0.5em] uppercase font-light">
          <ScrambleText text="Spatial Computing OS" />
        </p>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
           <div className="w-[1px] h-12 bg-white/50"></div>
           <span className="text-xs uppercase tracking-widest text-white">Scroll to Enter</span>
        </div>
      </Section>

      {/* Page 2: Build */}
      <Section right>
        <h2 className="text-6xl md:text-8xl font-medium text-white tracking-tighter mb-6">
          <ScrambleText text="Build in" /> <br/> 
          <span className="text-cyan-400"><ScrambleText text="Thin Air." /></span>
        </h2>
        <p className="text-lg text-gray-400 max-w-md font-light leading-relaxed">
          Break free from the screen. Design, manipulate, and organize your digital life in true 3D space.
          No glasses required.
        </p>
      </Section>

      {/* Page 3: Memories */}
      <Section>
        <h2 className="text-6xl md:text-8xl font-medium text-white tracking-tighter mb-6">
          <ScrambleText text="Living" /> <br/> 
          <span className="text-purple-400"><ScrambleText text="Memory." /></span>
        </h2>
        <p className="text-lg text-gray-400 max-w-md font-light leading-relaxed">
          Your photos and moments aren't flat pixels. They are volumetric windows into the past.
          Walk through your gallery.
        </p>
      </Section>

      {/* Page 4: AI */}
      <Section right>
        <h2 className="text-6xl md:text-8xl font-medium text-white tracking-tighter mb-6">
          <ScrambleText text="Meet Meg." />
        </h2>
        <p className="text-lg text-gray-400 max-w-md font-light leading-relaxed">
          Not a chatbot. A presence. <br/>
          She organizes your chaos and builds alongside you.
        </p>
      </Section>

      {/* Page 5: Portal */}
      <Section>
        <h2 className="text-6xl md:text-8xl font-medium text-white tracking-tighter mb-12">
          <ScrambleText text="Step Inside." />
        </h2>
        {/* Interactive buttons will be in the 3D scene (PortalScene), but we can have fallback/extra here */}
      </Section>
    </>
  );
};

const Section = ({ children, right, opacity = 1 }) => {
  return (
    <section 
      className={`h-screen w-full flex flex-col justify-center p-10 md:p-24 ${
        right ? 'items-end text-right' : 'items-start text-left'
      }`}
      style={{ opacity }}
    >
      <div className="relative z-10 pointer-events-none">
        {/* We need pointer-events-auto for children interaction */}
        <div className="pointer-events-auto">
            {children}
        </div>
      </div>
    </section>
  );
};

export default Overlay;
