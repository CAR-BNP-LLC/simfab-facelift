import { Link } from 'react-router-dom';

const ProductCategories = () => {
  const categories = [
    {
      title: 'Flight Sim Modular Cockpits',
      description: 'Professional aviation simulation setups',
      image: '/flight-sim-1.webp',
      link: '/flight-sim'
    },
    {
      title: 'Sim Racing Cockpits', 
      description: 'High-performance racing simulation rigs',
      image: '/simfab-racing.webp',
      link: '/sim-racing'
    },
    {
      title: 'Monitor Stands',
      description: 'Single, triple, and overhead mount solutions',
      image: '/trimple-monitor.webp',
      link: '/monitor-stands'
    },
    {
      title: 'Racing & Flight Seats',
      description: 'Ergonomic seats with removable foam',
      image: '/trainer-station-main-page.webp',
      link: '/racing-flight-seats'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="heading-lg text-accent-underline mb-4">
            Product Categories
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {categories.map((category, index) => (
            <Link 
              key={index} 
              to={category.link}
              className="group cursor-pointer block overflow-visible relative"
            >
              <div className="aspect-square w-full overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <img 
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-2 text-center">
                {category.title}
              </h3>
              <p className="text-foreground/70 leading-relaxed break-words text-center text-sm">
                {category.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductCategories;