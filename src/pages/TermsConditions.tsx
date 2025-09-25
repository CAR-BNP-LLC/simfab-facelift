import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TermsConditions = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Terms & Conditions
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-8"></div>
          <p className="text-muted-foreground">Last updated: March 2024</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing and using SimFab's website and services, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Product Information</h2>
            <p className="text-muted-foreground mb-4">
              SimFab strives to provide accurate product descriptions and specifications. However, we do not warrant that product descriptions or other content is accurate, complete, reliable, current, or error-free.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Pricing and Payment</h2>
            <p className="text-muted-foreground mb-4">
              All prices are subject to change without notice. Payment must be received before shipment of products. We accept major credit cards and PayPal.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Shipping and Delivery</h2>
            <p className="text-muted-foreground mb-4">
              Shipping times are estimates and may vary. SimFab is not responsible for delays caused by shipping carriers or customs processing for international orders.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Returns and Refunds</h2>
            <p className="text-muted-foreground mb-4">
              Returns are accepted within 30 days of delivery for unused items in original packaging. Custom or modified products cannot be returned unless defective.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">6. Warranty</h2>
            <p className="text-muted-foreground mb-4">
              SimFab products come with a limited warranty against manufacturing defects. Warranty period varies by product. Normal wear and tear is not covered.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              SimFab shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our products or services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">8. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              For questions about these Terms & Conditions, please contact us at legal@simfab.com or +359 88 930 6855.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsConditions;