import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Trash2 } from "lucide-react";
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import CampaignWizard from "./CampaignWizard";
import { useMarketingChannels } from "@/hooks/useMarketingChannels";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500 text-white",
  sending: "bg-amber-500 text-white",
  completed: "bg-emerald-500 text-white",
  failed: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export default function CampaignsPanel() {
  const { campaigns, loading, refresh, deleteCampaign } = useMarketingCampaigns();
  const { channels } = useMarketingChannels();
  const [wizardOpen, setWizardOpen] = useState(false);

  const hasWhatsApp = channels.some(c =>
    (c.channel_type === "whatsapp_cloud" || c.channel_type === "whatsapp_thirdparty") &&
    c.status === "connected"
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <h3 className="font-semibold text-sm">Bulk WhatsApp campaigns</h3>
          <p className="text-xs text-muted-foreground">Send template messages to a slice of your leads.</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (!hasWhatsApp) {
              toast.info("Connect a WhatsApp channel first", { description: "Go to the Channels tab." });
              return;
            }
            setWizardOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" /> New campaign
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No campaigns yet"
          description={hasWhatsApp ? "Click New campaign to send your first bulk message." : "Connect a WhatsApp channel first to start sending campaigns."}
        />
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => {
            const stats = c.stats ?? {};
            return (
              <Card key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm truncate">{c.name}</h4>
                    <Badge className={STATUS_COLORS[c.status] ?? "bg-muted"}>{c.status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {c.audience_count} recipients · {c.channel_type} · {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span><span className="font-semibold">{stats.sent ?? 0}</span> sent</span>
                  <span className="text-emerald-600"><span className="font-semibold">{stats.delivered ?? 0}</span> delivered</span>
                  <span className="text-blue-600"><span className="font-semibold">{stats.read ?? 0}</span> read</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={async () => {
                      if (!confirm(`Delete campaign "${c.name}"?`)) return;
                      await deleteCampaign(c.id);
                      toast.success("Campaign deleted");
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => { refresh(); setWizardOpen(false); }}
      />
    </>
  );
}