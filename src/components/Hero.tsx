import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  
  return (
    <section className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
        style={{
          backgroundImage: "url('./main-page-first-bg-image.webp')"
        }}
      >
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
          
          <div className="flex justify-start">
            <Button 
              className="btn-primary text-lg px-8 py-4"
              onClick={() => navigate('/shop')}
            >
              SHOP NOW
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;