import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Link } from 'react-router-dom';

const FAQ = () => {
  const faqs = [
    {
      question: "Do you ship outside of US & Canada?",
      answer: (
        <>
          We are working on adding shipping options outside of US and Canada.
          <br /><br />
          Meanwhile please provide us with list of products at{' '}
          <a href="mailto:info@simfab.com" className="text-primary hover:underline">
            info@simfab.com
          </a>, so we can provide you with shipping quote. We will also need shipping address to get accurate quote.
        </>
      )
    },
    {
      question: "What to do if there are missing pieces from my order?",
      answer: (
        <>
          Please reach out to us at{' '}
          <a href="mailto:info@simfab.com" className="text-primary hover:underline">
            info@simfab.com
          </a>{' '}
          or our toll-free line:{' '}
          <a href="tel:1-888-299-2746" className="text-primary hover:underline">
            1-888-299-2746
          </a>{' '}
          and provide your original order number.
          <br /><br />
          Also, please refer to our manuals, review appropriate manual and advise on missing parts based on the parts numbers and images in the manual.
          <br /><br />
          All manuals can be found here:{' '}
          <Link to="/assembly-manuals" className="text-primary hover:underline">
            Assembly Manuals
          </Link>
        </>
      )
    },
    {
      question: "Do you have affiliate program?",
      answer: (
        <>
          Currently we do not have dedicated affiliate program for content creators and influencers.
          <br /><br />
          However as a temporary solution we can provide you with special 5% off code that you can share with your followers. At the end of each month we run report and double up the 5% discount in form of commission to you.
          <br /><br />
          Please reach out to us at{' '}
          <a href="mailto:info@simfab.com" className="text-primary hover:underline">
            info@simfab.com
          </a>{' '}
          or our toll-free line:{' '}
          <a href="tel:1-888-299-2746" className="text-primary hover:underline">
            1-888-299-2746
          </a>.
        </>
      )
    },
    {
      question: "What is the warranty policy?",
      answer: "SimFab Modular Flight Sim Cockpit has lifetime warranty on all metal parts, 5 years warranty on all non metal parts."
    },
    {
      question: "What to do if I duplicated the order by mistake?",
      answer: (
        <>
          Please reach out to us at{' '}
          <a href="mailto:info@simfab.com" className="text-primary hover:underline">
            info@simfab.com
          </a>{' '}
          or our toll-free line:{' '}
          <a href="tel:1-888-299-2746" className="text-primary hover:underline">
            1-888-299-2746
          </a>{' '}
          and we will send you a prepaid return shipping label for the duplicate order. Please use original box to ship extra item back to us. Full refund will be issued the day item checks in back to our facility.
        </>
      )
    },
    {
      question: "How to get invoice for shipping outside of US and Canada?",
      answer: (
        <>
          You will receive payable invoice from our US PayPal as EU merchant is not set up yet. VAT will be excluded since billing comes from US. Package will ship from our warehouse in EU, Bulgaria.
          <br /><br />
          Please ensure you select or enter current and complete shipping address during PayPal payment process.
        </>
      )
    },
    {
      question: "Is SimFab interested in collaborations with controller brands?",
      answer: (
        <>
          We are definitely interested to learn more about your company and products. Please provide us information about your company like if you have any exclusive distribution agreements with US or EU based distributors and if you plan on engaging in such. Also, what is your warranty policy, terms, service and process in case of defects?
          <br /><br />
          Please reach out to us at{' '}
          <a href="mailto:info@simfab.com" className="text-primary hover:underline">
            info@simfab.com
          </a>{' '}
          or our toll-free line:{' '}
          <a href="tel:1-888-299-2746" className="text-primary hover:underline">
            1-888-299-2746
          </a>.
        </>
      )
    },
    {
      question: "Do you offer a military discount?",
      answer: (
        <>
          First of all thank you for your service. Please reach out to us at{' '}
          <a href="mailto:info@simfab.com" className="text-primary hover:underline">
            info@simfab.com
          </a>{' '}
          or our toll-free line:{' '}
          <a href="tel:1-888-299-2746" className="text-primary hover:underline">
            1-888-299-2746
          </a>{' '}
          and we will provide you with a 5% discount code for our entire catalog.
        </>
      )
    },
    {
      question: "Do you sell the frame only without the seat?",
      answer: (
        <>
          We don't offer such retail option because modifications need to be made to fit other seat to our frame. However we have available retail product for sim racing cockpit chassis Gen3 + DD conversion kit.
          <br /><br />
          We are always open to make custom solutions for our customers. Please reach out to us at{' '}
          <a href="mailto:info@simfab.com" className="text-primary hover:underline">
            info@simfab.com
          </a>{' '}
          or our toll-free line:{' '}
          <a href="tel:1-888-299-2746" className="text-primary hover:underline">
            1-888-299-2746
          </a>{' '}
          with your exact inquiry.
        </>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 max-w-4xl">
        <div className="text-left mb-12 sm:mb-16">
          <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
            FAQs
          </h1>
          <div className="w-full h-1 bg-primary mb-8"></div>
          <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
            Find answers to common questions about SimFab products and services
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="bg-card rounded-lg border border-border px-6">
              <AccordionTrigger className="text-left text-card-foreground hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="bg-card rounded-lg p-6 sm:p-8 text-center mt-12 sm:mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-4">
            Still Have Questions?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto text-base sm:text-lg">
            Can't find what you're looking for? Our customer support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:info@simfab.com" 
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors text-center"
            >
              Contact Support
            </a>
            <a 
              href="tel:1-888-299-2746" 
              className="border border-border text-foreground px-6 py-3 rounded-lg hover:bg-muted transition-colors text-center"
            >
              Call Us: 1-888-299-2746
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;