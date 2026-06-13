import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, FileText, MoreVertical, Eye, Pencil, Phone as PhoneIcon, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { SOURCE_COLORS } from "./constants";
import type { PipelineLead } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MobileActionSheet, type MobileSheetAction } from "./shared/MobileActionSheet";
import { EmptyState } from "./shared/EmptyState";
import { DemoBadge } from "./shared/DemoBadge";
import { useIsMobile } from "@/hooks/use-mobile";
import { showUndoToast } from "./shared/undoToast";

interface Props {
  leads: PipelineLead[];
  loading: boolean;
  onSelectLead: (lead: PipelineLead) => void;
  onRefresh?: () => void;
  onAddLead?: () => void;
  quoteCounts?: Record<string, { total: number; sent: number }>;
}

const LeadsTable = ({ leads, loading, onSelectLead, onRefresh, onAddLead, quoteCounts }: Props) => {
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<PipelineLead[]>(leads);
  const [actionLead, setActionLead] = useState<PipelineLead | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!search.trim()) { setFiltered(leads); return; }
    const q = search.toLowerCase();
    setFiltered(leads.filter(l =>
      l.name.toLowerCase().includes(q) || l.phone.includes(q) ||
      (l.email?.toLowerCase().includes(q)) || (l.city?.toLowerCase().includes(q)) ||
      (l.source?.toLowerCase().includes(q))
    ));
  }, [search, leads]);

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Email", "City", "Project Type", "Budget", "Timeline", "Stage", "Status", "Source", "Date"];
    const rows = filtered.map(l => [
      l.name, l.phone, l.email ?? "", l.city ?? "", l.project_type ?? "", l.budget ?? "",
      l.timeline ?? "", l.stage, l.status, l.source ?? "",
      new Date(l.created_at).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const softDeleteLead = async (lead: PipelineLead) => {
    if (!isMobile && !window.confirm(`Move "${lead.name}" to trash?\n\nYou can restore it later from the Trash panel.`)) return;

    const loadingId = toast.loading(`Moving "${lead.name}" to trash…`);
    const { error } = await supabase.from("leads").update({ deleted_at: new Date().toISOString() } as any).eq("id", lead.id);
    toast.dismiss(loadingId);
    if (error) { toast.error("Couldn't move lead to trash", { description: error.message }); return; }
    onRefresh?.();

    showUndoToast({
      title: `Lead "${lead.name}" moved to trash`,
      seconds: 6,
      onUndo: async () => {
        const undoId = toast.loading(`Restoring "${lead.name}"…`);
        const { error: undoErr } = await supabase.from("leads").update({ deleted_at: null } as any).eq("id", lead.id);
        toast.dismiss(undoId);
        if (undoErr) toast.error("Couldn't restore lead", { description: undoErr.message });
        else { toast.success("Lead restored", { description: `"${lead.name}" is back in your list.` }); onRefresh?.(); }
      },
    });
  };

  const buildLeadActions = (lead: PipelineLead): MobileSheetAction[] => {
    const acts: MobileSheetAction[] = [
      { key: "view", label: "View / Edit details", icon: Eye, onSelect: () => onSelectLead(lead) },
      { key: "call", label: `Call ${lead.phone}`, icon: PhoneIcon, href: `tel:${lead.phone}` },
    ];
    if (lead.email) acts.push({ key: "email", label: `Email ${lead.email}`, icon: Mail, href: `mailto:${lead.email}` });
    if (lead.resume_url) acts.push({ key: "resume", label: "Open Resume", icon: FileText, href: lead.resume_url });
    if (lead.floorplan_url) acts.push({ key: "floorplan", label: "Open Floor Plan", icon: FileText, href: lead.floorplan_url });
    acts.push({ key: "delete", label: "Move to Trash", icon: Trash2, variant: "destructive", onSelect: () => softDeleteLead(lead) });
    return acts;
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtShort = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <div data-tour-id="leads-search" className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, email, city…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length} className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Mobile card list (md:hidden) */}
      <div className="md:hidden space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3"><div className="h-16 bg-muted rounded animate-pulse" /></Card>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "No leads match your search" : "No leads yet"}
            description={search ? "Try a different name, phone or city." : "Capture your first lead to start tracking your pipeline."}
            actionLabel={search ? undefined : "Add Lead"}
            actionIcon={search ? undefined : UserPlus}
            onAction={search ? undefined : onAddLead}
          />
        ) : filtered.map(lead => (
          <Card key={lead.id} className="p-3 active:bg-muted/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="flex-1 min-w-0 text-left"
                onClick={() => onSelectLead(lead)}
              >
                <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                  <span className="truncate">{lead.name}</span>
                  <DemoBadge from={lead.details} />
                </p>
                <p className="text-xs text-muted-foreground truncate">{lead.phone}{lead.city ? ` · ${lead.city}` : ""}</p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 -mr-1"
                aria-label="Row actions"
                onClick={(e) => { e.stopPropagation(); setActionLead(lead); }}
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{lead.stage?.replace("_", " ")}</Badge>
              <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                {lead.source?.replace("_", " ") ?? "unknown"}
              </Badge>
              <span className="text-[10px] text-muted-foreground ml-auto">{fmtShort(lead.created_at)}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">Email</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">City</TableHead>
              <TableHead className="font-semibold">Stage</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Quotes</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">Downloads</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => (
                <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
              ))}</TableRow>
            )) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-0">
                  <EmptyState
                    asCard={false}
                    icon={Users}
                    title={search ? "No leads match your search" : "No leads yet"}
                    description={search ? "Try a different name, phone or city." : "Capture your first lead to start tracking your pipeline."}
                    actionLabel={search ? undefined : "Add Lead"}
                    actionIcon={search ? undefined : UserPlus}
                    onAction={search ? undefined : onAddLead}
                  />
                </TableCell>
              </TableRow>
            ) : filtered.map(lead => (
              <TableRow key={lead.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => onSelectLead(lead)}>
                <TableCell className="font-medium text-primary hover:underline">
                  <span className="inline-flex items-center gap-1.5">
                    {lead.name}
                    <DemoBadge from={lead.details} />
                  </span>
                </TableCell>
                <TableCell>
                  <a href={`tel:${lead.phone}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>{lead.phone}</a>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{lead.email || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{lead.city || "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">{lead.stage?.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                    {lead.source?.replace("_", " ") ?? "unknown"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {(() => {
                    const qc = quoteCounts?.[lead.id];
                    if (!qc || qc.total === 0) return <span className="text-muted-foreground text-xs">—</span>;
                    return (
                      <Badge variant="outline" className={`text-[10px] ${qc.sent > 0 ? "bg-primary/15 text-primary border-primary/20" : ""}`}>
                        {qc.total}{qc.sent > 0 ? ` · ${qc.sent} sent` : ""}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex flex-col gap-1">
                    {lead.resume_url && <a href={lead.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs" onClick={e => e.stopPropagation()}><FileText className="w-3.5 h-3.5" /> Resume</a>}
                    {lead.floorplan_url && <a href={lead.floorplan_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs" onClick={e => e.stopPropagation()}><FileText className="w-3.5 h-3.5" /> Floor Plan</a>}
                    {!lead.resume_url && !lead.floorplan_url && <span className="text-muted-foreground text-xs">—</span>}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{fmt(lead.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-center">Showing {filtered.length} of {leads.length} leads</p>

      <MobileActionSheet
        open={!!actionLead}
        onOpenChange={(o) => !o && setActionLead(null)}
        title={actionLead?.name ?? ""}
        description={actionLead ? `${actionLead.phone}${actionLead.city ? ` · ${actionLead.city}` : ""}` : undefined}
        actions={actionLead ? buildLeadActions(actionLead) : []}
      />
    </div>
  );
};

export default LeadsTable;
