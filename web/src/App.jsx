import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import SmoothScroll from "./components/SmoothScroll";
import { useSound } from "./utils/SoundManager";
import Landing from "./screens/Landing";
import SecondPage from "./screens/SecondPage";
import Upload from "./screens/Upload";
import Viewer from "./screens/Viewer";
import PromoVideo from "./screens/PromoVideo";

import Platform from "./pages/Platform";
import ExperimentalHome from "./pages/ExperimentalHome";
import WebsiteHome from "./pages/WebsiteHome";
import Features from "./pages/Features";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Requirements from "./pages/Requirements";

import HolostagePage from "./screens/HolostagePage";

function LandingWrapper() {

  const navigate = useNavigate();
  // Phases: init -> logo_scan -> text_emerge -> tagline -> interaction
  const [phase, setPhase] = useState("init");

  useEffect(() => {
    setPhase("init");
    
    // Sequence timeline
    // 0s: Start
    // 0.2s: Start logo scan (lasts ~3s)
    const t1 = setTimeout(() => setPhase("logo_scan"), 200);
    
    // 3.5s: Logo finished, Name starts emerging
    const t2 = setTimeout(() => setPhase("text_emerge"), 3500);
    
    // 5.0s: Name settled, Tagline fades in
    const t3 = setTimeout(() => setPhase("tagline"), 5000);

    // 7.5s: Button appears (2.5s after everything else)
    const t4 = setTimeout(() => setPhase("interaction"), 7500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <Landing 
      phase={phase} 
      onStart={() => navigate("/second")} 
    />
  );
}

function ViewerWrapper() {
    const location = useLocation();
    const image = location.state?.image;
    const creative = location.state?.creative;
    
    // Handle case where accessed directly without image
    if (!image && !creative) {
        // In a real app, maybe redirect to upload or show default
        // For prototype, we'll let Viewer handle null or redirect
        return <Viewer image={null} />; 
    }

    return <Viewer image={image} />;
}

export default function App() {
  useSound(); // Initialize global audio

  return (
    <Routes>
      {/* Intro Experience (Default Home) */}
      <Route path="/" element={<LandingWrapper />} />
      <Route path="/home" element={<LandingWrapper />} />
      <Route path="/intro" element={<LandingWrapper />} />

      {/* Main Hub */}
      <Route path="/holostage" element={<HolostagePage />} />
      
      {/* App Routes */}
      <Route path="/second" element={<SecondPage />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/viewer" element={<ViewerWrapper />} />
      <Route path="/promo" element={<PromoVideo />} />

      {/* Legacy/Marketing Routes (Hidden/Secondary) */}
      <Route path="/classic" element={<SmoothScroll><WebsiteHome /></SmoothScroll>} />
      <Route path="/experimental" element={<ExperimentalHome />} />
      <Route path="/features" element={<SmoothScroll><Features /></SmoothScroll>} />
      <Route path="/about" element={<SmoothScroll><About /></SmoothScroll>} />
      <Route path="/contact" element={<SmoothScroll><Contact /></SmoothScroll>} />
      <Route path="/requirements" element={<SmoothScroll><Requirements /></SmoothScroll>} />
      <Route path="/download" element={<SmoothScroll><Platform /></SmoothScroll>} />
      <Route path="/platforms" element={<SmoothScroll><Platform /></SmoothScroll>} />
      <Route path="/platform" element={<SmoothScroll><Platform /></SmoothScroll>} />
    </Routes>
  );
}
