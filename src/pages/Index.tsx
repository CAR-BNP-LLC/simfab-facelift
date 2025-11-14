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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
