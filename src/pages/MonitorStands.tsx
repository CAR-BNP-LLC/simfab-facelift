import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const MonitorStands = () => {
  const products = [
    {
      id: 1,
      name: "Single Monitor Mount Stand",
      description: "Monitor Mount Floor Stand for Racing and Flight Simulators",
      price: "$219",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      name: "Triple Monitor Mount Stand", 
      description: "Triple Monitor Mount Floor Stand for Racing and Flight Simulators",
      price: "$599",
      image: "/placeholder.svg"
    },
    {
      id: 3,
      name: "Overhead or Sub-mount Monitor Mount Bracket Kit",
      description: "Versatile mounting solution for various monitor configurations",
      price: "$129", 
      image: "/placeholder.svg"
    }
  ];

  const addOns = [
    {
      id: 1,
      name: "VESA Bracket Kit For Single Monitor 7",
      price: "$69.00",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      name: "Triple Monitor Stand Long Swing Arm",
      price: "$89.99",
      image: "/placeholder.svg"
    },
    {
      id: 3,
      name: "Monitor & TV Stands Height Adjustment",
      price: "$69.00 – $129.00",
      image: "/placeholder.svg"
    },
    {
      id: 4,
      name: "TV Mount System Bracket Kit",
      price: "$59.00",
      image: "/placeholder.svg"
    },
    {
      id: 5,
      name: "Monitor Mount System Vesa Adapter",
      price: "$69.00",
      image: "/placeholder.svg"
    },
    {
      id: 6,
      name: "Front Surround Speaker Tray Kit Monitor",
      price: "$79.99",
      image: "/placeholder.svg"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-32 bg-gradient-to-br from-background via-card to-background overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="heading-xl text-primary mb-8">
              MONITOR MOUNT SYSTEMS
            </h1>
            <p className="text-xl text-foreground/80 mb-12 leading-relaxed max-w-3xl mx-auto">
              Versatile LD and HD options, customizable single or triple monitor setups 
              with a modular design. Perfect for racing and flight simulators.
            </p>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5"></div>
      </section>

      {/* Products Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="heading-lg text-accent-underline mb-6">
              MONITORS & TV STANDS
            </h2>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
              Choose from our range of professional monitor mounting solutions 
              designed for optimal viewing and simulator integration.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <Card key={product.id} className="bg-background border-border hover:shadow-card transition-all duration-300">
                <CardContent className="p-6">
                  <div className="aspect-square bg-muted rounded-lg mb-6 flex items-center justify-center">
                    <div className="w-32 h-32 bg-muted-foreground/20 rounded"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {product.name}
                  </h3>
                  <p className="text-foreground/70 mb-6 leading-relaxed">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      {product.price}
                    </span>
                    <Button className="btn-primary">
                      BUY NOW
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="heading-lg text-accent-underline mb-8">
                MONITOR MOUNT SYSTEMS
              </h2>
              <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                Modular design for a personalized configuration
              </p>
              <p className="text-foreground/70 leading-relaxed mb-8">
                SimFab's monitor stands division provides versatile LD and HD options, 
                featuring customizable single or triple monitor setups with a modular design, 
                allowing users to personalize their configuration and mount additional screens 
                ranging from 24" monitors to 65" TVs horizontally or overhead and sub-mounted.
              </p>
            </div>
            
            <div className="relative">
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                <div className="w-64 h-40 bg-muted-foreground/20 rounded"></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tl from-primary/10 to-transparent rounded-xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Add-Ons Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="heading-lg text-accent-underline mb-6">
              Monitor Stand Add-Ons
            </h2>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
              Enhance your monitor setup with our comprehensive range of accessories 
              and mounting solutions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addOns.map((addon) => (
              <Card key={addon.id} className="bg-background border-border hover:shadow-card transition-all duration-300">
                <CardContent className="p-6">
                  <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <div className="w-20 h-20 bg-muted-foreground/20 rounded"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {addon.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      {addon.price}
                    </span>
                    <Button size="sm" className="btn-primary">
                      BUY NOW
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MonitorStands;