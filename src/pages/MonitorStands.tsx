import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePageProducts } from '@/hooks/usePageProducts';
import { useSEO } from '@/hooks/useSEO';
import { getCanonicalUrl } from '@/utils/seo';
import { BreadcrumbSchema } from '@/components/SEO/BreadcrumbSchema';
import { ItemListSchema } from '@/components/SEO/ItemListSchema';

const MonitorMountSystemsCarousel = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  const images = [
    'monitor-mount-systems-1.webp',
    'monitor-mount-systems-2.webp',
    'monitor-mount-systems-3.webp',
    'monitor-mount-systems-4.webp',
    'monitor-mount-systems-5.webp',
    'monitor-mount-systems-6.webp',
    'monitor-mount-systems-7.webp',
    'monitor-mount-systems-8.webp',
    'monitor-mount-systems-9.webp',
    'monitor-mount-systems-10.webp'
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
          src={`/monitor-mount-systems/${images[currentImage]}`}
          alt={`Monitor mount system ${currentImage + 1}`}
          className={`w-full transition-opacity duration-700 ease-in-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      
      {/* Navigation Arrows - Hidden on mobile */}
      <button
        onClick={prevImage}
        className="hidden sm:block absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/20"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
      
      <button
        onClick={nextImage}
        className="hidden sm:block absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/20"
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

const MonitorStands = () => {
  // Fetch products from API
  const { products: mainProducts, loading: loadingMain, error: errorMain } = 
    usePageProducts('/monitor-stands', 'main-products');
  const { products: addOnsProducts, loading: loadingAddOns, error: errorAddOns } = 
    usePageProducts('/monitor-stands', 'add-ons');

  // Map API products to component format
  const products = mainProducts.map((pageProduct) => {
    const product = pageProduct.product;
    if (!product) return null;

    const productImage = product.images?.find((img: any) => img.is_primary) || 
                        product.images?.[0] || 
                        { image_url: "/placeholder.svg" };

    const currency = product.region === 'eu' ? '€' : '$';
    const price = product.sale_price 
      ? `${currency}${product.sale_price}` 
      : product.regular_price 
        ? `${currency}${product.regular_price}` 
        : product.price_min 
          ? `${currency}${product.price_min}` 
          : `${currency}0`;

    return {
      id: product.id,
      name: product.name,
      description: product.short_description || '',
      price,
      image: productImage.image_url || productImage.url || "/placeholder.svg",
      slug: product.slug,
    };
  }).filter(Boolean);

  const addOns = addOnsProducts.map((pageProduct) => {
    const product = pageProduct.product;
    if (!product) return null;

    const productImage = product.images?.find((img: any) => img.is_primary) || 
                        product.images?.[0] || 
                        { image_url: "/placeholder.svg" };

    const currency = product.region === 'eu' ? '€' : '$';
    const price = product.sale_price 
      ? `${currency}${product.sale_price}` 
      : product.regular_price 
        ? `${currency}${product.regular_price}` 
        : product.price_min 
          ? `${currency}${product.price_min}` 
          : `${currency}0`;

    return {
      id: product.id,
      name: product.name,
      price,
      image: productImage.image_url || productImage.url || "/placeholder.svg",
      slug: product.slug,
    };
  }).filter(Boolean);

  const seoElement = useSEO({
    title: 'Monitor Stands for Sim Racing & Flight Sim | Triple Monitor Mounts | SimFab',
    description: 'Professional monitor mounting systems for simulators. Single, triple, and overhead/sub-mount monitor stands. Compatible with 24" to 65" displays. Modular design with adjustable height and angle. Includes VESA brackets, swing arms, and TV mounting options.',
    canonical: getCanonicalUrl('/monitor-stands'),
    ogType: 'website'
  });

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Monitor Stands', url: '/monitor-stands' }
  ];

  const schemaProducts = [...products, ...addOns].map(item => ({
    id: item.id,
    name: item.name,
    slug: item.slug || '',
    price: { min: 0 },
    images: []
  }));

  return (
    <div className="min-h-screen bg-background">
      {seoElement}
      <BreadcrumbSchema items={breadcrumbItems} />
      {schemaProducts.length > 0 && (
        <ItemListSchema name="Monitor Stands" items={schemaProducts} />
      )}
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-black pb-12 sm:pb-16 lg:pb-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-6 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-3 order-2 lg:order-1">
              <h1 className="heading-lg sm:heading-xl text-accent-underline mb-4 sm:mb-6">
                MONITOR MOUNT SYSTEMS
              </h1>
              <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                Versatile LD and HD options, customizable single or triple monitor setups with a modular design
              </p>
            </div>
            
            <div className="lg:col-span-3 relative max-w-full overflow-hidden order-1 lg:order-2">
              <img 
                src="/trimple-monitor.webp"
                alt="Monitor mount systems setup"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
              MONITORS & TV STANDS
            </h2>
            <p className="text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto">
              Choose from our range of professional monitor mounting solutions 
              designed for optimal viewing and simulator integration.
            </p>
          </div>
          
          {loadingMain ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : errorMain ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Unable to load products. Please try again later.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No products available at this time.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <Card key={product.id} className="bg-background border-border hover:shadow-card transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="aspect-square bg-muted rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-foreground/70 mb-6 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {product.price}
                      </span>
                      <Link to={product.slug ? `/product/${product.slug}` : '#'}>
                        <Button className="btn-primary">
                          BUY NOW
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
                MONITOR MOUNT SYSTEMS
              </h2>
              <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                Modular design for a personalized configuration
              </p>
              <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                SimFab's monitor stands division provides versatile LD and HD options, featuring customizable single or triple monitor setups with a modular design, allowing users to personalize their configuration and mount additional screens ranging from 24" monitors to 65" TVs horizontally or overhead and sub-mounted.
              </p>
            </div>
            
            <div className="relative order-1 lg:order-2">
              <MonitorMountSystemsCarousel />
            </div>
          </div>
        </div>
      </section>

      {/* Add-Ons Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
              Monitor Stand Add-Ons
            </h2>
            <p className="text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto">
              Enhance your monitor setup with our comprehensive range of accessories 
              and mounting solutions.
            </p>
          </div>
          
          {loadingAddOns ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : errorAddOns ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Unable to load add-ons. Please try again later.</p>
            </div>
          ) : addOns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No add-ons available at this time.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {addOns.map((addon) => (
                <Card key={addon.id} className="bg-background border-border hover:shadow-card transition-all duration-300">
                  <CardContent className="p-4 sm:p-6">
                    <div className="aspect-square bg-muted rounded-lg mb-3 sm:mb-4 flex items-center justify-center overflow-hidden">
                      <img
                        src={addon.image}
                        alt={addon.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                      {addon.name}
                    </h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                      <span className="text-lg sm:text-xl font-bold text-primary">
                        {addon.price}
                      </span>
                      <Link to={addon.slug ? `/product/${addon.slug}` : '#'}>
                        <Button size="sm" className="btn-primary w-full sm:w-auto">
                          BUY NOW
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MonitorStands;