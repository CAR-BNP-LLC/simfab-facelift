import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ProductFAQ, faqsAPI } from '@/services/api';

interface ProductFAQsProps {
  productId: number;
}

const ProductFAQs = ({ productId }: ProductFAQsProps) => {
  const [faqs, setFaqs] = useState<ProductFAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFAQs = async () => {
      try {
        const productFAQs = await faqsAPI.getProductFAQs(productId);
        setFaqs(productFAQs);
      } catch (error) {
        console.error('Error loading FAQs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, [productId]);

  if (loading) {
    return (
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (faqs.length === 0) {
    return null; // Don't show anything if no FAQs
  }

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
      
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={`faq-${faq.id}`} className="border-b">
            <AccordionTrigger className="text-left hover:no-underline">
              <span className="font-medium">{faq.question}</span>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="prose prose-sm max-w-none text-muted-foreground">
                {faq.answer.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default ProductFAQs;
