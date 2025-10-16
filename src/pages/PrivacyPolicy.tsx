import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 max-w-4xl">
        <div className="text-left mb-12 sm:mb-16">
          <h1 className="heading-xl mb-6 sm:mb-8 text-primary">
            Privacy Policy
          </h1>
          <div className="w-full h-1 bg-primary mb-8"></div>
          <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
        </div>

        <div className="prose prose-lg max-w-none text-justify">
          {/* Introduction */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Introduction
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              At Homeracer, we are committed to protecting the privacy and security of our users' personal information. This privacy policy outlines the types of personal data we collect, how we use it, and the rights and choices available to you.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Information We Collect
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
              We may collect the following types of personal information when you visit or interact with our website:
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg text-foreground leading-relaxed">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Contact Information:</strong> Name, email address, phone number, and mailing address.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Payment Information:</strong> Credit card details or other payment information.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Account Information:</strong> Usernames, passwords, and other credentials used to access our services.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Order Information:</strong> Details about the products or services you purchase from us.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Usage Data:</strong> Information about how you use our website, including pages visited, time spent, and other statistics.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Cookies and Similar Technologies:</strong> We may use cookies and similar technologies to collect information about your browsing activities.</span>
              </li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              How We Use Your Information
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
              We use the collected information for the following purposes:
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg text-foreground leading-relaxed">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To process and fulfill your orders or requests.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To provide customer support and address inquiries.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To personalize your experience and improve our website.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To communicate with you about updates, promotions, and relevant offers.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To comply with legal obligations and enforce our terms and conditions.</span>
              </li>
            </ul>
          </section>

          {/* Data Sharing and Disclosure */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Data Sharing and Disclosure
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
              We may share your personal information with:
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg text-foreground leading-relaxed">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Trusted third-party service providers who assist us in operating our business.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Payment processors to facilitate transactions and process payments securely.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Legal authorities or regulatory bodies when required by law or to protect our rights.</span>
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Data Retention
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              We will retain your personal information for as long as necessary to fulfill the purposes outlined in this privacy policy unless a longer retention period is required by law.
            </p>
          </section>

          {/* Data Security */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Data Security
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure. However, please be aware that no data transmission over the internet or storage system is entirely secure.
            </p>
          </section>

          {/* Your Rights and Choices */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Your Rights and Choices
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
              You have the right to:
            </p>
            <ul className="space-y-3 sm:space-y-4 text-base sm:text-lg text-foreground leading-relaxed">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Access, update, or delete your personal information.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Object to the processing of your data for certain purposes.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Opt-out of receiving marketing communications.</span>
              </li>
            </ul>
          </section>

          {/* Third-Party Links and Services */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Third-Party Links and Services
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              Our website may contain links to third-party websites or services. We are not responsible for their privacy practices, and we encourage you to review their privacy policies.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Children's Privacy
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              Our website is not intended for individuals under the age of 13. We do not knowingly collect personal information from children. If you believe that we may have inadvertently collected personal information from a child, please contact us immediately.
            </p>
          </section>

          {/* Changes to This Privacy Policy */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Changes to This Privacy Policy
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              We may update this privacy policy from time to time. Any changes will be posted on this page, and the revised version will be effective upon posting.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">
              Contact Us
            </h2>
            <p className="text-base sm:text-lg text-foreground leading-relaxed">
              If you have any questions or concerns about our privacy policy or the handling of your personal information, please contact us at{' '}
              <a href="mailto:info@simfab.com" className="text-primary hover:underline">
                info@simfab.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;