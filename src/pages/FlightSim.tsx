import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { usePageProducts } from '@/hooks/usePageProducts';
import flightSimImage from '@/assets/flight-sim-cockpit.jpg';
import heroCockpitImage from '@/assets/hero-cockpit.jpg';
import trainerStationImage from '@/assets/trainer-station.jpg';
import { useSEO } from '@/hooks/useSEO';
import { getCanonicalUrl } from '@/utils/seo';
import { BreadcrumbSchema } from '@/components/SEO/BreadcrumbSchema';
import { ItemListSchema } from '@/components/SEO/ItemListSchema';

const ModularCockpitsCarousel = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  const images = [
    'modular-cockpits-1.webp',
    'modular-cockpits-2.webp',
    'modular-cockpits-3.webp',
    'modular-cockpits-4.webp',
    'modular-cockpits-5.webp',
    'modular-cockpits-6.webp',
    'modular-cockpits-7.webp',
    'modular-cockpits-8.webp',
    'modular-cockpits-9.webp',
    'modular-cockpits-10.webp',
    'modular-cockpits-11.webp',
    'modular-cockpits-12.webp',
    'modular-cockpits-13.webp'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative group">
      <div className="overflow-hidden">
        <img 
          src={`/modular-cockpits/${images[currentImage]}`}
          alt={`Modular cockpit ${currentImage + 1}`}
          className={`w-full transition-opacity duration-700 ease-in-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      
      {/* Navigation Arrows - Hidden on mobile */}
      <button
        onClick={prevImage}
        className="hidden sm:block absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[9999] bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/20"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      
      <button
        onClick={nextImage}
        className="hidden sm:block absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[9999] bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/20"
        aria-label="Next image"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      
      {/* Image counter dots - Hidden on mobile */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1 sm:space-x-2 hidden sm:flex">
        {images.slice(0, 5).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors duration-300 ${
              index === currentImage ? 'bg-primary' : 'bg-white/50'
            }`}
          />
        ))}
        {images.length > 5 && (
          <span className="text-white/50 text-xs ml-1">+{images.length - 5}</span>
        )}
      </div>
    </div>
  );
};

const FlightSim = () => {
  // Fetch products from API
  const { products: apiProducts, loading, error } = usePageProducts('/flight-sim', 'base-models');

  // Map API products to component format
  const baseModels = apiProducts.map((pageProduct) => {
    const product = pageProduct.product;
    if (!product) return null;

    const productImage = product.images?.find((img: any) => img.is_primary) || 
                        product.images?.[0] || 
                        null;

    const imageUrl = productImage?.image_url || flightSimImage;

    const currency = product.region === 'eu' ? '€' : '$';
    const price = product.sale_price 
      ? `${currency}${product.sale_price}` 
      : product.regular_price 
        ? `${currency}${product.regular_price}` 
        : product.price_min 
          ? `${currency}${product.price_min}` 
          : `from ${currency}0`;

    return {
      id: product.id,
      name: product.name,
      description: product.short_description || '',
      price,
      image: imageUrl,
      cta: product.status === 'active' ? 'BUY NOW' : 'SEE MORE',
      slug: product.slug,
    };
  }).filter(Boolean);

  const seoElement = useSEO({
    title: 'Flight Simulator Cockpits & Mounting Systems | Complete Modular Solutions | SimFab',
    description: 'Professional flight simulator cockpits and mounting hardware. Complete DCS, MSFS, Rotorcraft, and Trainer Station cockpit systems. Modular design with 13+ add-on modules (MFD panels, HOTAS mounts, rudder pedals). Compatible with Winwing, VKB, Virpil, Honeycomb, Thrustmaster, Saitek, CH Products, RealSim Gears, SimGears, MFG, Komodo, and all major flight sim brands.',
    canonical: getCanonicalUrl('/flight-sim'),
    ogType: 'website'
  });

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Flight Sim', url: '/flight-sim' }
  ];

  // Prepare products for ItemListSchema
  const schemaProducts = baseModels.map(item => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    price: {
      min: 0 // Price parsing would be needed from string format
    },
    images: [] // Would need to get from product data
  }));

  return (
    <div className="min-h-screen bg-background">
      {seoElement}
      <BreadcrumbSchema items={breadcrumbItems} />
      {baseModels.length > 0 && (
        <ItemListSchema name="Flight Simulator Cockpits" items={schemaProducts} />
      )}
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative bg-card pb-12 sm:pb-16 lg:pb-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-6 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-2 order-2 lg:order-1">
                <h1 className="heading-lg sm:heading-xl text-accent-underline mb-4 sm:mb-6">
                  FLIGHT SIM
                </h1>
                <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                  Modular flight simulation cockpits with high levels of fidelity, realism and immersion
                </p>
              </div>
              
              <div className="lg:col-span-4 relative max-w-full overflow-hidden order-1 lg:order-2">
                <img 
                  src="/flight-sim-1.webp"
                  alt="Flight simulator cockpit with labeled components"
                  className="w-full"
                />
                
                {/* Clickable Points - Hidden on mobile for better UX */}
                <div className="absolute inset-0 hidden sm:block">
                  {/* Point 1 - Flight Sim #12 */}
                  <button 
                    className="absolute top-[16%] left-[43%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                    title="Flight Sim #12 Add-On"
                  >
                    <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Flight Sim #12 Add-On</div>
                      <div className="text-xs leading-relaxed">
                        Main Instrument and MFD panel holder. Highly adjustable design allows for repositioning of each MFD/UFC/ICP/HUD according to each aircraft layout. Compatible with WinWing F-18 MIP, Thrustmaster Warthog and SimGears ICP.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Flight Sim #12
                    </div>
                  </button>
                  
                  {/* Point 2 - Keyboard & Mouse or Laptop Tray kit */}
                  <button 
                    className="absolute top-[30%] left-[85%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Keyboard & Mouse or Laptop Tray kit"
                  >
                    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Keyboard & Mouse or Laptop Tray kit</div>
                      <div className="text-xs leading-relaxed">
                        Active Articulating Arm with Keyboard & Mouse or Laptop Tray kit. The tray kit can be mounted on either the left or right side of the seat.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Keyboard & Mouse or Laptop Tray kit
                    </div>
                  </button>
                  
                  {/* Point 3 - Flight Sim #4 */}
                  <button 
                    className="absolute top-[31%] left-[50%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Flight Sim #4 Add-On"
                  >
                    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Flight Sim #4 Add-On</div>
                      <div className="text-xs leading-relaxed">
                        Dedicated rudder pedal plate. Compatible with almost every rudder pedal on the market. All mounting hardware is included.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Flight Sim #4
                    </div>
                  </button>
                  
                  {/* Point 4 - Advanced Modular Side Mount / combat-ready panel */}
                  <button 
                    className="absolute top-[30%] right-[81%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Advanced Modular Side Mount / combat-ready panel"
                  >
                    <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Advanced Modular Side Mount / combat-ready panel</div>
                      <div className="text-xs leading-relaxed">
                        Part of the Advanced Modular Side Mount (AMSM) is the takeoff combat-ready panel. The bracket has full articulation for precise user adjustment. Compatible with popular WinWing panels and VirPil panels.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Advanced Modular Side Mount
                    </div>
                  </button>
                  
                  {/* Point 5 - Flight Sim #2 */}
                  <button 
                    className="absolute bottom-[57%] left-[66%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Flight Sim #2 Add-On"
                  >
                    <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Flight Sim #2 Add-On</div>
                      <div className="text-xs leading-relaxed">
                        HOTAS style side-by-side stick and throttle. Compatible with Thrustmaster Warthog and alike controls such as WinWing, VirPil and VKB Gunfighter.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Flight Sim #2
                    </div>
                  </button>
                  
                  {/* Point 6 - Flight Sim #6 & #7 */}
                  <button 
                    className="absolute bottom-[55%] left-[43%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Flight Sim #6 & #7 Add-Ons"
                  >
                    <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Flight Sim #6 & #7 Add-Ons</div>
                      <div className="text-xs leading-relaxed">
                        Centered stick lower-mount bracket. The bracket is designed to adjust the height positioning of the stick base for proper alignment of the stick grip, whether it is used with grip extension or a default setting. Also suitable for sticks used as helicopter cyclic. Configuration #7 is our unique design grip extension compatible with Thrustmaster Warthog, VirPil and WinWing sticks. Premium quality machined female and male adapters with three lengths of...
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Flight Sim #6 & #7
                    </div>
                  </button>
                  
                  {/* Point 7 - Seat */}
                  <button 
                    className="absolute bottom-[32%] left-[45%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Seat"
                  >
                    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Seat</div>
                      <div className="text-xs leading-relaxed">
                        Our patented design seat base slanted cutout with removable foam insert. Cutout of the seat provides full motion of the center-mounted stick with grip extension without protruding into the seat within a proper arm's reach.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Seat
                    </div>
                  </button>
                  
                  {/* Point 8 - Flight Sim #10 */}
                  <button 
                    className="absolute top-[50%] right-[85%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Flight Sim #10 Add-On"
                  >
                    <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Flight Sim #10 Add-On</div>
                      <div className="text-xs leading-relaxed">
                        AMSM. Side-bracket assembly allows for stackable mounting of throttle, additional horizontally mounted control panel in front or behind throttle and additional takeoff/combat-ready panel mounted on the left side of upper pilot pit space.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Flight Sim #10
                    </div>
                  </button>
                  
                  {/* Point 9 - Arm rest kit */}
                  <button 
                    className="absolute bottom-[47%] right-[32%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Arm rest kit"
                  >
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Arm rest kit</div>
                      <div className="text-xs leading-relaxed">
                        Added comfort for F-16 pilots. Resting your forearm provides better stick control for long hours of dog fighting.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Arm rest kit
                    </div>
                  </button>
                  
                  {/* Point 10 - Flight Sim #11 */}
                  <button 
                    className="absolute top-[75%] left-[23%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Flight Sim #11 Add-On"
                  >
                    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Flight Sim #11 Add-On</div>
                      <div className="text-xs leading-relaxed">
                        Universal helicopter collective bracket. Compatible with VirPil, WinWing and Komodo collectives.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Flight Sim #11
                    </div>
                  </button>
                  
                  {/* Point 11 - Universal shaker bracket */}
                  <button 
                    className="absolute bottom-[15%] right-[20%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Universal shaker bracket"
                  >
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Universal shaker bracket</div>
                      <div className="text-xs leading-relaxed">
                        Add a shaker to your pit for enhanced immersion.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Universal shaker bracket
                    </div>
                  </button>
                  
                  {/* Point 6 - Bottom Right */}
                  <button 
                    className="absolute bottom-[15%] left-[32%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="EZ rolling wheels"
                  >
                    <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">EZ rolling wheels</div>
                      <div className="text-xs leading-relaxed">
                        Move around your cockpit by lifting the front until cilycon wheels touch the floor. When the pit gets heavier with added peripheral brackets and controls, simply disconnect each assembly (on either side or front) at the easiest disconnect point, by turning a couple of knobs. Couldn't be easier than that!
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      EZ rolling wheels
                    </div>
                  </button>
                  
                  {/* Point 13 - Right side advanced modular side mount assembly kit */}
                  <button 
                    className="absolute top-[60%] right-[20%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                    title="Right side advanced modular side mount assembly kit"
                  >
                    <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Right side advanced modular side mount assembly kit</div>
                      <div className="text-xs leading-relaxed">
                        Right side advanced modular side mount assembly kit. Suitable for stacking several controls per user preference.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Advanced modular side mount assembly kit
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Flight Sim Base Models */}
        <section className="py-12 sm:py-16 lg:py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="heading-lg text-center text-accent-underline mb-8 sm:mb-12">
              FLIGHT SIM BASE MODELS
            </h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Unable to load products. Please try again later.</p>
              </div>
            ) : baseModels.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No products available at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {baseModels.map((model) => (
                  <div key={model.id} className="product-card text-center">
                    <div className="aspect-square bg-card rounded-lg mb-4 overflow-hidden">
                      <img 
                        src={model.image}
                        alt={model.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = flightSimImage;
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-card-foreground mb-3 leading-tight text-lg">
                      {model.name}
                    </h3>
                    {model.description && (
                      <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
                        {model.description}
                      </p>
                    )}
                    <div className="text-2xl font-bold text-primary mb-4">
                      {model.price}
                    </div>
                    <Link to={model.slug ? `/product/${model.slug}` : '#'}>
                      <Button 
                        className={model.cta === 'BUY NOW' ? 'btn-primary w-full' : 'btn-outline w-full'}
                      >
                        {model.cta}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trainer Station Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="order-1 lg:order-1">
                <img 
                  src="/trainer-station-main-page.webp"
                  alt="Trainer station modular cockpit"
                  className="w-full shadow-card"
                />
                <p className="text-xs sm:text-sm text-muted-foreground mt-4 text-center">
                  Providing precise replication of popular aircrafts with true to life controls placement
                </p>
              </div>
              
              <div className="order-2 lg:order-2">
                <h3 className="heading-md mb-4">
                  SimFab Trainer Station Modular Cockpit
                </h3>
                
                <p className="text-lg sm:text-xl text-white font-semibold mb-4 sm:mb-6">
                  Designed to Foster Skill Development
                </p>

                <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                  Whether you're a budding pilot honing your muscle memory or a seasoned aviator refining your emergency procedures, the SimFab Trainer Station is your trusted companion.
                </p>

                <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                  Its modular design allows for easy customization, catering to the needs of candidates preparing for FAA certification and current pilots seeking to sharpen their skills.
                </p>

                <div className="mb-6 sm:mb-8">
                  <span className="text-2xl sm:text-3xl font-bold text-card-foreground">from $999</span>
                </div>

                <Button className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                  buy now
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Modular Cockpits Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="order-2 lg:order-1">
                <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
                  Modular Cockpits
                </h2>
                <h3 className="text-lg sm:text-xl text-foreground/90 mb-4 sm:mb-6 font-medium">
                  For Diverse Flight Sim Experiences
                </h3>
                <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                  SimFab modular flight cockpit concept starts with several basic models covering the essentials at most affordable budget, without compromising quality and craftsmanship.
                </p>
                <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                  Base models are suitable for flight sim pilots entering the airfield of flight simulation who want to try it without breaking the bank. Each of our models has a modular design and is scalable and interchangeable with each other. Achieve your preferred setup, whether that's combat, general aviation, space sim or a hybrid.
                </p>
                <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                  Our base models are crafted for the type of flight simulation and type of flight controls, sharing similar attachment designs. Each of our three base models is scalable by purchasing individual modules. Each modular flight cockpit is interchangeable with one another, offered as an add-on kit.
                </p>
              </div>
              
              <div className="relative order-1 lg:order-2">
                <ModularCockpitsCarousel />
              </div>
            </div>
          </div>
        </section>

        {/* Add-on Modules Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="relative order-1 lg:order-1">
                <img 
                  src="/flight-sim-add-onn-composition.webp"
                  alt="Flight sim cockpit with labeled add-on modules"
                  className="w-full"
                />
              </div>
              
              <div className="order-2 lg:order-2">
                <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
                  FLIGHT SIM ADD-ON MODULES
                </h2>
                <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                  Our flight sim options cover every aspect of flight simulation with ergonomic design, rigid mounting brackets, adjustment and full compatibility.
                </p>
                <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                  Flight sim configurations are suitable for combat and space sim as well as commercial and recreational flight simulation.
                </p>
                <Button className="btn-primary w-full sm:w-auto">
                  see add-ons
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default FlightSim;