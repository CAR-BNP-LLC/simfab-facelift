import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import flightSimImage from '@/assets/flight-sim-cockpit.jpg';
import heroCockpitImage from '@/assets/hero-cockpit.jpg';
import trainerStationImage from '@/assets/trainer-station.jpg';

const ModularCockpitsCarousel = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  const images = [
    'modular-cockpits-1.webp',
    'modular-cockpits-2.webp',
    'modular-cockpits-3.webp',
    'modular-cockpits-4.webp',
    'modular-cockpits-5.webp',
    'modular-cockpits-6.webp',
    'modular-cockpits-7.webp',
    'modular-cockpits-8.webp',
    'modular-cockpits-9.webp',
    'modular-cockpits-10.webp',
    'modular-cockpits-11.webp',
    'modular-cockpits-12.webp',
    'modular-cockpits-13.webp'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative group">
      <div className="overflow-hidden">
        <img 
          src={`/modular-cockpits/${images[currentImage]}`}
          alt={`Modular cockpit ${currentImage + 1}`}
          className={`w-full transition-opacity duration-700 ease-in-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      
      {/* Navigation Arrows */}
      <button
        onClick={prevImage}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/20"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <button
        onClick={nextImage}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/20"
        aria-label="Next image"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      
      {/* Image counter dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index === currentImage ? 'bg-primary' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const FlightSim = () => {
  const baseModels = [
    {
      name: 'DCS Flight Sim Modular Cockpit',
      description: 'Dedicated combat cockpit purposed for mostly DCS world modules',
      price: '$599',
      image: flightSimImage,
      cta: 'BUY NOW'
    },
    {
      name: 'MSFS Flight Sim Modular Cockpit',
      description: 'Dedicated to civil, general and commercial aviation sim',
      price: '$599',
      image: flightSimImage,
      cta: 'BUY NOW'
    },
    {
      name: 'Hybrid Flight Sim Modular Cockpit',
      description: 'Ready for a combination of combat, civil aviation, and space sim gaming',
      price: '$499',
      image: flightSimImage,
      cta: 'BUY NOW'
    },
    {
      name: 'Rotorcraft Flight Sim Modular Cockpit',
      description: 'Coming soon!',
      price: 'from $589',
      image: flightSimImage,
      cta: 'SEE MORE'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative bg-card pb-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-6 gap-12 items-center">
              <div className="lg:col-span-2">
                <h1 className="heading-xl text-accent-underline mb-6">
                  FLIGHT SIM
                </h1>
                <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                  Modular flight simulation cockpits with high levels of fidelity, realism and immersion
                </p>
              </div>
              
              <div className="lg:col-span-4 relative max-w-full overflow-hidden">
                <img 
                  src="/flight-sim-1.webp"
                  alt="Flight simulator cockpit with labeled components"
                  className="w-full"
                />
                
                {/* Clickable Points */}
                <div className="absolute inset-0">
                  {/* Point 1 - Top Left */}
                  <button 
                    className="absolute top-[20%] left-[15%] w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Flight Controls"
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      Flight Controls
                    </div>
                  </button>
                  
                  {/* Point 2 - Top Center */}
                  <button 
                    className="absolute top-[25%] left-[50%] w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Instrument Panel"
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      Instrument Panel
                    </div>
                  </button>
                  
                  {/* Point 3 - Middle Left */}
                  <button 
                    className="absolute top-[45%] left-[20%] w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Throttle Controls"
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      Throttle Controls
                    </div>
                  </button>
                  
                  {/* Point 4 - Middle Right */}
                  <button 
                    className="absolute top-[50%] right-[25%] w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Multi-Function Display"
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      Multi-Function Display
                    </div>
                  </button>
                  
                  {/* Point 5 - Bottom Center */}
                  <button 
                    className="absolute bottom-[30%] left-[45%] w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Seat Base"
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      Seat Base
                    </div>
                  </button>
                  
                  {/* Point 6 - Bottom Right */}
                  <button 
                    className="absolute bottom-[25%] right-[20%] w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200 group"
                    title="Rudder Pedals"
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      Rudder Pedals
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Flight Sim Base Models */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="heading-lg text-center text-accent-underline mb-12">
              FLIGHT SIM BASE MODELS
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {baseModels.map((model, index) => (
                <div key={index} className="product-card text-center">
                  <div className="aspect-square bg-card rounded-lg mb-4 overflow-hidden">
                    <img 
                      src={model.image}
                      alt={model.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-card-foreground mb-3 leading-tight text-lg">
                    {model.name}
                  </h3>
                  <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
                    {model.description}
                  </p>
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
        </section>

        {/* Trainer Station Section */}
        <section className="py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <img 
                  src="/trainer-station-main-page.webp"
                  alt="Trainer station modular cockpit"
                  className="w-full shadow-card"
                />
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Providing precise replication of popular aircrafts with true to life controls placement
                </p>
              </div>

              <div>
                <h3 className="heading-md mb-4">
                  SimFab Trainer Station Modular Cockpit
                </h3>
                
                <p className="text-xl text-white font-semibold mb-6">
                  Designed to Foster Skill Development
                </p>

                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  Whether you're a budding pilot honing your muscle memory or a seasoned aviator refining your emergency procedures, the SimFab Trainer Station is your trusted companion.
                </p>

                <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                  Its modular design allows for easy customization, catering to the needs of candidates preparing for FAA certification and current pilots seeking to sharpen their skills.
                </p>

                <div className="mb-8">
                  <span className="text-3xl font-bold text-card-foreground">from $999</span>
                </div>

                <Button className="btn-primary text-lg px-8 py-4">
                  buy now
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Modular Cockpits Section */}
        <section className="py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="heading-lg text-accent-underline mb-6">
                  Modular Cockpits
                </h2>
                <h3 className="text-xl text-foreground/90 mb-6 font-medium">
                  For Diverse Flight Sim Experiences
                </h3>
                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  SimFab modular flight cockpit concept starts with several basic models covering the essentials at most affordable budget, without compromising quality and craftsmanship.
                </p>
                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  Base models are suitable for flight sim pilots entering the airfield of flight simulation who want to try it without breaking the bank. Each of our models has a modular design and is scalable and interchangeable with each other. Achieve your preferred setup, whether that's combat, general aviation, space sim or a hybrid.
                </p>
                <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                  Our base models are crafted for the type of flight simulation and type of flight controls, sharing similar attachment designs. Each of our three base models is scalable by purchasing individual modules. Each modular flight cockpit is interchangeable with one another, offered as an add-on kit.
                </p>
              </div>
              
              <div className="relative">
                <ModularCockpitsCarousel />
              </div>
            </div>
          </div>
        </section>

        {/* Add-on Modules Section */}
        <section className="py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <img 
                  src="/flight-sim-add-onn-composition.webp"
                  alt="Flight sim cockpit with labeled add-on modules"
                  className="w-full"
                />
              </div>
              
              <div>
                <h2 className="heading-lg text-accent-underline mb-6">
                  FLIGHT SIM ADD-ON MODULES
                </h2>
                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  Our flight sim options cover every aspect of flight simulation with ergonomic design, rigid mounting brackets, adjustment and full compatibility.
                </p>
                <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                  Flight sim configurations are suitable for combat and space sim as well as commercial and recreational flight simulation.
                </p>
                <Button className="btn-primary">
                  see add-ons
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default FlightSim;