import { getBaseUrl } from '@/utils/seo';

export const OrganizationSchema = () => {
  const baseUrl = getBaseUrl();
  
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    name: 'SimFab',
    url: baseUrl,
    logo: `${baseUrl}/SimFab-logo-red-black-min-crop.svg`,
    description: 'Professional modular cockpit systems and mounting solutions for flight simulation and sim racing',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English']
    }
  };
  
  return (
    <script type="application/ld+json">
      {JSON.stringify(schema, null, 2)}
    </script>
  );
};
