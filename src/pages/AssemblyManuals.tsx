import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { getCanonicalUrl } from '@/utils/seo';
import { BreadcrumbSchema } from '@/components/SEO/BreadcrumbSchema';

type ManualItem = {
  name: string;
  config: string;
  url: string;
  image?: string;
};

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

  const flightSimManuals: ManualItem[] = [
    {
      name: "DCS Flight Sim Modular Cockpit",
      config: "DCS Edition",
      url: "/assembly-manuals/Complete_flight_sim_pit_DCS_master_web-new.pdf",
      image: "/assembly-manuals/img/Complete-DCS-Edition-800x1200.webp"
    },
    {
      name: "MSFS Flight Sim Modular Cockpit",
      config: "MSFS Edition",
      url: "/assembly-manuals/Complete-flight-sim-pit-MSFS-edition-V6.2M-102824-master-manual-for-web.pdf",
      image: "/assembly-manuals/img/Complete_flight_sim_pit_MSFS_edition_master_web-1.webp"
    },
    {
      name: "Flight Sim #1 HOTAS Hybrid",
      config: "Configuration #1",
      url: "/assembly-manuals/FLIGHT-SIM-1-v5.2-102824-web.pdf",
      image: "/assembly-manuals/img/FLight-1BLACK-FIRST-FRAME-800x1200.webp"
    },
    {
      name: "Flight Sim #2 HOTAS Side-by-Side Mount",
      config: "Configuration #2",
      url: "/assembly-manuals/FLIGHT-SIM-2-v6.2-080725-web.pdf",
      image: "/assembly-manuals/img/FLight-2-BLACK-FIRST-FRAME-800x1209.webp"
    },
    {
      name: "Flight Sim #3 HOTAS Stick Center Bracket Kit",
      config: "Configuration #3",
      url: "/assembly-manuals/FLIGHT-SIM-3-v1.2-080725-web.pdf",
      image: "/assembly-manuals/img/023.FLIGHT-SIM-3-web.webp"
    },
    {
      name: "Flight Sim #4 HOTAS Rudder Pedal Plate Kit",
      config: "Configuration #4",
      url: "/assembly-manuals/FLIGHT-SIM-4-v3.2-080725-web.pdf",
      image: "/assembly-manuals/img/flight-04-800x1209.webp"
    },
    {
      name: "Flight Sim #5 General & Commercial Aviation Package",
      config: "Configuration #5",
      url: "/assembly-manuals/FLIGHT-SIM-5-Yoke-V7.2-080725-web.pdf",
      image: "/assembly-manuals/img/FLight-5-BLACK-FIRST-FRAME-800x1209.webp"
    },
    {
      name: "Flight Sim #6 Centered Stick, Lower Mount Bracket",
      config: "Configuration #6",
      url: "/assembly-manuals/Center-stick-lower-mount-bracket-v4.4-080725-web.pdf",
      image: "/assembly-manuals/img/DCS6-800x1200.webp"
    },
    {
      name: "Flight Sim #7 Stick Grip Extension Kit",
      config: "Configuration #7",
      url: "/assembly-manuals/Flight-stick-grip-extension-kit-V5.2-080725-web.pdf",
      image: "/assembly-manuals/img/grip-extension-black-800x1209.webp"
    },
    {
      name: "Flight Sim #8 Mounting Bracket Kit",
      config: "Configuration #8",
      url: "/assembly-manuals/FLIGHT-SIM-8-TMB-yokeandthrottle-V1.4-080725-web.pdf",
      image: "/assembly-manuals/img/Flight-Sim-8-TMB-800x1200.webp"
    },
    {
      name: "Flight Sim #9 Mounting Bracket Kit",
      config: "Configuration #9",
      url: "/assembly-manuals/TMB-TCA-yoke-9-installation-manual-V1.3-080725-for-web.pdf",
      image: "/assembly-manuals/img/TMB-TCA-Yoke9-800x1200.webp"
    },
    {
      name: "Flight Sim #10 AMSM Kit: Advanced Side Mount",
      config: "Configuration #10",
      url: "/assembly-manuals/FLIGHT-SIM-10-V2.3-080725-web.pdf",
      image: "/assembly-manuals/img/FLIGHT-SIM-10-web.webp"
    },
    {
      name: "Flight Sim #10A Left Or Right Vertical Panel Universal Bracket Kit",
      config: "Configuration #10A",
      url: "/assembly-manuals/FLIGHT-SIM-10A-add-on-universal-adapter-plate-assy-vertical-panel-V2.4-080725-web.pdf",
      image: "/assembly-manuals/img/FLIGHT-SIM-10A-web.webp"
    },
    {
      name: "Flight Sim #11 Helicopter Collective Bracket Kit",
      config: "Configuration #11",
      url: "/assembly-manuals/FLIGHT-SIM-11-V2.3-080825-web.pdf",
      image: "/assembly-manuals/img/FLIGHT-SIM-11-web.webp"
    },
    {
      name: "Flight Sim #12 MFD Holder Bracket Kit",
      config: "Configuration #12",
      url: "/assembly-manuals/FLIGHT-SIM-12-v3.3-080825-web.pdf",
      image: "/assembly-manuals/img/FLIGHT-SIM-12-web.webp"
    },
    {
      name: "Flight Sim #13 Right Side Advanced Modular Side Mount",
      config: "Configuration #13",
      url: "/assembly-manuals/FLIGHT-SIM-13-v1.7-080825-web.pdf",
      image: "/assembly-manuals/img/FLIGHT-SIM-13-web.webp"
    }
  ];

  const flightSimAddOnManuals: ManualItem[] = [
    {
      name: "Hybrid Flight Sim Modular Cockpit",
      config: "Hybrid Edition complete cockpit manual",
      url: "/assembly-manuals/Complete-flight-sim-pit-HYBRID-edition-V1.1-030824-master-manual-for-web.pdf",
      image: "/assembly-manuals/img/Hybrid.webp"
    },
    {
      name: "Trainer Cockpit with Avionics",
      config: "Trainer cockpit manual with avionics",
      url: "/assembly-manuals/Trainer-manual-with-avionics-V2.2mod-for-VF-avionics-070925-for-web.pdf",
      image: "/assembly-manuals/img/FFrame-Complete_flight_sim_pit_Trainer_station_master_web-1-400x604-1.webp"
    },
    {
      name: "Rotorcraft Flight Sim Setup",
      config: "Rotorcraft configuration and setup guide",
      url: "/assembly-manuals/Rotorceaft-V1-062824-for-web.pdf",
      image: "/assembly-manuals/img/FFrame-Complete_flight_sim_pit_Rotorcraft_master_web-1-400x604-1.webp"
    },
    {
      name: "Flight Sim #5A Yoke Add-On",
      config: "Additional yoke configuration manual for Flight Sim #5",
      url: "/assembly-manuals/FLIGHT-SIM-5A-Yoke-V1.4-080725-web.pdf",
      image: "/assembly-manuals/img/FLight-5-BLACK-FIRST-FRAME-400x604-1.webp"
    }
  ];

  const simRacingManuals: ManualItem[] = [
    {
      name: "GEN3 Racing Cockpit",
      config: "3rd Generation racing cockpit main manual",
      url: "/assembly-manuals/Main-Manual-V31.4-GEN3-080825-web.pdf",
      image: "/assembly-manuals/img/01.Main-Manual-web-800x1209.webp"
    },
    {
      name: "DD Conversion Kit",
      config: "DD conversion kit for OpenWheeler Gen2 and Gen3",
      url: "/assembly-manuals/DD-kit-V3.3-080825-web.pdf",
      image: "/assembly-manuals/img/DD_conversion_kit_web.webp"
    },
    {
      name: "DD Racing Cockpit",
      config: "Direct drive racing cockpit assembly manual",
      url: "/assembly-manuals/DD-cockpit-manual-V1.4-080825-web.pdf",
      image: "/assembly-manuals/img/DD-BLACK-FIRST-FRAME-400x604-1.webp"
    },
    {
      name: "USB Handbrake Accessory",
      config: "Generic USB handbrake installation manual",
      url: "/assembly-manuals/11.USB-generic-handbrake-web.pdf",
      image: "/assembly-manuals/img/11.USB-generic-handbrake-web.webp"
    }
  ];

  const monitorStandManuals: ManualItem[] = [
    {
      name: "Single Monitor Mount Stand",
      config: "Single monitor mount stand and add-on accessories",
      url: "/assembly-manuals/Single-monitor-mount-V5.2-081225-LDHD-web.pdf",
      image: "/assembly-manuals/img/05.Single-monitor-mount-web-800x1209.webp"
    },
    {
      name: "Triple Monitor Mount Stand (HD)",
      config: "Heavy duty three-monitor stand",
      url: "/assembly-manuals/3x-HD-monitor-stand-V2.7-081225-web.pdf",
      image: "/assembly-manuals/img/12.Triple-monitor-mount-HD.webp"
    },
    {
      name: "Triple Monitor Mount Stand (LD)",
      config: "Light duty triple monitor mount stand",
      url: "/assembly-manuals/Triple-monitor-mount-LD-V5.4-NEW-HINGES-081225-web-1.pdf",
      image: "/assembly-manuals/img/12.Triple-monitor-mount-LD.webp"
    },
    {
      name: "Overhead or Sub-Mount Monitor Bracket Kit",
      config: "Overhead and sub-mount monitor bracket kit",
      url: "/assembly-manuals/remote_monitor_mount_bracket_manual_web.pdf",
      image: "/assembly-manuals/img/Overhead-sub-mount-monitor-bracket-kit.webp"
    },
    {
      name: "Front Surround Speaker Tray Kit",
      config: "Front surround speakers bracket kit assembly manual and accessories",
      url: "/assembly-manuals/front-surround-speakers-bracket-kit-manual-V2.1-081225-web.pdf",
      image: "/assembly-manuals/img/Front-Surround-Speakers-bracket-800x1200.webp"
    },
    {
      name: "Rear Surround Speaker Bracket Kit",
      config: "Rear surround speakers bracket kit assembly manual",
      url: "/assembly-manuals/rear-surround-speakers-bracket-kit-manual-V2.3-081225-web.pdf",
      image: "/assembly-manuals/img/Rear-Surround-Speakers-bracket.webp"
    },
    {
      name: "Keyboard Tray Kit V2",
      config: "Keyboard tray kit V2 assembly manual",
      url: "/assembly-manuals/keyboard-tray-kit-V2-manual-V2.1-081225-web.pdf",
      image: "/assembly-manuals/img/Active-Articulating-Arm-with-Keyboard-or-Laptop-Tray-kit.webp"
    }
  ];

  const accessoryManuals: ManualItem[] = [
    {
      name: "Arm Rest Kit",
      config: "Arm rest kit assembly manual",
      url: "/assembly-manuals/Arm-Rest-kit-V2.1-081225-web.pdf",
      image: "/assembly-manuals/img/Arm_Rest_kit_web.webp"
    },
    {
      name: "Seat Lift Kit",
      config: "Seat lift kit V8.2 assembly manual",
      url: "/assembly-manuals/SEAT-LIFT-KIT-V8.2-081225-no-accessories-web.pdf",
      image: "/assembly-manuals/img/07.SEAT-LIFT-KIT-web.webp"
    },
    {
      name: "Seat Frame Extension Kit",
      config: "Seat frame extension kit V3.2 assembly manual",
      url: "/assembly-manuals/SEAT-FRAME-EXTENSION-Kit-V3.2-Manual-081225-web.pdf",
      image: "/assembly-manuals/img/06.SEAT-FRAME-EXTENSION-Kit-web.webp"
    },
    {
      name: "Harness Manual",
      config: "Harness installation and adjustment guide",
      url: "/assembly-manuals/Harness-manual-v5.1-081225-web.pdf",
      image: "/assembly-manuals/img/10.Harness-manual-web.webp"
    },
    {
      name: "Pillows Manual",
      config: "Pillows and headrest adjustment manual",
      url: "/assembly-manuals/pillows-manual-V2.1B-no-buckle-neck-081225-web.pdf",
      image: "/assembly-manuals/img/08.pillows-manual-web.webp"
    }
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
              <div key={index} className="bg-card rounded-lg p-6 border border-border max-w-[320px] mx-auto">
                {manual.image ? (
                  <div className="aspect-[210/297] bg-muted rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                    <img
                      src={manual.image}
                      alt={`${manual.name} preview`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-muted-foreground text-center">Manual Preview</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {manual.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{manual.config}</p>
                <Button className="w-full" variant="outline" asChild>
                  <a href={manual.url} target="_blank" rel="noopener noreferrer">
                    Download Manual
                  </a>
                </Button>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flightSimAddOnManuals.map((manual, index) => (
              <div key={index} className="bg-card rounded-lg p-6 border border-border max-w-[320px] mx-auto">
                {manual.image ? (
                  <div className="aspect-[210/297] bg-muted rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                    <img
                      src={manual.image}
                      alt={`${manual.name} preview`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-muted-foreground text-center">Manual Preview</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {manual.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{manual.config}</p>
                <Button className="w-full" variant="outline" asChild>
                  <a href={manual.url} target="_blank" rel="noopener noreferrer">
                    Download Manual
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Sim Racing Assembly Manuals */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Sim Racing Assembly Manuals
          </h2>
          <div className="w-16 h-1 bg-primary mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {simRacingManuals.map((manual, index) => (
              <div key={index} className="bg-card rounded-lg p-6 border border-border max-w-[320px] mx-auto">
                {manual.image ? (
                  <div className="aspect-[210/297] bg-muted rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                    <img
                      src={manual.image}
                      alt={`${manual.name} preview`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-muted-foreground text-center">Manual Preview</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {manual.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{manual.config}</p>
                <Button className="w-full" variant="outline" asChild>
                  <a href={manual.url} target="_blank" rel="noopener noreferrer">
                    Download Manual
                  </a>
                </Button>
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
              <div key={index} className="bg-card rounded-lg p-6 border border-border max-w-[320px] mx-auto">
                {manual.image ? (
                  <div className="aspect-[210/297] bg-muted rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                    <img
                      src={manual.image}
                      alt={`${manual.name} preview`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-muted-foreground text-center">Manual Preview</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {manual.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{manual.config}</p>
                <Button className="w-full" variant="outline" asChild>
                  <a href={manual.url} target="_blank" rel="noopener noreferrer">
                    Download Manual
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Cockpit Accessories Manuals */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Cockpit Accessories Assembly Manuals
          </h2>
          <div className="w-16 h-1 bg-primary mb-8"></div>
          <p className="text-muted-foreground mb-8">
            Additional accessories and comfort upgrades for your SimFab cockpit.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessoryManuals.map((manual, index) => (
              <div key={index} className="bg-card rounded-lg p-6 border border-border max-w-[320px] mx-auto">
                {manual.image ? (
                  <div className="aspect-[210/297] bg-muted rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                    <img
                      src={manual.image}
                      alt={`${manual.name} preview`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-muted-foreground text-center">Manual Preview</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {manual.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{manual.config}</p>
                <Button className="w-full" variant="outline" asChild>
                  <a href={manual.url} target="_blank" rel="noopener noreferrer">
                    Download Manual
                  </a>
                </Button>
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