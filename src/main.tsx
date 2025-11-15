import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initFacebookPixel } from './utils/facebookPixel'
import { HelmetProvider } from 'react-helmet-async'

// Initialize Facebook Pixel
initFacebookPixel();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
