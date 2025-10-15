import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MovingBrandsBar = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  // All brand images from the recom-brands folder
  const brandImages = [
    'butkicker.webp',
    'ch_products.webp',
    'hanatec.webp',
    'hori.webp',
    'huneycomb.webp',
    'huv-logo.webp',
    'iniBuilds.webp',
    'komodo-simulators-logo.webp',
    'logitech.webp',
    'mace-logo.webp',
    'mfg.webp',
    'moza-logo.webp',
    'msi-logo.webp',
    'pc.webp',
    'ps4.webp',
    'ps5.webp',
    'realsim-gears.webp',
    'red-birds.webp',
    'saitek.webp',
    'simagic_logo.webp',
    'simgears-logo.webp',
    'thrustmaster.webp',
    'turtle_beach.webp',
    'varjo-logo.webp',
    'virpil.webp',
    'VirtualReality.webp',
    'vkb.webp',
    'winwing.webp',
    'xbox_one.webp',
    'xbox_x.webp'
  ];

  // Create duplicated array for seamless looping
  const duplicatedBrandImages = [...brandImages, ...brandImages];

  // Number of brands to show at once (responsive)
  const brandsToShow = {
    mobile: 3,
    tablet: 5,
    desktop: 8
  };

  const [visibleCount, setVisibleCount] = useState(brandsToShow.desktop);

  // Update visible count based on screen size
  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth < 768) {
        setVisibleCount(brandsToShow.mobile);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(brandsToShow.tablet);
      } else {
        setVisibleCount(brandsToShow.desktop);
      }
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  // Auto-scroll functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        // When we reach the end of the original array, reset to 0 without transition
        if (nextIndex >= brandImages.length) {
          setTimeout(() => {
            setIsTransitioning(false);
            setCurrentIndex(0);
            setTimeout(() => setIsTransitioning(true), 50);
          }, 700); // Wait for transition to complete
          return nextIndex;
        }
        return nextIndex;
      });
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [brandImages.length]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= brandImages.length) {
        setTimeout(() => {
          setIsTransitioning(false);
          setCurrentIndex(0);
          setTimeout(() => setIsTransitioning(true), 50);
        }, 700);
        return nextIndex;
      }
      return nextIndex;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex === 0) {
        setIsTransitioning(false);
        setCurrentIndex(brandImages.length - 1);
        setTimeout(() => setIsTransitioning(true), 50);
        return brandImages.length - 1;
      }
      return prevIndex - 1;
    });
  };

  return (
    <section className="py-16 bg-black border-y border-border overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div className="text-white">
            <h3 className="text-xl lg:text-2xl font-bold uppercase tracking-wider mb-2 text-white">
              Recommended & Compatible Brands
            </h3>
            <p className="text-gray-300 text-sm lg:text-base">
              Trusted by leading manufacturers worldwide
            </p>
          </div>
          
          <button 
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold text-sm uppercase tracking-wide hover:bg-primary/90 transition-colors duration-300"
          >
            See All
          </button>
        </div>

        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg"
            aria-label="Previous brands"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg"
            aria-label="Next brands"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Brands Carousel */}
          <div className="flex items-center justify-center px-16 overflow-hidden">
            <div 
              className={`flex items-center ${isTransitioning ? 'transition-transform duration-700 ease-in-out' : ''}`}
              style={{
                transform: `translateX(-${currentIndex * 120}px)`
              }}
            >
              {duplicatedBrandImages.map((brandImage, index) => (
                <div 
                  key={`${brandImage}-${index}`}
                  className="flex-shrink-0 p-4 hover:scale-105 transition-all duration-300 group"
                  style={{ minWidth: '120px' }}
                >
                  <img 
                    src={`/recom-brands/${brandImage}`}
                    alt={brandImage.replace('.webp', '').replace('_', ' ').replace('-', ' ')}
                    className="h-16 lg:h-20 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default MovingBrandsBar;
