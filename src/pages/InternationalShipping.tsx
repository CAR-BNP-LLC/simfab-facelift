import Header from '@/components/Header';

const InternationalShipping = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 max-w-6xl">
        {/* Hero Section */}
        <div className="text-left mb-12 sm:mb-16">
          <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
            Shipping Outside Europe: How to Order from SimFab.com
          </h1>
          <div className="w-full h-1 bg-primary mb-8"></div>
          <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
            This European SimFab store ships only to countries within Europe. If you are located
            outside Europe (for example in the United States, Canada, or other regions), please
            place your order directly on our main website at{' '}
            <a
              href="https://simfab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              simfab.com
            </a>
            .
          </p>
        </div>

        <div className="prose prose-lg max-w-none text-justify">
          {/* How it works section */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">
              Ordering from outside Europe
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-8 sm:mb-12">
              If your shipping address is not in Europe, you should order from our global store at{' '}
              <a
                href="https://simfab.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                simfab.com
              </a>{' '}
              where we handle all non-European orders.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
              {/* Step 1: Go to SimFab.com */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h6" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Step 1: Visit SimFab.com</h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  Go to our main store at{' '}
                  <a
                    href="https://simfab.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    simfab.com
                  </a>{' '}
                  and browse the full SimFab catalog. This site is optimized for customers outside
                  Europe.
                </p>
              </div>

              {/* Step 2: Add items and check available shipping */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Step 2: Add items and check shipping options
                  </h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  Add your desired items to the cart on{' '}
                  <a
                    href="https://simfab.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    simfab.com
                  </a>{' '}
                  and proceed to checkout. You&apos;ll see the available shipping methods and
                  prices for your country or region.
                </p>
              </div>

              {/* Step 3: Complete your purchase */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Step 3: Complete your purchase on SimFab.com
                  </h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  Once you&apos;re happy with the products and shipping costs, complete the checkout
                  on{' '}
                  <a
                    href="https://simfab.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    simfab.com
                  </a>
                  . Your order will be processed and shipped from our main warehouse.
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

          {/* (Why section removed per updated EU shipping messaging) */}

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
