import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePageProducts } from '@/hooks/usePageProducts';
import { Loader2 } from 'lucide-react';
import simRacingHero from '@/assets/sim-racing-hero.png';
import racingImage from '@/assets/sim-racing-cockpit.jpg';
import { useSEO } from '@/hooks/useSEO';
import { getCanonicalUrl } from '@/utils/seo';
import { BreadcrumbSchema } from '@/components/SEO/BreadcrumbSchema';
import { ItemListSchema } from '@/components/SEO/ItemListSchema';

const SimRacing = () => {
  // Fetch products from API
  const { products: apiProducts, loading, error } = usePageProducts('/sim-racing', 'base-models');

  // Fallback to empty array if loading/error
  const baseModels = apiProducts.map((pageProduct) => {
    const product = pageProduct.product;
    if (!product) return null;

    // Get primary image or first image
    const productImage = product.images?.find((img: any) => img.is_primary) || 
                        product.images?.[0] || 
                        null;

    const imageUrl = productImage?.image_url || racingImage;

    const currency = product.region === 'eu' ? '€' : '$';
    return {
      id: product.id,
      name: product.name,
      description: '', // Product might have short_description
      originalPrice: product.regular_price ? `${currency}${product.regular_price}` : null,
      currentPrice: product.sale_price 
        ? `${currency}${product.sale_price}` 
        : product.regular_price 
          ? `${currency}${product.regular_price}` 
          : product.price_min 
            ? `${currency}${product.price_min}` 
            : `${currency}0`,
      image: imageUrl,
      slug: product.slug,
    };
  }).filter(Boolean);

  const useCases = [
    "Sim racing setup, compatible with all major brands controls",
    "Convert to flight sim setup",
    "Use as general lounge chair"
  ];

  const compatibleBrands = [
    "FANATEC", "logitech G", "THRUSTMASTER", "Saitek", "ButtKicker",
    "TURTLE BEACH", "VIRPIL", "VKBsim", "HORI", "HONEYCOMB AERONAUTICAL",
    "CH Products", "MFG", "XBOX ONE", "XBOX X", "PS4", "PS5", "Virtual Reality", "PC"
  ];

  const seoElement = useSEO({
    title: 'Sim Racing Cockpits & Wheel Mounts | Complete Racing Setup | SimFab',
    description: 'Complete sim racing cockpit systems and wheel mounting solutions. Gen3 and DD modular cockpits with conversion kits for flight sim. Compatible with Logitech G29/G920/G923, Thrustmaster T300/T248/TMX, Moza Racing R5/R9/R12, Simagic Alpha, Fanatec, Hori, and all major racing wheel brands. Works with PC, PlayStation 4/5, and Xbox One/Series X. Modular, adjustable designs.',
    canonical: getCanonicalUrl('/sim-racing'),
    ogType: 'website'
  });

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Sim Racing', url: '/sim-racing' }
  ];

  const schemaProducts = baseModels.map(item => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    price: { min: 0 },
    images: []
  }));

  return (
    <div className="min-h-screen bg-background">
      {seoElement}
      <BreadcrumbSchema items={breadcrumbItems} />
      {baseModels.length > 0 && (
        <ItemListSchema name="Sim Racing Cockpits" items={schemaProducts} />
      )}
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-black pb-12 sm:pb-16 lg:pb-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-6 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <h1 className="heading-lg sm:heading-xl text-accent-underline mb-4 sm:mb-6">
                SIM RACING
              </h1>
              <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                The real racing experience, beyond the mainstream setup
              </p>
            </div>
            
            <div className="lg:col-span-4 relative max-w-full overflow-hidden order-1 lg:order-2">
              <img 
                src="/simfab-racing.webp"
                alt="Sim racing cockpit with labeled components"
                className="w-full"
              />
              
              {/* Clickable Points - Hidden on mobile for better UX */}
              <div className="absolute inset-0 hidden sm:block">
                {/* Point 1 - Front Surround Speaker Tray Kit */}
                <button 
                  className="absolute top-[15%] left-[50%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                  title="Front Surround Speaker Tray Kit"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                    Front Surround Speaker Tray Kit
                  </div>
                </button>
                
                {/* Point 2 - Keyboard & Mouse or Laptop Tray kit */}
                <button 
                  className="absolute top-[30%] left-[25%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                  title="Keyboard & Mouse or Laptop Tray kit"
                >
                  <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                    <div className="font-semibold mb-1">Keyboard & Mouse or Laptop Tray kit</div>
                    <div className="text-xs leading-relaxed">
                      Active Articulating Arm with Keyboard & Mouse or Laptop Tray kit. Can be mounted on either left or right hand side.
                    </div>
                  </div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                    Keyboard & Mouse or Laptop Tray kit
                  </div>
                </button>
                
                {/* Point 3 - Single Monitor Mount Stand */}
                <button 
                  className="absolute top-[20%] left-[85%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                  title="Single Monitor Mount Stand"
                >
                  <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                    <div className="font-semibold mb-1">Single Monitor Mount Stand</div>
                    <div className="text-xs leading-relaxed">
                      Single Monitor Mount Stand. Designed with spread out legs, for optimal field of view.
                    </div>
                  </div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                    Single Monitor Mount Stand
                  </div>
                </button>
                
                {/* Point 4 - Rear Surround Speaker Tray Kit */}
                <button 
                  className="absolute top-[65%] right-[60%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                  title="Rear Surround Speaker Tray Kit"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                    Rear Surround Speaker Tray Kit
                  </div>
                </button>
                
                {/* Point 5 - Universal Bracket for Bass Shaker */}
                <button 
                  className="absolute bottom-[20%] left-[25%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                  title="Universal Bracket for Bass Shaker"
                >
                  <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                    <div className="font-semibold mb-1">Universal Bracket for Bass Shaker</div>
                    <div className="text-xs leading-relaxed">
                      Universal Bracket for Bass Shaker. Low Frequency Audio Tactile Transducers. Fits all Buttkickers, AuraSound.
                    </div>
                  </div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                    Universal Bracket for Bass Shaker
                  </div>
                </button>
                
                {/* Point 6 - EZ rolling wheels */}
                <button 
                  className="absolute bottom-[7%] left-[20%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                  title="EZ rolling wheels"
                >
                  <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                    <div className="font-semibold mb-1">EZ rolling wheels</div>
                    <div className="text-xs leading-relaxed">
                      EZ rolling wheels. Standard to all SimFab cockpits. Optional seat frame stabilizer kit when seat is used without front chassis.
                    </div>
                  </div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                    EZ rolling wheels
                  </div>
                  </button>
                  
                  {/* Point 7 - Gen3 front chassis */}
                  <button 
                    className="absolute top-[42%] left-[63%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                    title="Gen3 front chassis"
                  >
                    <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Gen3 front chassis</div>
                      <div className="text-xs leading-relaxed">
                        Gen3 front chassis, with option to hot swap entire assembly to flight sim rudder pedals with yoke or center mounted stick.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Gen3 front chassis
                    </div>
                  </button>
                  
                  {/* Point 8 - Hot swap shifter/stick */}
                  <button 
                    className="absolute top-[62%] left-[72%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group z-20"
                    title="Hot swap between sim racing shifter and flight sim stick"
                  >
                    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-[9999]">
                      <div className="font-semibold mb-1">Hot swap between sim racing shifter and flight sim stick</div>
                      <div className="text-xs leading-relaxed">
                        Hot swap between sim racing shifter and flight sim stick.
                      </div>
                    </div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/80 text-primary text-xs px-2 py-1 rounded font-semibold whitespace-nowrap z-5">
                      Hot swap shifter/stick
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* Base Models Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 lg:mb-16 text-foreground">
            SIM RACING BASE MODELS
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
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto">
              {baseModels.map((model) => (
                <Card key={model.id} className="bg-card border-border overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img 
                      src={model.image}
                      alt={model.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = racingImage;
                      }}
                    />
                  </div>
                  <CardContent className="p-4 sm:p-6 text-center">
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">
                      {model.name}
                    </h3>
                    {model.description && (
                      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                        {model.description}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {model.originalPrice && (
                        <span className="text-sm sm:text-base text-muted-foreground line-through">
                          {model.originalPrice}
                        </span>
                      )}
                      <span className="text-xl sm:text-2xl font-bold text-foreground">
                        {model.currentPrice}
                      </span>
                    </div>
                    <Link to={model.slug ? `/product/${model.slug}` : '#'}>
                      <Button className="btn-primary w-full">
                        BUY NOW
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Concept Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="relative order-1 lg:order-1">
              <img 
                src="/simracing-1.webp"
                alt="Sim Racing Concept Cockpit"
                className="w-full"
              />
            </div>
            
            <div className="order-2 lg:order-2">
              <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
                SIM RACING CONCEPT
              </h2>
              <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                Modular and versatile ecosystem complimented by various add-on accessories
              </p>
              <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                We offer an ecosystem of products serving the Sim Racing simulation segment from entry-level gamers to modular systems for trainees or advanced professionals, all at an affordable price. Each base model sim cockpit is upgradable and interchangeable via add-on modules.
              </p>
              <Button className="btn-primary w-full sm:w-auto">
                conversion kits
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Versatility Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="heading-lg text-center text-accent-underline mb-8 sm:mb-12 lg:mb-16">
            The most versatile SIM RACING cockpit on the market
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-1.webp"
                alt="Sim racing setup"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Sim racing setup, compatible with all major brands controls
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-2.webp"
                alt="Convert to flight sim setup"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Convert to flight sim setup
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                *available optional flight sim add-ons
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-3.webp"
                alt="Use as general lounge chair"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Use as general lounge chair
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-4.webp"
                alt="Need a break? Take a quick nap"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Need a break? Take a quick nap
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-5.webp"
                alt="Break it down to pieces and fold it in seconds"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Break it down to pieces and fold it in seconds
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-6.webp"
                alt="Easy to move around"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Easy to move around
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="bg-black">
        <video 
          src="/OpenWheeler-Simulation-Video.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-auto"
        >
          Your browser does not support the video tag.
        </video>
      </section>

      {/* Compatibility Image Section */}
      <section>
        <img 
          src="/compatibility-image.webp"
          alt="Compatibility with various brands"
          className="w-full h-auto"
        />
      </section>

      <Footer />
    </div>
  );
};

export default SimRacing;