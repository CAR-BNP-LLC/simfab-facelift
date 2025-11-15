import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { productsAPI, Product } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { WishlistButton } from '@/components/WishlistButton';
import { useRegion } from '@/contexts/RegionContext';
import { trackSearch, trackViewCategory } from '@/utils/facebookPixel';

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const { toast } = useToast();
  const { region } = useRegion();

  // Read category from URL params on mount
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, page, region]); // Refetch when region changes

  // Fetch categories on mount and when region changes
  useEffect(() => {
    fetchCategories();
  }, [region]);

  // Track Facebook Pixel ViewCategory when category is selected (including initial load)
  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const category = categories.find(cat => cat.id === selectedCategory);
      if (category) {
        trackViewCategory({
          content_name: category.name,
          content_category: category.name,
          content_type: 'product',
        });
      }
    }
  }, [selectedCategory, categories]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit: 20,
      };

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await productsAPI.getAll(params);
      
      setProducts(response.data.products || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalProducts(response.data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Set empty array so UI isn't stuck
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page
    fetchProducts();
    
    // Track Facebook Pixel Search event
    if (searchQuery.trim().length > 0) {
      trackSearch({
        search_string: searchQuery.trim(),
        content_type: 'product',
      });
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPage(1); // Reset to first page
    
    // Update URL params
    if (categoryId) {
      setSearchParams({ category: categoryId });
    } else {
      setSearchParams({});
    }
    
    // Track Facebook Pixel ViewCategory event
    if (categoryId) {
      const category = categories.find(cat => cat.id === categoryId);
      trackViewCategory({
        content_name: category?.name || categoryId,
        content_category: category?.name || categoryId,
        content_type: 'product',
      });
    }
  };

  // Check if sale is currently active
  const isSaleActive = (product: any) => {
    if (!product.is_on_sale) return false;
    
    const now = new Date();
    const startDate = product.sale_start_date ? new Date(product.sale_start_date) : null;
    const endDate = product.sale_end_date ? new Date(product.sale_end_date) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  };

  const getProductPrice = (product: any) => {
    try {
      const onSale = isSaleActive(product);
      const currency = product.region === 'eu' ? '€' : '$';
      
      // Handle both nested and flat price structures
      if (product.price && typeof product.price === 'object') {
        // New API structure
        if (product.price.min !== undefined && product.price.max !== undefined && product.price.min !== product.price.max) {
          return `${currency}${product.price.min.toFixed(2)} - ${currency}${product.price.max.toFixed(2)}`;
        }
        if (onSale && product.price.sale) {
          return { price: product.price.sale, original: product.price.regular, onSale: true };
        }
        if (product.price.regular) {
          return { price: product.price.regular, original: null, onSale: false };
        }
        if (product.price.min) {
          return { price: product.price.min, original: null, onSale: false };
        }
      }
      
      // Database structure (flat fields)
      if (product.price_min !== undefined && product.price_max !== undefined && product.price_min !== product.price_max) {
        return `${currency}${product.price_min.toFixed(2)} - ${currency}${product.price_max.toFixed(2)}`;
      }
      
      if (onSale && product.sale_price !== undefined && product.sale_price !== null) {
        return { price: product.sale_price, original: product.regular_price, onSale: true };
      }
      
      if (product.regular_price !== undefined && product.regular_price !== null) {
        return { price: product.regular_price, original: null, onSale: false };
      }
      
      return { price: 0, original: null, onSale: false };
    } catch (error) {
      console.error('Error getting product price:', error, product);
      return { price: 0, original: null, onSale: false };
    }
  };

  const getProductImage = (product: any) => {
    try {
      // Handle array of images
      if (Array.isArray(product.images) && product.images.length > 0) {
        // Sort to get primary image first
        const sortedImages = [...product.images].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        const primaryImage = sortedImages[0];
        return primaryImage.image_url || primaryImage.url || null;
      }
      
      // Handle single image string
      if (typeof product.images === 'string' && product.images) {
        return product.images;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting product image:', error, product);
      return null;
    }
  };

  const isProductInStock = (product: any) => {
    try {
      // Handle both structures
      if (product.stock !== undefined) {
        return product.stock > 0;
      }
      if (product.stock_quantity !== undefined) {
        return product.stock_quantity > 0;
      }
      if (product.in_stock === '1' || product.in_stock === true) {
        return true;
      }
      return true; // Default to in stock
    } catch (error) {
      return true;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-destructive mb-2">SimFab Shop</h1>
            <div className="w-39 h-1 bg-destructive"></div>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 bg-card border-border"
            />
            <Button
              onClick={handleSearch}
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              disabled={loading}
            >
              Search
            </Button>
          </div>
        </div>

        {/* Category Navigation */}
        <div className="mb-12">
          <nav className="flex flex-wrap gap-8">
            <button
              type="button"
              onClick={() => handleCategoryChange('')}
              className={`text-sm font-medium pb-2 transition-colors relative ${
                selectedCategory === ''
                  ? 'text-destructive'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All {categories.length > 0 && `(${categories.reduce((sum, cat) => sum + cat.count, 0)})`}
              {selectedCategory === '' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-destructive"></div>
              )}
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`text-sm font-medium pb-2 transition-colors relative ${
                  selectedCategory === category.id
                    ? 'text-destructive'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {category.name} ({category.count})
                {selectedCategory === category.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-destructive"></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-destructive mb-4" />
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive text-lg font-medium mb-2">Error loading products</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchProducts} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="bg-card border-border hover:border-destructive/50 transition-colors group flex flex-col relative cursor-pointer">
                  <CardContent className="p-0 relative flex flex-col flex-1">
                    {/* Wishlist Button - Top Right - Above clickable area */}
                    <div className="absolute top-2 right-2 z-30" onClick={(e) => e.stopPropagation()}>
                      <WishlistButton productId={product.id} variant="icon" size="sm" />
                    </div>
                    
                    {/* Clickable Link covering card content */}
                    <Link 
                      to={`/product/${product.slug}`}
                      className="absolute inset-0 z-10"
                      aria-label={`View ${product.name}`}
                      onClick={(e) => {
                        // Allow clicks on buttons to work independently
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('[role="button"]')) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    />
                    
                    {/* Product Image */}
                    <div className="aspect-square bg-muted rounded-t-lg overflow-hidden relative">
                      {isSaleActive(product) && product.sale_label && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold z-20">
                          {product.sale_label}
                        </div>
                      )}
                      {getProductImage(product) ? (
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">No image available</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-4 flex flex-col flex-1 gap-2 relative">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2">
                        {product.name}
                      </h3>
                      
                      {/* Price */}
                      <div>
                        {(() => {
                          const priceData = getProductPrice(product);
                          if (typeof priceData === 'string') {
                            return <span className="text-lg font-bold text-foreground">{priceData}</span>;
                          }
                          const currency = region === 'eu' ? '€' : '$';
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-destructive">
                                  {currency}{priceData.price.toFixed(2)}
                                </span>
                                {priceData.original && (
                                  <span className="text-sm line-through text-muted-foreground">
                                    {currency}{priceData.original.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              {priceData.onSale && priceData.original && (
                                <span className="text-xs text-green-600 font-medium">
                                  Save {currency}{(priceData.original - priceData.price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Stock Status */}
                      {!isProductInStock(product) && (
                        <p className="text-sm text-destructive">Out of Stock</p>
                      )}
                      
                      {/* Buy Now Button - Pushed to bottom with minimal gap */}
                      <div className="mt-auto pt-2 relative z-30" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/product/${product.slug}`} onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="outline" 
                            className="w-full border-border text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                            disabled={!isProductInStock(product)}
                          >
                            {!isProductInStock(product) ? 'OUT OF STOCK' : 'BUY NOW'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* No Results */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No products found matching your criteria.</p>
            {(selectedCategory || searchQuery) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory('');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Shop;