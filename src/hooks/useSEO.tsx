import { Helmet } from 'react-helmet-async';

export interface SEOData {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'product';
  ogUrl?: string;
  productPrice?: number;
  productCurrency?: string;
  productAvailability?: 'in stock' | 'out of stock';
  noindex?: boolean;
}

export const useSEO = (data: SEOData) => {
  return (
    <Helmet>
      <title>{data.title}</title>
      <meta name="description" content={data.description} />
      {data.keywords && <meta name="keywords" content={data.keywords.join(', ')} />}
      {data.canonical && <link rel="canonical" href={data.canonical} />}
      {data.noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:type" content={data.ogType || 'website'} />
      <meta property="og:title" content={data.title} />
      <meta property="og:description" content={data.description} />
      {data.ogImage && <meta property="og:image" content={data.ogImage} />}
      {data.ogUrl && <meta property="og:url" content={data.ogUrl} />}
      
      {/* Product-specific Open Graph tags */}
      {data.ogType === 'product' && data.productPrice !== undefined && (
        <>
          <meta property="product:price:amount" content={data.productPrice.toString()} />
          <meta property="product:price:currency" content={data.productCurrency || 'USD'} />
          {data.productAvailability && (
            <meta property="product:availability" content={data.productAvailability} />
          )}
          <meta property="product:condition" content="new" />
        </>
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={data.title} />
      <meta name="twitter:description" content={data.description} />
      {data.ogImage && <meta name="twitter:image" content={data.ogImage} />}
    </Helmet>
  );
};
