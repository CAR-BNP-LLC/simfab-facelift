import { Button } from '@/components/ui/button';

const FlightSimSection = () => {
  const baseModels = [
    {
      name: 'DCS Flight Sim Modular Cockpit',
      price: '$599',
      cta: 'BUY NOW'
    },
    {
      name: 'MSFS Flight Sim Modular Cockpit', 
      price: '$599',
      cta: 'BUY NOW'
    },
    {
      name: 'Hybrid Flight Sim Modular Cockpit',
      price: '$499', 
      cta: 'BUY NOW'
    },
    {
      name: 'Rotorcraft Flight Sim Modular Cockpit',
      price: 'from $589',
      cta: 'SEE MORE'
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-card">
      <div className="container mx-auto px-4">
        {/* Main Feature Block */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12 sm:mb-16 lg:mb-20">
          <div className="order-2 lg:order-1">
            <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
              FLIGHT SIM
            </h2>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">
              A Realistic and Immersive Flying Experience
            </h3>
            <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
              Our flight simulation division offers base packages of dedicated flight cockpits. Each one is upgradeable with add-on modules, allowing users to scale up their specific setup.
            </p>
            <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
              All flight sim cockpits come with our patented seat base design complete with a removable center foam insert. The seat base's slanted cutout allows for the adjustment of the mounted stick or helicopter cyclic to within a proper arm's reach, as well as full motion of the stick without protruding into seat foam.
            </p>
            <Button className="btn-primary w-full sm:w-auto">
              see more
            </Button>
          </div>
          
          <div className="order-1 lg:order-2">
            <img 
              src="/flight-sim-2.webp"
              alt="Flight simulator cockpit setup"
              className="w-full"
            />
          </div>
        </div>

        {/* Base Models Grid */}
        <div>
          <h3 className="heading-md text-center mb-8 sm:mb-12">
            Flight Sim Base Models
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {baseModels.map((model, index) => (
              <div key={index} className="product-card text-center">
                <div className="h-48 bg-secondary/50 rounded-lg mb-4 flex items-center justify-center">
                  <div className="w-16 h-16 bg-muted-foreground/20 rounded"></div>
                </div>
                <h4 className="font-semibold text-card-foreground mb-3 leading-tight">
                  {model.name}
                </h4>
                <div className="text-2xl font-bold text-primary mb-4">
                  {model.price}
                </div>
                <Button 
                  className={model.cta === 'BUY NOW' ? 'btn-primary w-full' : 'btn-outline w-full'}
                >
                  {model.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightSimSection;