import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProductCategories from '@/components/ProductCategories';
import FlightSimSection from '@/components/FlightSimSection';
import TrainerStation from '@/components/TrainerStation';
import SimRacingSection from '@/components/SimRacingSection';
import BrandLogos from '@/components/BrandLogos';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <ProductCategories />
        <FlightSimSection />
        <TrainerStation />
        <SimRacingSection />
        <BrandLogos />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
