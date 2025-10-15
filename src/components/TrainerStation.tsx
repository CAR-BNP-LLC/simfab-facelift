import { Button } from '@/components/ui/button';

const TrainerStation = () => {
  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <img 
              src="/trainer-station-main-page.webp"
              alt="Trainer station modular cockpit"
              className="w-full rounded-xl shadow-card"
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
  );
};

export default TrainerStation;