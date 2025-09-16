import { useState } from 'react';
import { Search, User, ShoppingCart, Menu, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DebugPanel from './DebugPanel';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const megaMenuItems = {
    'FLIGHT SIM': [
      'DCS Flight Sim Modular Cockpit',
      'MSFS Flight Sim Modular Cockpit', 
      'Hybrid Flight Sim Modular Cockpit',
      'Trainer Station Modular Cockpit',
      'Rotorcraft Flight Sim Modular Cockpit',
      'Flight Sim Add-On Modules',
      'Flight Sim Accessories'
    ],
    'SIM RACING': [
      'Gen3 Racing Modular Cockpit',
      'Gen3 Racing Modular Cockpit',
      'Conversion Kits',
      'Individual Parts'
    ],
    'RACING & FLIGHT SEATS': [
      'Racing and Flight Sim Seat',
      'Racing and Flight Sim Seat (removable foam)'
    ],
    'MONITOR STANDS': [
      'Single Monitor Stand',
      'Triple Monitor Stand', 
      'Overhead or Sub-Mount Monitor Bracket Kit'
    ],
    'ACCESSORIES': [
      'Active Articulating Arm with Keyboard & Mouse or Laptop Tray kit',
      'Sim Racing Pedal Plate Foot Rest',
      'Lumbar Pillow for Racing & Flight Sim Cockpits',
      'Neck Pillow for Racing & Flight Sim Cockpits',
      'Sim Racing & Flight Simulation Cockpit Four Point Harness',
      'Rear Surround Speaker Tray Kit',
      'Flight Sim Accessories',
      'Sim Racing Individual Parts',
      'All Accessories'
    ]
  };

  const mainNavItems = ['FLIGHT SIM', 'SIM RACING', 'RACING & FLIGHT SEATS', 'MONITOR STANDS', 'ACCESSORIES', 'REFURBISHED STOCK', 'SERVICES'];

  return (
    <header className="relative">
      {/* Utility Bar */}
      <div className="bg-secondary text-text-muted text-xs py-2 px-4 text-center">
        <span>Toll free for USA & Canada: 1-888-299-2746 | We ship worldwide</span>
      </div>

      {/* Main Header */}
      <div className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-card-foreground">
                SimFab
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {mainNavItems.map((item) => (
                <div
                  key={item}
                  className="relative"
                  onMouseEnter={() => setActiveMegaMenu(item)}
                  onMouseLeave={() => setActiveMegaMenu(null)}
                >
                  <button className="nav-link">
                    {item}
                  </button>
                  
                  {/* Mega Menu */}
                  {activeMegaMenu === item && megaMenuItems[item as keyof typeof megaMenuItems] && (
                    <div className="absolute top-full left-0 bg-card border border-border rounded-lg shadow-lg p-6 min-w-[300px] z-50">
                      <div className="grid gap-2">
                        {megaMenuItems[item as keyof typeof megaMenuItems].map((subItem) => (
                          <a
                            key={subItem}
                            href="#"
                            className="text-card-foreground hover:text-primary transition-colors py-2 text-sm"
                          >
                            {subItem}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              <button className="text-foreground hover:text-primary transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="text-foreground hover:text-primary transition-colors">
                <User className="w-5 h-5" />
              </button>
              <button className="text-foreground hover:text-primary transition-colors relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  0
                </span>
              </button>
              
              {/* Debug Button */}
              <button 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                title="Debug Panel"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <Button className="btn-primary hidden md:inline-flex">
                SHOP
              </Button>

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-card border-t border-border">
            <div className="container mx-auto px-4 py-4">
              <div className="space-y-4">
                {mainNavItems.map((item) => (
                  <div key={item} className="border-b border-border pb-2">
                    <button className="text-card-foreground font-medium uppercase tracking-wider text-sm w-full text-left">
                      {item}
                    </button>
                  </div>
                ))}
                <Button className="btn-primary w-full mt-4">
                  SHOP
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Debug Panel</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDebugPanel(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <DebugPanel />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;