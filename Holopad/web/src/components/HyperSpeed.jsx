import React, { useEffect } from "react";
export default function HyperSpeed({ effectOptions = {}, style }) {
  useEffect(() => {}, []);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 30%)', pointerEvents: 'none', ...style }} />
  );
}
