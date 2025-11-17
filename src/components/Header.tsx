import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Search, User, ShoppingCart, Heart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CartSidebar from './CartSidebar';
import { RegionToggle } from './RegionToggle';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRegionSettings } from '@/contexts/RegionSettingsContext';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '@/services/api';
import ProductSearchDialog from '@/components/ProductSearchDialog';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [megaMenuProducts, setMegaMenuProducts] = useState<Record<string, any[]>>({});
  const [loadingMegaMenu, setLoadingMegaMenu] = useState<Record<string, boolean>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [megaMenuPosition, setMegaMenuPosition] = useState<{ left: number; width?: number; maxHeight?: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const closeMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use cart from context
  const { cart, itemCount } = useCart();
  
  // Use wishlist from context
  const { wishlistCount } = useWishlist();
  
  // Use auth from context
  const { isAuthenticated, user, hasAnyAuthority } = useAuth();
  const { contactInfo, loading: settingsLoading } = useRegionSettings();
  const navigate = useNavigate();
  
  // Check if user is admin or staff (has any admin/staff authority)
  // This is safer than checking roles as it uses the authority system
  const isNotCustomer = isAuthenticated && (
    hasAnyAuthority('dashboard:view', 'orders:manage', 'products:manage', 'users:manage') ||
    user?.roles?.some(role => role.name?.toLowerCase() !== 'customer') ||
    (user?.authorities && user.authorities.length > 0)
  );
  
  // Handle account button click
  const handleAccountClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  const handleSearchOpen = () => {
    setIsSearchOpen(true);
  };

  const handleMobileSearch = () => {
    const trimmedQuery = mobileSearchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    setIsMenuOpen(false);
    setMobileSearchQuery('');
    navigate(`/shop?search=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleMobileSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleMobileSearch();
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

  const mainNavItems = ['FLIGHT SIM', 'SIM RACING', 'RACING & FLIGHT SEATS', 'MONITOR STANDS', 'ACCESSORIES', 'B-STOCK', 'BUNDLES', 'SERVICES'];


  // Listen for product changes to invalidate cache
  useEffect(() => {
    const handleProductChange = () => {
      // Clear cached mega menu products
      setMegaMenuProducts({});
      setLoadingMegaMenu({});
    };

    // Listen for custom product change events
    window.addEventListener('productChanged', handleProductChange);
    
    return () => {
      window.removeEventListener('productChanged', handleProductChange);
    };
  }, []);

  // Calculate mega menu position function
  const calculateMegaMenuPosition = (menuItemKey: string) => {
    if (!navRef.current) {
      return null;
    }

    const navRect = navRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Get first and last menu items
    const firstItem = menuItemRefs.current[mainNavItems[0]]; // FLIGHT SIM
    const lastItem = menuItemRefs.current[mainNavItems[mainNavItems.length - 1]]; // SERVICES
    
    if (!firstItem || !lastItem) {
      return null;
    }

    const firstItemRect = firstItem.getBoundingClientRect();
    const lastItemRect = lastItem.getBoundingClientRect();
    
    // Calculate left position (align with first item's left edge)
    const leftPosition = firstItemRect.left;
    
    // Calculate width (from first item's left to last item's right)
    const megaMenuWidth = lastItemRect.right - firstItemRect.left;

    // Convert to relative position within nav container
    const relativeLeft = leftPosition - navRect.left;

    // Calculate max height to prevent overflow on shorter screens
    // Leave space for header + padding + margin to ensure menu doesn't go off screen
    const spaceFromTop = navRect.bottom;
    const spaceFromBottom = 32; // Bottom padding/margin
    const calculatedMaxHeight = viewportHeight - spaceFromTop - spaceFromBottom;
    const maxHeight = Math.max(400, calculatedMaxHeight);

    return { left: relativeLeft, width: megaMenuWidth, maxHeight };
  };

  // Calculate mega menu position based on active menu item
  useEffect(() => {
    if (!activeMegaMenu || !navRef.current) {
      setMegaMenuPosition(null);
      return;
    }

    // Calculate position immediately using requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const position = calculateMegaMenuPosition(activeMegaMenu);
      if (position) {
        setMegaMenuPosition(position);
      }
    });

    // Recalculate on window resize (handles both width and height changes)
    const handleResize = () => {
      const position = calculateMegaMenuPosition(activeMegaMenu);
      if (position) {
        setMegaMenuPosition(position);
      }
    };

    window.addEventListener('resize', handleResize);
    // Also recalculate on scroll in case header position changes
    window.addEventListener('scroll', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [activeMegaMenu]);

  // Helper function to clear close menu timeout
  const clearCloseTimeout = () => {
    if (closeMenuTimeoutRef.current) {
      clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }
  };

  // Helper function to schedule menu close with delay
  const scheduleMenuClose = (delay: number = 200) => {
    clearCloseTimeout();
    closeMenuTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
      closeMenuTimeoutRef.current = null;
    }, delay);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      // Save the current overflow value
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMenuOpen]);

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
      const currency = product.region === 'eu' ? '€' : '$';
      if (product.price && typeof product.price === 'object') {
        if (product.price.min !== undefined && product.price.max !== undefined && product.price.min !== product.price.max) {
          return `${currency}${product.price.min.toFixed(2)} - ${currency}${product.price.max.toFixed(2)}`;
        }
        if (product.price.regular) {
          return `${currency}${product.price.regular.toFixed(2)}`;
        }
        if (product.price.min) {
          return `${currency}${product.price.min.toFixed(2)}`;
        }
      }
      
      if (product.price_min !== undefined && product.price_max !== undefined && product.price_min !== product.price_max) {
        return `${currency}${product.price_min.toFixed(2)} - ${currency}${product.price_max.toFixed(2)}`;
      }
      if (product.regular_price !== undefined && product.regular_price !== null) {
        return `${currency}${product.regular_price.toFixed(2)}`;
      }
      if (product.sale_price !== undefined && product.sale_price !== null) {
        return `${currency}${product.sale_price.toFixed(2)}`;
      }
      
      return 'Price TBD';
    } catch (error) {
      return 'Price TBD';
    }
  };

  return (
    <header className="sticky top-0 z-50 relative">
      {/* Utility Bar */}
      <div className="bg-secondary text-foreground text-sm py-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          {/* Contact Info */}
          <span className="text-center flex-1">
            {contactInfo?.phone_display ? (
              <>
                {contactInfo.phone_display.split(':')[0]}:{' '}
                <a href={`tel:${contactInfo.phone}`} className="text-primary hover:underline">
                  {contactInfo.phone_display.split(':').slice(1).join(':').trim() || contactInfo.phone}
                </a>
                {' | '}
              </>
            ) : (
              <>
                Toll free for USA & Canada:{' '}
                <a href="tel:1-888-299-2746" className="text-primary hover:underline">
                  1-888-299-2746
                </a>
                {' | '}
              </>
            )}
            <a href="/international-shipping" className="text-primary hover:underline">
              We ship worldwide
            </a>
          </span>
          
          {/* Action Buttons - Desktop only */}
          <div className="hidden lg:flex items-center space-x-3 md:space-x-4 ml-auto">
            <button 
              className="text-foreground hover:text-primary transition-colors"
              title="Search"
              type="button"
              onClick={handleSearchOpen}
              aria-label="Search products"
            >
              <Search className="w-5 h-5" />
            </button>
            <button 
              className="text-foreground hover:text-primary transition-colors"
              onClick={handleAccountClick}
              title={isAuthenticated ? 'My Account' : 'Login'}
            >
              <User className="w-5 h-5" />
            </button>
            {isAuthenticated && (
              <button 
                className="text-foreground hover:text-primary transition-colors relative"
                onClick={() => navigate('/wishlist')}
                title="My Wishlist"
              >
                <div className="relative">
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {wishlistCount > 99 ? '99' : wishlistCount}
                    </span>
                  )}
                </div>
              </button>
            )}
            <button 
              className="text-foreground hover:text-primary transition-colors relative"
              onClick={() => setIsCartOpen(true)}
              title="Shopping Cart"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount > 99 ? '99' : itemCount}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
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
            <nav ref={navRef} className="hidden lg:flex items-center space-x-1 lg:space-x-2 xl:space-x-3 2xl:space-x-4 flex-1 justify-center max-w-3xl relative">
              {mainNavItems.map((item) => (
                <div
                  key={item}
                  ref={(el) => {
                    menuItemRefs.current[item] = el;
                  }}
                  onMouseEnter={() => {
                    // Clear any pending close timeout
                    clearCloseTimeout();
                    // Open the menu
                    setActiveMegaMenu(item);
                    // Calculate position immediately
                    requestAnimationFrame(() => {
                      const position = calculateMegaMenuPosition(item);
                      if (position) {
                        setMegaMenuPosition(position);
                      }
                    });
                    // Fetch products when hovering over category
                    if (['FLIGHT SIM', 'SIM RACING', 'RACING & FLIGHT SEATS', 'MONITOR STANDS', 'ACCESSORIES'].includes(item)) {
                      fetchMegaMenuProducts(item);
                    }
                  }}
                  onMouseLeave={() => {
                    // Schedule menu close with delay (allows time to move to menu)
                    scheduleMenuClose(200);
                  }}
                >
                  <button 
                    className="nav-link flex items-center gap-0.5 text-sm lg:text-sm xl:text-base whitespace-nowrap px-0.5"
                    onClick={() => {
                      if (item === 'FLIGHT SIM') window.location.href = '/flight-sim';
                      if (item === 'SIM RACING') window.location.href = '/sim-racing';
                      if (item === 'MONITOR STANDS') window.location.href = '/monitor-stands';
                      if (item === 'RACING & FLIGHT SEATS') window.location.href = '/racing-flight-seats';
                      if (item === 'ACCESSORIES') window.location.href = '/accessories';
                      if (item === 'B-STOCK') window.location.href = '/b-stock';
                      if (item === 'BUNDLES') window.location.href = '/shop?category=bundles';
                      if (item === 'SERVICES') window.location.href = '/services';
                    }}
                  >
                    <span>{item}</span>
                  </button>
                </div>
              ))}
              
              {/* Mega Menu - Positioned relative to the active menu item */}
              {activeMegaMenu && (megaMenuContent[activeMegaMenu as keyof typeof megaMenuContent] || megaMenuProducts[activeMegaMenu]) && (
                <>
                  {/* Invisible bridge to prevent gap issues */}
                  {megaMenuPosition && (
                    <div 
                      className="hidden lg:block absolute top-full h-2 z-40"
                      onMouseEnter={() => {
                        clearCloseTimeout();
                        setActiveMegaMenu(activeMegaMenu);
                      }}
                      onMouseLeave={() => {
                        scheduleMenuClose(200);
                      }}
                      style={{ 
                        pointerEvents: 'auto',
                        left: `${megaMenuPosition.left}px`,
                        width: megaMenuPosition.width ? `${megaMenuPosition.width}px` : 'min(90vw, 1000px)',
                        minWidth: '300px',
                        marginTop: '0.5rem'
                      }}
                    />
                  )}
                  <div 
                    data-mega-menu
                    className="hidden lg:block absolute top-full bg-background border border-border rounded-lg shadow-2xl p-4 sm:p-6 lg:p-6 xl:p-8 z-50"
                    onMouseEnter={() => {
                      clearCloseTimeout();
                      setActiveMegaMenu(activeMegaMenu);
                    }}
                    onMouseLeave={() => {
                      scheduleMenuClose(200);
                    }}
                    style={{ 
                      left: megaMenuPosition ? `${megaMenuPosition.left}px` : '50%',
                      transform: megaMenuPosition ? 'none' : 'translateX(-50%)',
                      width: megaMenuPosition?.width ? `${megaMenuPosition.width}px` : 'min(90vw, 1000px)',
                      maxWidth: megaMenuPosition?.width ? `${megaMenuPosition.width}px` : 'min(90vw, 1000px)',
                      minWidth: '300px',
                      maxHeight: megaMenuPosition?.maxHeight ? `${megaMenuPosition.maxHeight}px` : 'calc(100vh - 200px)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box'
                    }}
                  >
                      {/* Loading State */}
                      {loadingMegaMenu[activeMegaMenu] && (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="ml-2 text-muted-foreground">Loading products...</span>
                        </div>
                      )}

                      {/* Real Products from API */}
                      {!loadingMegaMenu[activeMegaMenu] && megaMenuProducts[activeMegaMenu] && megaMenuProducts[activeMegaMenu].length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4" style={{ minHeight: 0, maxHeight: '100%', overflow: 'hidden' }}>
                          {megaMenuProducts[activeMegaMenu].slice(0, 8).map((product) => (
                            <div key={product.id} className="group cursor-pointer flex flex-col h-full">
                              <div 
                                className="bg-card rounded-lg overflow-hidden hover:bg-card/80 transition-all duration-300 flex flex-col h-full"
                                onClick={() => window.location.href = `/product/${product.slug}`}
                              >
                                <div className="bg-black/20 flex items-center justify-center p-4 flex-shrink-0" style={{ height: '240px', minHeight: '240px' }}>
                                  {getProductImage(product) ? (
                                    <img 
                                      src={getProductImage(product)} 
                                      alt={product.name}
                                      className="w-full h-full object-contain"
                                      style={{ maxHeight: '220px', maxWidth: '100%' }}
                                    />
                                  ) : (
                                    <p className="text-muted-foreground text-xs">No image</p>
                                  )}
                                </div>
                                <div className="p-3 text-center">
                                  <h3 className="text-xs font-medium text-card-foreground leading-tight line-clamp-2">
                                    {product.name}
                                  </h3>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No products available message */}
                      {!loadingMegaMenu[activeMegaMenu] && (!megaMenuProducts[activeMegaMenu] || megaMenuProducts[activeMegaMenu].length === 0) && (
                        <div className="py-8 text-center">
                          <p className="text-muted-foreground">No products available in this category yet.</p>
                        </div>
                      )}

                      {/* Category Buttons */}
                      {megaMenuContent[activeMegaMenu as keyof typeof megaMenuContent] && megaMenuContent[activeMegaMenu as keyof typeof megaMenuContent].categories.length > 0 && (
                        <div className="border-t border-border pt-6">
                          <div className="flex flex-wrap gap-4 justify-center">
                            {megaMenuContent[activeMegaMenu as keyof typeof megaMenuContent].categories.map((category) => (
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
                </>
              )}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
              {/* Action Buttons - Mobile only */}
              <div className="flex items-center space-x-2 mr-4 lg:hidden">
                <button 
                  className="text-foreground hover:text-primary transition-colors"
                  title="Search"
                  type="button"
                  onClick={handleSearchOpen}
                  aria-label="Search products"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button 
                  className="text-foreground hover:text-primary transition-colors"
                  onClick={handleAccountClick}
                  title={isAuthenticated ? 'My Account' : 'Login'}
                >
                  <User className="w-5 h-5" />
                </button>
                {isAuthenticated && (
                  <button 
                    className="text-foreground hover:text-primary transition-colors relative"
                    onClick={() => navigate('/wishlist')}
                    title="My Wishlist"
                  >
                    <div className="relative">
                      <Heart className="w-5 h-5" />
                      {wishlistCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                          {wishlistCount > 99 ? '99' : wishlistCount}
                        </span>
                      )}
                    </div>
                  </button>
                )}
                <button 
                  className="text-foreground hover:text-primary transition-colors relative"
                  onClick={() => setIsCartOpen(true)}
                  title="Shopping Cart"
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {itemCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                        {itemCount > 99 ? '99' : itemCount}
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Region Toggle */}
              <div className="hidden md:block">
                <RegionToggle />
              </div>
              
              {/* Admin Button - Only for non-customer users */}
              {isNotCustomer && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="hidden lg:inline-flex border-destructive text-destructive hover:bg-destructive hover:text-white w-[60px] xl:w-[70px]"
                  onClick={() => window.location.href = '/admin'}
                  title="Admin Dashboard"
                >
                  ADMIN
                </Button>
              )}
              
              {/* SHOP Button */}
              <Button 
                size="sm"
                variant="default"
                className="hidden lg:inline-flex w-[60px] xl:w-[70px]"
                onClick={() => window.location.href = '/shop'}
              >
                SHOP
              </Button>

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black z-50 overflow-y-auto"
            style={{ touchAction: 'pan-y' }}
            onTouchStart={(e) => {
              // Prevent touch events from propagating to body
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Allow scrolling within menu, but prevent body scroll
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <img 
                src="/SimFab-logo-red-black-min-crop.svg" 
                alt="SimFab" 
                className="h-8 w-auto"
              />
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-800">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={mobileSearchQuery}
                  onChange={(event) => setMobileSearchQuery(event.target.value)}
                  onKeyDown={handleMobileSearchKeyDown}
                  className="w-full bg-gray-800 text-white placeholder-gray-400 px-4 py-3 rounded-lg pr-12"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  onClick={handleMobileSearch}
                  aria-label="Search products"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Menu Categories */}
            <div className="px-6 py-6 space-y-6">
              {/* FLIGHT SIM */}
              <div className="border-b border-gray-800 pb-6">
                <div className="flex items-center space-x-4 ml-2">
                  <img 
                    src="/flight-sim-1.webp" 
                    alt="Flight Sim" 
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <button 
                      className="text-white font-bold text-lg uppercase tracking-wider"
                      onClick={() => {
                        navigate('/flight-sim');
                        setIsMenuOpen(false);
                      }}
                    >
                      FLIGHT SIM
                    </button>
                    <div className="mt-2 space-y-1">
                      <button 
                        className="block text-gray-300 hover:text-white transition-colors w-full text-left"
                        onClick={() => {
                          navigate('/shop?category=flight-sim-add-ons');
                          setIsMenuOpen(false);
                        }}
                      >
                        ADD-ONS
                      </button>
                      <button 
                        className="block text-gray-300 hover:text-white transition-colors w-full text-left"
                        onClick={() => {
                          navigate('/accessories');
                          setIsMenuOpen(false);
                        }}
                      >
                        ACCESSORIES
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SIM RACING */}
              <div className="border-b border-gray-800 pb-6">
                <div className="flex items-center space-x-4 ml-2">
                  <img 
                    src="/simfab-racing.webp" 
                    alt="Sim Racing" 
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <button 
                      className="text-white font-bold text-lg uppercase tracking-wider"
                      onClick={() => {
                        navigate('/sim-racing');
                        setIsMenuOpen(false);
                      }}
                    >
                      SIM RACING
                    </button>
                    <div className="mt-2 space-y-1">
                      <button 
                        className="block text-gray-300 hover:text-white transition-colors w-full text-left"
                        onClick={() => {
                          navigate('/shop?category=conversion-kits');
                          setIsMenuOpen(false);
                        }}
                      >
                        CONVERSION KITS
                      </button>
                      <button 
                        className="block text-gray-300 hover:text-white transition-colors w-full text-left"
                        onClick={() => {
                          navigate('/shop?category=individual-parts');
                          setIsMenuOpen(false);
                        }}
                      >
                        INDIVIDUAL PARTS
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RACING & FLIGHT SEATS */}
              <div className="border-b border-gray-800 pb-6">
                <div className="flex items-center space-x-4 ml-2">
                  <img 
                    src="/trainer-station-main-page.webp" 
                    alt="Racing & Flight Seats" 
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <button 
                      className="text-white font-bold text-lg uppercase tracking-wider"
                      onClick={() => {
                        navigate('/racing-flight-seats');
                        setIsMenuOpen(false);
                      }}
                    >
                      RACING & FLIGHT SEATS
                    </button>
                  </div>
                </div>
              </div>

              {/* MONITOR STANDS */}
              <div className="border-b border-gray-800 pb-6">
                <div className="flex items-center space-x-4 ml-2">
                  <img 
                    src="/trimple-monitor.webp" 
                    alt="Monitor Stands" 
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <button 
                      className="text-white font-bold text-lg uppercase tracking-wider"
                      onClick={() => {
                        navigate('/monitor-stands');
                        setIsMenuOpen(false);
                      }}
                    >
                      MONITOR STANDS
                    </button>
                    <div className="mt-2 space-y-1">
                      <button 
                        className="block text-gray-300 hover:text-white transition-colors w-full text-left"
                        onClick={() => {
                          navigate('/shop?category=single-monitor-stand');
                          setIsMenuOpen(false);
                        }}
                      >
                        SINGLE MONITOR STAND
                      </button>
                      <button 
                        className="block text-gray-300 hover:text-white transition-colors w-full text-left"
                        onClick={() => {
                          navigate('/shop?category=triple-monitor-stand');
                          setIsMenuOpen(false);
                        }}
                      >
                        TRIPLE MONITOR STAND
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACCESSORIES */}
              <div className="border-b border-gray-800 pb-6">
                <div className="flex items-center space-x-4 ml-2">
                  <img 
                    src="/simracing-1.webp" 
                    alt="Accessories" 
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <button 
                      className="text-white font-bold text-lg uppercase tracking-wider"
                      onClick={() => {
                        navigate('/accessories');
                        setIsMenuOpen(false);
                      }}
                    >
                      ACCESSORIES
                    </button>
                  </div>
                </div>
              </div>

              {/* B-STOCK */}
              <div className="border-b border-gray-800 pb-6">
                <button 
                  className="text-white font-bold text-lg uppercase tracking-wider"
                  onClick={() => {
                    navigate('/b-stock');
                    setIsMenuOpen(false);
                  }}
                >
                  B-STOCK
                </button>
              </div>

              {/* BUNDLES */}
              <div className="border-b border-gray-800 pb-6">
                <button 
                  className="text-white font-bold text-lg uppercase tracking-wider"
                  onClick={() => {
                    navigate('/shop?category=bundles');
                    setIsMenuOpen(false);
                  }}
                >
                  BUNDLES
                </button>
              </div>

              {/* SHOP */}
              <div className="border-b border-gray-800 pb-6">
                <button 
                  className="text-white font-bold text-lg uppercase tracking-wider w-full text-left"
                  onClick={() => {
                    navigate('/shop');
                    setIsMenuOpen(false);
                  }}
                >
                  SHOP
                </button>
              </div>

              {/* SERVICES */}
              <div className="pb-6">
                <div className="mb-4">
                  <button 
                    className="text-white font-bold text-lg uppercase tracking-wider"
                    onClick={() => {
                      navigate('/services');
                      setIsMenuOpen(false);
                    }}
                  >
                    SERVICES
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                      </svg>
                    </div>
                    {!settingsLoading && contactInfo.phone && (
                      <a 
                        href={`tel:${contactInfo.phone}`} 
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        {contactInfo.phone_display || contactInfo.phone}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <a 
                      href="/international-shipping" 
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      We ship worldwide
                    </a>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                      </svg>
                    </div>
                    {!settingsLoading && contactInfo.email && (
                      <a 
                        href={`mailto:${contactInfo.email}`} 
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        {contactInfo.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* ADMIN - Only show for non-customer users */}
              {isNotCustomer && (
                <div className="border-b border-gray-800 pb-6">
                  <button 
                    className="text-white font-bold text-lg uppercase tracking-wider w-full text-left"
                    onClick={() => {
                      navigate('/admin');
                      setIsMenuOpen(false);
                    }}
                  >
                    ADMIN DASHBOARD
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <CartSidebar 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
      <ProductSearchDialog 
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </header>
  );
};

export default Header;