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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category, index) => (
            <Link 
              key={index} 
              to={category.link}
              className="feature-card text-center group cursor-pointer block overflow-visible"
            >
              <div className="w-full h-48 bg-muted-foreground/20 rounded-lg mb-4 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                <img 
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-3">
                {category.title}
              </h3>
              <p className="text-foreground/70 leading-relaxed break-words">
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