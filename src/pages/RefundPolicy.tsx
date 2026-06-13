import { Helmet } from "react-helmet-async";

const RefundPolicy = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Refund & Cancellation Policy | Chirpeel</title>
      <meta name="description" content="Refund and cancellation policy for Chirpeel — booking, production, and delivery-stage rules for interior design projects." />
      <link rel="canonical" href="https://studiocrm.app/refund-policy" />
    </Helmet>
    <div className="pt-24 sm:pt-32 pb-16 sm:pb-20">
      <div className="container mx-auto section-padding max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Refund & Cancellation Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-foreground/80 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Overview</h2>
            <p>This policy explains how cancellations and refunds work for projects executed by Chirpeel (the studio). Because interior projects involve custom design and made-to-order manufacturing, refund eligibility depends on the stage of the project at the time of cancellation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Booking / Advance Amount</h2>
            <p>The booking amount (typically 10% of the project value) confirms your slot, locks pricing, and initiates design work. Of this, an amount equal to the design and consultation fee already consumed is non-refundable. The remainder is adjustable against your project invoice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Refund Eligibility — Before Production</h2>
            <p>If the project is cancelled after booking but <strong>before</strong> design freeze and material procurement, the client is eligible for a refund of paid amounts after deducting:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Design and 3D visualisation charges already rendered.</li>
              <li>Site visit and consultation costs.</li>
              <li>Applicable payment-gateway / transaction charges.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. No Refund — After Production Begins</h2>
            <p>Once material has been procured, cutting/manufacturing has started, or any custom item has been ordered from a vendor, the corresponding amount is <strong>non-refundable</strong>. This includes but is not limited to plywood, laminates, hardware, appliances, stone, glass, and shutters made to specification.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Cancellation by Client — Slab-Based Deductions</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Before design freeze:</strong> refund of paid amount minus design & consultation cost.</li>
              <li><strong>After design freeze, before material procurement:</strong> 15% of project value retained as cancellation charge plus design cost.</li>
              <li><strong>After material procurement / production start:</strong> 100% of cost of procured & produced items is non-refundable; balance, if any, is refunded.</li>
              <li><strong>After dispatch / installation start:</strong> no refund applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Cancellation by Chirpeel</h2>
            <p>In the rare event we are unable to deliver the project due to reasons attributable solely to us, the client will receive a full refund of unutilised amounts within 14 business days. We are not liable for any indirect or consequential losses.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Defects, Replacements & Rectification</h2>
            <p>Defective workmanship or material identified during handover or within the warranty period is addressed through <strong>repair or replacement</strong>, not through monetary refund. Please refer to the warranty section in our <a href="/terms" className="text-primary hover:underline">Terms & Conditions</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Refund Processing Time</h2>
            <p>Approved refunds are processed within <strong>7 to 14 business days</strong> from the date of confirmation, to the original mode of payment. Bank or gateway settlement timelines may add a few additional working days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Disputes</h2>
            <p>Any dispute regarding a refund must be raised in writing to <a href="mailto:hello@studiocrm.app" className="text-primary hover:underline">hello@studiocrm.app</a> within 15 days of the cancellation notice. Disputes are subject to the exclusive jurisdiction of the courts at your jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
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

export default RefundPolicy;
