import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const TrainerStation = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="order-1 lg:order-1">
            <img 
              src="/trainer-station-main-page.webp"
              alt="Trainer station modular cockpit"
              className="w-full rounded-xl shadow-card"
            />
            <p className="text-xs sm:text-sm text-muted-foreground mt-4 text-center">
              Providing precise replication of popular aircrafts with true to life controls placement
            </p>
          </div>

          <div className="order-2 lg:order-2">
            <h3 className="heading-md mb-4">
              SimFab Trainer Station Modular Cockpit
            </h3>
            
            <p className="text-lg sm:text-xl text-white font-semibold mb-4 sm:mb-6">
              Designed to Foster Skill Development
            </p>

            <p className="text-base sm:text-lg text-foreground/80 mb-4 sm:mb-6 leading-relaxed">
              Whether you're a budding pilot honing your muscle memory or a seasoned aviator refining your emergency procedures, the SimFab Trainer Station is your trusted companion.
            </p>

            <p className="text-base sm:text-lg text-foreground/80 mb-6 sm:mb-8 leading-relaxed">
              Its modular design allows for easy customization, catering to the needs of candidates preparing for FAA certification and current pilots seeking to sharpen their skills.
            </p>

            <div className="mb-6 sm:mb-8">
              <span className="text-2xl sm:text-3xl font-bold text-card-foreground">from $999</span>
            </div>

            <Link to="/shop?search=trainer+station">
              <Button className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                buy now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrainerStation;