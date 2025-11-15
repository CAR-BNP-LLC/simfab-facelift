import { getCanonicalUrl } from '@/utils/seo';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbSchema = ({ items }: BreadcrumbSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.url)
    }))
  };
  
  return (
    <script type="application/ld+json">
      {JSON.stringify(schema, null, 2)}
    </script>
  );
};
