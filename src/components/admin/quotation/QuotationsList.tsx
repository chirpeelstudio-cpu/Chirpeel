import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, ExternalLink, Loader2, Copy } from "lucide-react";
import { QuotationBuilder } from "./QuotationBuilder";
import { formatINR } from "./types";
import { toast } from "@/hooks/use-toast";
import UpgradeGate from "@/components/billing/UpgradeGate";

interface Row {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  project_name: string | null;
  project_type: string | null;
  total_amount: number;
  status: "draft" | "sent" | "approved" | "rejected";
  pdf_url: string | null;
  created_at: string;
  revision_count: number | null;
  last_sent_at: string | null;
  sent_at: string | null;
  auto_project_id: string | null;
  payment_link_url: string | null;
  client_approved_at: string | null;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  approved: "default",
  rejected: "destructive",
};

interface QuotationsListProps {
  initialLeadId?: string | null;
  initialQuotationId?: string | null;
  onConsumedInitial?: () => void;
}

export const QuotationsList = ({ initialLeadId, initialQuotationId, onConsumedInitial }: QuotationsListProps = {}) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [createForLeadId, setCreateForLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "approved" | "rejected">("all");
  const [cloningId, setCloningId] = useState<string | null>(null);

  const handleClone = async (id: string) => {
    setCloningId(id);
    const { data, error } = await supabase.rpc("clone_quotation", { _source_id: id });
    setCloningId(null);
    if (error || !data) {
      toast({ title: "Clone failed", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Quotation cloned", description: "Opened as a new draft." });
    setActiveId(data as string);
  };

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quotations")
      .select("id, quotation_number, customer_name, customer_phone, project_name, project_type, total_amount, status, pdf_url, created_at, revision_count, last_sent_at, sent_at, auto_project_id, payment_link_url, client_approved_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  // External request to open a specific quotation or to create one for a given lead
  useEffect(() => {
    if (initialQuotationId) {
      setActiveId(initialQuotationId);
      onConsumedInitial?.();
    } else if (initialLeadId) {
      setCreateForLeadId(initialLeadId);
      setCreating(true);
      onConsumedInitial?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLeadId, initialQuotationId]);

  // FAB-triggered "Add" event from AdminDashboard
  useEffect(() => {
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.view === "quotation") setCreating(true);
    };
    window.addEventListener("admin:add", onAdd);
    return () => window.removeEventListener("admin:add", onAdd);
  }, []);

  // Hydrate from drill-down filter set by Overview
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin.drillFilter");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.view !== "quotation") return;
      if (Date.now() - (parsed.ts ?? 0) > 30_000) return;
      const s = parsed.filter?.status;
      if (s && ["draft","sent","approved","rejected"].includes(s)) setFilter(s);
      localStorage.removeItem("admin.drillFilter");
    } catch {}
  }, []);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.customer_name.toLowerCase().includes(q) ||
      r.customer_phone.includes(q) ||
      r.quotation_number.toLowerCase().includes(q) ||
      (r.project_name?.toLowerCase().includes(q) ?? false)
    );
  });

  if (creating || activeId) {
    return (
      <QuotationBuilder
        quotationId={activeId}
        initialLeadId={createForLeadId ?? undefined}
        onBack={() => { setCreating(false); setActiveId(undefined); setCreateForLeadId(null); fetchRows(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground">Create and manage interior quotations</p>
        </div>
        <UpgradeGate kind="quote">
          <Button data-tour-id="quot-add" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> New Quotation</Button>
        </UpgradeGate>
      </div>

      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, phone, project, number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList data-tour-id="quot-filters">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-1">No quotations yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first quotation to get started.</p>
          <UpgradeGate kind="quote">
            <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> New Quotation</Button>
          </UpgradeGate>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left py-2 px-3 font-medium">Number</th>
                <th className="text-left py-2 px-3 font-medium">Customer</th>
                <th className="text-left py-2 px-3 font-medium">Project</th>
                <th className="text-right py-2 px-3 font-medium">Total</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="text-left py-2 px-3 font-medium">Sent</th>
                <th className="text-right py-2 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sends = Number(r.revision_count ?? 0);
                const lastSent = r.last_sent_at ?? r.sent_at;
                return (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20 cursor-pointer" onClick={() => setActiveId(r.id)}>
                  <td className="py-2 px-3 font-medium text-primary">{r.quotation_number}</td>
                  <td className="py-2 px-3">
                    <div>{r.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{r.customer_phone}</div>
                  </td>
                  <td className="py-2 px-3">
                    <div>{r.project_name ?? "—"}</div>
                    {r.project_type && <div className="text-xs text-muted-foreground">{r.project_type}</div>}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold">{formatINR(r.total_amount)}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-col gap-1">
                      <Badge variant={statusVariant[r.status]} className="capitalize w-fit">{r.status}</Badge>
                      {r.auto_project_id && (
                        <Badge
                          variant="outline"
                          className="text-[10px] w-fit border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/studio/projects?projectId=${r.auto_project_id}`);
                          }}
                        >
                          Project created
                        </Badge>
                      )}
                      {r.payment_link_url && (
                        <a
                          href={r.payment_link_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-primary hover:underline inline-flex items-center"
                        >
                          Pay link <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    {sends === 0 ? (
                      <Badge variant="outline" className="text-[10px]">Not sent</Badge>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={sends > 1 ? "default" : "secondary"} className="text-[10px] w-fit">
                          {sends > 1 ? `Revised ×${sends}` : `Sent ×1`}
                        </Badge>
                        {lastSent && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(lastSent).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      {r.pdf_url && (
                        <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-primary hover:underline">
                          PDF <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={cloningId === r.id}
                        onClick={() => handleClone(r.id)}
                        title="Clone as new draft"
                      >
                        {cloningId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                        <span className="ml-1">Clone</span>
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
