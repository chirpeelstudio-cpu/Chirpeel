
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  placeholders text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage message_templates"
ON public.message_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER set_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.message_templates (key, title, body, placeholders) VALUES
('quotation_send', 'Quotation Send',
'Hello {{customer_name}},

Greetings from {{company_name}}!

Please find your interior quotation details below:

📄 Quotation No: {{quotation_number}}
🛠 10-Year Warranty | 🚚 45-Day Delivery | 🔧 After-Sales Support | 🏭 Factory Precision

You can view or download your quotation here:
{{pdf_url}}

Kindly review the quotation and share your feedback. We''d be happy to assist you with any changes or clarifications.

Looking forward to your response.

— Team {{company_name}}',
ARRAY['customer_name','company_name','quotation_number','pdf_url','total_amount']),

('welcome', 'Welcome Message',
'Hello {{customer_name}},

Welcome to {{company_name}}! 🏡

Thank you for reaching out to us. We specialize in premium modular interiors with a 10-Year Warranty and 45-Day Delivery guarantee.

Our design consultant will connect with you shortly to understand your requirements.

— Team {{company_name}}',
ARRAY['customer_name','company_name']),

('ask_floorplan', 'Ask Floor Plan',
'Hello {{customer_name}},

To prepare an accurate quotation for your interiors, kindly share your floor plan (PDF / image) on this WhatsApp chat.

If you don''t have a floor plan, our team can arrange a free site measurement visit.

— Team {{company_name}}',
ARRAY['customer_name','company_name']),

('site_visit_scheduled', 'Site Visit Scheduled',
'Hello {{customer_name}},

Your site visit has been scheduled ✅

📅 Date: {{visit_date}}
⏰ Time: {{visit_time}}
👤 Designer: {{designer_name}}
📍 Location: {{site_address}}

Our team will reach out 30 minutes before arrival. Please ensure access to the site.

— Team {{company_name}}',
ARRAY['customer_name','company_name','visit_date','visit_time','designer_name','site_address']),

('payment_link', 'Payment Link',
'Hello {{customer_name}},

Thank you for confirming your order with {{company_name}}.

💰 Amount Due: ₹{{amount}}
📄 Quotation No: {{quotation_number}}
🔗 Payment Link: {{payment_url}}

Once payment is received, your project moves to production immediately.

— Team {{company_name}}',
ARRAY['customer_name','company_name','amount','quotation_number','payment_url']),

('site_completion', 'Site Completion',
'Hello {{customer_name}},

We''re happy to share that your interior project has been completed! 🎉

📄 Project: {{project_name}}
🛠 10-Year Warranty active from today
📞 Support: {{support_phone}}

We would love to hear your feedback and a Google review would mean the world to us:
{{review_url}}

Thank you for trusting {{company_name}}.

— Team {{company_name}}',
ARRAY['customer_name','company_name','project_name','support_phone','review_url']);
