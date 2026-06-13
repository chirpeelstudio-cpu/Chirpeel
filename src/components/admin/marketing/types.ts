export type ChannelType = "meta" | "google_ads" | "whatsapp_cloud" | "whatsapp_thirdparty";

export interface MarketingChannel {
  id: string;
  channel_type: ChannelType;
  display_name: string | null;
  status: "not_connected" | "connected" | "error";
  config: Record<string, unknown>;
  secret_ref: string | null;
  last_event_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel_type: string;
  audience_filter: Record<string, unknown>;
  template_name: string | null;
  template_language: string | null;
  template_variables: unknown[];
  message_body: string | null;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed" | "cancelled";
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  audience_count: number;
  stats: { sent?: number; delivered?: number; read?: number; replied?: number; failed?: number };
  created_by: string | null;
  created_at: string;
}

export interface InboundLeadRow {
  id: string;
  channel_type: string;
  campaign_name: string | null;
  ad_name: string | null;
  payload: Record<string, unknown>;
  lead_id: string | null;
  processed_at: string | null;
  error: string | null;
  created_at: string;
}

export interface ChannelMeta {
  type: ChannelType;
  title: string;
  blurb: string;
  icon: string; // emoji fallback
  fields: Array<{
    key: string;
    label: string;
    placeholder?: string;
    secret?: boolean;
    helper?: string;
    type?: "text" | "textarea";
  }>;
  helpSteps: string[];
  webhookSlug?: string;
}

export const CHANNEL_META: Record<ChannelType, ChannelMeta> = {
  meta: {
    type: "meta",
    title: "Meta Lead Ads",
    blurb: "Receive Facebook & Instagram Lead Ads as pipeline leads.",
    icon: "Ⓜ️",
    fields: [
      { key: "page_id", label: "Page ID", placeholder: "1234567890" },
      { key: "verify_token", label: "Verify token", placeholder: "Choose any string", helper: "Paste this same string into Meta App → Webhooks → Verify Token." },
      { key: "access_token", label: "Page access token", secret: true, placeholder: "EAAG...", helper: "Long-lived Page Access Token from Meta Business Manager." },
    ],
    helpSteps: [
      "Go to developers.facebook.com → Your App → Webhooks → Page.",
      "Paste the Webhook URL above into the Callback URL field.",
      "Use the Verify Token you set above.",
      "Subscribe the page to the leadgen field.",
      "Generate a long-lived Page Access Token and paste it above.",
    ],
    webhookSlug: "meta-lead-webhook",
  },
  google_ads: {
    type: "google_ads",
    title: "Google Ads Lead Forms",
    blurb: "Receive Lead Form Extension submissions as pipeline leads.",
    icon: "🅖",
    fields: [
      { key: "shared_key", label: "Shared key", secret: true, placeholder: "Any random string", helper: "Paste this same key into the Google Ads Lead Form Webhook." },
    ],
    helpSteps: [
      "In Google Ads, open your Lead Form asset.",
      "Scroll to Lead delivery options → Webhook integration.",
      "Paste the Webhook URL above into the Webhook URL field.",
      "Paste the Shared Key above into the Key field.",
      "Click Send test data to verify.",
    ],
    webhookSlug: "google-ads-lead-webhook",
  },
  whatsapp_cloud: {
    type: "whatsapp_cloud",
    title: "WhatsApp Business (Cloud API)",
    blurb: "Send approved templates and receive replies via Meta WhatsApp Cloud API.",
    icon: "🟢",
    fields: [
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "1098765432109876" },
      { key: "business_account_id", label: "WhatsApp Business Account ID", placeholder: "9876543210987654" },
      { key: "verify_token", label: "Verify token", placeholder: "Choose any string" },
      { key: "access_token", label: "Permanent access token", secret: true, placeholder: "EAAG...", helper: "System User permanent token from Meta Business Manager." },
    ],
    helpSteps: [
      "Open Meta Business Manager → WhatsApp → API Setup.",
      "Copy the Phone Number ID and WABA ID into the fields above.",
      "Generate a permanent System User token with whatsapp_business_messaging + whatsapp_business_management.",
      "Paste the Webhook URL above into the WhatsApp Configuration → Callback URL.",
      "Use the Verify Token you set above and subscribe to messages.",
    ],
    webhookSlug: "whatsapp-webhook",
  },
  whatsapp_thirdparty: {
    type: "whatsapp_thirdparty",
    title: "3rd-party WhatsApp / Zapier",
    blurb: "Send via AiSensy, WATI, Interakt, Gallabox, Zapier, or any custom webhook.",
    icon: "🔗",
    fields: [
      { key: "outbound_url", label: "Outbound webhook URL", placeholder: "https://api.aisensy.com/...", helper: "We POST one JSON per recipient to this URL." },
      { key: "auth_header", label: "Auth header (optional)", secret: true, placeholder: "Bearer xyz...", helper: "Sent as the Authorization header on each request." },
    ],
    helpSteps: [
      "Create a campaign-trigger webhook in your provider (AiSensy, WATI, Interakt, Zapier, etc).",
      "Paste their webhook URL above.",
      "Optionally add an Authorization header value.",
      "Test by creating a draft campaign with a small audience.",
    ],
  },
};