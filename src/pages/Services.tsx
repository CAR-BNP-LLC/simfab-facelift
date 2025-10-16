import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const Services = () => {
  const services = [
    {
      title: "Drilling Service for Collective Universal Plate",
      price: "$15.00",
      description: "Professional drilling service for precise mounting holes"
    },
    {
      title: "Drilling Service for Base Plate for Rudder Ped",
      price: "$25.00", 
      description: "Expert drilling service for rudder pedal base plate mounting"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section with Video */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
                SimFab Concierge Services
              </h1>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed max-w-4xl mx-auto">
                Professional drilling and customization services for your SimFab products
              </p>
            </div>
          </div>
        </section>

        {/* Video and Services Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
              {/* Left Side - Video */}
              <div className="order-2 lg:order-1">
                <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-lg max-w-sm mx-auto lg:mx-0">
                  <video 
                    className="w-full h-full object-cover"
                    controls
                    poster="/services-video-poster.jpg"
                  >
                    <source src="/services-video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>

              {/* Right Side - Services */}
              <div className="order-1 lg:order-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  {services.map((service, index) => (
                    <div key={index} className="bg-transparent border border-border rounded-lg p-4 sm:p-6">
                      <div className="aspect-square bg-muted rounded-lg mb-4 sm:mb-6 flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">Service Image</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm sm:text-base">{service.description}</p>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <span className="text-xl sm:text-2xl font-bold text-primary">{service.price}</span>
                        <Button className="btn-primary w-full sm:w-auto">BUY NOW</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Services Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="heading-lg mb-6 sm:mb-8 text-white">
                Custom Services Available
              </h2>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed mb-8 sm:mb-12">
                Need a custom drilling pattern or special modification? Our expert technicians 
                can provide tailored solutions for your specific simulation setup requirements.
              </p>
              <Button className="btn-primary">Contact Us for Custom Work</Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Services;