import { Helmet } from "react-helmet-async";

const TermsAndConditions = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Terms & Conditions | Chirpeel</title>
      <meta name="description" content="Terms & Conditions governing the interior design, modular kitchen, and execution services provided by Chirpeel, Tiruppur." />
      <link rel="canonical" href="https://studiocrm.app/terms" />
    </Helmet>
    <div className="pt-24 sm:pt-32 pb-16 sm:pb-20">
      <div className="container mx-auto section-padding max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-foreground/80 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction & Acceptance</h2>
            <p>These Terms & Conditions ("Terms") govern your engagement with Chirpeel (a brand of the studio), referred to as "we", "our", or "us". By signing a quotation, paying a booking amount, or otherwise engaging our services, you ("Client") agree to be bound by these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Services Offered</h2>
            <p>We provide interior design consultation, 3D visualisation, modular kitchen and wardrobe manufacturing, civil & false-ceiling work, electrical and plumbing coordination, painting, and end-to-end project execution for residential and commercial spaces.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Quotations & Pricing</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>All quotations are valid for the period stated on the document (default 15 days) and may be revised thereafter based on material costs.</li>
              <li>Prices are exclusive of GST unless explicitly stated; applicable GST is charged as per Indian law.</li>
              <li>Up to two (2) rounds of design revisions are included; additional revisions may be billed separately.</li>
              <li>Any item, finish, or scope not listed in the approved quotation is treated as extra work.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Payments & Milestones</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>10% booking amount on confirmation of design.</li>
              <li>50% on production / material procurement.</li>
              <li>30% before site delivery / installation.</li>
              <li>10% on handover and final walkthrough.</li>
              <li>Production and dispatch begin only after the corresponding milestone payment is received.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Project Timelines & Delays</h2>
            <p>Standard delivery is 45 days from the date of design freeze and receipt of the production milestone payment. Timelines may extend due to delays in client approvals, civil readiness, site access, payment delays, or force-majeure events. We will communicate any revised schedule in writing.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Warranty</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>10-year warranty on modular carcass and core structural workmanship, subject to normal domestic use.</li>
              <li>Hardware, appliances, and accessories carry the original manufacturer's warranty (Hettich, Hafele, Blum, etc.).</li>
              <li>Warranty does not cover damage from water seepage, termite, misuse, unauthorised modifications, or natural disasters.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Client Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Provide timely approvals on designs, materials, and finishes.</li>
              <li>Ensure the site is civil-ready (plastered, painted base, water & power available) before installation.</li>
              <li>Provide unobstructed site access during agreed working hours.</li>
              <li>Society / building permissions, lift charges, and material storage at site are the client's responsibility.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Changes & Variations</h2>
            <p>Any change requested after design freeze — including additions, substitutions, or relocations — will be quoted separately and may impact the agreed timeline. Work on changes begins only after written approval and applicable payment.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Cancellation</h2>
            <p>Cancellation terms and applicable deductions are detailed in our <a href="/refund-policy" className="text-primary hover:underline">Refund Policy</a>. In all cases, costs already incurred for design, custom material, and procurement are non-refundable.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Intellectual Property</h2>
            <p>All designs, drawings, 3D renders, mood boards, and creative output produced by Chirpeel remain our intellectual property. The client receives a non-exclusive licence to use them for their specific project. Reproduction, resale, or sharing with third-party vendors without written consent is prohibited.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Limitation of Liability</h2>
            <p>Our total liability for any claim arising out of the engagement shall not exceed the total contract value paid by the client. We are not liable for indirect, incidental, or consequential losses including loss of rental income, business interruption, or emotional distress.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Force Majeure</h2>
            <p>We shall not be held liable for delays or non-performance caused by events beyond our reasonable control, including natural disasters, pandemics, government restrictions, transport strikes, or supply-chain disruptions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">13. Governing Law & Jurisdiction</h2>
            <p>These Terms shall be governed by the laws of India. Any dispute arising hereunder shall be subject to the exclusive jurisdiction of the courts at your jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">14. Contact Us</h2>
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

export default TermsAndConditions;
