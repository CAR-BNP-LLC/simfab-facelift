import { Button } from '@/components/ui/button';
import flightSimImage from '@/assets/flight-sim-cockpit.jpg';

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
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        {/* Main Feature Block */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="heading-lg text-accent-underline mb-6">
              FLIGHT SIM
            </h2>
            <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
              Experience unparalleled realism with our modular add-on capability and patented seat base 
              featuring removable center foam insert. Customize your cockpit with precision-engineered 
              add-on modules for any aircraft type.
            </p>
            <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
              From commercial aviation to military fighters, our modular system adapts to your simulation needs 
              with professional-grade components and authentic control layouts.
            </p>
            <Button className="btn-primary">
              SEE MORE
            </Button>
          </div>
          
          <div className="relative">
            <img 
              src={flightSimImage}
              alt="Blue and black modular flight simulator cockpit"
              className="w-full rounded-xl shadow-card"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-xl"></div>
          </div>
        </div>

        {/* Base Models Grid */}
        <div>
          <h3 className="heading-md text-center mb-12">
            Flight Sim Base Models
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {baseModels.map((model, index) => (
              <div key={index} className="product-card text-center">
                <div className="h-48 bg-secondary/50 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl">🎮</span>
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