import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { siteNoticeAPI, SiteNotice } from '@/services/api';

const SiteNotice = () => {
  const [notice, setNotice] = useState<SiteNotice | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const pageLoadIdRef = useRef<string | null>(null);

  // Generate a unique page load ID on component mount (resets on page reload)
  useEffect(() => {
    if (!pageLoadIdRef.current) {
      pageLoadIdRef.current = `pageLoad_${Date.now()}_${Math.random()}`;
    }
  }, []);

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        setLoading(true);
        const response = await siteNoticeAPI.getActiveNotice();
        if (response.success && response.data) {
          const activeNotice = response.data;
          setNotice(activeNotice);
          
          // Only show on home page (/)
          if (location.pathname === '/') {
            checkAndShowNotice(activeNotice);
          } else {
            setIsVisible(false);
          }
        }
      } catch (error) {
        console.error('Error fetching site notice:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [location.pathname]);

  // Re-check visibility when location changes to home page
  useEffect(() => {
    if (notice && location.pathname === '/') {
      checkAndShowNotice(notice);
    } else if (location.pathname !== '/') {
      setIsVisible(false);
    }
  }, [location.pathname, notice]);

  const checkAndShowNotice = (activeNotice: SiteNotice) => {
    if (!pageLoadIdRef.current) return;
    
    // Check if this notice has been dismissed in this page load session
    // The key includes the notice ID and the current page load ID
    // This ensures:
    // - It shows again on page reload (new pageLoadId is generated)
    // - It shows when navigating back to home page naturally (if not dismissed in this page load)
    // - Once dismissed, it won't show again until page reload (new pageLoadId)
    const dismissedKey = `siteNoticeDismissed_${activeNotice.id}_${pageLoadIdRef.current}`;
    const dismissedInThisPageLoad = sessionStorage.getItem(dismissedKey);
    
    if (!dismissedInThisPageLoad) {
      setIsVisible(true);
    }
  };

  const handleDismiss = () => {
    if (notice && pageLoadIdRef.current) {
      // Mark as dismissed for this page load session
      // This will persist until the page is reloaded (new pageLoadId)
      const dismissedKey = `siteNoticeDismissed_${notice.id}_${pageLoadIdRef.current}`;
      sessionStorage.setItem(dismissedKey, 'true');
      setIsVisible(false);
    }
  };

  // Only render on home page
  if (location.pathname !== '/') {
    return null;
  }

  if (loading || !isVisible || !notice) {
    return null;
  }

  return (
    <div className="w-full bg-blue-600 dark:bg-blue-800 text-white border-b border-blue-700 dark:border-blue-900">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm md:text-base leading-relaxed">
              {notice.message}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 text-white hover:bg-blue-700 dark:hover:bg-blue-900 flex-shrink-0"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SiteNotice;

