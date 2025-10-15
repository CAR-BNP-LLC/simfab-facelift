import { Button } from '@/components/ui/button';

const MonitorStandsSection = () => {
  const monitorModels = [
    {
      name: 'Single Monitor Stand',
      price: 'from $299',
      cta: 'BUY NOW'
    },
    {
      name: 'Triple Monitor Stand', 
      price: 'from $399',
      cta: 'BUY NOW'
    },
    {
      name: 'Overhead Monitor Bracket Kit',
      price: 'from $199',
      cta: 'BUY NOW'
    }
  ];

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
            <Button className="btn-primary w-full sm:w-auto">
              see more
            </Button>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {monitorModels.map((model, index) => (
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
                <Button className="btn-primary w-full">
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

export default MonitorStandsSection;
