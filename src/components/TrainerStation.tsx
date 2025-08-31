import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import trainerImage from '@/assets/trainer-station.jpg';

const TrainerStation = () => {
  const features = [
    'FAA certification preparation',
    'Customizable training scenarios', 
    'Emergency procedures practice',
    'Multi-aircraft compatibility'
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <img 
              src={trainerImage}
              alt="Triple monitor flight simulator trainer station"
              className="w-full rounded-xl shadow-card"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/10 rounded-xl"></div>
          </div>

          <div>
            <h3 className="heading-md mb-4">
              SimFab Trainer Station Modular Cockpit
            </h3>
            
            <p className="text-xl text-primary font-semibold mb-6">
              Designed to Foster Skill Development
            </p>

            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <span className="text-3xl font-bold text-card-foreground">from $999</span>
            </div>

            <Button className="btn-primary text-lg px-8 py-4">
              BUY NOW
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrainerStation;