import Header from '@/components/Header';
import Footer from '@/components/Footer';

const IntellectualProperties = () => {
  const patents = [
    {
      title: "MODULAR MULTI-MONITOR MOUNT SYSTEM FOR A GAMING CHAIR ASSEMBLY",
      publicationNumber: "20220408931",
      type: "Application",
      filedDate: "September 6, 2022",
      publicationDate: "December 29, 2022",
      applicant: "HOME RACER LLC",
      inventor: "Dimitar Pavlov",
      abstract: "A modular multi-monitor amount system for a gaming chair assembly having a monitor framing assembly with a plurality of tubular framing elements selectively coupled together and with two opposing leg frame elements and a central monitor frame element coupled to the opposing leg frame elements and having two substantially parallel sections flanking and defining a central channel and having a left side and right side opposing the left side of the central monitor frame element and having a first screen support bracket frame element with opposing ends respectively coupled to the two substantially parallel sections of the central monitor frame element and disposed within the central channel defined thereon, the central monitor frame element having at least one electronic display bracket coupled thereto, wherein the electronic display bracket is operably configured to retain an electronic display thereon."
    },
    {
      title: "Gaming chair assembly with modular multi-monitor mount system",
      patentNumber: "11333294",
      type: "Grant",
      filedDate: "March 3, 2021",
      issueDate: "May 17, 2022",
      assignee: "HOME RACER LLC",
      inventor: "Dimitar Pavlov",
      abstract: "A gaming chair assembly with modular multi-monitor mount system that includes a monitor framing assembly couplable to a modular gaming chair frame assembly, wherein the monitor framing assembly includes a plurality of tubular framing elements selectively coupled together and include a lower leg support frame coupled to the modular gaming chair frame assembly and a central, left, and right monitor frame elements with two substantially parallel sections flanking and defining a central channel. The central monitor frame element may include a left and a right central hinge member selectively, translatably, lockably, and telescopically coupled to the central monitor frame element. The monitor frame elements include screen support bracket frame elements selectively, translatably, and lockably coupled to the two substantially parallel sections and include electronic display brackets thereto to enable adjustment and support for multiple electronic displays relative to the modular gaming chair frame assembly."
    },
    {
      title: "GAMING CHAIR ASSEMBLY WITH MODULAR MULTI-MONITOR MOUNT SYSTEM",
      publicationNumber: "20220120374",
      type: "Application",
      filedDate: "March 3, 2021",
      publicationDate: "April 21, 2022",
      applicant: "HOME RACER LLC",
      inventor: "Dimitar Pavlov",
      abstract: "A gaming chair assembly with modular multi-monitor mount system that includes a monitor framing assembly couplable to a modular gaming chair frame assembly, wherein the monitor framing assembly includes a plurality of tubular framing elements selectively coupled together and include a lower leg support frame coupled to the modular gaming chair frame assembly and a central, left, and right monitor frame elements with two substantially parallel sections flanking and defining a central channel. The central monitor frame element may include a left and a right central hinge member selectively, translatably, lockably, and telescopically coupled to the central monitor frame element. The monitor frame elements include screen support bracket frame elements selectively, translatably, and lockably coupled to the two substantially parallel sections and include electronic display brackets thereto to enable adjustment and support for multiple electronic displays relative to the modular gaming chair frame assembly."
    },
    {
      title: "Gaming simulation chasis",
      patentNumber: "11224286",
      type: "Grant",
      filedDate: "October 2, 2020",
      issueDate: "January 18, 2022",
      assignee: "HOME RACER LLC",
      inventor: "Dimitar Pavlov",
      abstract: "A gaming chair assembly with adjustable keyboard assembly having a base frame assembly with a tubular framing configuration and a keyboard tray assembly having a lower tubular arm member selectively and telescopically coupled to one of the plurality of base frame members in a selectively lockable configuration, a pivoting lower tubular arm member rotatably coupled to the lower tubular arm member, two upright tubular arm members coupled together, wherein one of the upright tubular arm members has a tubular t-post defining a through hole thereon. A keyboard support member is selectively, slidably, and lockably coupled to the tubular t-post and disposed within the through hole thereon and a keyboard tray member with a mounting bracket coupled thereto is pivotably coupled to a tray clamping member with a through hole defined thereon and that is selectively, slidably, and lockably coupled to the keyboard support member."
    },
    {
      title: "GAMING CHAIR ASSEMBLY WITH ADJUSTABLE KEYBOARD ASSEMBLY",
      publicationNumber: "20210100365",
      type: "Application",
      filedDate: "October 2, 2020",
      publicationDate: "April 8, 2021",
      applicant: "HOME RACER LLC",
      inventor: "Dimitar Pavlov",
      abstract: "A gaming chair assembly with adjustable keyboard assembly having a base frame assembly with a tubular framing configuration and a keyboard tray assembly having a lower tubular arm member selectively and telescopically coupled to one of the plurality of base frame members in a selectively lockable configuration, a pivoting lower tubular arm member rotatably coupled to the lower tubular arm member, two upright tubular arm members coupled together, wherein one of the upright tubular arm members has a tubular t-post defining a through hole thereon. A keyboard support member is selectively, slidably, and lockably coupled to the tubular t-post and disposed within the through hole thereon and a keyboard tray member with a mounting bracket coupled thereto is pivotably coupled to a tray clamping member with a through hole defined thereon and that is selectively, slidably, and lockably coupled to the keyboard support member."
    },
    {
      title: "Support frame for cockpit driving simulator",
      patentNumber: "D656553",
      type: "Grant",
      filedDate: "January 31, 2011",
      issueDate: "March 27, 2012",
      assignee: "Home Racer LLC",
      inventors: "Nikolay Blaskov, Miroslav Todorov",
      abstract: "Design patent for support frame for cockpit driving simulator."
    },
    {
      title: "Large universal plate bracket with apertures for a gaming chair assembly",
      patentNumber: "D913077",
      type: "Grant",
      filedDate: "October 1, 2019",
      issueDate: "March 16, 2021",
      assignee: "HOME RACER LLC",
      inventor: "Dimitar Maldenov Pavlov",
      abstract: "Design patent for large universal plate bracket with apertures for a gaming chair assembly."
    },
    {
      title: "Steering wheel plate bracket with apertures for a gaming chair assembly",
      patentNumber: "D913078",
      type: "Grant",
      filedDate: "October 2, 2019",
      issueDate: "March 16, 2021",
      assignee: "HOME RACER LLC",
      inventor: "Dimitar Maldenov Pavlov",
      abstract: "Design patent for steering wheel plate bracket with apertures for a gaming chair assembly."
    },
    {
      title: "Medium universal plate bracket with apertures for a gaming chair assembly",
      patentNumber: "D937070",
      type: "Grant",
      filedDate: "October 2, 2019",
      issueDate: "November 30, 2021",
      assignee: "HOME RACER LLC",
      inventor: "Dimitar Maldenov Pavlov",
      abstract: "Design patent for medium universal plate bracket with apertures for a gaming chair assembly."
    },
    {
      title: "Small lower universal plate bracket with apertures for a gaming chair assembly",
      patentNumber: "D937071",
      type: "Grant",
      filedDate: "October 2, 2019",
      issueDate: "November 30, 2021",
      assignee: "HOME RACER LLC",
      inventor: "Dimitar Maldenov Pavlov",
      abstract: "Design patent for small lower universal plate bracket with apertures for a gaming chair assembly."
    },
    {
      title: "Small upper universal plate bracket with apertures for a gaming chair assembly",
      patentNumber: "D937072",
      type: "Grant",
      filedDate: "October 2, 2019",
      issueDate: "November 30, 2021",
      assignee: "HOME RACER LLC",
      inventor: "Dimitar Maldenov Pavlov",
      abstract: "Design patent for small upper universal plate bracket with apertures for a gaming chair assembly."
    },
    {
      title: "Rudder pedal plate bracket with apertures for a gaming chair assembly",
      patentNumber: "D947004",
      type: "Grant",
      filedDate: "October 2, 2019",
      issueDate: "March 29, 2022",
      assignee: "Home Racer LLC",
      inventor: "Dimitar Maldenov Pavlov",
      abstract: "Design patent for rudder pedal plate bracket with apertures for a gaming chair assembly."
    },
    {
      title: "Rudder pedal plate support for a gaming chair assembly",
      patentNumber: "D947005",
      type: "Grant",
      filedDate: "October 2, 2019",
      issueDate: "March 29, 2022",
      assignee: "Home Racer LLC",
      inventor: "Dimitar Maldenov Pavlov",
      abstract: "Design patent for rudder pedal plate support for a gaming chair assembly."
    },
    {
      title: "Slotted pivot bracket for a gaming chair assembly",
      patentNumber: "D948315",
      type: "Grant",
      filedDate: "October 2, 2019",
      issueDate: "April 12, 2022",
      assignee: "HOME RACER LLC",
      inventor: "Dimitar Maldenov Pavlov",
      abstract: "Design patent for slotted pivot bracket for a gaming chair assembly."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 max-w-6xl">
        <div className="text-left mb-12 sm:mb-16">
          <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
            SimFab Intellectual Properties
          </h1>
          <div className="w-full h-1 bg-primary mb-8"></div>
          <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
            Patents Assigned to Home Racer LLC
          </p>
        </div>

        <div className="space-y-8 sm:space-y-12">
          {patents.map((patent, index) => (
            <div key={index} className="bg-card border border-border rounded-lg p-6 sm:p-8">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-primary mb-2 sm:mb-3">
                  {patent.title}
                </h2>
                <div className="flex flex-wrap gap-4 sm:gap-6 text-sm sm:text-base text-foreground/70">
                  <div className="flex items-center">
                    <span className="font-semibold text-foreground mr-2">
                      {patent.patentNumber ? 'Patent Number:' : 'Publication Number:'}
                    </span>
                    <span className="font-mono bg-muted px-2 py-1 rounded">
                      {patent.patentNumber || patent.publicationNumber}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold text-foreground mr-2">Type:</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      patent.type === 'Grant' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {patent.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div>
                  <span className="font-semibold text-foreground block mb-1">Filed:</span>
                  <span className="text-sm sm:text-base text-foreground/70">{patent.filedDate}</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground block mb-1">
                    {patent.issueDate ? 'Date of Patent:' : 'Publication Date:'}
                  </span>
                  <span className="text-sm sm:text-base text-foreground/70">
                    {patent.issueDate || patent.publicationDate}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-foreground block mb-1">
                    {patent.assignee ? 'Assignee:' : 'Applicant:'}
                  </span>
                  <span className="text-sm sm:text-base text-foreground/70">
                    {patent.assignee || patent.applicant}
                  </span>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <span className="font-semibold text-foreground block mb-2">
                  {patent.inventors ? 'Inventors:' : 'Inventor:'}
                </span>
                <span className="text-sm sm:text-base text-foreground/70">
                  {patent.inventors || patent.inventor}
                </span>
              </div>

              <div>
                <span className="font-semibold text-foreground block mb-2">Abstract:</span>
                <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                  {patent.abstract}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 sm:mt-16 p-6 sm:p-8 bg-muted/50 rounded-lg border-l-4 border-primary">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">
            Intellectual Property Notice
          </h3>
          <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
            All patents listed above are owned by Home Racer LLC. These intellectual properties represent 
            significant innovations in gaming chair and simulator technology. Unauthorized use, reproduction, 
            or distribution of these patented designs is strictly prohibited. For licensing inquiries or 
            questions regarding these patents, please contact us at{' '}
            <a href="mailto:info@simfab.com" className="text-primary hover:underline">
              info@simfab.com
            </a>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default IntellectualProperties;
