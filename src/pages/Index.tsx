import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProductCategories from '@/components/ProductCategories';
import MovingBrandsBar from '@/components/MovingBrandsBar';
import FlightSimSection from '@/components/FlightSimSection';
import TrainerStation from '@/components/TrainerStation';
import SimRacingSection from '@/components/SimRacingSection';
import MonitorStandsSection from '@/components/MonitorStandsSection';
import FinalSection from '@/components/FinalSection';
import Footer from '@/components/Footer';
import SiteNotice from '@/components/SiteNotice';
import { useSEO } from '@/hooks/useSEO';
import { getCanonicalUrl } from '@/utils/seo';
import { OrganizationSchema } from '@/components/SEO/OrganizationSchema';
import { BreadcrumbSchema } from '@/components/SEO/BreadcrumbSchema';

const Index = () => {
  const seoElement = useSEO({
    title: 'SimFab - Complete Modular Flight Sim & Racing Cockpit Systems | Professional Simulation Equipment',
    description: 'Complete modular cockpit systems for flight simulation and sim racing. Includes seat, chassis, and all mounting hardware. Compatible with Thrustmaster, Logitech, Moza, Winwing, VKB, Virpil, and all major controller brands. Modular design with unlimited upgrade options.',
    canonical: getCanonicalUrl('/'),
    ogType: 'website'
  });

  const breadcrumbItems = [
    { name: 'Home', url: '/' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {seoElement}
      <OrganizationSchema />
      <BreadcrumbSchema items={breadcrumbItems} />
      <Header />
      <SiteNotice />
      <main>
        <Hero />
        <ProductCategories />
        <MovingBrandsBar />
        <FlightSimSection />
        <TrainerStation />
        <SimRacingSection />
        <MonitorStandsSection />
        <FinalSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
