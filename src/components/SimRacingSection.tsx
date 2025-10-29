import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePageProducts } from '@/hooks/usePageProducts';

const SimRacingSection = () => {
  // Fetch products from API for homepage section
  const { products: apiProducts, loading, error } = usePageProducts('homepage', 'sim-racing-section');

  // Map API products to component format
  const racingModels = apiProducts.map((pageProduct) => {
    const product = pageProduct.product;
    if (!product) return null;

    const price = product.sale_price 
      ? `$${product.sale_price}` 
      : product.regular_price 
        ? `$${product.regular_price}` 
        : product.price_min 
          ? `from $${product.price_min}` 
          : 'from $0';

    return {
      id: product.id,
      name: product.name,
      price,
      cta: product.status === 'active' ? 'BUY NOW' : 'SEE MORE',
      slug: product.slug,
    };
  }).filter(Boolean);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-card">
      <div className="container mx-auto px-4">
        {/* Main Feature Block */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12 sm:mb-16 lg:mb-20">
          <div className="order-2 lg:order-1">
            <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
              SIM RACING
            </h2>
            <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
              Our sim racing division includes our affordable compact member, Gen3 chassis, and its big brother, the DD cockpit.
            </p>
            <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
              Gen3 chassis is a great choice for limited spaces and/or a multi-user setup where re-adjustment on the fly is key. It's extremely easy to move around and offers the option to break it down into pieces or store it away.
            </p>
            <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
              DD chassis is offered as an upgrade to Gen3 without wasting any part or as its own complete rig. We chose telescopic steel tubing as our material so modular capabilities remain open and endless. Our race seats offer unmatched comfort with reclining and sliding mechanisms.
            </p>
            <Button className="btn-primary w-full sm:w-auto">
              see more
            </Button>
          </div>
          
          <div className="order-1 lg:order-2">
            <img 
              src="/simracing-1.webp"
              alt="Sim racing cockpit setup"
              className="w-full"
            />
          </div>
        </div>

        {/* Racing Models Grid */}
        <div>
          <h3 className="heading-md text-center mb-8 sm:mb-12">
            Sim Racing Base Models
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Products unavailable
            </div>
          ) : racingModels.length === 0 ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
              {racingModels.map((model) => (
                <div key={model.id} className="product-card text-center">
                  <div className="h-48 bg-secondary/50 rounded-lg mb-4 flex items-center justify-center">
                    <div className="w-16 h-16 bg-muted-foreground/20 rounded"></div>
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

export default SimRacingSection;