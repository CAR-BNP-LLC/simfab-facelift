import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  const quickLinks = [
    'Services', 'Assembly Manuals', 'Compatible Brands', 'Gallery', 
    'Blog', 'Bundles', 'FlightSimExpo 2023', 'FlightSimExpo 2024', 'CES 2024'
  ];

  const usefulLinks = [
    'IP', 'Cookie Policy (EU)', 'Terms & Conditions', 'Backorders Terms',
    'International Shipping', 'Privacy', 'FAQs'
  ];

  const paymentMethods = ['Amex', 'Mastercard', 'Visa', 'PayPal'];

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* About SimFab */}
          <div>
            <h3 className="text-xl font-bold text-card-foreground mb-4">
              About SimFab
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-6">
              Industry leader in modular sim racing and flight cockpit design. 
              We create professional-grade simulation hardware that delivers 
              uncompromising realism and performance.
            </p>
            <div className="flex space-x-4">
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
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-card-foreground mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href="#" 
                    className="text-foreground/70 hover:text-primary transition-colors text-sm"
                  >
                    {link}
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
            <ul className="space-y-2">
              {usefulLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href="#" 
                    className="text-foreground/70 hover:text-primary transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold text-card-foreground mb-4">
              Stay Updated
            </h4>
            <p className="text-foreground/70 text-sm mb-4">
              Get the latest updates on new products and exclusive offers.
            </p>
            <div className="flex gap-2 mb-6">
              <Input 
                type="email" 
                placeholder="Your email address"
                className="bg-card border-border text-card-foreground"
              />
              <Button className="btn-primary">
                Subscribe
              </Button>
            </div>
            
            {/* Trustpilot Badge Placeholder */}
            <div className="bg-card/50 rounded-lg p-3 mb-4 text-center">
              <span className="text-xs text-foreground/60">⭐⭐⭐⭐⭐ Trustpilot</span>
            </div>
          </div>
        </div>

        {/* Payment Methods & Copyright */}
        <div className="border-t border-border pt-8 mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex space-x-4">
              {paymentMethods.map((method, index) => (
                <div 
                  key={index}
                  className="w-12 h-8 bg-card rounded border border-border flex items-center justify-center"
                >
                  <span className="text-xs text-foreground/60">{method}</span>
                </div>
              ))}
            </div>
            
            <p className="text-foreground/60 text-sm text-center">
              © 2024 SimFab. All trademarks are property of their respective owners.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;