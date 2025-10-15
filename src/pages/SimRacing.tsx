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
      <section className="relative bg-black pb-12 sm:pb-16 lg:pb-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-6 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <h1 className="heading-lg sm:heading-xl text-accent-underline mb-4 sm:mb-6">
                SIM RACING
              </h1>
              <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                The real racing experience, beyond the mainstream setup
              </p>
            </div>
            
            <div className="lg:col-span-4 relative max-w-full overflow-hidden order-1 lg:order-2">
              <img 
                src="/simfab-racing.webp"
                alt="Sim racing cockpit with labeled components"
                className="w-full"
              />
              
              {/* Clickable Points - Hidden on mobile for better UX */}
              <div className="absolute inset-0 hidden sm:block">
                {/* Point 1 - Top Left */}
                <button 
                  className="absolute top-[20%] left-[15%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                  title="Steering Wheel"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Steering Wheel
                  </div>
                </button>
                
                {/* Point 2 - Top Center */}
                <button 
                  className="absolute top-[25%] left-[50%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                  title="Dashboard Display"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Dashboard Display
                  </div>
                </button>
                
                {/* Point 3 - Middle Left */}
                <button 
                  className="absolute top-[45%] left-[20%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                  title="Shifter & Handbrake"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Shifter & Handbrake
                  </div>
                </button>
                
                {/* Point 4 - Middle Right */}
                <button 
                  className="absolute top-[50%] right-[25%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                  title="Pedal Set"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Pedal Set
                  </div>
                </button>
                
                {/* Point 5 - Bottom Center */}
                <button 
                  className="absolute bottom-[30%] left-[45%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                  title="Racing Seat"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Racing Seat
                  </div>
                </button>
                
                {/* Point 6 - Bottom Right */}
                <button 
                  className="absolute bottom-[25%] right-[20%] w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                  title="Chassis Frame"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Chassis Frame
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Base Models Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 lg:mb-16 text-foreground">
            SIM RACING BASE MODELS
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-4xl mx-auto">
            {baseModels.map((model, index) => (
              <Card key={index} className="bg-card border-border overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted">
                  <img 
                    src={model.image}
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4 sm:p-6 text-center">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">
                    {model.name}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                    {model.description}
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-sm sm:text-base text-muted-foreground line-through">
                      {model.originalPrice}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-foreground">
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
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="relative order-1 lg:order-1">
              <img 
                src="/simracing-1.webp"
                alt="Sim Racing Concept Cockpit"
                className="w-full"
              />
            </div>
            
            <div className="order-2 lg:order-2">
              <h2 className="heading-lg text-accent-underline mb-4 sm:mb-6">
                SIM RACING CONCEPT
              </h2>
              <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                Modular and versatile ecosystem complimented by various add-on accessories
              </p>
              <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
                We offer an ecosystem of products serving the Sim Racing simulation segment from entry-level gamers to modular systems for trainees or advanced professionals, all at an affordable price. Each base model sim cockpit is upgradable and interchangeable via add-on modules.
              </p>
              <Button className="btn-primary w-full sm:w-auto">
                conversion kits
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Versatility Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="heading-lg text-center text-accent-underline mb-8 sm:mb-12 lg:mb-16">
            The most versatile SIM RACING cockpit on the market
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-1.webp"
                alt="Sim racing setup"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Sim racing setup, compatible with all major brands controls
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-2.webp"
                alt="Convert to flight sim setup"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Convert to flight sim setup
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                *available optional flight sim add-ons
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-3.webp"
                alt="Use as general lounge chair"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Use as general lounge chair
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-4.webp"
                alt="Need a break? Take a quick nap"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Need a break? Take a quick nap
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-5.webp"
                alt="Break it down to pieces and fold it in seconds"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Break it down to pieces and fold it in seconds
              </p>
            </div>

            <div className="text-center">
              <img 
                src="/sim-racing-cockpit/sim-racing-cockpit-6.webp"
                alt="Easy to move around"
                className="w-full h-auto mb-4"
              />
              <p className="text-sm sm:text-base text-foreground/80 font-medium">
                Easy to move around
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="bg-black">
        <video 
          src="/OpenWheeler-Simulation-Video.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-auto"
        >
          Your browser does not support the video tag.
        </video>
      </section>

      {/* Compatibility Image Section */}
      <section>
        <img 
          src="/compatibility-image.webp"
          alt="Compatibility with various brands"
          className="w-full h-auto"
        />
      </section>

      <Footer />
    </div>
  );
};

export default SimRacing;