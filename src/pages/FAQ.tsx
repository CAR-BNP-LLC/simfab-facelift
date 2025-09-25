import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ = () => {
  const faqs = [
    {
      question: "What products does SimFab offer?",
      answer: "SimFab specializes in modular simulation cockpits for flight simulation and sim racing, along with monitor mounting solutions and compatible accessories."
    },
    {
      question: "How long does shipping take?",
      answer: "Domestic shipping typically takes 3-7 business days. International shipping varies by location, usually 7-21 business days depending on customs processing."
    },
    {
      question: "Do you offer international shipping?",
      answer: "Yes, we ship worldwide. International customers are responsible for any customs duties or taxes imposed by their country."
    },
    {
      question: "What is your return policy?",
      answer: "We accept returns within 30 days of delivery for unused items in original packaging. Custom or modified products cannot be returned unless defective."
    },
    {
      question: "Are SimFab products compatible with my hardware?",
      answer: "Our products are designed to be compatible with most major simulation hardware brands. Check our Compatible Brands page or contact us for specific compatibility questions."
    },
    {
      question: "Do you provide assembly instructions?",
      answer: "Yes, all products come with detailed assembly manuals. You can also download them from our Assembly Manuals page."
    },
    {
      question: "What warranty do you offer?",
      answer: "We provide a limited warranty against manufacturing defects. Warranty period varies by product - typically 1-2 years for structural components."
    },
    {
      question: "Can I customize my order?",
      answer: "Yes, we offer customization services including custom drilling patterns and modifications. Contact us to discuss your specific requirements."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept major credit cards (Visa, Mastercard, American Express) and PayPal for secure online payments."
    },
    {
      question: "How do I track my order?",
      answer: "Once your order ships, you'll receive a tracking number via email. You can use this to track your package on the carrier's website."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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

        <div className="bg-card rounded-lg p-8 text-center mt-16">
          <h2 className="text-3xl font-bold text-card-foreground mb-4">
            Still Have Questions?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Can't find what you're looking for? Our customer support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
              Contact Support
            </button>
            <button className="border border-border text-foreground px-6 py-3 rounded-lg hover:bg-muted transition-colors">
              Live Chat
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;