import { useState, useEffect } from 'react';
import { Search, User, ShoppingCart, Menu, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DebugPanel from './DebugPanel';
import CartSidebar from './CartSidebar';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '@/services/api';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'left' | 'center' | 'right'>('center');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [megaMenuProducts, setMegaMenuProducts] = useState<Record<string, any[]>>({});
  const [loadingMegaMenu, setLoadingMegaMenu] = useState<Record<string, boolean>>({});
  
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

  const mainNavItems = ['FLIGHT SIM', 'SIM RACING', 'RACING & FLIGHT SEATS', 'MONITOR STANDS', 'ACCESSORIES', 'REFURBISHED', 'SERVICES'];

  // Fetch category counts on mount
  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const response = await productsAPI.getCategories();
        const counts: Record<string, number> = {};
        response.data.forEach(cat => {
          counts[cat.id] = cat.count;
        });
        setCategoryCounts(counts);
      } catch (error) {
        console.error('Failed to fetch category counts:', error);
      }
    };
    fetchCategoryCounts();
  }, []);

  // Listen for product changes to invalidate cache
  useEffect(() => {
    const handleProductChange = () => {
      // Clear cached mega menu products
      setMegaMenuProducts({});
      setLoadingMegaMenu({});
      
      // Refetch category counts
      const fetchCategoryCounts = async () => {
        try {
          const response = await productsAPI.getCategories();
          const counts: Record<string, number> = {};
          response.data.forEach(cat => {
            counts[cat.id] = cat.count;
          });
          setCategoryCounts(counts);
        } catch (error) {
          console.error('Failed to fetch category counts:', error);
        }
      };
      fetchCategoryCounts();
    };

    // Listen for custom product change events
    window.addEventListener('productChanged', handleProductChange);
    
    return () => {
      window.removeEventListener('productChanged', handleProductChange);
    };
  }, []);

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

  // Get product count for a category
  const getCategoryCount = (categoryKey: string): number => {
    const categoryMap: Record<string, string> = {
      'FLIGHT SIM': 'flight-sim',
      'SIM RACING': 'sim-racing',
      'RACING & FLIGHT SEATS': 'cockpits',
      'MONITOR STANDS': 'monitor-stands',
      'ACCESSORIES': 'accessories'
    };
    return categoryCounts[categoryMap[categoryKey]] || 0;
  };

  // Fetch featured products for mega menu
  const fetchMegaMenuProducts = async (categoryKey: string) => {
    const categoryMap: Record<string, string> = {
      'FLIGHT SIM': 'flight-sim',
      'SIM RACING': 'sim-racing',
      'RACING & FLIGHT SEATS': 'cockpits',
      'MONITOR STANDS': 'monitor-stands',
      'ACCESSORIES': 'accessories'
    };

    const categorySlug = categoryMap[categoryKey];
    if (!categorySlug || megaMenuProducts[categoryKey] || loadingMegaMenu[categoryKey]) {
      return; // Already loaded or loading
    }

    try {
      setLoadingMegaMenu(prev => ({ ...prev, [categoryKey]: true }));
      const response = await productsAPI.getFeaturedProductsByCategory(categorySlug, 6);
      setMegaMenuProducts(prev => ({ ...prev, [categoryKey]: response.data }));
    } catch (error) {
      console.error(`Failed to fetch products for ${categoryKey}:`, error);
      setMegaMenuProducts(prev => ({ ...prev, [categoryKey]: [] }));
    } finally {
      setLoadingMegaMenu(prev => ({ ...prev, [categoryKey]: false }));
    }
  };

  // Get product image URL
  const getProductImage = (product: any) => {
    try {
      if (Array.isArray(product.images) && product.images.length > 0) {
        // Sort to get primary image first
        const sortedImages = [...product.images].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        const primaryImage = sortedImages[0];
        return primaryImage.image_url || primaryImage.url || null;
      }
      if (typeof product.images === 'string' && product.images) {
        return product.images;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Get product price
  const getProductPrice = (product: any) => {
    try {
      if (product.price && typeof product.price === 'object') {
        if (product.price.min !== undefined && product.price.max !== undefined && product.price.min !== product.price.max) {
          return `$${product.price.min.toFixed(2)} - $${product.price.max.toFixed(2)}`;
        }
        if (product.price.regular) {
          return `$${product.price.regular.toFixed(2)}`;
        }
        if (product.price.min) {
          return `$${product.price.min.toFixed(2)}`;
        }
      }
      
      if (product.price_min !== undefined && product.price_max !== undefined && product.price_min !== product.price_max) {
        return `$${product.price_min.toFixed(2)} - $${product.price_max.toFixed(2)}`;
      }
      if (product.regular_price !== undefined && product.regular_price !== null) {
        return `$${product.regular_price.toFixed(2)}`;
      }
      if (product.sale_price !== undefined && product.sale_price !== null) {
        return `$${product.sale_price.toFixed(2)}`;
      }
      
      return 'Price TBD';
    } catch (error) {
      return 'Price TBD';
    }
  };

  return (
    <header className="sticky top-0 z-50 relative">
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
              <a href="/" className="flex items-center">
                <img 
                  src="/SimFab-logo-red-black-min-crop.svg" 
                  alt="SimFab" 
                  className="h-8 lg:h-10 w-auto"
                />
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 lg:space-x-2 xl:space-x-3 2xl:space-x-4 flex-1 justify-center max-w-3xl">
              {mainNavItems.map((item) => (
                <div
                  key={item}
                  className="relative"
                  onMouseEnter={(e) => {
                    calculateMenuPosition(e);
                    setActiveMegaMenu(item);
                    // Fetch products when hovering over category
                    if (['FLIGHT SIM', 'SIM RACING', 'RACING & FLIGHT SEATS', 'MONITOR STANDS', 'ACCESSORIES'].includes(item)) {
                      fetchMegaMenuProducts(item);
                    }
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
                    className="nav-link flex items-center gap-0.5 text-xs lg:text-xs xl:text-sm whitespace-nowrap px-0.5"
                    onClick={() => {
                      if (item === 'FLIGHT SIM') window.location.href = '/flight-sim';
                      if (item === 'SIM RACING') window.location.href = '/sim-racing';
                      if (item === 'MONITOR STANDS') window.location.href = '/monitor-stands';
                    }}
                  >
                    <span>{item}</span>
                    {getCategoryCount(item) > 0 && (
                      <span className="text-xs text-muted-foreground">({getCategoryCount(item)})</span>
                    )}
                  </button>
                  
                  {/* Mega Menu */}
                  {activeMegaMenu === item && (megaMenuContent[item as keyof typeof megaMenuContent] || megaMenuProducts[item]) && (
                    <div 
                      className={`absolute top-full mt-2 bg-background border border-border rounded-lg shadow-2xl p-8 min-w-[900px] max-w-[1200px] z-50 ${
                        menuPosition === 'left' ? 'left-0' : 
                        menuPosition === 'right' ? 'right-0' : 
                        'left-1/2 transform -translate-x-1/2'
                      }`}
                      onMouseEnter={() => setActiveMegaMenu(item)}
                      onMouseLeave={() => setActiveMegaMenu(null)}
                    >
                      {/* Loading State */}
                      {loadingMegaMenu[item] && (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="ml-2 text-muted-foreground">Loading products...</span>
                        </div>
                      )}

                      {/* Real Products from API */}
                      {!loadingMegaMenu[item] && megaMenuProducts[item] && megaMenuProducts[item].length > 0 && (
                        <div className="grid grid-cols-3 gap-8 mb-8">
                          {megaMenuProducts[item].slice(0, 6).map((product) => (
                            <div key={product.id} className="group cursor-pointer">
                              <div 
                                className="bg-card rounded-lg overflow-hidden hover:bg-card/80 transition-all duration-300 hover:scale-105"
                                onClick={() => window.location.href = `/product/${product.slug}`}
                              >
                                <div className="aspect-square bg-black/20 flex items-center justify-center p-4">
                                  {getProductImage(product) ? (
                                    <img 
                                      src={getProductImage(product)} 
                                      alt={product.name}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <p className="text-muted-foreground text-xs">No image available</p>
                                  )}
                                </div>
                                <div className="p-4 text-center">
                                  <h3 className="text-sm font-medium text-card-foreground mb-2 leading-tight line-clamp-2">
                                    {product.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mb-3">
                                    {getProductPrice(product)}
                                  </p>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="w-full border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                  >
                                    VIEW DETAILS
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No products available message */}
                      {!loadingMegaMenu[item] && (!megaMenuProducts[item] || megaMenuProducts[item].length === 0) && (
                        <div className="py-8 text-center">
                          <p className="text-muted-foreground">No products available in this category yet.</p>
                        </div>
                      )}

                      {/* Category Buttons */}
                      {megaMenuContent[item as keyof typeof megaMenuContent] && megaMenuContent[item as keyof typeof megaMenuContent].categories.length > 0 && (
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
            <div className="flex items-center space-x-1 xl:space-x-2 flex-shrink-0">
              <button className="text-foreground hover:text-primary transition-colors">
                <Search className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button 
                className="text-foreground hover:text-primary transition-colors"
                onClick={handleAccountClick}
                title={isAuthenticated ? 'My Account' : 'Login'}
              >
                <User className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button 
                className="text-foreground hover:text-primary transition-colors relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5" />
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
                <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              
              {/* Admin Button */}
              <Button 
                variant="outline"
                size="sm"
                className="hidden xl:inline-flex border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={() => window.location.href = '/admin'}
                title="Admin Dashboard"
              >
                ADMIN
              </Button>
              
              <Button 
                className="btn-primary hidden lg:inline-flex"
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