import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import { useMarketingChannels } from "@/hooks/useMarketingChannels";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}

type AudienceType = "all" | "by_stage" | "by_source" | "by_city" | "csv";

export default function CampaignWizard({ open, onOpenChange, onCreated }: Props) {
  const { createCampaign } = useMarketingCampaigns();
  const { channels } = useMarketingChannels();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [channelType, setChannelType] = useState("whatsapp_cloud");
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [audienceValue, setAudienceValue] = useState("");
  const [audienceCount, setAudienceCount] = useState<number>(0);
  const [templateName, setTemplateName] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setName(""); setAudienceType("all"); setAudienceValue("");
      setTemplateName(""); setMessageBody(""); setScheduleType("now"); setScheduledAt("");
    }
  }, [open]);

  // Available WhatsApp channels
  const whatsAppChannels = channels.filter(c =>
    (c.channel_type === "whatsapp_cloud" || c.channel_type === "whatsapp_thirdparty") &&
    c.status === "connected"
  );

  // Live audience preview
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      let q = supabase.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null);
      if (audienceType === "by_stage" && audienceValue) q = q.eq("stage", audienceValue);
      if (audienceType === "by_source" && audienceValue) q = q.eq("source", audienceValue);
      if (audienceType === "by_city" && audienceValue) q = q.ilike("city", `%${audienceValue}%`);
      if (audienceType === "csv") { setAudienceCount(0); return; }
      const { count } = await q;
      if (!cancelled) setAudienceCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [open, audienceType, audienceValue]);

  const canNext = (() => {
    if (step === 1) return name.trim().length > 0 && !!channelType;
    if (step === 2) return audienceType === "csv" || audienceCount > 0;
    if (step === 3) return messageBody.trim().length > 0 || templateName.trim().length > 0;
    if (step === 4) return scheduleType === "now" || (scheduleType === "later" && !!scheduledAt);
    return true;
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      await createCampaign({
        name,
        channel_type: channelType,
        audience_filter: { type: audienceType, value: audienceValue },
        audience_count: audienceCount,
        template_name: templateName || null,
        message_body: messageBody || null,
        status: scheduleType === "later" ? "scheduled" : "draft",
        scheduled_at: scheduleType === "later" ? scheduledAt : null,
      });
      toast.success("Campaign saved as draft", {
        description: "Use the Send button on the campaign row to start sending.",
      });
      onCreated();
    } catch (e) {
      toast.error("Could not create campaign", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New WhatsApp campaign</DialogTitle>
          <DialogDescription>Step {step} of 4</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Campaign name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Diwali offer blast" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Send via</Label>
              <Select value={channelType} onValueChange={setChannelType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {whatsAppChannels.map(c => (
                    <SelectItem key={c.id} value={c.channel_type}>
                      {c.channel_type === "whatsapp_cloud" ? "WhatsApp Business (Cloud API)" : "3rd-party WhatsApp"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Audience</Label>
              <Select value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All leads</SelectItem>
                  <SelectItem value="by_stage">By pipeline stage</SelectItem>
                  <SelectItem value="by_source">By source</SelectItem>
                  <SelectItem value="by_city">By city</SelectItem>
                  <SelectItem value="csv">Upload CSV (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {audienceType !== "all" && audienceType !== "csv" && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {audienceType === "by_stage" ? "Stage key (e.g. quote_sent)" :
                   audienceType === "by_source" ? "Source key (e.g. meta_facebook)" : "City"}
                </Label>
                <Input value={audienceValue} onChange={e => setAudienceValue(e.target.value)} />
              </div>
            )}
            <div className="rounded-md bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Audience preview</p>
              <p className="text-2xl font-bold">{audienceCount} <span className="text-sm font-normal text-muted-foreground">recipients</span></p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {channelType === "whatsapp_cloud" && (
              <div className="space-y-1.5">
                <Label className="text-xs">WhatsApp template name (must be approved in Meta)</Label>
                <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="welcome_offer_v2" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Message body / fallback text</Label>
              <Textarea
                rows={5}
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                placeholder="Hi {{name}}, special Diwali offer just for you — flat 10% off. Reply YES to claim."
              />
              <p className="text-[11px] text-muted-foreground">Use <code className="font-mono">{'{{name}}'}</code> to insert the lead's name.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">When to send</Label>
              <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as "now" | "later")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Save as draft (send manually later)</SelectItem>
                  <SelectItem value="later">Schedule for date & time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scheduleType === "later" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Scheduled date & time</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              </div>
            )}
            <div className="rounded-md border p-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Campaign</span><span className="font-medium">{name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Audience</span><Badge variant="outline">{audienceCount}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Channel</span><span>{channelType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span>{templateName || "—"}</span></div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Campaigns are saved as drafts and won't send until the bulk-sender backend is wired up. Channel credentials and audience are already stored.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
          {step < 4 && <Button onClick={() => setStep(s => s + 1)} disabled={!canNext}>Next</Button>}
          {step === 4 && <Button onClick={handleSave} disabled={!canNext || saving}>{saving ? "Saving..." : "Save campaign"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}