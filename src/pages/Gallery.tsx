import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Gallery = () => {
  const galleryCategories = [
    {
      title: "Flight Simulation Setups",
      images: 12,
      description: "Customer builds featuring our flight simulation cockpits and accessories"
    },
    {
      title: "Sim Racing Builds", 
      images: 8,
      description: "Racing enthusiasts showcasing their SimFab racing cockpits"
    },
    {
      title: "Monitor Configurations",
      images: 6,
      description: "Multi-monitor setups using our mounting solutions"
    },
    {
      title: "Custom Builds",
      images: 10,
      description: "Unique customer configurations and modifications"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Customer Gallery
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how our customers have brought their simulation dreams to life with SimFab products
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {galleryCategories.map((category, index) => (
            <div key={index} className="bg-card rounded-lg overflow-hidden border border-border">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">Gallery Preview</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-2">
                  {category.title}
                </h3>
                <p className="text-muted-foreground mb-4">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {category.images} images
                  </span>
                  <button className="text-primary hover:underline">View Gallery</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-card-foreground mb-4">
            Share Your Build
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Built something amazing with SimFab products? We'd love to feature your setup in our gallery! 
            Share your photos and inspire other simulation enthusiasts.
          </p>
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
            Submit Your Photos
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Gallery;