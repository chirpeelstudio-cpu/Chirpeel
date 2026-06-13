
const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="pt-24 sm:pt-32 pb-16 sm:pb-20">
      <div className="container mx-auto section-padding max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-foreground/80 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>Chirpeel ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <p className="mb-2">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Personal Information:</strong> Name, phone number, email address, city, pincode, and other details you provide through our forms.</li>
              <li><strong>Project Details:</strong> Budget range, project type, preferred timeline, and floor plans you upload.</li>
              <li><strong>Employment Data:</strong> Resumes and related documents submitted through our Work With Us page.</li>
              <li><strong>Usage Data:</strong> Browser type, IP address, pages visited, and interaction data collected automatically.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>To provide interior design consultations and quotes.</li>
              <li>To communicate with you regarding your project or inquiry.</li>
              <li>To process job applications submitted through our careers section.</li>
              <li>To improve our website, services, and customer experience.</li>
              <li>To send promotional offers, updates, and newsletters (with your consent).</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Storage & Security</h2>
            <p>Your data is stored on secure servers. We implement industry-standard security measures including encryption, access controls, and regular security audits to protect your personal information from unauthorized access, alteration, or disclosure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Sharing of Information</h2>
            <p className="mb-2">We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Our internal design and project teams to serve you better.</li>
              <li>Trusted service providers who assist in website hosting, analytics, and communication.</li>
              <li>Legal authorities when required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookies & Tracking</h2>
            <p>Our website may use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can manage cookie preferences through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Third-Party Links</h2>
            <p>Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Access, update, or delete your personal data by contacting us.</li>
              <li>Opt out of marketing communications at any time.</li>
              <li>Request a copy of the data we hold about you.</li>
              <li>Withdraw consent for data processing where applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Children's Privacy</h2>
            <p>Our services are not directed to individuals under 18. We do not knowingly collect personal information from children.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with a revised "Last updated" date. We encourage you to review this policy periodically.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <ul className="mt-2 space-y-1">
              <li><strong>Email:</strong> hello@studiocrm.app</li>
              <li><strong>Phone:</strong> +91 95858 96733</li>
              <li><strong>Address:</strong> the studio, SF No.392/1, Nehru Street, Annuparpalayam, Thirumuruganpoondi, your jurisdiction, 641652</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
