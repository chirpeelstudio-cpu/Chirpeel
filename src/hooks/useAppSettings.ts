import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  monthly_lead_target: number;
  monthly_revenue_target: number;
  profit_margin_alert_pct: number;
  default_gst_rate: number;
  default_validity_days: number;
  overdue_threshold_days: number;
  pipeline_stages_visible: string[];
  default_followup_days: number;
  auto_snapshot_on_send: boolean;
  auto_create_project_on_first_payment: boolean;
  digest_send_hour: number;
  reminder_cadence_days: number;
}

const DEFAULTS: AppSettings = {
  monthly_lead_target: 50,
  monthly_revenue_target: 1_000_000,
  profit_margin_alert_pct: 25,
  default_gst_rate: 18,
  default_validity_days: 15,
  overdue_threshold_days: 1,
  pipeline_stages_visible: [],
  default_followup_days: 3,
  auto_snapshot_on_send: true,
  auto_create_project_on_first_payment: false,
  digest_send_hour: 9,
  reminder_cadence_days: 3,
};

let cached: AppSettings | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(cached ?? DEFAULTS);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (cached && Date.now() - cachedAt < TTL_MS) {
        setSettings(cached);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("app_settings" as any)
        .select("*")
        .maybeSingle();
      if (!alive) return;
      const d = data as any;
      const next: AppSettings = {
        monthly_lead_target: d?.monthly_lead_target ?? DEFAULTS.monthly_lead_target,
        monthly_revenue_target: d?.monthly_revenue_target ?? DEFAULTS.monthly_revenue_target,
        profit_margin_alert_pct: d?.profit_margin_alert_pct ?? DEFAULTS.profit_margin_alert_pct,
        default_gst_rate: d?.default_gst_rate ?? DEFAULTS.default_gst_rate,
        default_validity_days: d?.default_validity_days ?? DEFAULTS.default_validity_days,
        overdue_threshold_days: d?.overdue_threshold_days ?? DEFAULTS.overdue_threshold_days,
        pipeline_stages_visible: Array.isArray(d?.pipeline_stages_visible) ? d.pipeline_stages_visible : DEFAULTS.pipeline_stages_visible,
        default_followup_days: d?.default_followup_days ?? DEFAULTS.default_followup_days,
        auto_snapshot_on_send: d?.auto_snapshot_on_send ?? DEFAULTS.auto_snapshot_on_send,
        auto_create_project_on_first_payment: d?.auto_create_project_on_first_payment ?? DEFAULTS.auto_create_project_on_first_payment,
        digest_send_hour: d?.digest_send_hour ?? DEFAULTS.digest_send_hour,
        reminder_cadence_days: d?.reminder_cadence_days ?? DEFAULTS.reminder_cadence_days,
      };
      cached = next;
      cachedAt = Date.now();
      setSettings(next);
      setLoading(false);
    };
    load();
    return () => { alive = false; };
  }, []);

  return { settings, loading };
}

export function invalidateAppSettings() {
  cached = null;
  cachedAt = 0;
}
