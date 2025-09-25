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
      
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            SimFab Concierge Services
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional drilling and customization services for your SimFab products
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <div key={index} className="bg-card rounded-lg p-6 border border-border">
              <div className="aspect-square bg-muted rounded-lg mb-6 flex items-center justify-center">
                <span className="text-muted-foreground">Service Image</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                {service.title}
              </h3>
              <p className="text-muted-foreground mb-4">{service.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">{service.price}</span>
                <Button>Order Service</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-card-foreground mb-4">
            Custom Services Available
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Need a custom drilling pattern or special modification? Our expert technicians 
            can provide tailored solutions for your specific simulation setup requirements.
          </p>
          <Button size="lg">Contact Us for Custom Work</Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;