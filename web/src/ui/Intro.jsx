import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Intro({ onFinish }) {
  const [phase, setPhase] = useState("start");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 200);
    const t2 = setTimeout(() => setPhase("text"), 1000);
    const t3 = setTimeout(() => setPhase("done"), 2600);
    const t4 = setTimeout(onFinish, 3000);

    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div className={`intro intro-${phase}`}>
      <div className="intro-center">
        <Logo size={180} />

        <div className="brand">
          <div className="name">HOLO✦PAD</div>
          <div className="tagline">Turn images into light.</div>
        </div>
      </div>
    </div>
  );
}
