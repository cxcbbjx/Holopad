import { useEffect, useState } from "react";

export default function FadeIn({ delay = 0, children }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
}, [delay]);

  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0)" : "translateY(12px)",
      transition: "all 1.2s ease"
    }}>
      {children}
    </div>
  );
}
