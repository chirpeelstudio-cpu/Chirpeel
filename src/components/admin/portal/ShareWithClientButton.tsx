import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Eye, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Props { leadId: string; leadName?: string | null; phone?: string | null; }

interface Link { id: string; token: string; view_count: number; revoked: boolean; last_viewed_at: string | null; created_at: string; }

function genToken(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
}

export default function ShareWithClientButton({ leadId, leadName, phone }: Props) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("client_share_links" as any)
      .select("id, token, view_count, revoked, last_viewed_at, created_at")
      .eq("lead_id", leadId).order("created_at", { ascending: false });
    setLinks((data ?? []) as unknown as Link[]);
    setLoading(false);
  };

  const create = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let creator: string | null = null;
    if (user) {
      const { data } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
      creator = data?.full_name || data?.email || null;
    }
    const { error } = await supabase.from("client_share_links" as any).insert({
      lead_id: leadId, token: genToken(), created_by: creator,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Share link created");
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("client_share_links" as any).update({ revoked: true } as any).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const portalUrl = (token: string) => `${window.location.origin}/client/${token}`;

  const copy = (token: string) => {
    navigator.clipboard.writeText(portalUrl(token));
    toast.success("Link copied");
  };

  const whatsappLink = (token: string) => {
    const msg = `Hi ${leadName || ""}! 👋 You can track your project with Chirpeel here: ${portalUrl(token)}`;
    const num = (phone || "").replace(/\D/g, "");
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5"><Share2 className="w-4 h-4" />Share with client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Client portal links</DialogTitle>
          <DialogDescription>Public read-only project view. Share with the customer to see status, payments, and photos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
            links.length === 0 ? <p className="text-sm text-muted-foreground">No links yet.</p> :
            links.map(l => (
              <div key={l.id} className={`p-3 rounded border ${l.revoked ? "opacity-50 bg-muted/40" : "bg-card"}`}>
                <Input readOnly value={portalUrl(l.token)} className="text-xs font-mono mb-2" />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3 h-3" />{l.view_count} view{l.view_count !== 1 ? "s" : ""}
                    {l.revoked && " · revoked"}
                  </span>
                  {!l.revoked && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => copy(l.token)}><Copy className="w-3.5 h-3.5" /></Button>
                      {phone && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={whatsappLink(l.token)} target="_blank" rel="noreferrer"><MessageCircle className="w-3.5 h-3.5" /></a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => revoke(l.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        <DialogFooter>
          <Button onClick={create}>Create new link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
