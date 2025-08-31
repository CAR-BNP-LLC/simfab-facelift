import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-cockpit.jpg';

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Professional flight simulator cockpit setup"
          className="w-full h-full object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-screen flex items-center">
        <div className="max-w-2xl">
          <h1 className="heading-xl mb-6 text-shadow-lg">
            Elevate Your Flight Sim Experience
          </h1>
          <p className="text-xl text-foreground/90 mb-8 leading-relaxed">
            Professional modular cockpits designed for ultimate realism and precision
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="btn-primary text-lg px-8 py-4">
              SHOP NOW
            </Button>
            <Button className="btn-outline text-lg px-8 py-4">
              SEE MODELS
            </Button>
          </div>

          {/* Scroll Indicators */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div className="w-2 h-2 bg-foreground/30 rounded-full"></div>
              <div className="w-2 h-2 bg-foreground/30 rounded-full"></div>
              <div className="w-2 h-2 bg-foreground/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements - Hidden on mobile for performance */}
      <div className="hidden lg:block absolute top-1/4 right-16 opacity-60">
        <div className="w-32 h-24 bg-card/20 rounded-lg border border-border/30 backdrop-blur-sm animate-pulse"></div>
      </div>
      <div className="hidden lg:block absolute top-2/3 right-32 opacity-40">
        <div className="w-24 h-16 bg-card/20 rounded-lg border border-border/30 backdrop-blur-sm animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
    </section>
  );
};

export default Hero;