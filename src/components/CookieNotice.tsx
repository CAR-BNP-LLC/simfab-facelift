import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const CookieNotice = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem('cookiesAccepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookiesAccepted', 'false');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-foreground mb-2">
              <strong>We use cookies to enhance your experience</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              This website uses cookies to improve your browsing experience, analyze site traffic, and provide personalized content. 
              By continuing to use this site, you consent to our use of cookies. You can manage your preferences in our 
              <button className="text-primary hover:underline mx-1">
                Cookie Policy
              </button>
              and 
              <button className="text-primary hover:underline mx-1">
                Privacy Policy
              </button>
              .
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={declineCookies}
              className="text-xs px-3 py-1"
            >
              Decline
            </Button>
            <Button 
              size="sm"
              onClick={acceptCookies}
              className="btn-primary text-xs px-4 py-1"
            >
              Accept All
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={declineCookies}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieNotice;