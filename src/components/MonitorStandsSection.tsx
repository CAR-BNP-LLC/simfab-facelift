import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePageProducts } from '@/hooks/usePageProducts';
import { useRegion } from '@/contexts/RegionContext';

const MonitorStandsSection = () => {
  // Fetch products from API for homepage section
  const { products: apiProducts, loading, error } = usePageProducts('homepage', 'monitor-stands-section');
  const { region } = useRegion();

  // Map API products to component format
  const monitorModels = apiProducts.map((pageProduct) => {
    const product = pageProduct.product;
    if (!product) return null;

    const productImage = product.images?.find((img: any) => img.is_primary) || 
                        product.images?.[0] || 
                        null;

    const imageUrl = productImage?.image_url || null;

    const currency = region === 'eu' ? '€' : '$';
    const price = product.sale_price 
      ? `${currency}${product.sale_price}` 
      : product.regular_price 
        ? `${currency}${product.regular_price}` 
        : product.price_min 
          ? `from ${currency}${product.price_min}` 
          : `from ${currency}0`;

    return {
      id: product.id,
      name: product.name,
      price,
      image: imageUrl,
      cta: product.status === 'active' ? 'BUY NOW' : 'SEE MORE',
      slug: product.slug,
    };
  }).filter(Boolean);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-black">
      <div className="container mx-auto px-4">
        {/* Main Feature Block */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12 sm:mb-16 lg:mb-20">
          <div className="order-2 lg:order-1">
            <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
              MONITOR & TV STANDS
            </h2>
            <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
              Our monitor stands division offers a variety of LD (for monitors) and HD (for TV sets). Monitor stands are available in single or triple mode. Personalize your setup with an overhead or sub-mount monitor mounting option or choose the more common triple monitor setup.
            </p>
            <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
              Our modular design allows for any number of additional monitors to be mounted horizontally with the option to add screens overhead or sub-mount to each main panel. The capacity of our monitors ranges from 24" monitors to 65" TVs.
            </p>
            <Link to="/monitor-stands">
              <Button className="btn-primary w-full sm:w-auto">
                see more
              </Button>
            </Link>
          </div>
          
          <div className="order-1 lg:order-2">
            <img 
              src="/monitor-4-1.webp"
              alt="Monitor stands setup"
              className="w-full"
            />
          </div>
        </div>

        {/* Monitor Models Grid */}
        <div>
          <h3 className="heading-md text-center mb-8 sm:mb-12">
            Monitor Stand Models
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Products unavailable
            </div>
          ) : monitorModels.length === 0 ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {monitorModels.map((model) => (
                <div key={model.id} className="product-card text-center">
                  <div className="h-48 bg-secondary/50 rounded-lg mb-4 overflow-hidden">
                    {model.image ? (
                      <img 
                        src={model.image}
                        alt={model.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 bg-muted-foreground/20 rounded"></div>
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-card-foreground mb-3 leading-tight">
                    {model.name}
                  </h4>
                  <div className="text-2xl font-bold text-primary mb-4">
                    {model.price}
                  </div>
                  {model.slug ? (
                    <Link to={`/product/${model.slug}`}>
                      <Button className="btn-primary w-full">
                        {model.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Button className="btn-primary w-full">
                      {model.cta}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MonitorStandsSection;
