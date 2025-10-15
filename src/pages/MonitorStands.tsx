import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const MonitorMountSystemsCarousel = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  const images = [
    'monitor-mount-systems-1.webp',
    'monitor-mount-systems-2.webp',
    'monitor-mount-systems-3.webp',
    'monitor-mount-systems-4.webp',
    'monitor-mount-systems-5.webp',
    'monitor-mount-systems-6.webp',
    'monitor-mount-systems-7.webp',
    'monitor-mount-systems-8.webp',
    'monitor-mount-systems-9.webp',
    'monitor-mount-systems-10.webp'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative group">
      <div className="overflow-hidden">
        <img 
          src={`/monitor-mount-systems/${images[currentImage]}`}
          alt={`Monitor mount system ${currentImage + 1}`}
          className={`w-full transition-opacity duration-700 ease-in-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      
      {/* Navigation Arrows */}
      <button
        onClick={prevImage}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/20"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <button
        onClick={nextImage}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/20"
        aria-label="Next image"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      
      {/* Image counter dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index === currentImage ? 'bg-primary' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

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
      <section className="relative bg-black pb-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-6 gap-12 items-center">
            <div className="lg:col-span-3">
              <h1 className="heading-xl text-accent-underline mb-6">
                MONITOR MOUNT SYSTEMS
              </h1>
              <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                Versatile LD and HD options, customizable single or triple monitor setups with a modular design
              </p>
            </div>
            
            <div className="lg:col-span-3 relative max-w-full overflow-hidden">
              <img 
                src="/trimple-monitor.webp"
                alt="Monitor mount systems setup"
                className="w-full"
              />
            </div>
          </div>
        </div>
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
      <section className="py-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-lg text-accent-underline mb-6">
                MONITOR MOUNT SYSTEMS
              </h2>
              <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                Modular design for a personalized configuration
              </p>
              <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
                SimFab's monitor stands division provides versatile LD and HD options, featuring customizable single or triple monitor setups with a modular design, allowing users to personalize their configuration and mount additional screens ranging from 24" monitors to 65" TVs horizontally or overhead and sub-mounted.
              </p>
            </div>
            
            <div className="relative">
              <MonitorMountSystemsCarousel />
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