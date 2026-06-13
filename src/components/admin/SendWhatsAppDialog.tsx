import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import type { PipelineLead } from "./types";

interface Template {
  id: string;
  key: string;
  title: string;
  body: string;
  placeholders: string[];
}

const STAGE_TEMPLATE_MAP: Record<string, string> = {
  leads: "welcome",
  follow_up: "ask_floorplan",
  site_visit: "site_visit_scheduled",
  booking: "quotation_send",
  designing: "quotation_send",
  execution: "payment_link",
  handover: "site_completion",
  completed: "site_completion",
};

const CUSTOM_KEY = "__custom__";

const normalizePhone = (raw: string) => {
  const digits = (raw || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
};

const renderBody = (body: string, vars: Record<string, string>) =>
  body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`);

interface Props {
  open: boolean;
  onClose: () => void;
  lead: PipelineLead;
  companyName?: string;
  supportPhone?: string;
  onSent?: () => void;
}

export default function SendWhatsAppDialog({ open, onClose, lead, companyName, supportPhone, onSent }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});
  const [editedBody, setEditedBody] = useState("");
  const [sending, setSending] = useState(false);

  const autoVars = useMemo<Record<string, string>>(() => ({
    customer_name: lead.name || "",
    company_name: companyName || "Homycube Interiors",
    support_phone: supportPhone || "+91 90030 47474",
    project_name: lead.project_type || "your project",
  }), [lead, companyName, supportPhone]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("message_templates" as any).select("*").order("title");
      const list = (data ?? []) as unknown as Template[];
      setTemplates(list);
      const suggested = STAGE_TEMPLATE_MAP[lead.stage] || "welcome";
      const initial = list.find(t => t.key === suggested)?.key || list[0]?.key || CUSTOM_KEY;
      setSelectedKey(initial);
    })();
  }, [open, lead.stage]);

  const activeTemplate = templates.find(t => t.key === selectedKey);

  // Manual placeholders the admin must fill
  const manualPlaceholders = useMemo(() => {
    if (!activeTemplate) return [];
    return (activeTemplate.placeholders || []).filter(p => !(p in autoVars));
  }, [activeTemplate, autoVars]);

  // Reset/sync edited body whenever template or vars change
  useEffect(() => {
    if (selectedKey === CUSTOM_KEY) {
      setEditedBody(prev => prev || "");
      return;
    }
    if (!activeTemplate) return;
    const allVars = { ...autoVars, ...extraVars };
    setEditedBody(renderBody(activeTemplate.body, allVars));
  }, [selectedKey, activeTemplate, autoVars, extraVars]);

  // Reset extra vars when template changes
  useEffect(() => {
    setExtraVars({});
  }, [selectedKey]);

  const handleSend = async () => {
    const phone = normalizePhone(lead.phone);
    if (!phone) {
      toast.error("Lead has no valid phone number");
      return;
    }
    if (!editedBody.trim()) {
      toast.error("Message body is empty");
      return;
    }

    setSending(true);
    const isCustom = selectedKey === CUSTOM_KEY || !activeTemplate;
    const { data: userData } = await supabase.auth.getUser();
    const sentBy = userData?.user?.email || null;

    const { error } = await supabase.from("lead_messages" as any).insert({
      lead_id: lead.id,
      template_key: isCustom ? null : activeTemplate!.key,
      template_title: isCustom ? "Custom Message" : activeTemplate!.title,
      body: editedBody,
      channel: "whatsapp",
      sent_by: sentBy,
    });
    setSending(false);

    if (error) {
      toast.error("Failed to log message: " + error.message);
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(editedBody)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp opened — message ready to send");
    onSent?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Send WhatsApp to {lead.name}
          </DialogTitle>
          <DialogDescription>
            Choose a template, fill in details, then send via WhatsApp. The message is logged automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Template picker */}
          <div>
            <Label className="text-xs">Template</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.title}
                    {STAGE_TEMPLATE_MAP[lead.stage] === t.key && " · suggested"}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_KEY}>✏️ Empty / Custom message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Manual placeholder inputs */}
          {manualPlaceholders.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Fill in details:</p>
              <div className="grid grid-cols-2 gap-2">
                {manualPlaceholders.map(ph => (
                  <div key={ph}>
                    <Label className="text-[11px] font-mono text-muted-foreground">{`{{${ph}}}`}</Label>
                    <Input
                      value={extraVars[ph] || ""}
                      onChange={e => setExtraVars(v => ({ ...v, [ph]: e.target.value }))}
                      placeholder={ph}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable message */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" /> Message (editable)
            </Label>
            <Textarea
              value={editedBody}
              onChange={e => setEditedBody(e.target.value)}
              className="min-h-[220px] text-sm font-sans whitespace-pre-wrap"
              placeholder="Type your custom message..."
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Sending to: <span className="font-mono">{lead.phone}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !editedBody.trim()}>
            <Send className="w-4 h-4 mr-1.5" />
            {sending ? "Sending…" : "Send via WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
