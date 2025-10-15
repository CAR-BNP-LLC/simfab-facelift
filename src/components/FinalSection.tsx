import { Button } from '@/components/ui/button';

const FinalSection = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="max-w-full">
          <h2 className="heading-lg text-accent-underline mb-8 text-center">
            Enjoy SimFab's Modular Sim Racing and Flight Cockpit Design!
          </h2>
          
          <div className="space-y-8 text-lg text-foreground/80 leading-relaxed">
            <div className="border-l-4 border-primary pl-6">
              <p>
                Experience the high fidelity and authentic realism of our modular-based cockpit design and its accessories. All our cockpits, attachments and brackets are designed to replicate real race cars and aircraft layouts.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-6">
              <p>
                We take great pride in offering maximum comfort compared to all other flight simulation devices currently on the market. We've accomplished this through a stable modular design with full mounting integration compatibility.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-6">
              <p>
                Our modular cockpits start with several basic models covering the essentials and are within most simulation enthusiasts' budgets.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-6">
              <p>
                Whether you're a beginner or seasoned sim pilot, you can increase your immersive experience with our modular cockpit design that makes add-ons easy to install and cost-effective without compromising quality or craftsmanship. All our racing and flight simulation cockpit models are upgradable and interchangeable.
              </p>
            </div>
          </div>
          
          <div className="mt-20 pt-16 text-center">
            <h3 className="heading-md text-accent-underline mb-12">
              Welcome to SimFab!
            </h3>
            
            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <div className="text-center p-6 border border-primary/20 rounded-lg bg-background/50">
                <h4 className="font-semibold text-card-foreground mb-4 text-xl">
                  Versatile ecosystem
                </h4>
                <p className="text-foreground/80">
                  of compatible sim and cockpit modular products. We fit every controller available on the market.
                </p>
              </div>
              
              <div className="text-center p-6 border border-primary/20 rounded-lg bg-background/50">
                <h4 className="font-semibold text-card-foreground mb-4 text-xl">
                  Limited production output
                </h4>
                <p className="text-foreground/80">
                  yet boutique experience
                </p>
              </div>
            </div>
            
            <div className="mb-12">
              <Button className="btn-primary">
                Explore catalogue
              </Button>
            </div>
            
            <div className="pt-16">
              <p className="text-lg text-foreground/80 leading-relaxed max-w-3xl mx-auto">
                Whether used in a home simulator or a professional training center, our modular flight and racing seats provide a high-quality and realistic experience. They offer flexible and up-to-date compatibility not only with popular brand controls but also with specific high-end brands.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalSection;
