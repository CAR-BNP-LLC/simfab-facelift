import { useState } from 'react';
import { Search } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

// Sample product data matching the reference images
const products = [
  {
    id: 1,
    name: 'Flight Sim Modular Cockpit',
    price: 599.00,
    image: '/api/placeholder/300/200',
    category: 'FLIGHT SIM'
  },
  {
    id: 2,
    name: 'Active Articulating Arm with Keyboard',
    price: 199.00,
    priceRange: '199.00 - 278.98',
    image: '/api/placeholder/300/200',
    category: 'All Accessories'
  },
  {
    id: 3,
    name: 'SimFab Single Monitor Mount Stand',
    price: 219.00,
    priceRange: '219.00 - 249.00',
    image: '/api/placeholder/300/200',
    category: 'MONITOR STANDS'
  },
  {
    id: 4,
    name: 'Flight Sim #11 Helicopter Collective',
    price: 79.00,
    image: '/api/placeholder/300/200',
    category: 'FLIGHT SIM'
  },
  {
    id: 5,
    name: 'Flight Sim #12 MFD Holder Bracket Kit',
    price: 199.00,
    image: '/api/placeholder/300/200',
    category: 'Flight Sim Add-On Modules'
  },
  {
    id: 6,
    name: 'Large Universal Flight Plate (Plate A)',
    price: 29.99,
    image: '/api/placeholder/300/200',
    category: 'Flight Sim Add-On Modules'
  },
  {
    id: 7,
    name: 'Flight Sim #10A Left Or Right Vertical',
    price: 129.00,
    image: '/api/placeholder/300/200',
    category: 'FLIGHT SIM'
  },
  {
    id: 8,
    name: 'SimFab 4-way coupler',
    price: 24.99,
    image: '/api/placeholder/300/200',
    category: 'All Accessories'
  }
];

const categories = [
  'All',
  'All Accessories',
  'Conversion Kits',
  'FLIGHT SIM',
  'Flight Sim Add-On Modules',
  'MONITOR STANDS',
  'RACING & FLIGHT SEATS',
  'SIM RACING'
];

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-destructive mb-2">SimFab Shop</h1>
            <div className="w-20 h-1 bg-destructive"></div>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>

        {/* Category Navigation */}
        <div className="mb-12">
          <nav className="flex flex-wrap gap-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-sm font-medium pb-2 transition-colors relative ${
                  selectedCategory === category
                    ? 'text-destructive'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {category}
                {selectedCategory === category && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-destructive"></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="bg-card border-border hover:border-destructive/50 transition-colors group">
              <CardContent className="p-0">
                {/* Product Image */}
                <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  
                  {/* Price */}
                  <div className="mb-4">
                    {product.priceRange ? (
                      <span className="text-lg font-bold text-foreground">
                        ${product.priceRange}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-foreground">
                        ${product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {/* Buy Now Button */}
                  <Button 
                    variant="outline" 
                    className="w-full border-border text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                  >
                    BUY NOW
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No products found matching your criteria.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Shop;