import React from "react";
export default function Waves({ lineColor = '#fff', backgroundColor = 'transparent', style }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: backgroundColor, borderTop: `1px solid ${lineColor}22`, pointerEvents: 'none', ...style }} />
  );
}
