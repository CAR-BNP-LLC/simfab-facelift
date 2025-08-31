const ProductCategories = () => {
  const categories = [
    {
      title: 'Flight Sim Modular Cockpits',
      description: 'Professional aviation simulation setups',
      icon: '✈️'
    },
    {
      title: 'Sim Racing Cockpits', 
      description: 'High-performance racing simulation rigs',
      icon: '🏎️'
    },
    {
      title: 'Monitor Stands',
      description: 'Single, triple, and overhead mount solutions',
      icon: '🖥️'
    },
    {
      title: 'Racing & Flight Seats',
      description: 'Ergonomic seats with removable foam',
      icon: '🪑'
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
            <div key={index} className="feature-card text-center group cursor-pointer">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {category.icon}
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-3">
                {category.title}
              </h3>
              <p className="text-foreground/70 leading-relaxed">
                {category.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductCategories;