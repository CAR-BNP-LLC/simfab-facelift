import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 max-w-4xl">
        <div className="text-left mb-12 sm:mb-16">
          <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
            Cookie Policy (EU)
          </h1>
          <div className="w-full h-1 bg-primary mb-8"></div>
          <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
            This Cookie Policy explains how SimFab / Home Racer LLC (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar
            technologies on this website, in particular to comply with EU and UK requirements.
          </p>
        </div>

        <div className="prose prose-lg max-w-none text-justify">
          {/* What are cookies */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              What are cookies?
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile phone)
              when you visit a website. They are widely used to make websites work, to improve the user
              experience, and to provide information to the site owners. Some cookies are strictly necessary
              for the site to function, while others help us understand how the site is used or allow us to
              show you relevant content and offers.
            </p>
          </section>

          {/* How we use cookies */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              How we use cookies
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
              We use cookies and similar technologies on this website for the following purposes:
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg text-foreground leading-relaxed">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>
                  <strong>Essential / strictly necessary cookies:</strong> These cookies are required for the
                  website to function properly and cannot be switched off in our systems. They are usually set
                  only in response to actions you take, such as logging in, setting your privacy preferences,
                  or adding items to your cart.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>
                  <strong>Performance and analytics cookies:</strong> These cookies help us understand how
                  visitors interact with our site, so we can measure and improve performance (for example,
                  which pages are most popular, or how users move around the site).
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>
                  <strong>Functionality cookies:</strong> These cookies enable the website to provide enhanced
                  functionality and personalization, such as remembering your region or previously viewed
                  products.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>
                  <strong>Advertising and social media cookies:</strong> These may be set by us or by third
                  parties to build a profile of your interests and show you relevant ads on other sites, or to
                  enable social media features. If you do not allow these cookies, you will still see ads, but
                  they may be less relevant to you.
                </span>
              </li>
            </ul>
          </section>

          {/* Legal basis and consent */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Legal basis and consent (EU / UK users)
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
              For visitors from the European Economic Area (EEA), the United Kingdom, and similar jurisdictions,
              we rely on your consent to place non-essential cookies (such as analytics or advertising cookies)
              on your device. You can give or withdraw your consent using the cookie banner or your browser
              settings at any time.
            </p>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              Essential cookies are used based on our legitimate interest in providing you with a secure,
              high-quality online experience and in operating our website and services.
            </p>
          </section>

          {/* Managing cookies */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Managing your cookie preferences
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
              You can control and manage cookies in several ways. Please note that removing or blocking cookies
              can impact your experience on our website and some features may no longer work as intended.
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>
                  <strong>Browser settings:</strong> Most web browsers allow you to manage cookies through
                  their settings. You can configure your browser to block or delete cookies. Please refer to
                  your browser&apos;s help section for more information.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>
                  <strong>Third-party opt-outs:</strong> Some third-party providers offer their own opt-out
                  tools for analytics or advertising cookies. Where applicable, we may provide links to those
                  tools in our Privacy Policy.
                </span>
              </li>
            </ul>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              If you previously accepted cookies on this site and wish to change your choice, you can clear
              cookies for this website in your browser and re-visit the site to see the cookie notice again.
            </p>
          </section>

          {/* Cookies and personal data */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Cookies and personal data
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              Some cookies may collect information that is considered personal data under applicable law. For
              details about how we process your personal data, including your rights as a data subject, please
              refer to our{' '}
              <a href="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </section>

          {/* Changes */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Changes to this Cookie Policy
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in the cookies we use or
              for other operational, legal, or regulatory reasons. Any changes will be posted on this page
              with an updated &quot;last updated&quot; date. We encourage you to review this policy regularly
              to stay informed about our use of cookies.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Contact us
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              If you have any questions about this Cookie Policy or our use of cookies and similar
              technologies, please contact us at{' '}
              <a href="mailto:info@simfab.com" className="text-primary hover:underline">
                info@simfab.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;


