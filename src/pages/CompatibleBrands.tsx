import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CompatibleBrands = () => {
  const flightSimBrands = [
    "Thrustmaster", "Logitech", "VKB", "Virpil", "Winwing", "Honeycomb",
    "CH Products", "Saitek", "MFG Crosswind", "VPC", "Brunner"
  ];

  const simRacingBrands = [
    "Logitech", "Thrustmaster", "Fanatec", "SimMagic", "VRS", "Moza Racing",
    "Simagic", "OSW", "Accuforce", "Leo Bodnar", "Heusinkveld"
  ];

  const monitorBrands = [
    "Samsung", "LG", "ASUS", "Acer", "Dell", "MSI", "BenQ", "AOC",
    "ViewSonic", "HP", "Alienware", "Gigabyte"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Compatible Brands
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            SimFab products are designed to work seamlessly with leading simulation hardware brands
          </p>
        </div>

        <div className="space-y-16">
          {/* Flight Simulation Brands */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              Flight Simulation Hardware
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {flightSimBrands.map((brand, index) => (
                <div key={index} className="bg-card rounded-lg p-6 text-center border border-border hover:border-primary transition-colors">
                  <h3 className="text-lg font-semibold text-card-foreground">{brand}</h3>
                </div>
              ))}
            </div>
          </section>

          {/* Sim Racing Brands */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              Sim Racing Hardware
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {simRacingBrands.map((brand, index) => (
                <div key={index} className="bg-card rounded-lg p-6 text-center border border-border hover:border-primary transition-colors">
                  <h3 className="text-lg font-semibold text-card-foreground">{brand}</h3>
                </div>
              ))}
            </div>
          </section>

          {/* Monitor Brands */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              Monitor Brands
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {monitorBrands.map((brand, index) => (
                <div key={index} className="bg-card rounded-lg p-6 text-center border border-border hover:border-primary transition-colors">
                  <h3 className="text-lg font-semibold text-card-foreground">{brand}</h3>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="bg-card rounded-lg p-8 text-center mt-16">
          <h2 className="text-3xl font-bold text-card-foreground mb-4">
            Don't See Your Brand?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Our modular design philosophy means most hardware can be adapted to work with SimFab products. 
            Contact us to discuss compatibility for your specific setup.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CompatibleBrands;