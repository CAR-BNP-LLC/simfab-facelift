import { ProductWithDetails } from '@/services/api';
import { getCanonicalUrl, getAbsoluteImageUrl } from '@/utils/seo';

interface ProductSchemaProps {
  product: ProductWithDetails;
  region?: 'us' | 'eu';
}

export const ProductSchema = ({ product, region = 'us' }: ProductSchemaProps) => {
  const baseUrl = getCanonicalUrl(`/product/${product.slug}`);
  const currency = region === 'us' ? 'USD' : 'EUR';
  
  // Get price - prefer sale_price, then regular_price, then price_min
  // Handle both ProductWithDetails structure and direct price fields
  const price = (product as any).price?.sale || 
                (product as any).price?.regular || 
                (product as any).price?.min ||
                (product as any).sale_price ||
                (product as any).regular_price ||
                (product as any).price_min || 0;
  
  // Get availability
  const inStock = product.stock?.inStock ?? (product.stock?.quantity ?? 0) > 0;
  const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  
  // Get images
  const images = product.images?.map(img => getAbsoluteImageUrl(img.image_url)).filter(Boolean) || [];
  
  // Get categories
  let category = 'Simulation Equipment';
  if (product.categories && Array.isArray(product.categories) && product.categories.length > 0) {
    category = product.categories[0];
  } else if (typeof product.categories === 'string') {
    try {
      const parsed = JSON.parse(product.categories);
      if (Array.isArray(parsed) && parsed.length > 0) {
        category = parsed[0];
      }
    } catch (e) {
      // Use default
    }
  }
  
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description || '',
    image: images.length > 0 ? images : undefined,
    brand: {
      '@type': 'Brand',
      name: 'SimFab'
    },
    category: category,
    offers: {
      '@type': 'Offer',
      url: baseUrl,
      priceCurrency: currency,
      price: price.toString(),
      priceValidUntil: product.sale_end_date || '2025-12-31',
      availability: availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'SimFab'
      }
    }
  };
  
  return (
    <script type="application/ld+json">
      {JSON.stringify(schema, null, 2)}
    </script>
  );
};
