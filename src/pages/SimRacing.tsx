import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import simRacingHero from '@/assets/sim-racing-hero.png';
import racingImage from '@/assets/sim-racing-cockpit.jpg';

const SimRacing = () => {
  const baseModels = [
    {
      name: "GEN3 Modular Racing Sim Cockpit",
      description: "Modular and versatile ecosystem complimented by various add-on accessories",
      originalPrice: "$499",
      currentPrice: "$399",
      image: racingImage
    },
    {
      name: "DD Modular Racing Sim Cockpit",
      description: "Full-size ergonomic seat with sliders and recliner mechanism",
      originalPrice: "$699",
      currentPrice: "$598",
      image: racingImage
    }
  ];

  const useCases = [
    "Sim racing setup, compatible with all major brands controls",
    "Convert to flight sim setup",
    "Use as general lounge chair"
  ];

  const compatibleBrands = [
    "FANATEC", "logitech G", "THRUSTMASTER", "Saitek", "ButtKicker",
    "TURTLE BEACH", "VIRPIL", "VKBsim", "HORI", "HONEYCOMB AERONAUTICAL",
    "CH Products", "MFG", "XBOX ONE", "XBOX X", "PS4", "PS5", "Virtual Reality", "PC"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-screen bg-black text-white overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={simRacingHero}
            alt="Sim Racing Cockpit with Interactive Points"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-2xl">
            <h1 className="text-6xl font-bold mb-6 text-primary">
              SIM RACING
            </h1>
            <div className="w-32 h-1 bg-primary mb-8"></div>
            <p className="text-xl mb-8 leading-relaxed">
              The real racing experience, beyond the mainstream setup
            </p>
          </div>
        </div>
      </section>

      {/* Base Models Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
            SIM RACING BASE MODELS
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {baseModels.map((model, index) => (
              <Card key={index} className="bg-card border-border overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted">
                  <img 
                    src={model.image}
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {model.name}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {model.description}
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-muted-foreground line-through">
                      {model.originalPrice}
                    </span>
                    <span className="text-2xl font-bold text-foreground">
                      {model.currentPrice}
                    </span>
                  </div>
                  <Button className="btn-primary w-full">
                    BUY NOW
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Concept Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src={racingImage}
                alt="Sim Racing Concept Cockpit"
                className="w-full rounded-xl shadow-card"
              />
            </div>
            
            <div>
              <h2 className="text-4xl font-bold mb-6 text-primary">
                SIM RACING CONCEPT
              </h2>
              <div className="w-24 h-1 bg-primary mb-8"></div>
              <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                Modular and versatile ecosystem complimented by various add-on accessories
              </p>
              <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                We offer an ecosystem of products serving the Sim Racing simulation segment from entry-level gamers to modular systems for trainees or advanced professionals, all at an affordable price. Each base model sim cockpit is upgradable and interchangeable via add-on modules.
              </p>
              <Button className="btn-primary">
                CONVERSION KITS
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Versatility Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
            The most versatile SIM RACING cockpit on the market
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {useCases.map((useCase, index) => (
              <div key={index} className="text-center">
                <div className="aspect-video bg-muted rounded-xl mb-4 overflow-hidden">
                  <img 
                    src={racingImage}
                    alt={useCase}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-foreground font-medium">
                  {useCase}
                </p>
                {index === 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    *available optional flight sim add-ons
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video/Hero Image Section */}
      <section className="py-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="aspect-video rounded-xl overflow-hidden max-w-4xl mx-auto">
            <img 
              src={racingImage}
              alt="Professional sim racing experience"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Compatibility Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src={racingImage}
                alt="Complete Sim Racing Setup"
                className="w-full rounded-xl shadow-card"
              />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-8 text-foreground">
                COMPATIBLE WITH:
              </h2>
              <div className="w-24 h-1 bg-primary mb-8"></div>
              
              <div className="grid grid-cols-2 gap-4">
                {compatibleBrands.map((brand, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    <span className="text-foreground font-medium">{brand}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SimRacing;