import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CompatibleBrands = () => {
  const brands = [
    // Row 1
    { name: 'Thrustmaster', logo: '/recom-brands/thrustmaster.webp', alt: 'Thrustmaster' },
    { name: 'Moza Racing', logo: '/recom-brands/moza-logo.webp', alt: 'Moza Racing' },
    { name: 'Simagic', logo: '/recom-brands/simagic_logo.webp', alt: 'Simagic' },
    
    // Row 2
    { name: 'Winwing', logo: '/recom-brands/winwing.webp', alt: 'Winwing' },
    { name: 'VKBSim', logo: '/recom-brands/vkb.webp', alt: 'VKBSim' },
    { name: 'Saitek', logo: '/recom-brands/saitek.webp', alt: 'Saitek' },
    
    // Row 3
    { name: 'PlayStation 5', logo: '/recom-brands/ps5.webp', alt: 'PlayStation 5' },
    { name: 'PC', logo: '/recom-brands/pc.webp', alt: 'PC' },
    { name: 'MFG', logo: '/recom-brands/mfg.webp', alt: 'MFG' },
    
    // Row 4
    { name: 'Xbox Series X', logo: '/recom-brands/xbox_x.webp', alt: 'Xbox Series X' },
    { name: 'Xbox One', logo: '/recom-brands/xbox_one.webp', alt: 'Xbox One' },
    { name: 'Logitech', logo: '/recom-brands/logitech.webp', alt: 'Logitech' },
    
    // Additional brands
    { name: 'Virpil', logo: '/recom-brands/virpil.webp', alt: 'Virpil' },
    { name: 'Honeycomb', logo: '/recom-brands/huneycomb.webp', alt: 'Honeycomb' },
    { name: 'CH Products', logo: '/recom-brands/ch_products.webp', alt: 'CH Products' },
    { name: 'RealSim Gears', logo: '/recom-brands/realsim-gears.webp', alt: 'RealSim Gears' },
    { name: 'Turtle Beach', logo: '/recom-brands/turtle_beach.webp', alt: 'Turtle Beach' },
    { name: 'Varjo', logo: '/recom-brands/varjo-logo.webp', alt: 'Varjo' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
                COMPATIBLE BRANDS
              </h1>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
                SimFab products are designed to work seamlessly with all major simulation hardware brands. 
                From entry-level controllers to professional-grade equipment, our modular design ensures 
                compatibility across the entire simulation ecosystem.
              </p>
            </div>
          </div>
        </section>

        {/* Brands Grid */}
        <section className="py-12 sm:py-16 lg:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8 max-w-7xl mx-auto">
              {brands.map((brand, index) => (
                <div 
                  key={index} 
                  className="brand-card group flex flex-col items-center justify-center p-4 sm:p-6 bg-transparent border border-border rounded-xl hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="w-full h-20 sm:h-24 flex items-center justify-center mb-3">
                    <img 
                      src={brand.logo} 
                      alt={brand.alt}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="text-xs sm:text-sm font-heading font-medium text-foreground text-center">
                    {brand.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Info Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="heading-lg mb-6 sm:mb-8">
                UNIVERSAL COMPATIBILITY
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                <div className="text-left">
                  <h3 className="text-xl font-heading font-semibold text-card-foreground mb-4">
                    Hardware Integration
                  </h3>
                  <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
                    Our modular mounting system accommodates controls from all major manufacturers, 
                    ensuring your existing hardware works perfectly with SimFab cockpits.
                  </p>
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-heading font-semibold text-card-foreground mb-4">
                    Platform Support
                  </h3>
                  <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
                    Compatible with PC, PlayStation, and Xbox platforms, giving you the flexibility 
                    to switch between gaming systems without changing your cockpit setup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CompatibleBrands;