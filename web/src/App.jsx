import { useEffect, useState } from "react";
import Landing from "./screens/Landing";
import SecondPage from "./screens/SecondPage";
import Upload from "./screens/Upload";
import Viewer from "./screens/Viewer";

export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | second | upload | viewer
  // Phases: init -> logo_scan -> text_emerge -> tagline -> interaction
  const [phase, setPhase] = useState("init");
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (screen === "landing") {
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
    }
  }, [screen]);

  return (
    <>
      {screen === "landing" && (
        <Landing 
          phase={phase} 
          onStart={() => setScreen("second")} 
        />
      )}

      {screen === "second" && (
        <SecondPage />
      )}

      {screen === "upload" && (
        <Upload
          onSelect={(img) => {
            setImage(img);
            setScreen("viewer");
          }}
        />
      )}

      {screen === "viewer" && (
        <Viewer image={image} />
      )}
    </>
  );
}
