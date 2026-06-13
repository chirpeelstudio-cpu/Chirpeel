import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar as CalendarIcon,
  Copy,
  ExternalLink,
  IndianRupee,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, type Quotation } from "./types";

interface Props {
  quotation: Quotation;
  onUpdated: (patch: Partial<Quotation>) => void;
}

const buildMessage = (q: Quotation, url: string, advance: number) => [
  `Hi ${q.customer_name?.split(" ")[0] || "there"},`,
  `Here is the booking advance payment link for your quotation ${q.quotation_number ?? ""}${
    q.project_name ? ` (${q.project_name})` : ""
  }.`,
  `Amount: ${formatINR(advance)}`,
  `Pay securely: ${url}`,
  `— Team Chirpeel`,
].join("\n");

const normalizePhone = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
};

// Format ISO datetime as 'YYYY-MM-DDTHH:mm' for datetime-local input
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const PaymentLinkPanel = ({ quotation, onUpdated }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"create" | "regenerate" | "edit" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"regenerate" | "edit" | null>(null);

  // Editor form state
  const total = Number(quotation.total_amount ?? 0);
  const defaultAdvance = Math.max(1, Math.round(total * 0.1));
  const [amount, setAmount] = useState<number>(defaultAdvance);
  const [description, setDescription] = useState<string>("");
  const [expireAt, setExpireAt] = useState<string>("");
  const [custName, setCustName] = useState(quotation.customer_name || "");
  const [custEmail, setCustEmail] = useState(quotation.customer_email || "");
  const [custPhone, setCustPhone] = useState(quotation.customer_phone || "");

  // Reset defaults whenever the quotation changes
  useEffect(() => {
    setAmount(defaultAdvance);
    setDescription(
      `Booking advance for ${quotation.quotation_number ?? ""} — ${quotation.project_name ?? "Interior project"}`,
    );
    setExpireAt("");
    setCustName(quotation.customer_name || "");
    setCustEmail(quotation.customer_email || "");
    setCustPhone(quotation.customer_phone || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation.id]);

  if (!quotation.id) return null;

  const hasLink = !!quotation.payment_link_url;
  const isPaid = quotation.payment_status === "paid";
  const createdAt = quotation.payment_link_created_at;
  const url = quotation.payment_link_url ?? "";
  const message = hasLink ? buildMessage(quotation, url, amount) : "";
  const waPhone = normalizePhone(custPhone || quotation.customer_phone || "");
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}` : "";
  const mailUrl = (custEmail || quotation.customer_email)
    ? `mailto:${custEmail || quotation.customer_email}?subject=${encodeURIComponent(
        `Booking advance — ${quotation.quotation_number ?? ""}`,
      )}&body=${encodeURIComponent(message)}`
    : "";

  const callEdge = async (mode: "create" | "regenerate" | "edit") => {
    setBusy(mode);
    try {
      const body: Record<string, unknown> = { quotation_id: quotation.id };
      if (mode === "regenerate") body.regenerate = true;
      if (mode === "edit" || mode === "create") {
        if (amount !== defaultAdvance) body.amount_rupees = amount;
        if (description.trim()) body.description = description.trim();
        if (expireAt) {
          const t = new Date(expireAt).getTime();
          if (Number.isNaN(t)) {
            throw new Error("Invalid expiry date");
          }
          if (t < Date.now() + 20 * 60 * 1000) {
            throw new Error("Expiry must be at least 20 minutes from now. Please pick a later time or clear the field.");
          }
          body.expire_at = new Date(t).toISOString();
        }
        if (custName.trim() && custName.trim() !== quotation.customer_name) body.customer_name = custName.trim();
        if (custEmail.trim() !== (quotation.customer_email || "")) body.customer_email = custEmail.trim() || null;
        if (custPhone.trim() !== (quotation.customer_phone || "")) body.customer_phone = custPhone.trim() || null;
        if (mode === "edit") body.regenerate = true;
      }
      const { data, error } = await supabase.functions.invoke("create-payment-link", { body });
      if (error) {
        // Try to extract the real error message from the function's response body
        let detail = error.message;
        try {
          const ctx = (error as unknown as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            if (j?.error) detail = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
          }
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      const payload = data as { ok?: boolean; payment_url?: string; payment_link_id?: string; amount?: number; error?: string };
      if (!payload?.ok || !payload.payment_url) throw new Error(payload?.error ?? "Failed to create payment link");
      onUpdated({
        payment_link_url: payload.payment_url,
        payment_link_id: payload.payment_link_id ?? null,
        payment_link_created_at: new Date().toISOString(),
        payment_status: "active",
      });
      toast({
        title: mode === "create" ? "Payment link generated"
          : mode === "regenerate" ? "New payment link created"
          : "Payment link updated",
        description: `${formatINR(payload.amount ?? amount)} link is ready.`,
      });
    } catch (e) {
      toast({
        title: "Could not save payment link",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      setConfirmAction(null);
    }
  };

  const copy = async (text: string, label = "Copied") => {
    try { await navigator.clipboard.writeText(text); toast({ title: label }); }
    catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      {/* Status / link card */}
      <Card className="p-4 space-y-3 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Booking advance payment link</h2>
              <p className="text-xs text-muted-foreground">
                Quotation total: <span className="font-medium">{formatINR(total)}</span> · Default advance (10%): {formatINR(defaultAdvance)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPaid ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge>
              : hasLink ? <Badge variant="default">Active</Badge>
              : <Badge variant="outline">Not generated</Badge>}
          </div>
        </div>

        {hasLink && (
          <>
            <div className="flex items-center gap-2">
              <Input value={url} readOnly className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copy(url, "Link copied")}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                disabled={!waUrl}
                onClick={() => waUrl && window.open(waUrl, "_blank", "noopener,noreferrer")}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
              </Button>
              <Button size="sm" variant="outline" disabled={!mailUrl}
                onClick={() => mailUrl && window.open(mailUrl, "_blank", "noopener,noreferrer")}>
                <Mail className="w-3.5 h-3.5 mr-1" /> Email
              </Button>
              <Button size="sm" variant="ghost" onClick={() => copy(message, "Message copied")}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy message
              </Button>
              {!isPaid && (
                <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground"
                  onClick={() => setConfirmAction("regenerate")} disabled={busy !== null}>
                  {busy === "regenerate" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                  Regenerate (no edits)
                </Button>
              )}
            </div>

            {createdAt && (
              <p className="text-[11px] text-muted-foreground">
                Generated {new Date(createdAt).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </>
        )}
      </Card>

      {/* Editor card */}
      {!isPaid && (
        <Card className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold">{hasLink ? "Edit payment link" : "Configure payment link"}</h3>
            <p className="text-xs text-muted-foreground">
              {hasLink
                ? "Razorpay links are immutable. Saving edits cancels the current link and creates a new one."
                : "Customise the link before generating, or just hit Generate to use defaults."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Math.round(Number(e.target.value) || 0)))}
                />
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                <button type="button" className="underline hover:text-primary" onClick={() => setAmount(defaultAdvance)}>10%</button>
                <button type="button" className="underline hover:text-primary" onClick={() => setAmount(Math.max(1, Math.round(total * 0.25)))}>25%</button>
                <button type="button" className="underline hover:text-primary" onClick={() => setAmount(Math.max(1, Math.round(total * 0.5)))}>50%</button>
                <button type="button" className="underline hover:text-primary" onClick={() => setAmount(Math.max(1, Math.round(total)))}>Full</button>
              </div>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> Expiry (optional)
              </Label>
              <Input
                type="datetime-local"
                value={expireAt}
                min={toLocalInput(new Date(Date.now() + 20 * 60 * 1000).toISOString())}
                onChange={(e) => setExpireAt(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Must be at least 20 minutes from now (Razorpay requires 15+).</p>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description shown to customer</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2048))}
              placeholder="Booking advance for HC-Q-1234 — 3BHK Interior project"
            />
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Customer contact for this link
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={custName} onChange={(e) => setCustName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Email (for receipts)</Label>
                <Input type="email" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} placeholder="optional" />
              </div>
              <div>
                <Label className="text-xs">Phone (for SMS)</Label>
                <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Razorpay uses these to send the link via SMS/email. Leave blank to keep what's saved on the quotation.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {hasLink ? (
              <Button onClick={() => setConfirmAction("edit")} disabled={busy !== null || amount <= 0}>
                {busy === "edit" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save changes (regenerate link)
              </Button>
            ) : (
              <Button onClick={() => callEdge("create")} disabled={busy !== null || amount <= 0}>
                {busy === "create" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
                Generate payment link
              </Button>
            )}
          </div>
        </Card>
      )}

      <AlertDialog open={confirmAction !== null} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "edit" ? "Apply edits and regenerate link?" : "Regenerate payment link?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The current Razorpay link will be cancelled and a new one will be created.
              {confirmAction === "edit" ? " The new link will use your edits above." : ""} The customer must use the new link to pay. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); callEdge(confirmAction === "edit" ? "edit" : "regenerate"); }}
              disabled={busy !== null}
            >
              {confirmAction === "edit" ? "Save & regenerate" : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
