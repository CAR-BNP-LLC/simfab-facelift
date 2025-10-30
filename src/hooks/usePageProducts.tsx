/**
 * usePageProducts Hook
 * Custom hook for fetching page products (public frontend use)
 */

import { useState, useEffect } from 'react';
import { pageProductsAPI, PageSectionProducts } from '@/services/api';

interface UsePageProductsResult {
  products: PageSectionProducts['products'];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePageProducts(pageRoute: string, section: string): UsePageProductsResult {
  const [products, setProducts] = useState<PageSectionProducts['products']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pageProductsAPI.getPublicPageProducts(pageRoute, section);
      if (response.success) {
        setProducts(response.data.products);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      console.error('Error fetching page products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pageRoute, section]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}


