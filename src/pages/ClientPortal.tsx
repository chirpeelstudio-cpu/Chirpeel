import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, FileText, Camera, Receipt, Phone, Mail, Globe, ShieldCheck, Loader2, ExternalLink, Hammer, Copy, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const STAGE_LABEL: Record<string, string> = {
  factory: "🏭 Factory", site: "📍 Site", installation: "🔧 Installation", handover: "🎉 Handover",
};

export default function ClientPortal() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approval, setApproval] = useState<{ payment_url: string | null; approved_at: string } | null>(null);

  const refresh = async () => {
    if (!token) return;
    const { data: res, error } = await supabase.rpc("get_client_portal_data" as any, { _token: token });
    if (error) setErr(error.message);
    else if (!res) setErr("This link is invalid or has been revoked.");
    else setData(res);
  };

  const handleApprove = async () => {
    if (!token) return;
    if (!confirm("Approve this quotation and generate your booking advance payment link?")) return;
    setApproving(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("approve-quotation", { body: { token } });
      if (error) throw error;
      if (!res?.ok) throw new Error(res?.error || "Approval failed");
      setApproval({ payment_url: res.payment_url, approved_at: res.approved_at });
      toast.success(res.already_approved ? "Already approved" : "Quotation approved!", {
        description: res.payment_url ? "Your payment link is ready below." : "Project created. Our team will share payment details shortly.",
      });
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not approve");
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>;
  if (err) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Link unavailable</h1>
        <p className="text-sm text-muted-foreground">{err}</p>
      </Card>
    </div>
  );

  const { lead, quotation, project, payments = [], invoices = [], photos = [], files = [], company } = data;
  const projectCode = project?.id ? `HC-PRJ-${String(project.id).slice(0, 8).toUpperCase()}` : null;
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const outstanding = quotation ? Math.max(0, Number(quotation.total_amount || 0) - totalPaid) : 0;
  const photosByStage: Record<string, any[]> = {};
  photos.forEach((p: any) => { (photosByStage[p.stage] ||= []).push(p); });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logo_url && <img src={company.logo_url} alt={company.name} className="h-10 w-10 object-contain" />}
            <div>
              <h1 className="font-bold text-foreground" style={{ color: company?.accent_color || undefined }}>{company?.name || "Chirpeel"}</h1>
              {company?.tagline && <p className="text-xs text-muted-foreground">{company.tagline}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Project Card */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-1">Hello {lead?.name} 👋</h2>
          <p className="text-sm text-muted-foreground mb-4">Here's your project status with us.</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div><p className="text-muted-foreground">Project type</p><p className="font-medium capitalize">{lead?.project_type || "—"}</p></div>
            <div><p className="text-muted-foreground">Location</p><p className="font-medium">{lead?.city || "—"}</p></div>
            <div><p className="text-muted-foreground">Current stage</p><Badge className="capitalize">{lead?.stage || "—"}</Badge></div>
          </div>
        </Card>

        {/* WhatsApp quick contact */}
        {(company?.whatsapp || company?.phone) && (() => {
          const rawPhone = String(company.whatsapp || company.phone).replace(/\D/g, "");
          if (rawPhone.length < 10) return null;
          const waNumber = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
          const projectRef = project?.id
            ? `HC-PRJ-${String(project.id).slice(0, 8).toUpperCase()}`
            : (quotation?.quotation_number || "");
          const template =
            (company?.client_portal_whatsapp_template as string | undefined)?.trim() ||
            "Hi {{company}} team, this is {{name}}{{ref}}. I'd like an update on my project.";
          const msg = template
            .replace(/\{\{\s*company\s*\}\}/gi, company?.name || "Chirpeel")
            .replace(/\{\{\s*name\s*\}\}/gi, lead?.name || "")
            .replace(/\{\{\s*ref\s*\}\}/gi, projectRef ? ` (${projectRef})` : "");
          const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg.slice(0, 1000))}`;
          return (
            <Card className="p-4 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Need an update?</p>
                  <p className="text-xs text-muted-foreground">Chat with our team on WhatsApp for instant replies.</p>
                </div>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                  <a href={waUrl} target="_blank" rel="noreferrer">
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            </Card>
          );
        })()}

        {/* Financial summary */}
        {quotation && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Quotation {quotation.quotation_number}</h3>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center p-3 rounded bg-muted/50"><p className="text-xs text-muted-foreground">Total</p><p className="font-bold">{inr(Number(quotation.total_amount))}</p></div>
              <div className="text-center p-3 rounded bg-emerald-50 dark:bg-emerald-950/30"><p className="text-xs text-muted-foreground">Paid</p><p className="font-bold text-emerald-600">{inr(totalPaid)}</p></div>
              <div className="text-center p-3 rounded bg-amber-50 dark:bg-amber-950/30"><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-bold text-amber-600">{inr(outstanding)}</p></div>
            </div>
            {quotation.pdf_url && (
              <a href={quotation.pdf_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">View quotation PDF →</a>
            )}
          </Card>
        )}

        {/* Approve & Pay */}
        {quotation && (
          <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            {approval || quotation.client_approved_at ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">Quotation approved</h3>
                    <p className="text-xs text-muted-foreground">
                      {approval?.approved_at
                        ? `Approved on ${format(new Date(approval.approved_at), "MMM d, yyyy")}`
                        : "Thank you! Our team is preparing your project."}
                    </p>
                  </div>
                </div>
                {(approval?.payment_url || quotation.payment_link_url) && (
                  <Button asChild size="lg" className="w-full">
                    <a href={approval?.payment_url || quotation.payment_link_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Pay booking advance now
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">Ready to start your project?</h3>
                    <p className="text-xs text-muted-foreground">
                      Approve this quotation to confirm your booking. We'll generate a secure payment link for the booking advance and our team will start work right away.
                    </p>
                  </div>
                </div>
                <Button size="lg" className="w-full" onClick={handleApprove} disabled={approving}>
                  {approving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving…</>) : "Approve & Generate Payment Link"}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  By approving, you accept the quotation terms. Booking advance: <strong>{inr(Math.max(1, Math.round(Number(quotation.total_amount || 0) * 0.1)))}</strong> (10% of total).
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Project tracker (after approval) */}
        {project && (
          <Card className="p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <Hammer className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base">Your project is live</h3>
                  <Badge variant="secondary" className="capitalize">{project.status?.replace(/_/g, " ") || "planning"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.name}</p>
              </div>
            </div>

            {projectCode && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/60 mb-3">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Project code</span>
                <code className="text-sm font-mono font-semibold flex-1 truncate">{projectCode}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(projectCode);
                    toast.success("Project code copied");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(Number(project.progress_pct || 0))}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, Number(project.progress_pct || 0)))}%` }}
                />
              </div>
              {project.target_end_date && (
                <p className="text-[11px] text-muted-foreground">
                  Target handover: <strong>{format(new Date(project.target_end_date), "MMM d, yyyy")}</strong>
                </p>
              )}
            </div>

            {Array.isArray(project.milestones) && project.milestones.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {project.milestones.slice(0, 6).map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {m.completed_at ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={m.completed_at ? "line-through text-muted-foreground" : ""}>{m.title}</span>
                    {m.target_date && !m.completed_at && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {format(new Date(m.target_date), "MMM d")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => {
                const el = document.getElementById("photos-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else toast.info("Progress photos will appear here as work begins.");
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              View progress updates
            </Button>
          </Card>
        )}
        {payments.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" />Payments</h3>
            <div className="space-y-2">
              {payments.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <p className="font-medium">{inr(Number(p.amount))}</p>
                    <p className="text-xs text-muted-foreground">{p.milestone || p.mode} · {format(new Date(p.paid_on), "MMM d, yyyy")}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stage Photos */}
        {photos.length > 0 && (
          <Card id="photos-section" className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Camera className="w-4 h-4 text-primary" />Project Photos</h3>
            <div className="space-y-4">
              {Object.keys(photosByStage).map(stage => (
                <div key={stage}>
                  <p className="text-sm font-medium mb-2">{STAGE_LABEL[stage] || stage}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {photosByStage[stage].map((p, i) => (
                      <a key={i} href={p.photo_url} target="_blank" rel="noreferrer">
                        <img src={p.photo_url} alt={stage} className="w-full h-32 object-cover rounded border hover:opacity-90" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Files */}
        {files.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />Project Files</h3>
            <div className="space-y-1.5">
              {files.map((f: any, i: number) => (
                <a key={i} href={f.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{f.file_name}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(f.created_at), "MMM d")}</span>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        {company && (
          <Card className="p-4 text-center text-xs text-muted-foreground">
            Questions? Contact us: 
            {company.phone && <> <Phone className="w-3 h-3 inline" /> {company.phone}</>}
            {company.email && <> · <Mail className="w-3 h-3 inline" /> {company.email}</>}
            {company.website && <> · <Globe className="w-3 h-3 inline" /> {company.website}</>}
          </Card>
        )}
      </main>
    </div>
  );
}
