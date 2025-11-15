import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { getCanonicalUrl } from '@/utils/seo';
import { BreadcrumbSchema } from '@/components/SEO/BreadcrumbSchema';

const AssemblyManuals = () => {
  const seoElement = useSEO({
    title: 'Assembly Manuals & Setup Guides | SimFab Cockpit Installation | SimFab',
    description: 'Complete assembly manuals and setup guides for all SimFab cockpits and modules. Step-by-step installation instructions for DCS, MSFS, racing cockpits, Flight Sim add-on modules #1-13, and monitor stands. Download PDF guides.',
    canonical: getCanonicalUrl('/assembly-manuals'),
    ogType: 'website'
  });

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Assembly Manuals', url: '/assembly-manuals' }
  ];
  const flightSimManuals = [
    { name: "DCS Flight Sim Modular Cockpit", config: "DCS Edition" },
    { name: "MSFS Flight Sim Modular Cockpit", config: "MSFS Edition" },
    { name: "Flight Sim #1 HOTAS Hybrid", config: "Configuration #1" },
    { name: "Flight Sim #2 HOTAS Side-by-Side Mount", config: "Configuration #2" },
    { name: "Flight Sim #3 HOTAS Stick Center Bracket Kit", config: "Configuration #3" },
    { name: "Flight Sim #4 HOTAS Rudder Pedal Plate Kit", config: "Configuration #4" },
    { name: "Flight Sim #5 General & Commercial Aviation Package", config: "Configuration #5" },
    { name: "Flight Sim #6 Centered Stick, Lower Mount Bracket", config: "Configuration #6" },
    { name: "Flight Sim #7 Stick Grip Extension Kit", config: "Configuration #7" },
    { name: "Flight Sim #8 Mounting Bracket Kit", config: "Configuration #8" },
    { name: "Flight Sim #9 Mounting Bracket Kit", config: "Configuration #9" },
    { name: "Flight Sim #10 AMSM Kit: Advanced Side Mount", config: "Configuration #10" },
    { name: "Flight Sim #10A Left Or Right Vertical Panel Universal Bracket Kit", config: "Configuration #10A" },
    { name: "Flight Sim #11 Helicopter Collective Bracket Kit", config: "Configuration #11" },
    { name: "Flight Sim #12 MFD Holder Bracket Kit", config: "Configuration #12" },
    { name: "Flight Sim #13 Right Side Advanced Modular Side Mount", config: "Configuration #13" }
  ];

  const simRacingManuals = [
    { name: "GEN3 Racing Cockpit", config: "3rd Generation" },
    { name: "SimFab DD Conversion Kit", config: "DD Conversion Kit for OpenWheeler Gen2 and Gen3" }
  ];

  const monitorStandManuals = [
    { name: "Single Monitor Mount Stand", config: "Single Monitor Mount Stand and Add-on Accessories" },
    { name: "Triple Monitor Mount Stand (HD)", config: "Heavy Duty Mounting Brackets" },
    { name: "Triple Monitor Mount Stand (LD)", config: "Triple Monitor Mount Stand" },
    { name: "Overhead or Sub-Mount Monitor Bracket Kit", config: "Overhead, Sub-mount Monitor Bracket Kit" },
    { name: "Front Surround Speaker Tray Kit", config: "Front Surround Speakers Bracket Kit Assembly Manual and Accessories" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {seoElement}
      <BreadcrumbSchema items={breadcrumbItems} />
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Assembly Manuals
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Complete assembly guides and instructions for all SimFab products
          </p>
        </div>

        {/* Flight Sim Assembly Manuals */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Flight Sim Assembly Manuals
          </h2>
          <div className="w-16 h-1 bg-primary mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flightSimManuals.map((manual, index) => (
              <div key={index} className="bg-card rounded-lg p-6 border border-border">
                <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-muted-foreground text-center">Manual Preview</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {manual.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{manual.config}</p>
                <Button className="w-full" variant="outline">Download Manual</Button>
              </div>
            ))}
          </div>
        </section>

        {/* Flight Sim Add-On Configurations */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Flight Sim Add-On Configurations Assembly Manuals
          </h2>
          <div className="w-16 h-1 bg-primary mb-8"></div>
          <p className="text-muted-foreground mb-8">
            Additional configuration guides and optional accessories for enhanced flight simulation experience.
          </p>
        </section>

        {/* Sim Racing Assembly Manuals */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Sim Racing Assembly Manuals
          </h2>
          <div className="w-16 h-1 bg-primary mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {simRacingManuals.map((manual, index) => (
              <div key={index} className="bg-card rounded-lg p-6 border border-border">
                <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-muted-foreground text-center">Manual Preview</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {manual.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{manual.config}</p>
                <Button className="w-full" variant="outline">Download Manual</Button>
              </div>
            ))}
          </div>
        </section>

        {/* Monitor Stands Assembly Manuals */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Monitor Stands Assembly Manuals
          </h2>
          <div className="w-16 h-1 bg-primary mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitorStandManuals.map((manual, index) => (
              <div key={index} className="bg-card rounded-lg p-6 border border-border">
                <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-muted-foreground text-center">Manual Preview</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {manual.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{manual.config}</p>
                <Button className="w-full" variant="outline">Download Manual</Button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AssemblyManuals;