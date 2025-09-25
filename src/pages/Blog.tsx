import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Blog = () => {
  const posts = [
    {
      title: "The Evolution of Flight Simulation Hardware",
      excerpt: "Exploring how flight simulation hardware has evolved and what the future holds...",
      date: "March 15, 2024",
      category: "Flight Sim"
    },
    {
      title: "Building the Perfect Sim Racing Setup",
      excerpt: "A comprehensive guide to creating an immersive sim racing experience...",
      date: "March 10, 2024", 
      category: "Sim Racing"
    },
    {
      title: "Monitor Configuration Best Practices",
      excerpt: "Tips for optimal monitor placement and configuration for simulation...",
      date: "March 5, 2024",
      category: "Monitors"
    },
    {
      title: "FlightSimExpo 2024 Recap",
      excerpt: "Highlights from this year's premier flight simulation event...",
      date: "February 28, 2024",
      category: "Events"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            SimFab Blog
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stay updated with the latest news, guides, and insights from the world of simulation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <article key={index} className="bg-card rounded-lg overflow-hidden border border-border">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">Article Image</span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{post.date}</span>
                </div>
                <h2 className="text-xl font-semibold text-card-foreground mb-3">
                  {post.title}
                </h2>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <button className="text-primary hover:underline">Read More</button>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
            Load More Posts
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;