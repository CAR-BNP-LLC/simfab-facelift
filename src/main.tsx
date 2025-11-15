import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initFacebookPixel } from './utils/facebookPixel'
import { initGoogleTagManager } from './utils/googleTagManager'
import { HelmetProvider } from 'react-helmet-async'

// Initialize Facebook Pixel
initFacebookPixel();

// Initialize Google Tag Manager
initGoogleTagManager();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
