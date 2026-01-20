import { useEffect, useRef } from "react";

export default function HydraHero({ className, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.transferControlToOffscreen !== "function") return;
    let worker = null;
    try {
      const offscreen = el.transferControlToOffscreen();
      worker = new Worker("/hydrathread.js/activetheory.net/assets/js/hydra/hydra-thread.js");
      const code = `
      function renderHydra(data){
        const canvas = data.canvas;
        const ctx = canvas.getContext('2d');
        let t0 = performance.now();
        const w = data.width, h = data.height;
        function frame(){
          const t = (performance.now() - t0) * 0.001;
          ctx.clearRect(0,0,w,h);
          const g = ctx.createLinearGradient(0,0,w,h);
          g.addColorStop(0, 'rgba(14,165,233,0.15)');
          g.addColorStop(1, 'rgba(147,51,234,0.12)');
          ctx.fillStyle = g;
          ctx.fillRect(0,0,w,h);
          ctx.globalCompositeOperation = 'lighter';
          for (let i=0;i<48;i++){
            const y = (i/48)*h + Math.sin(t*0.8 + i)*4;
            ctx.fillStyle = 'rgba(0,240,255,0.06)';
            ctx.fillRect(0,y,w,1);
          }
          ctx.globalCompositeOperation = 'source-over';
          const cx = w*0.5 + Math.sin(t*0.6)*w*0.08;
          const cy = h*0.5 + Math.cos(t*0.7)*h*0.06;
          for (let r=220; r>0; r-=22){
            const alpha = 0.012 + Math.max(0, Math.sin(t + r*0.01))*0.012;
            ctx.strokeStyle = 'rgba(0,240,255,'+alpha+')';
            ctx.beginPath();
            ctx.arc(cx, cy, r + Math.sin(t*1.4 + r)*4, 0, Math.PI*2);
            ctx.stroke();
          }
          requestAnimationFrame(frame);
        }
        frame();
      }
      `;
      worker.postMessage({ es6: code, name: "renderHydra" });
      const rect = el.getBoundingClientRect();
      worker.postMessage({ fn: "renderHydra", canvas: offscreen, width: Math.floor(rect.width), height: Math.floor(rect.height) }, [offscreen]);
    } catch {}
    return () => {
      if (worker) worker.terminate();
    };
  }, []);
  return <canvas ref={ref} className={className} style={style} />;
}
