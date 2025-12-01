import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Youtube, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRegionSettings } from '@/contexts/RegionSettingsContext';

const Footer = () => {
  const { contactInfo, loading: settingsLoading } = useRegionSettings();
  
  const quickLinks = [
    'SERVICES', 'ASSEMBLY MANUALS', 'COMPATIBLE BRANDS', 'GALLERY', 
    // 'BLOG', 
    'BUNDLES'
  ];

  const eventLinks = [
    'FlightSimExpo 2023', 'CES 2024', 'MARCH RAFFLE', 'SUN \'n FUN 2024', 'FlightSimExpo 2024'
  ];

  const usefulLinks = [
  'SimFab Intellectual Properties', 'Cookie Policy (EU)', 'Terms & Conditions', 
  'Backorders Terms & Conditions', 'International Shipping Information', 'Privacy Policy', 'FAQs'
  ];

  const paymentMethods = [
    {
      name: 'American Express',
      logo: '/payment-methods/amex-logo.webp'
    },
    {
      name: 'Mastercard',
      logo: '/payment-methods/mastercard-150x100.webp'
    },
    {
      name: 'Visa',
      logo: '/payment-methods/visa-150x100.webp'
    },
    {
      name: 'PayPal',
      logo: '/payment-methods/paypal1.webp'
    }
  ];

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
          {/* SimFab */}
          <div>
            <div className="flex items-center mb-4">
              <img 
                src="/SimFab-logo-red-black-min-crop.svg" 
                alt="SimFab" 
                className="h-8 w-auto mr-2"
              />
              <h3 className="text-xl font-bold text-card-foreground">
                SimFab
              </h3>
            </div>
            <p className="text-sm sm:text-base text-foreground/70 leading-relaxed mb-4 sm:mb-6">
              Modular sim racing and flight cockpit design. Experience the SimFab difference – where innovation, quality, and passion for sim racing and flight simulation come together to create a truly unique and immersive experience.
            </p>
            
            <div className="mb-3 sm:mb-4">
              <h4 className="text-xs sm:text-sm font-semibold text-card-foreground mb-2">ABOUT US</h4>
            </div>
            
            <div className="mb-3 sm:mb-4">
              <h4 className="text-xs sm:text-sm font-semibold text-card-foreground mb-2">Contact Info</h4>
              {!settingsLoading && contactInfo.email && (
                <p className="text-foreground/70 text-xs sm:text-sm mb-1">
                  Email: <a href={`mailto:${contactInfo.email}`} className="hover:text-primary transition-colors">{contactInfo.email}</a>
                </p>
              )}
              {!settingsLoading && contactInfo.phone_display && (
                <>
                  <p className="text-foreground/70 text-xs sm:text-sm">{contactInfo.phone_display.split(':')[0]}:</p>
                  <p className="text-foreground/70 text-xs sm:text-sm">
                    <a href={`tel:${contactInfo.phone}`} className="hover:text-primary transition-colors">
                      {contactInfo.phone_display.split(':').slice(1).join(':').trim() || contactInfo.phone}
                    </a>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-card-foreground mb-3 sm:mb-4">
              Quick links
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
              {quickLinks.map((link, index) => {
                const href = link === 'COMPATIBLE BRANDS' ? '/compatible-brands' : 
                           link === 'SERVICES' ? '/services' :
                           link === 'ASSEMBLY MANUALS' ? '/assembly-manuals' :
                           link === 'GALLERY' ? '/gallery' :
                           link === 'BLOG' ? '/blog' : '#';
                return (
                  <li key={index}>
                    <Link to={href} className="text-foreground/70 hover:text-primary transition-colors text-xs sm:text-sm">
                      {link}
                    </Link>
                  </li>
                );
              })}
            </ul>
            
            <ul className="space-y-1">
              {eventLinks.map((event, index) => (
                <li key={index}>
                  <a href="#" className="text-foreground/70 hover:text-primary transition-colors text-xs sm:text-sm">
                    {event}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-card-foreground mb-3 sm:mb-4">
              Useful Links
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
              {usefulLinks.map((link, index) => {
                const href = link === 'Terms & Conditions' ? '/terms-conditions' : 
                           link === 'Backorders Terms & Conditions' ? '/backorders' :
                           link === 'International Shipping Information' ? '/international-shipping' :
                           link === 'SimFab Intellectual Properties' ? '/intellectual-properties' :
                           link === 'Privacy Policy' ? '/privacy-policy' :
                           link === 'Cookie Policy (EU)' ? '/cookie-policy' :
                           link === 'FAQs' ? '/faq' : '#';
                return (
                  <li key={index}>
                    <Link to={href} className="text-foreground/70 hover:text-primary transition-colors text-xs sm:text-sm">
                      {link}
                    </Link>
                  </li>
                );
              })}
            </ul>
            
            <div className="mb-3 sm:mb-4">
              <h4 className="text-xs sm:text-sm font-semibold text-card-foreground mb-2 sm:mb-3">PAYMENT METHODS</h4>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {paymentMethods.map((method, index) => (
                  <div 
                    key={index}
                    className="w-12 h-8 sm:w-16 sm:h-10 bg-card rounded flex items-center justify-center px-1 sm:px-2"
                  >
                    <img 
                      src={method.logo} 
                      alt={method.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Get Social */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-card-foreground mb-3 sm:mb-4">
              Get Social
            </h4>
            <div className="flex space-x-3 sm:space-x-4 mb-4 sm:mb-6">
              <a href="https://www.facebook.com/SimFabOfficial/" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors">
                <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="https://www.instagram.com/simfab_official/" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors">
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="https://www.youtube.com/@SimFabOfficial" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors">
                <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="https://www.tiktok.com/@simfab_official" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-primary transition-colors">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
            </div>
            
            {/* Trustpilot Review Button */}
            <a href="https://www.trustpilot.com/review/simfab.com?utm_medium=trustbox&utm_source=TrustBoxReviewCollector" target="_blank" rel="noopener noreferrer" className="block bg-white border-2 border-green-500 rounded-lg p-2 sm:p-3 mb-4 sm:mb-6 text-center hover:bg-gray-50 transition-colors">
              <p className="text-black text-xs sm:text-sm mb-1">Review us on</p>
              <div className="flex items-center justify-center">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                <span className="text-green-500 font-semibold text-xs sm:text-sm">Trustpilot</span>
              </div>
            </a>
            
            {/* Newsletter Signup */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-card-foreground mb-2 sm:mb-3">
                Sign up to SimFab Newsletter
              </h4>
              <div className="mb-2">
                <label className="text-xs text-foreground/70 mb-1 block">Email Address *</label>
                <Input 
                  type="email" 
                  placeholder=""
                  className="bg-card border-border text-card-foreground mb-2 text-sm"
                />
                <p className="text-xs text-foreground/60">* indicates required</p>
              </div>
              <Button className="btn-primary w-full text-sm">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-6 sm:pt-8 mt-8 sm:mt-12">
          <div className="text-center">
            <p className="text-foreground/60 text-xs sm:text-sm leading-relaxed">
              HomeRacer, OpenWheeler and SimFab are registered trademarks owned by Home Racer LLC | © 2025 Home Racer LLC | Do not use any of our brands without written approval.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;