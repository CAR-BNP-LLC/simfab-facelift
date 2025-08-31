import { Button } from '@/components/ui/button';
import racingImage from '@/assets/sim-racing-cockpit.jpg';

const SimRacingSection = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="heading-lg text-accent-underline mb-6">
              SIM RACING
            </h2>
            <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
              Master the track with our Gen3 compact chassis featuring telescopic steel tubing 
              and complete modularity. Seamlessly upgrade to direct drive systems while enjoying 
              the comfort of reclining and sliding seats.
            </p>
            <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
              Built for champions, our racing cockpits deliver professional-grade stability 
              and adjustability for drivers of all sizes and skill levels.
            </p>
            <Button className="btn-primary">
              SEE MORE
            </Button>
          </div>
          
          <div className="relative">
            <img 
              src={racingImage}
              alt="Red and black sim racing cockpit setup"
              className="w-full rounded-xl shadow-card"
            />
            <div className="absolute inset-0 bg-gradient-to-tl from-primary/10 to-transparent rounded-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimRacingSection;