const BrandLogos = () => {
  const brands = [
    'Turtle Beach',
    'VIRPIL Controls', 
    'Virtual Reality',
    'VKBSIM',
    'Xbox One/Series X|S'
  ];

  return (
    <section className="py-16 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-card-foreground mb-2">
            Recommended & Compatible Brands
          </h3>
          <p className="text-foreground/60">
            Trusted by leading manufacturers worldwide
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-16">
          {brands.map((brand, index) => (
            <div 
              key={index}
              className="text-center group cursor-pointer"
            >
              <div className="w-32 h-16 bg-foreground/10 rounded-lg flex items-center justify-center 
                            group-hover:bg-foreground/20 transition-all duration-300 
                            group-hover:scale-105">
                <span className="text-foreground/60 group-hover:text-foreground font-medium text-sm">
                  {brand}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandLogos;