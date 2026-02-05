import React from "react";
export default function LiquidEther({ colors = ['#0b1020','#3b82f6','#06b6d4'], speed = 0.2, intensity = 0.25, style }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 120% at 50% 50%, ${colors[1]}22, ${colors[0]} 70%)`, filter: 'blur(10px)', ...style }} />
  );
}
