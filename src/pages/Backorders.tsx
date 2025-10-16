import Header from '@/components/Header';

const Backorders = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 max-w-6xl">
        {/* Hero Section */}
        <div className="text-left mb-12 sm:mb-16">
          <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
            Backorders Terms & Conditions
          </h1>
          <div className="w-full h-1 bg-primary mb-8"></div>
          <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
            At SimFab, we aim to provide a seamless shopping experience. Sometimes, popular items may be temporarily out of stock, but don't worry—we've got you covered! Here's everything you need to know about our backorder process.
          </p>
        </div>

        <div className="prose prose-lg max-w-none text-justify">
          {/* What is a Backorder */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">
              What is a Backorder?
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-6">
              When an item you love is temporarily unavailable, you can still place an order for it. This is called a backorder. We'll hold your place in line and ship the item as soon as it's back in stock.
            </p>
          </section>

          {/* How Backorders Work */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">
              How Backorders Work?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
              {/* Placing a Backorder */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h6" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-7 7-4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Placing a Backorder</h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  If an item is on backorder, you can still add it to your cart and proceed to checkout.
                </p>
              </div>

              {/* Payment for Backorders */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Payment for Backorders</h3>
                </div>
                <div className="text-white text-sm sm:text-base leading-relaxed space-y-3">
                  <p>Payment is collected at the time of your order, securing your spot in line.</p>
                  <p>If you're ordering multiple items, in-stock items will ship first, and the backordered items will ship separately once available.</p>
                </div>
              </div>

              {/* Shipping Backorders */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Shipping Backorders</h3>
                </div>
                <div className="text-white text-sm sm:text-base leading-relaxed space-y-3">
                  <p>We work hard to get backordered items to you as quickly as possible.</p>
                  <p>Once the item is restocked, we'll ship it out immediately. You'll receive a shipping confirmation with tracking details.</p>
                </div>
              </div>

              {/* Combining Shipments */}
              <div className="bg-black rounded-lg p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white rounded-full flex items-center justify-center mr-4 sm:mr-6">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Combining Shipments</h3>
                </div>
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  To minimize shipping costs and reduce environmental impact, we'll combine multiple items into the least number of packages whenever possible.
                </p>
              </div>
            </div>
          </section>

          {/* Managing Your Backorder */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">
              Managing Your Backorder
            </h2>
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">
                  Estimated Restock Times:
                </h3>
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  We do our best to provide accurate restock dates, but please note that these are estimates and subject to change.
                </p>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">
                  Order Updates:
                </h3>
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  We'll keep you updated via email with any changes to your backorder status. You can also check your order status anytime by logging into your account.
                </p>
              </div>
            </div>
          </section>

          {/* Modifying or Canceling a Backorder */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">
              Modifying or Canceling a Backorder
            </h2>
            <div className="space-y-6 sm:space-y-8">
              <p className="text-base sm:text-lg text-foreground leading-relaxed">
                Need to make changes? Contact us at{' '}
                <a href="mailto:info@simfab.com" className="text-primary hover:underline">
                  info@simfab.com
                </a>{' '}
                or{' '}
                <a href="tel:1-888-299-2746" className="text-primary hover:underline">
                  1-888-299-2746
                </a>{' '}
                (toll free for US & Canada).
              </p>
              <p className="text-base sm:text-lg text-foreground leading-relaxed">
                If your plans change, you can cancel your backorder anytime before it ships for a full refund.
              </p>
            </div>
          </section>

          {/* Why Choose Backordering */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">
              Why Choose Backordering?
            </h2>
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">
                  Secure Your Items:
                </h3>
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  Don't miss out on popular items—backordering lets you secure your favorites without waiting for a restock.
                </p>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">
                  Hassle-Free:
                </h3>
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  We'll keep you informed every step of the way, so you know exactly when to expect your items.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Backorders;
