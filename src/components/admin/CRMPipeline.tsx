import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Phone, Calendar, User, GripVertical, X, FileText } from "lucide-react";
import { STAGES, STAGE_STATUSES, SOURCE_COLORS } from "./constants";
import type { PipelineLead } from "./types";
import { useAppSettings } from "@/hooks/useAppSettings";
import { toast } from "sonner";

interface Props {
  leads: PipelineLead[];
  onRefresh: () => void;
  onSelectLead: (lead: PipelineLead) => void;
  quoteCounts?: Record<string, { total: number; sent: number }>;
}

const CRMPipeline = ({ leads, onRefresh, onSelectLead, quoteCounts }: Props) => {
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const { settings } = useAppSettings();
  const overdueThresholdMs = (settings.overdue_threshold_days ?? 1) * 86_400_000;
  const dragItem = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [activeCol, setActiveCol] = useState(0);

  // Hydrate from drill-down filter set by Overview
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin.drillFilter");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.view !== "pipeline") return;
      if (Date.now() - (parsed.ts ?? 0) > 30_000) return; // expire after 30s
      if (parsed.filter?.stage) setFilterStage(parsed.filter.stage);
      if (parsed.filter?.overdueOnly) setOverdueOnly(true);
      localStorage.removeItem("admin.drillFilter");
    } catch {}
  }, []);

  const filtered = leads.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.phone.includes(q)) return false;
    }
    if (filterStage !== "all" && l.stage !== filterStage) return false;
    if (filterSource !== "all" && l.source !== filterSource) return false;
    if (overdueOnly) {
      if (!l.next_followup_date) return false;
      if (Date.now() - new Date(l.next_followup_date).getTime() < overdueThresholdMs) return false;
      if (l.stage === "completed") return false;
    }
    return true;
  });

  const handleDrop = async (stageKey: string) => {
    if (!dragItem.current) return;
    const leadId = dragItem.current;
    dragItem.current = null;
    const defaultStatus = STAGE_STATUSES[stageKey]?.[0] || "";
    const { error } = await supabase.from("leads").update({ stage: stageKey, status: defaultStatus } as any).eq("id", leadId);
    if (error) toast.error("Failed to move lead");
    else { toast.success("Lead moved"); onRefresh(); }
  };

  const handleStatusChange = async (leadId: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status } as any).eq("id", leadId);
    if (error) toast.error("Failed to update status");
    else onRefresh();
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const isOverdue = (d: string | null) => !!d && (Date.now() - new Date(d).getTime() >= overdueThresholdMs);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div data-tour-id="pipeline-filters" className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Object.keys(SOURCE_COLORS).map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {overdueOnly && (
          <Button variant="outline" size="sm" onClick={() => setOverdueOnly(false)} className="gap-1.5 border-red-300 text-red-700 bg-red-50 w-full sm:w-auto">
            Overdue follow-ups only (≥{settings.overdue_threshold_days}d) <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div
        ref={boardRef}
        data-tour-id="pipeline-board"
        onScroll={(e) => {
          const el = e.currentTarget;
          const colW = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 12 : 1;
          setActiveCol(Math.round(el.scrollLeft / colW));
        }}
        className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none scroll-px-3 -mx-3 px-3 md:mx-0 md:px-0"
        style={{ minHeight: "60vh" }}
      >
        {STAGES.filter(s => !settings.pipeline_stages_visible?.length || settings.pipeline_stages_visible.includes(s.key)).map(stage => {
          const stageLeads = filtered.filter(l => l.stage === stage.key);
          return (
            <div
              key={stage.key}
              className="flex-shrink-0 w-[88vw] sm:w-[320px] md:w-[280px] snap-center md:snap-align-none bg-muted/30 rounded-xl border border-border flex flex-col"
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary"); }}
              onDragLeave={e => e.currentTarget.classList.remove("ring-2", "ring-primary")}
              onDrop={e => { e.currentTarget.classList.remove("ring-2", "ring-primary"); handleDrop(stage.key); }}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                  <span className="text-sm font-semibold">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[65vh]">
                {stageLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No leads</p>
                ) : stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => { dragItem.current = lead.id; }}
                    onClick={() => onSelectLead(lead)}
                    className={`bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group ${isOverdue(lead.next_followup_date) ? "border-red-400 ring-1 ring-red-200 bg-red-50/50 dark:bg-red-950/20" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">{lead.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{lead.phone}</span>
                        </div>
                      </div>
                      <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Status dropdown */}
                    <Select value={lead.status} onValueChange={v => handleStatusChange(lead.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-full" onClick={e => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(STAGE_STATUSES[lead.stage] || []).map(s => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Meta */}
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className={`text-[9px] ${SOURCE_COLORS[lead.source ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                        {lead.source?.replace("_", " ") ?? "—"}
                      </Badge>
                      {lead.next_followup_date && (
                        <div className={`flex items-center gap-1 text-[10px] ${isOverdue(lead.next_followup_date) ? "text-red-600 font-bold animate-pulse" : "text-muted-foreground"}`}>
                          <Calendar className="w-3 h-3" />
                          {isOverdue(lead.next_followup_date) && <span className="mr-0.5">OVERDUE</span>}
                          {fmt(lead.next_followup_date)}
                        </div>
                      )}
                    </div>

                    {lead.assigned_to && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                        <User className="w-3 h-3" /> {lead.assigned_to}
                      </div>
                    )}

                    {/* Payment indicators */}
                    <div className="flex gap-1 mt-2">
                      {[
                        { paid: lead.payment_10_percent, label: "10%" },
                        { paid: lead.payment_50_percent, label: "50%" },
                        { paid: lead.payment_100_percent, label: "100%" },
                      ].map(p => (
                        <span key={p.label} className={`text-[9px] px-1.5 py-0.5 rounded ${p.paid ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                          {p.label}
                        </span>
                      ))}
                      {(() => {
                        const qc = quoteCounts?.[lead.id];
                        if (!qc || qc.total === 0) return null;
                        const accent = qc.sent > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground";
                        return (
                          <span className={`ml-auto inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded ${accent}`} title={`${qc.total} quotation${qc.total === 1 ? "" : "s"} · ${qc.sent} sent`}>
                            <FileText className="w-2.5 h-2.5" /> QT · {qc.total}
                          </span>
                        );
                      })()}
                    </div>

                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile column indicator */}
      <div className="flex md:hidden items-center justify-center gap-1.5 pt-1">
        {STAGES.filter(s2 => !settings.pipeline_stages_visible?.length || settings.pipeline_stages_visible.includes(s2.key)).map((s2, i) => (
          <button
            key={s2.key}
            type="button"
            aria-label={`Show ${s2.label} column`}
            onClick={() => {
              const el = boardRef.current;
              if (!el) return;
              const colW = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 12 : 1;
              el.scrollTo({ left: i * colW, behavior: "smooth" });
            }}
            className={`h-1.5 rounded-full transition-all ${i === activeCol ? "bg-primary w-6" : "bg-muted w-1.5"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default CRMPipeline;
