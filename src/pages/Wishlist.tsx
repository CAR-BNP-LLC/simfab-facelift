import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WishlistButton } from '@/components/WishlistButton';
import { Heart, ShoppingCart, Eye, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Wishlist: React.FC = () => {
  const { wishlist, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = async (product: any) => {
    try {
      await addToCart(product.id, {}, 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  // Get product image helper function - handles wishlist item structure
  const getProductImage = (item: any) => {
    try {
      // First check product_images array from wishlist item (from API)
      if (Array.isArray(item.product_images) && item.product_images.length > 0) {
        // Sort to get primary image first
        const sortedImages = [...item.product_images].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        const primaryImage = sortedImages[0];
        const imageUrl = primaryImage.image_url || primaryImage.url;
        if (imageUrl) return imageUrl;
      }
      
      // Fallback: check product.images array (if it exists)
      if (item.product && Array.isArray(item.product.images) && item.product.images.length > 0) {
        const sortedImages = [...item.product.images].sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        const primaryImage = sortedImages[0];
        const imageUrl = primaryImage.image_url || primaryImage.url;
        if (imageUrl) return imageUrl;
      }
      
      // Handle single image string
      if (item.product && typeof item.product.images === 'string' && item.product.images) {
        return item.product.images;
      }
      
      // Debug: log if no image found
      console.warn('No image found for product:', {
        product_id: item.product?.id,
        product_name: item.product?.name,
        has_product_images: Array.isArray(item.product_images),
        product_images_count: item.product_images?.length || 0,
        has_product_images_prop: !!item.product?.images,
        product_images_type: typeof item.product?.images
      });
      
      return null;
    } catch (error) {
      console.error('Error getting product image:', error, item);
      return null;
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (wishlist.length === 0) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Heart className="h-24 w-24 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">
              Start adding items you love to your wishlist
            </p>
            <Button asChild>
              <Link to="/shop">Browse Products</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground">
            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item) => {
            const product = item.product;
            const primaryImage = getProductImage(item) || '/placeholder.svg';

            return (
              <Card key={item.id} className="relative">
                <CardContent className="p-0">
                  <div className="relative">
                    <Link to={`/product/${product.slug}`}>
                      <img
                        src={primaryImage}
                        alt={product.name}
                        className="w-full h-64 object-cover rounded-t-lg"
                      />
                    </Link>
                    
                    {/* Wishlist Button */}
                    <div className="absolute top-2 right-2 z-10">
                      <WishlistButton productId={product.id} variant="icon" size="sm" />
                    </div>
                  </div>

                  <div className="p-4">
                    <Link to={`/product/${product.slug}`}>
                      <h3 className="font-semibold text-lg mb-2 hover:text-primary">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-2 mb-4">
                      {(() => {
                        const currency = product.region === 'eu' ? '€' : '$';
                        return product.sale_price ? (
                          <>
                            <span className="text-lg font-bold text-destructive">
                              {currency}{product.sale_price.toFixed(2)}
                            </span>
                            <span className="text-sm line-through text-muted-foreground">
                              {currency}{product.regular_price?.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold">
                            {currency}{product.regular_price?.toFixed(2) || '0.00'}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Stock Status */}
                    {product.in_stock === '0' && (
                      <p className="text-sm text-destructive mb-2">Out of Stock</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                      >
                        <Link to={`/product/${product.slug}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.in_stock === '0'}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Wishlist;

