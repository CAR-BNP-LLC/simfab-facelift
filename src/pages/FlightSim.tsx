import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import flightSimImage from '@/assets/flight-sim-cockpit.jpg';
import heroCockpitImage from '@/assets/hero-cockpit.jpg';
import trainerStationImage from '@/assets/trainer-station.jpg';

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
        <section className="relative bg-card py-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="heading-xl text-accent-underline mb-6">
                  FLIGHT SIM
                </h1>
                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  Modular flight simulation cockpits with high levels of fidelity, realism and immersion
                </p>
                <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                  Experience unparalleled realism with our modular add-on capability and patented seat base 
                  featuring removable center foam insert. Customize your cockpit with precision-engineered 
                  add-on modules for any aircraft type.
                </p>
              </div>
              
              <div className="relative">
                <img 
                  src={heroCockpitImage}
                  alt="Flight simulator cockpit with labeled components"
                  className="w-full rounded-xl shadow-card"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-xl"></div>
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
        <section className="py-20 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <img 
                  src={trainerStationImage}
                  alt="SimFab Trainer Station Modular Cockpit"
                  className="w-full rounded-xl shadow-card"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-xl"></div>
              </div>
              
              <div>
                <h2 className="heading-lg text-accent-underline mb-6">
                  SimFab Trainer Station Modular Cockpit
                </h2>
                <h3 className="text-xl text-foreground/90 mb-6 font-medium">
                  Designed to Foster Skill Development
                </h3>
                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  Whether you're a budding pilot honing your muscle memory or a seasoned aviator refining your 
                  emergency procedures, the SimFab Trainer Station is your trusted companion.
                </p>
                <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                  Its modular design allows for easy customization, catering to the needs of candidates preparing for FAA 
                  certification and current pilots seeking to sharpen their skills.
                </p>
                <div className="flex items-center gap-6">
                  <div className="text-2xl font-bold text-primary">
                    from $999
                  </div>
                  <Button className="btn-primary">
                    BUY NOW
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modular Cockpits Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="heading-lg text-accent-underline mb-6">
                  MODULAR COCKPITS
                </h2>
                <h3 className="text-xl text-foreground/90 mb-6 font-medium">
                  For Diverse Flight Sim Experiences
                </h3>
                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  SimFab modular flight cockpit concept starts with several basic models covering the essentials at most 
                  affordable budget, without compromising quality and craftsmanship.
                </p>
                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  Base models are suitable for flight sim pilots entering the airfield of flight simulation who want to try it 
                  without breaking the bank. Each of our models has a modular design and is scalable and interchangeable 
                  with each other. Achieve your preferred setup, whether that's combat, general aviation, space sim or a hybrid.
                </p>
                <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                  Our base models are crafted for the type of flight simulation and type of flight controls, sharing similar 
                  attachment designs. Each of our three base models is scalable by purchasing individual modules. Each 
                  modular flight cockpit is interchangeable with one another, offered as an add-on kit.
                </p>
              </div>
              
              <div className="relative">
                <img 
                  src={flightSimImage}
                  alt="Person using modular flight sim cockpit"
                  className="w-full rounded-xl shadow-card"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Add-on Modules Section */}
        <section className="py-20 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <img 
                  src={heroCockpitImage}
                  alt="Flight sim cockpit with labeled add-on modules"
                  className="w-full rounded-xl shadow-card"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-xl"></div>
              </div>
              
              <div>
                <h2 className="heading-lg text-accent-underline mb-6">
                  FLIGHT SIM ADD-ON MODULES
                </h2>
                <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                  Our flight sim options cover every aspect of flight simulation with ergonomic design, rigid mounting 
                  brackets, adjustment and full compatibility.
                </p>
                <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                  Flight sim configurations are suitable for combat and space sim as well as commercial and recreational 
                  flight simulation.
                </p>
                <Button className="btn-primary">
                  SEE ADD-ONS
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