import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { CHANNEL_META, type ChannelType, type MarketingChannel } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  channelType: ChannelType;
  existing?: MarketingChannel;
  webhookUrl?: string;
  onSave: (config: Record<string, unknown>) => Promise<void>;
  onDisconnect?: () => Promise<void>;
}

export default function ConnectChannelDialog({ open, onOpenChange, channelType, existing, webhookUrl, onSave, onDisconnect }: Props) {
  const meta = CHANNEL_META[channelType];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      meta.fields.forEach(f => {
        const v = (existing?.config as Record<string, unknown> | undefined)?.[f.key];
        initial[f.key] = typeof v === "string" ? v : "";
      });
      setValues(initial);
    }
  }, [open, existing, meta]);

  const handleCopy = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config: Record<string, unknown> = { ...values };
      await onSave(config);
      toast.success(`${meta.title} connected`);
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not save", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit" : "Connect"} {meta.title}</DialogTitle>
          <DialogDescription>{meta.blurb}</DialogDescription>
        </DialogHeader>

        {webhookUrl && (
          <div className="space-y-1.5">
            <Label className="text-xs">Webhook URL (paste into the platform)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3 mt-2">
          {meta.fields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}{f.secret ? " (kept private)" : ""}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                />
              ) : (
                <Input
                  type={f.secret ? "password" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              )}
              {f.helper && <p className="text-[11px] text-muted-foreground">{f.helper}</p>}
            </div>
          ))}
        </div>

        <div className="rounded-md bg-muted/40 p-3 mt-2">
          <p className="text-xs font-semibold mb-1.5">How to connect</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
            {meta.helpSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {existing && onDisconnect && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={async () => {
                if (!confirm(`Disconnect ${meta.title}?`)) return;
                await onDisconnect();
                toast.success("Disconnected");
                onOpenChange(false);
              }}
            >
              Disconnect
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : existing ? "Save changes" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}