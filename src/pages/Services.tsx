import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { productsAPI } from '@/services/api';
import { useState, useEffect } from 'react';
import { useRegion } from '@/contexts/RegionContext';

const Services = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { region } = useRegion();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productsAPI.getAll({ category: 'services' });
        setServices(response.data.products || []);
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Failed to load services');
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [region]);

  const getProductImage = (product: any) => {
    try {
      if (Array.isArray(product.images) && product.images.length > 0) {
        const sortedImages = [...product.images].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        return sortedImages[0].image_url || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const getProductPrice = (product: any) => {
    try {
      const currency = region === 'eu' ? '€' : '$';
      if (product.sale_price) {
        return `${currency}${product.sale_price.toFixed(2)}`;
      }
      if (product.regular_price) {
        return `${currency}${product.regular_price.toFixed(2)}`;
      }
      if (product.price_min) {
        return `${currency}${product.price_min.toFixed(2)}`;
      }
      return 'Price TBD';
    } catch (error) {
      return 'Price TBD';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section with Video */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-left mb-12 sm:mb-16">
              <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
                SimFab Concierge Services
              </h1>
              <div className="w-full h-1 bg-primary mb-8"></div>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed max-w-4xl">
                Professional drilling and customization services for your SimFab products
              </p>
            </div>
          </div>
        </section>

        {/* Video and Services Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
              {/* Left Side - Video */}
              <div className="order-2 lg:order-1">
                <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-lg max-w-sm mx-auto lg:mx-0">
                  <video 
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src="/services-video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>

              {/* Right Side - Services */}
              <div className="order-1 lg:order-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>{error}</p>
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No services available at this time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    {services.map((service) => (
                      <div key={service.id} className="bg-transparent border border-border rounded-lg p-4 sm:p-6">
                        <div className="aspect-square bg-muted rounded-lg mb-4 sm:mb-6 overflow-hidden">
                          {getProductImage(service) ? (
                            <img 
                              src={getProductImage(service)}
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-muted-foreground text-sm">Service Image</span>
                            </div>
                          )}
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                          {service.name}
                        </h3>
                        {service.short_description && (
                          <p className="text-muted-foreground mb-4 text-sm sm:text-base">{service.short_description}</p>
                        )}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <span className="text-xl sm:text-2xl font-bold text-primary">{getProductPrice(service)}</span>
                          {service.slug ? (
                            <Link to={`/product/${service.slug}`}>
                              <Button className="btn-primary w-full sm:w-auto">BUY NOW</Button>
                            </Link>
                          ) : (
                            <Button className="btn-primary w-full sm:w-auto">BUY NOW</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Custom Services Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="heading-lg mb-6 sm:mb-8 text-white">
                Custom Services Available
              </h2>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed mb-8 sm:mb-12">
                Need a custom drilling pattern or special modification? Our expert technicians 
                can provide tailored solutions for your specific simulation setup requirements.
              </p>
              <Button className="btn-primary">Contact Us for Custom Work</Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Services;