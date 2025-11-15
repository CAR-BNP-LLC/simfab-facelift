import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';
import { trackPageView as trackFacebookPageView } from '../utils/facebookPixel';
import { trackPageView as trackGTMPageView } from '../utils/googleTagManager';

/**
 * Analytics Tracker Component
 * Tracks page views on route changes
 */
export const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view when route changes
    const startTime = performance.now();
    
    // Wait for page to be fully loaded
    const handleLoad = () => {
      const loadTime = Math.round(performance.now() - startTime);
      // Track to custom analytics backend
      trackPageView(location.pathname, document.title, loadTime);
      // Track Facebook Pixel PageView
      trackFacebookPageView();
      // Track Google Tag Manager PageView
      trackGTMPageView(location.pathname, document.title);
    };

    // If page is already loaded, track immediately
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [location.pathname]);

  return null;
};

