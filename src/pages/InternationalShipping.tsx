import Header from '@/components/Header';

const InternationalShipping = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 max-w-6xl">
        {/* Hero Section */}
        <div className="text-left mb-12 sm:mb-16">
          <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
            Shipping Worldwide: How We Get Your Order to You?
          </h1>
          <div className="w-full h-1 bg-primary mb-8"></div>
          <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
            At SimFab, we strive to provide our customers with the best shopping experience, no matter where you are in the world. For orders outside the United States and Canada, we use a custom shipping process to ensure you get the most accurate and cost-effective shipping rates.
          </p>
        </div>

        <div className="prose prose-lg max-w-none text-justify">
          {/* How it works section */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">
              How it works?
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-8 sm:mb-12">
              Follow these simple steps to get your items delivered to your doorstep.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
              {/* Step 1: Add Items to Your Cart */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h6" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Step 1: Add Items to Your Cart</h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  Add your desired items to your cart and proceed to checkout. When you enter a shipping address outside of the United States and Canada, you'll notice that an automatic shipping rate isn't displayed.
                </p>
              </div>

              {/* Step 2: Request a Shipping Quote */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Step 2: Request a Shipping Quote</h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  Submit your request for a shipping quote and we'll receive your information and start working on finding the best shipping options for your location. We'll consider factors like the size, weight, and destination of your items to provide you with the most accurate shipping rate.
                </p>
              </div>

              {/* Step 3: Receive Your Quote via Email */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Step 3: Receive Your Quote via Email</h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  Our system will calculate the shipping cost and send you an automated email with the details. This email will include the shipping rate along with a button to proceed with your order if you're satisfied with the quote.
                </p>
              </div>

              {/* Step 4: Confirm & Complete Your Order */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Step 4: Confirm & Complete Your Order</h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  If the shipping cost meets your expectations, simply click the button provided in the email. This will restore your shopping cart, allowing you to proceed to payment and place your order. If the shipping cost doesn't suit you, there's no need to take any further action – your order will simply remain unprocessed.
                </p>
              </div>
            </div>
          </section>

          {/* Note Section */}
          <section className="mb-12 sm:mb-16">
            <div className="bg-muted/50 rounded-lg p-6 sm:p-8 border-l-4 border-primary">
              <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 sm:mb-6">
                Note:
              </h3>
              <p className="text-base sm:text-lg text-foreground leading-relaxed">
                We aim to provide shipping quotes as quickly as possible, but depending on the destination and order details, it may take up to 3-4 business days to receive your quote. We combine multiple items in your order into the fewest possible boxes, ensuring cost-effective and eco-friendly shipping.
              </p>
            </div>
          </section>

          {/* Why We Do This */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">
              Why We Do This?
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              International shipping can vary greatly depending on your location, and we want to make sure you receive the most accurate rate before you commit to your purchase. This process ensures transparency and gives you control over your international shipping options.
            </p>
          </section>

          {/* Contact Section */}
          <section className="mb-12 sm:mb-16">
            <div className="bg-primary/10 rounded-lg p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 sm:mb-6">
                Need Help?
              </h3>
              <p className="text-base sm:text-lg text-foreground leading-relaxed">
                If you have any questions or need further assistance, don't hesitate to contact us at{' '}
                <a href="mailto:info@simfab.com" className="text-primary hover:underline">
                  info@simfab.com
                </a>{' '}
                or{' '}
                <a href="tel:1-888-299-2746" className="text-primary hover:underline">
                  1-888-299-2746
                </a>{' '}
                (toll free for US & Canada).
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default InternationalShipping;
