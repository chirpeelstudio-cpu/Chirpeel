import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TenantSettings {
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  gstin: string | null;
  currency: string;        // ISO code: INR, USD, AED, GBP
  currencySymbol: string;  // ₹ $ د.إ £
  timezone: string;
  fyStartMonth: number;    // 1=Jan ... 12=Dec (India = 4)
  primaryColor: string | null;
  accentColor: string | null;
  isOnboarded: boolean;
}

const DEFAULTS: TenantSettings = {
  companyName: "Your Studio",
  tagline: null,
  logoUrl: null,
  email: null,
  phone: null,
  whatsapp: null,
  website: null,
  address: null,
  gstin: null,
  currency: "INR",
  currencySymbol: "₹",
  timezone: "Asia/Kolkata",
  fyStartMonth: 4,
  primaryColor: null,
  accentColor: null,
  isOnboarded: false,
};

let cached: TenantSettings | null = null;
let cachedAt = 0;
const TTL = 60_000;

export function invalidateTenantSettings() { cached = null; cachedAt = 0; }

export function useTenantSettings() {
  const [settings, setSettings] = useState<TenantSettings>(cached ?? DEFAULTS);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (cached && Date.now() - cachedAt < TTL) {
        setSettings(cached); setLoading(false); return;
      }
      const { data } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      const d = data as any;
      const next: TenantSettings = d ? {
        companyName: d.company_name || DEFAULTS.companyName,
        tagline: d.tagline ?? null,
        logoUrl: d.logo_url ?? null,
        email: d.email ?? null,
        phone: d.phone ?? null,
        whatsapp: d.whatsapp ?? null,
        website: d.website ?? null,
        address: d.address ?? null,
        gstin: d.gstin ?? null,
        currency: d.currency ?? "INR",
        currencySymbol: d.currency_symbol ?? "₹",
        timezone: d.timezone ?? "Asia/Kolkata",
        fyStartMonth: d.fy_start_month ?? 4,
        primaryColor: d.primary_color ?? null,
        accentColor: d.accent_color ?? null,
        isOnboarded: !!d.onboarding_completed_at && !!d.company_name,
      } : DEFAULTS;
      cached = next; cachedAt = Date.now();
      setSettings(next); setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { settings, loading };
}

export function formatMoney(amount: number, settings?: Pick<TenantSettings, "currencySymbol"> | null): string {
  const sym = settings?.currencySymbol ?? "₹";
  if (!isFinite(amount)) return `${sym}0`;
  return `${sym}${Math.round(amount).toLocaleString("en-IN")}`;
}
