import { useState, useEffect } from 'react';
import { Search, User, ShoppingCart, Menu, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DebugPanel from './DebugPanel';
import CartSidebar from './CartSidebar';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'left' | 'center' | 'right'>('center');
  
  // Use cart from context
  const { cart, itemCount } = useCart();
  
  // Use auth from context
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Handle account button click
  const handleAccountClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  // Function to calculate optimal menu position
  const calculateMenuPosition = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const menuWidth = 1200; // max-w-[1200px] from the menu
    const menuHalfWidth = menuWidth / 2;
    
    // Calculate if menu would extend beyond right edge
    const rightEdge = rect.left + rect.width / 2 + menuHalfWidth;
    const leftEdge = rect.left + rect.width / 2 - menuHalfWidth;
    
    if (rightEdge > viewportWidth - 20) { // 20px margin from edge
      setMenuPosition('right');
    } else if (leftEdge < 20) { // 20px margin from edge
      setMenuPosition('left');
    } else {
      setMenuPosition('center');
    }
  };

  const megaMenuContent = {
    'FLIGHT SIM': {
      products: [
        {
          name: 'DCS Flight Sim Modular Cockpit',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SEE MORE'
        },
        {
          name: 'MSFS Flight Sim Modular Cockpit',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SEE MORE'
        },
        {
          name: 'Hybrid Flight Sim Modular Cockpit',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SEE MORE'
        },
        {
          name: 'Trainer Station Modular Cockpit',
          image: '/src/assets/trainer-station.jpg',
          action: 'SEE MORE'
        },
        {
          name: 'Rotorcraft Flight Sim Modular Cockpit',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SEE MORE'
        }
      ],
      categories: [
        'FLIGHT SIM ADD-ON MODULES',
        'FLIGHT SIM ACCESSORIES'
      ]
    },
    'SIM RACING': {
      products: [
        {
          name: 'Gen3 Racing Modular Cockpit',
          image: '/src/assets/sim-racing-cockpit.jpg',
          action: 'SEE MORE'
        },
        {
          name: 'Gen3 Racing Pro Cockpit',
          image: '/src/assets/sim-racing-cockpit.jpg',
          action: 'SEE MORE'
        }
      ],
      categories: [
        'CONVERSION KITS',
        'INDIVIDUAL PARTS'
      ]
    },
    'RACING & FLIGHT SEATS': {
      products: [
        {
          name: 'Racing and Flight Sim Seat',
          image: '/src/assets/sim-racing-cockpit.jpg',
          action: 'SEE MORE'
        },
        {
          name: 'Racing Seat (removable foam)',
          image: '/src/assets/sim-racing-cockpit.jpg',
          action: 'SEE MORE'
        }
      ],
      categories: []
    },
    'MONITOR STANDS': {
      products: [
        {
          name: 'Single Monitor Stand',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SEE MORE'
        },
        {
          name: 'Triple Monitor Stand',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SEE MORE'
        },
        {
          name: 'Overhead Monitor Bracket Kit',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SEE MORE'
        }
      ],
      categories: []
    },
    'ACCESSORIES': {
      products: [
        {
          name: 'Active Articulating Arm With Keyboard & Mouse Or Laptop Tray Kit',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SHOP NOW'
        },
        {
          name: 'Sim Racing Pedal Plate Foot Rest',
          image: '/src/assets/sim-racing-cockpit.jpg',
          action: 'SHOP NOW'
        },
        {
          name: 'Lumbar Pillow For Racing & Flight Sim Cockpits',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SHOP NOW'
        },
        {
          name: 'Neck Pillow For Racing & Flight Sim Cockpits',
          image: '/src/assets/sim-racing-cockpit.jpg',
          action: 'SHOP NOW'
        },
        {
          name: 'Sim Racing & Flight Simulation Cockpit Four Point Harness',
          image: '/src/assets/sim-racing-cockpit.jpg',
          action: 'SHOP NOW'
        },
        {
          name: 'Rear Surround Speaker Tray Kit',
          image: '/src/assets/flight-sim-cockpit.jpg',
          action: 'SHOP NOW'
        }
      ],
      categories: [
        'FLIGHT SIM ACCESSORIES',
        'SIM RACING INDIVIDUAL PARTS',
        'ALL ACCESSORIES'
      ]
    }
  };

  const mainNavItems = ['FLIGHT SIM', 'SIM RACING', 'RACING & FLIGHT SEATS', 'MONITOR STANDS', 'ACCESSORIES', 'REFURBISHED STOCK', 'SERVICES'];

  // Handle window resize to recalculate menu position
  useEffect(() => {
    const handleResize = () => {
      if (activeMegaMenu) {
        // Reset to center position on resize, will be recalculated on next hover
        setMenuPosition('center');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMegaMenu]);

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
                  onMouseEnter={(e) => {
                    calculateMenuPosition(e);
                    setActiveMegaMenu(item);
                  }}
                  onMouseLeave={(e) => {
                    // Only hide menu if mouse is leaving the entire navigation area
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mouseY = e.clientY;
                    const mouseX = e.clientX;
                    
                    // Check if mouse is still within the navigation item bounds or moving to menu
                    if (mouseY < rect.bottom + 10 && mouseX >= rect.left && mouseX <= rect.right) {
                      return; // Don't hide menu
                    }
                    setActiveMegaMenu(null);
                  }}
                >
                  <button 
                    className="nav-link"
                    onClick={() => {
                      if (item === 'FLIGHT SIM') window.location.href = '/flight-sim';
                      if (item === 'SIM RACING') window.location.href = '/sim-racing';
                      if (item === 'MONITOR STANDS') window.location.href = '/monitor-stands';
                    }}
                  >
                    {item}
                  </button>
                  
                  {/* Mega Menu */}
                  {activeMegaMenu === item && megaMenuContent[item as keyof typeof megaMenuContent] && (
                    <div 
                      className={`absolute top-full mt-2 bg-background border border-border rounded-lg shadow-2xl p-8 min-w-[900px] max-w-[1200px] z-50 ${
                        menuPosition === 'left' ? 'left-0' : 
                        menuPosition === 'right' ? 'right-0' : 
                        'left-1/2 transform -translate-x-1/2'
                      }`}
                      onMouseEnter={() => setActiveMegaMenu(item)}
                      onMouseLeave={() => setActiveMegaMenu(null)}
                    >
                      <div className="grid grid-cols-3 gap-8 mb-8">
                        {megaMenuContent[item as keyof typeof megaMenuContent].products.map((product) => (
                          <div key={product.name} className="group cursor-pointer">
                            <div className="bg-card rounded-lg overflow-hidden hover:bg-card/80 transition-all duration-300 hover:scale-105">
                              <div className="aspect-square bg-black/20 flex items-center justify-center p-4">
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="p-4 text-center">
                                <h3 className="text-sm font-medium text-card-foreground mb-3 leading-tight">
                                  {product.name}
                                </h3>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                >
                                  {product.action}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {megaMenuContent[item as keyof typeof megaMenuContent].categories.length > 0 && (
                        <div className="border-t border-border pt-6">
                          <div className="flex flex-wrap gap-4 justify-center">
                            {megaMenuContent[item as keyof typeof megaMenuContent].categories.map((category) => (
                              <Button
                                key={category}
                                variant="outline"
                                className="border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                              >
                                {category}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
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
              <button 
                className="text-foreground hover:text-primary transition-colors"
                onClick={handleAccountClick}
                title={isAuthenticated ? 'My Account' : 'Login'}
              >
                <User className="w-5 h-5" />
              </button>
              <button 
                className="text-foreground hover:text-primary transition-colors relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
              
              {/* Debug Button */}
              <button 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                title="Debug Panel"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Admin Button */}
              <Button 
                variant="outline"
                size="sm"
                className="hidden md:inline-flex border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={() => window.location.href = '/admin'}
                title="Admin Dashboard"
              >
                ADMIN
              </Button>
              
              <Button 
                className="btn-primary hidden md:inline-flex"
                onClick={() => window.location.href = '/shop'}
              >
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
                    <button 
                      className="text-card-foreground font-medium uppercase tracking-wider text-sm w-full text-left"
                      onClick={() => {
                        if (item === 'FLIGHT SIM') window.location.href = '/flight-sim';
                        if (item === 'SIM RACING') window.location.href = '/sim-racing';
                        if (item === 'MONITOR STANDS') window.location.href = '/monitor-stands';
                      }}
                    >
                      {item}
                    </button>
                  </div>
                ))}
                <Button 
                  className="btn-primary w-full mt-4"
                  onClick={() => window.location.href = '/shop'}
                >
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

      {/* Cart Sidebar */}
      <CartSidebar 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </header>
  );
};

export default Header;