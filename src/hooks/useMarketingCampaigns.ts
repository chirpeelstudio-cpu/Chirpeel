import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MarketingCampaign } from "@/components/admin/marketing/types";

export function useMarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns((data ?? []) as unknown as MarketingCampaign[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createCampaign = useCallback(async (payload: Partial<MarketingCampaign>) => {
    const { data, error } = await supabase
      .from("marketing_campaigns")
      .insert([{
        name: payload.name ?? "Untitled campaign",
        channel_type: payload.channel_type ?? "whatsapp_cloud",
        audience_filter: payload.audience_filter ?? {},
        template_name: payload.template_name ?? null,
        template_language: payload.template_language ?? "en",
        template_variables: (payload.template_variables ?? []) as never,
        message_body: payload.message_body ?? null,
        status: payload.status ?? "draft",
        scheduled_at: payload.scheduled_at ?? null,
        audience_count: payload.audience_count ?? 0,
      }] as never)
      .select()
      .single();
    if (error) throw error;
    await fetchAll();
    return data as unknown as MarketingCampaign;
  }, [fetchAll]);

  const updateCampaign = useCallback(async (id: string, patch: Partial<MarketingCampaign>) => {
    const { error } = await supabase.from("marketing_campaigns").update(patch as never).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteCampaign = useCallback(async (id: string) => {
    const { error } = await supabase.from("marketing_campaigns").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  return { campaigns, loading, refresh: fetchAll, createCampaign, updateCampaign, deleteCampaign };
}