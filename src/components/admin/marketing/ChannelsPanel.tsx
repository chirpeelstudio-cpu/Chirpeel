import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMarketingChannels } from "@/hooks/useMarketingChannels";
import { CHANNEL_META, type ChannelType } from "./types";
import ConnectChannelDialog from "./ConnectChannelDialog";
import { Skeleton } from "@/components/ui/skeleton";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function getWebhookUrl(channelType: ChannelType): string | undefined {
  const meta = CHANNEL_META[channelType];
  if (!meta.webhookSlug) return undefined;
  return `${SUPABASE_URL}/functions/v1/${meta.webhookSlug}`;
}

export default function ChannelsPanel() {
  const { channels, loading, upsertChannel, disconnectChannel, getChannel } = useMarketingChannels();
  const [openType, setOpenType] = useState<ChannelType | null>(null);

  const order: ChannelType[] = ["meta", "google_ads", "whatsapp_cloud", "whatsapp_thirdparty"];

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
      </div>
    );
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        {order.map(type => {
          const meta = CHANNEL_META[type];
          const channel = getChannel(type);
          const isConnected = channel?.status === "connected";
          return (
            <Card key={type} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{meta.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{meta.blurb}</p>
                  </div>
                </div>
                <Badge
                  variant={isConnected ? "default" : "outline"}
                  className={isConnected ? "bg-emerald-500 hover:bg-emerald-500" : ""}
                >
                  {isConnected ? "Connected" : "Not connected"}
                </Badge>
              </div>

              {channel?.last_event_at && (
                <p className="text-[11px] text-muted-foreground">
                  Last event {new Date(channel.last_event_at).toLocaleString()}
                </p>
              )}
              {channel?.last_error && (
                <p className="text-[11px] text-destructive line-clamp-2">⚠ {channel.last_error}</p>
              )}

              <div className="flex items-center gap-2 mt-auto pt-2">
                <Button size="sm" variant={isConnected ? "outline" : "default"} onClick={() => setOpenType(type)}>
                  {isConnected ? "Edit" : "Connect"}
                </Button>
                {isConnected && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={async () => {
                      if (confirm(`Disconnect ${meta.title}?`)) await disconnectChannel(type);
                    }}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {openType && (
        <ConnectChannelDialog
          open={!!openType}
          onOpenChange={(o) => !o && setOpenType(null)}
          channelType={openType}
          existing={getChannel(openType)}
          webhookUrl={getWebhookUrl(openType)}
          onSave={async (config) => { await upsertChannel(openType, config); }}
          onDisconnect={async () => { await disconnectChannel(openType); }}
        />
      )}
    </>
  );
}