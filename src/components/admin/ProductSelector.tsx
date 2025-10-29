/**
 * Product Selector Component
 * Dialog for searching and selecting products to add to page sections
 */

import { useState, useEffect } from 'react';
import { Search, Plus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { productsAPI, Product } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface ProductSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (productId: number) => void;
  excludeProductIds?: number[];
}

export default function ProductSelector({
  open,
  onClose,
  onSelect,
  excludeProductIds = [],
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && searchQuery) {
      searchProducts();
    } else {
      setProducts([]);
    }
  }, [searchQuery, open]);

  const searchProducts = async () => {
    if (!searchQuery.trim()) {
      setProducts([]);
      return;
    }

    try {
      setLoading(true);
      const response = await productsAPI.search(searchQuery, { limit: 20 });
      if (response.success) {
        // Filter out already-added products
        const filtered = response.data.products.filter(
          p => !excludeProductIds.includes(p.id)
        );
        setProducts(filtered);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to search products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (productId: number) => {
    onSelect(productId);
  };

  const formatPrice = (product: Product) => {
    // Handle missing price object
    if (!product.price) {
      return '$0.00';
    }

    // Check for sale price
    if (product.is_on_sale && product.price.sale) {
      return (
        <span>
          <span className="line-through text-muted-foreground">
            ${product.price.regular || product.price.min || '0.00'}
          </span>{' '}
          <span className="text-primary font-bold">${product.price.sale}</span>
        </span>
      );
    }

    // Regular price
    const price = product.price.regular || product.price.min || product.price.max || 0;
    return `$${typeof price === 'number' ? price.toFixed(2) : price || '0.00'}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchProducts();
                  }
                }}
              />
            </div>
            <Button onClick={searchProducts} disabled={loading || !searchQuery.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery
                  ? 'No products found. Try a different search term.'
                  : 'Enter a search term to find products.'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{product.name}</h4>
                          <Badge variant="outline">{product.sku}</Badge>
                          {product.status !== 'active' && (
                            <Badge variant="secondary">{product.status}</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatPrice(product)}</span>
                          {product.stock && product.stock.quantity > 0 && (
                            <span>Stock: {product.stock.quantity}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelect(product.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

