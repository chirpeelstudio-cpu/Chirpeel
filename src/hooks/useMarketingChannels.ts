import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MarketingChannel, ChannelType } from "@/components/admin/marketing/types";

export function useMarketingChannels() {
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketing_channels")
      .select("*")
      .order("created_at", { ascending: true });
    setChannels((data ?? []) as unknown as MarketingChannel[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upsertChannel = useCallback(async (
    channel_type: ChannelType,
    config: Record<string, unknown>,
    display_name?: string,
  ) => {
    const existing = channels.find(c => c.channel_type === channel_type);
    if (existing) {
      const { error } = await supabase
        .from("marketing_channels")
        .update({ config: config as never, display_name: display_name ?? existing.display_name, status: "connected", last_error: null })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("marketing_channels")
        .insert([{ channel_type, config: config as never, display_name: display_name ?? null, status: "connected" }] as never);
      if (error) throw error;
    }
    await fetchAll();
  }, [channels, fetchAll]);

  const disconnectChannel = useCallback(async (channel_type: ChannelType) => {
    const existing = channels.find(c => c.channel_type === channel_type);
    if (!existing) return;
    const { error } = await supabase.from("marketing_channels").delete().eq("id", existing.id);
    if (error) throw error;
    await fetchAll();
  }, [channels, fetchAll]);

  const getChannel = useCallback((channel_type: ChannelType): MarketingChannel | undefined =>
    channels.find(c => c.channel_type === channel_type), [channels]);

  return { channels, loading, refresh: fetchAll, upsertChannel, disconnectChannel, getChannel };
}