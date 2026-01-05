import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import SmoothScroll from "./components/SmoothScroll";
import { useSound } from "./utils/SoundManager";
import Landing from "./screens/Landing";
import SecondPage from "./screens/SecondPage";
import Upload from "./screens/Upload";
import Viewer from "./screens/Viewer";
import HolostagePage from "./screens/HolostagePage";
import ArchitecturePage from "./screens/ArchitecturePage";
import TorusKnotPage from "./screens/TorusKnotPage";
import CityTourPage from "./screens/CityTourPage";

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

function UploadWrapper() {
    const navigate = useNavigate();
    // We might need to store state globally or pass via location state
    // For now, let's just navigate to viewer with state
    return (
        <Upload
          onSelect={(img) => {
            navigate("/viewer", { state: { image: img } });
          }}
        />
    )
}

function ViewerWrapper() {
    const location = useLocation();
    const image = location.state?.image;
    
    // Handle case where accessed directly without image
    if (!image) {
        // In a real app, maybe redirect to upload or show default
        // For prototype, we'll let Viewer handle null or redirect
        return <Viewer image={null} />; 
    }

    return <Viewer image={image} />;
}

export default function App() {
  useSound(); // Initialize global audio

  return (
    <SmoothScroll>
      <Routes>
        <Route path="/" element={<LandingWrapper />} />
        <Route path="/second" element={<SecondPage />} />
        <Route path="/upload" element={<UploadWrapper />} />
        <Route path="/viewer" element={<ViewerWrapper />} />
        <Route path="/holostage" element={<HolostagePage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/geometry/torus-knot" element={<TorusKnotPage />} />
        <Route path="/city" element={<CityTourPage />} />
      </Routes>
    </SmoothScroll>
  );
}
