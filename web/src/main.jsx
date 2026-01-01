// web/src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx'; // use .jsx explicitly to avoid resolver issues

createRoot(document.getElementById('root')).render(<App />);
