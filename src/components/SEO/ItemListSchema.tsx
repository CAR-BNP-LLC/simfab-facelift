import { getCanonicalUrl, getAbsoluteImageUrl } from '@/utils/seo';

interface ProductItem {
  id: number;
  name: string;
  slug: string;
  price?: {
    min?: number;
    regular?: number;
    sale?: number;
  };
  images?: Array<{
    image_url: string;
  }>;
}

interface ItemListSchemaProps {
  name: string;
  items: ProductItem[];
}

export const ItemListSchema = ({ name, items }: ItemListSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'ItemList',
    name: name,
    itemListElement: items.map((item, index) => {
      const price = item.price?.sale || item.price?.regular || item.price?.min || 0;
      const image = item.images?.[0] ? getAbsoluteImageUrl(item.images[0].image_url) : undefined;
      
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: item.name,
          url: getCanonicalUrl(`/product/${item.slug}`),
          ...(image && { image: image }),
          ...(price > 0 && {
            offers: {
              '@type': 'Offer',
              price: price.toString(),
              priceCurrency: 'USD'
            }
          })
        }
      };
    })
  };
  
  return (
    <script type="application/ld+json">
      {JSON.stringify(schema, null, 2)}
    </script>
  );
};
