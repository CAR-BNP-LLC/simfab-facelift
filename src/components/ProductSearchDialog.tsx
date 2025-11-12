import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Product, productsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRegion } from '@/contexts/RegionContext';

interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

const ProductSearchDialog = ({ open, onOpenChange }: ProductSearchDialogProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number>();
  const latestRequestRef = useRef(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { region } = useRegion();

  // Reset state whenever dialog is closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      setError(null);
      latestRequestRef.current += 1; // invalidate pending requests
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (query.trim().length < MIN_QUERY_LENGTH) {
      window.clearTimeout(debounceRef.current);
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    window.clearTimeout(debounceRef.current);
    const requestId = ++latestRequestRef.current;

    debounceRef.current = window.setTimeout(async () => {
      try {
        const response = await productsAPI.search(query.trim(), { limit: 8 });

        if (latestRequestRef.current !== requestId) {
          return;
        }

        setResults(response.data.products || []);
        setHasSearched(true);
      } catch (err) {
        if (latestRequestRef.current !== requestId) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to search products';
        setError(message);
        setResults([]);
        toast({
          title: 'Search failed',
          description: message,
          variant: 'destructive',
        });
      } finally {
        if (latestRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, region]);

  const handleSelectProduct = (product: Product) => {
    onOpenChange(false);
    navigate(`/product/${product.slug}`);
  };

  const handleViewAll = () => {
    onOpenChange(false);
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
  };

  const formattedResults = useMemo(
    () =>
      results.map((product) => ({
        product,
        price: getProductPrice(product),
        image: getProductImage(product),
      })),
    [results],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search products..."
      />

      <CommandList>
        {loading && (
          <CommandGroup heading="Searching">
            <CommandItem disabled className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching products...
            </CommandItem>
          </CommandGroup>
        )}

        {!loading && error && (
          <CommandGroup heading="Error">
            <CommandItem disabled className="text-destructive">
              {error}
            </CommandItem>
          </CommandGroup>
        )}

        {!loading && !error && formattedResults.length > 0 && (
          <CommandGroup heading="Products">
            {formattedResults.map(({ product, price, image }) => (
              <CommandItem
                key={product.id}
                value={`${product.name} ${product.sku || ''}`}
                onSelect={() => handleSelectProduct(product)}
                className="flex items-center gap-3"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {product.sku || product.slug}
                  </p>
                </div>

                {price && (
                  <span className="flex-shrink-0 text-sm font-medium text-foreground">
                    {price}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && !error && formattedResults.length === 0 && (
          <CommandEmpty className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
            {query.trim().length < MIN_QUERY_LENGTH ? (
              <>
                <SearchIcon className="h-5 w-5" />
                <span>Type at least {MIN_QUERY_LENGTH} characters to search products</span>
              </>
            ) : hasSearched ? (
              <span>No products found. Try a different search term.</span>
            ) : (
              <span>Start typing to search products</span>
            )}
          </CommandEmpty>
        )}
      </CommandList>

      {query.trim().length >= MIN_QUERY_LENGTH && (
        <>
          <CommandSeparator />
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-xs text-muted-foreground">
              Showing up to {formattedResults.length} results for “{query.trim()}”
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewAll}
              className="h-8"
            >
              View all results
            </Button>
          </div>
        </>
      )}
    </CommandDialog>
  );
};

function getProductPrice(product: Product): string | null {
  try {
    const currency = product.region === 'eu' ? '€' : '$';

    if (product.price) {
      const { sale, regular, min, max } = product.price as any;
      if (sale) {
        return `${currency}${Number(sale).toFixed(2)}`;
      }
      if (regular) {
        return `${currency}${Number(regular).toFixed(2)}`;
      }
      if (min !== undefined && max !== undefined && min !== max) {
        return `${currency}${Number(min).toFixed(2)} - ${currency}${Number(max).toFixed(2)}`;
      }
      if (min !== undefined) {
        return `${currency}${Number(min).toFixed(2)}`;
      }
    }

    if (
      product.sale_price !== undefined &&
      product.sale_price !== null &&
      product.regular_price !== undefined &&
      product.regular_price !== null
    ) {
      return `${currency}${Number(product.sale_price).toFixed(2)}`;
    }

    if (product.regular_price !== undefined && product.regular_price !== null) {
      return `${currency}${Number(product.regular_price).toFixed(2)}`;
    }

    if (
      product.price_min !== undefined &&
      product.price_max !== undefined &&
      product.price_min !== product.price_max
    ) {
      return `${currency}${Number(product.price_min).toFixed(2)} - ${currency}${Number(
        product.price_max,
      ).toFixed(2)}`;
    }

    if (product.price_min !== undefined && product.price_min !== null) {
      return `${currency}${Number(product.price_min).toFixed(2)}`;
    }

    return null;
  } catch (error) {
    console.error('Failed to format product price', error, product);
    return null;
  }
}

function getProductImage(product: Product): string | null {
  try {
    if (Array.isArray(product.images) && product.images.length > 0) {
      const sorted = [...product.images].sort((a: any, b: any) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
      const primary = sorted[0];
      return primary?.image_url || primary?.url || null;
    }

    if (typeof (product as any).images === 'string' && (product as any).images) {
      return (product as any).images;
    }

    return null;
  } catch (error) {
    console.error('Failed to determine product image', error, product);
    return null;
  }
}

export default ProductSearchDialog;

