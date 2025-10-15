import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Youtube, Star } from 'lucide-react';

const Footer = () => {
  const quickLinks = [
    'SERVICES', 'ASSEMBLY MANUALS', 'COMPATIBLE BRANDS', 'GALLERY', 
    'BLOG', 'BUNDLES'
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
      logo: (
        <svg viewBox="0 0 100 30" className="w-full h-5">
          <rect width="100" height="30" fill="#1a1a1a"/>
          <text x="50" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">AMERICAN EXPRESS</text>
        </svg>
      )
    },
    {
      name: 'Mastercard',
      logo: (
        <svg viewBox="0 0 100 30" className="w-full h-5">
          <rect width="100" height="30" fill="#1a1a1a"/>
          <circle cx="30" cy="15" r="12" fill="#EB001B"/>
          <circle cx="70" cy="15" r="12" fill="#F79E1B"/>
          <path d="M40 15 A12 12 0 0 1 60 15 A12 12 0 0 1 40 15" fill="#FF5F00"/>
        </svg>
      )
    },
    {
      name: 'Visa',
      logo: (
        <svg viewBox="20 5 60 25" className="w-full h-5">
          <rect width="100" height="30" fill="#1a1a1a"/>
          <text x="50" y="20" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">VISA</text>
        </svg>
      )
    },
    {
      name: 'PayPal',
      logo: (
        <svg viewBox="20 8 60 18" className="w-full h-5">
          <rect width="100" height="30" fill="#1a1a1a"/>
          <text x="50" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">PayPal</text>
        </svg>
      )
    }
  ];

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
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
            <p className="text-foreground/70 leading-relaxed mb-6">
              Modular sim racing and flight cockpit design. Experience the SimFab difference – where innovation, quality, and passion for sim racing and flight simulation come together to create a truly unique and immersive experience.
            </p>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-card-foreground mb-2">ABOUT US</h4>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-card-foreground mb-2">Contact Info</h4>
              <p className="text-foreground/70 text-sm mb-1">Email: info@simfab.com</p>
              <p className="text-foreground/70 text-sm">Toll free for USA and Canada:</p>
              <p className="text-foreground/70 text-sm">1-888-299-2746</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-card-foreground mb-4">
              Quick links
            </h4>
            <ul className="space-y-2 mb-6">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-foreground/70 hover:text-primary transition-colors text-sm">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
            
            <ul className="space-y-1">
              {eventLinks.map((event, index) => (
                <li key={index}>
                  <a href="#" className="text-foreground/70 hover:text-primary transition-colors text-sm">
                    {event}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="text-lg font-semibold text-card-foreground mb-4">
              Useful Links
            </h4>
            <ul className="space-y-2 mb-6">
              {usefulLinks.map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-foreground/70 hover:text-primary transition-colors text-sm">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-card-foreground mb-3">PAYMENT METHODS</h4>
              <div className="flex space-x-3">
                {paymentMethods.map((method, index) => (
                  <div 
                    key={index}
                    className="w-16 h-10 bg-card rounded flex items-center justify-center px-2"
                  >
                    {method.logo}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Get Social */}
          <div>
            <h4 className="text-lg font-semibold text-card-foreground mb-4">
              Get Social
            </h4>
            <div className="flex space-x-4 mb-6">
              <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-foreground/60 hover:text-primary transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            
            {/* Trustpilot Review Button */}
            <div className="bg-white border-2 border-green-500 rounded-lg p-3 mb-6 text-center">
              <p className="text-black text-sm mb-1">Review us on</p>
              <div className="flex items-center justify-center">
                <Star className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500 font-semibold text-sm">Trustpilot</span>
              </div>
            </div>
            
            {/* Newsletter Signup */}
            <div>
              <h4 className="text-sm font-semibold text-card-foreground mb-3">
                Sign up to SimFab Newsletter
              </h4>
              <div className="mb-2">
                <label className="text-xs text-foreground/70 mb-1 block">Email Address *</label>
                <Input 
                  type="email" 
                  placeholder=""
                  className="bg-card border-border text-card-foreground mb-2"
                />
                <p className="text-xs text-foreground/60">* indicates required</p>
              </div>
              <Button className="btn-primary w-full">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-8 mt-12">
          <div className="text-center">
            <p className="text-foreground/60 text-sm">
              HomeRacer, OpenWheeler and SimFab are registered trademarks owned by Home Racer LLC | © 2025 Home Racer LLC | Do not use any of our brands without written approval.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;