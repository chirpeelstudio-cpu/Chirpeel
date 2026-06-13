import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, Phone, Mail, FileText, Upload, Trash2, CheckCircle2, AlertTriangle, Plus, User, Pencil, X, Save, MessageSquare, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { STAGES, STAGE_STATUSES } from "./constants";
import type { PipelineLead, FollowUp, ProjectFile, TeamMember, LeadMessage } from "./types";
import { toast } from "sonner";
import FollowUpDetailModal from "./FollowUpDetailModal";
import SendWhatsAppDialog from "./SendWhatsAppDialog";
import TasksSection from "./tasks/TasksSection";
import StagePhotosUploader from "./portal/StagePhotosUploader";
import ShareWithClientButton from "./portal/ShareWithClientButton";
import LeadQuotationsSection from "./LeadQuotationsSection";

interface Props {
  lead: PipelineLead | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenQuotation?: (args: { leadId: string; quotationId?: string }) => void;
}

const LeadDetailPanel = ({ lead, open, onClose, onRefresh, onOpenQuotation }: Props) => {
  const navigate = useNavigate();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [waOpen, setWaOpen] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [newFollowUpDate, setNewFollowUpDate] = useState<Date | undefined>(undefined);
  const [newFollowUpNote, setNewFollowUpNote] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", email: "", city: "", pincode: "", project_type: "", budget: "", timeline: "", details: "",
  });

  useEffect(() => {
    if (lead) {
      fetchFollowUps();
      fetchFiles();
      fetchTeamMembers();
      fetchMessages();
      setEditing(false);
      setShowAllMessages(false);
    }
  }, [lead?.id]);

  const fetchMessages = async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("lead_messages" as any)
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setMessages((data ?? []) as unknown as LeadMessage[]);
  };

  const startEditing = () => {
    if (!lead) return;
    setEditForm({
      name: lead.name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      city: lead.city || "",
      pincode: lead.pincode || "",
      project_type: lead.project_type || "",
      budget: lead.budget || "",
      timeline: lead.timeline || "",
      details: lead.details || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!lead) return;
    const updates: any = {
      name: editForm.name,
      phone: editForm.phone,
      email: editForm.email || null,
      city: editForm.city || null,
      pincode: editForm.pincode || null,
      project_type: editForm.project_type || null,
      budget: editForm.budget || null,
      timeline: editForm.timeline || null,
      details: editForm.details || null,
    };
    const { error } = await supabase.from("leads").update(updates).eq("id", lead.id);
    if (error) toast.error("Failed to update");
    else { toast.success("Lead updated"); setEditing(false); onRefresh(); }
  };

  const fetchFollowUps = async () => {
    if (!lead) return;
    const { data } = await supabase.from("lead_follow_ups" as any).select("*").eq("lead_id", lead.id).order("follow_up_date", { ascending: false });
    setFollowUps((data ?? []) as unknown as FollowUp[]);
  };

  const fetchFiles = async () => {
    if (!lead) return;
    const { data } = await supabase.from("project_files" as any).select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
    setFiles((data ?? []) as unknown as ProjectFile[]);
  };

  const fetchTeamMembers = async () => {
    const { data } = await supabase.from("team_members" as any).select("*").eq("active", true);
    setTeamMembers((data ?? []) as unknown as TeamMember[]);
  };

  const updateLead = async (updates: Partial<PipelineLead>) => {
    const { error } = await supabase.from("leads").update(updates as any).eq("id", lead!.id);
    if (error) toast.error("Failed to update");
    else { toast.success("Updated"); onRefresh(); }
  };

  const addFollowUp = async () => {
    if (!newFollowUpDate || !lead) return;
    const dateStr = newFollowUpDate.toISOString();
    const { error } = await supabase.from("lead_follow_ups" as any).insert({ lead_id: lead.id, follow_up_date: dateStr, note: newFollowUpNote || null });
    if (error) toast.error("Failed to add follow-up");
    else {
      toast.success("Follow-up added");
      setNewFollowUpDate(undefined);
      setNewFollowUpNote("");
      setCalendarOpen(false);
      await updateLead({ next_followup_date: dateStr } as any);
      fetchFollowUps();
    }
  };

  const toggleFollowUp = async (fu: FollowUp) => {
    const { error } = await supabase.from("lead_follow_ups" as any).update({ completed: !fu.completed }).eq("id", fu.id);
    if (!error) fetchFollowUps();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lead) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${lead.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
    await supabase.from("project_files" as any).insert({
      lead_id: lead.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type.startsWith("image/") ? "site_image" : "document",
    });
    toast.success("File uploaded");
    setUploading(false);
    fetchFiles();
  };

  const deleteFile = async (f: ProjectFile) => {
    await supabase.from("project_files" as any).delete().eq("id", f.id);
    toast.success("File removed");
    fetchFiles();
  };

  const isOverdue = (d: string) => new Date(d) < new Date();
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{editing ? "Edit Lead" : lead.name}</SheetTitle>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={startEditing} className="mr-8">
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1 mr-8">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>
                <Button size="sm" onClick={saveEdit}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Contact Information</h4>
            {editing ? (
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Name *</label>
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Phone *</label>
                  <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-sm" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <a href={`tel:${lead.phone}`} className="text-primary hover:underline font-medium">{lead.phone}</a>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{lead.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* WhatsApp Messaging */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-green-600" /> WhatsApp
              </h4>
              <Button size="sm" onClick={() => setWaOpen(true)} className="h-8 bg-green-600 hover:bg-green-700 text-white">
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Send WhatsApp
              </Button>
            </div>

            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No messages sent yet.</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {(showAllMessages ? messages : messages.slice(0, 3)).map(m => (
                    <div key={m.id} className="rounded-md border bg-muted/30 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{m.template_title || "Custom Message"}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(m.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5 whitespace-pre-wrap">{m.body}</p>
                      {m.sent_by && <p className="text-[10px] text-muted-foreground mt-1">by {m.sent_by}</p>}
                    </div>
                  ))}
                </div>
                {messages.length > 3 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-full text-xs"
                    onClick={() => setShowAllMessages(s => !s)}
                  >
                    {showAllMessages ? <><ChevronUp className="w-3 h-3 mr-1" />Show less</> : <><ChevronDown className="w-3 h-3 mr-1" />Show all {messages.length}</>}
                  </Button>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Project Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Project Details</h4>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">City</label>
                  <Input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Pincode</label>
                  <Input value={editForm.pincode} onChange={e => setEditForm(f => ({ ...f, pincode: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Project Type</label>
                  <Input value={editForm.project_type} onChange={e => setEditForm(f => ({ ...f, project_type: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Budget</label>
                  <Input value={editForm.budget} onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Timeline</label>
                  <Input value={editForm.timeline} onChange={e => setEditForm(f => ({ ...f, timeline: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Additional Details</label>
                  <Textarea value={editForm.details} onChange={e => setEditForm(f => ({ ...f, details: e.target.value }))} className="text-sm" rows={3} />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Location</p>
                    <p className="text-sm font-medium mt-0.5">{lead.city || "—"}</p>
                    {lead.pincode && <p className="text-xs text-muted-foreground">PIN: {lead.pincode}</p>}
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Project Type</p>
                    <p className="text-sm font-medium mt-0.5">{lead.project_type || "—"}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Budget Range</p>
                    <p className="text-sm font-medium mt-0.5">{lead.budget || "—"}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Preferred Timeline</p>
                    <p className="text-sm font-medium mt-0.5">{lead.timeline || "—"}</p>
                  </div>
                </div>
                {lead.details && (
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Additional Details</p>
                    <p className="text-sm mt-1">{lead.details}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Stage & Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Pipeline Stage</h4>
            <Select value={lead.stage} onValueChange={v => updateLead({ stage: v, status: STAGE_STATUSES[v]?.[0] || "" } as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={lead.status} onValueChange={v => updateLead({ status: v } as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(STAGE_STATUSES[lead.stage] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Assign Team Member */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1"><User className="w-4 h-4" /> Assign To</h4>
            <Select value={lead.assigned_to || "unassigned"} onValueChange={v => updateLead({ assigned_to: v === "unassigned" ? null : v } as any)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name} {m.role ? `(${m.role})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Quotations */}
          {onOpenQuotation && (
            <>
              <LeadQuotationsSection
                leadId={lead.id}
                onCreate={() => onOpenQuotation({ leadId: lead.id })}
                onOpen={(quotationId) => onOpenQuotation({ leadId: lead.id, quotationId })}
              />
              <Separator />
            </>
          )}

          {/* Follow-ups */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> Follow-ups</h4>
            <div className="flex gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-9",
                      !newFollowUpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newFollowUpDate ? format(newFollowUpDate, "dd-MM-yyyy") : <span>dd-mm-yyyy</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start" side="bottom">
                  <Calendar
                    mode="single"
                    selected={newFollowUpDate}
                    onSelect={setNewFollowUpDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Button size="sm" onClick={addFollowUp} disabled={!newFollowUpDate}><Plus className="w-4 h-4" /></Button>
            </div>
            <Textarea placeholder="Follow-up note (optional)" value={newFollowUpNote} onChange={e => setNewFollowUpNote(e.target.value)} className="text-xs" rows={2} />
            {/* Last Follow-up Summary */}
            {followUps.length > 0 && followUps.find(f => f.completed) && (() => {
              const last = followUps.find(f => f.completed);
              if (!last) return null;
              const lastOutcome = (last as any).outcome as string | null;
              return (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-2.5 text-xs">
                  <p className="font-medium text-green-700 dark:text-green-400 mb-1">Last Follow-up Summary</p>
                  <p className="text-muted-foreground">{fmt(last.follow_up_date)}{lastOutcome ? ` • ${lastOutcome}` : ""}</p>
                  {last.note && <p className="mt-1 line-clamp-2">{last.note}</p>}
                </div>
              );
            })()}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {followUps.map(fu => {
                const fuOutcome = (fu as any).outcome as string | null;
                return (
                  <div
                    key={fu.id}
                    onClick={() => setSelectedFollowUp(fu)}
                    className={cn(
                      "flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-sm",
                      fu.completed
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : isOverdue(fu.follow_up_date)
                        ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                        : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
                    )}
                  >
                    <div className="mt-0.5">
                      {fu.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : isOverdue(fu.follow_up_date) ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <CalendarIcon className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{fmt(fu.follow_up_date)}</span>
                        <Badge variant="outline" className={cn("text-[9px] ml-1",
                          fu.completed ? "border-green-300 text-green-700" :
                          isOverdue(fu.follow_up_date) ? "border-red-300 text-red-700" :
                          "border-yellow-300 text-yellow-700"
                        )}>
                          {fu.completed ? "Completed" : isOverdue(fu.follow_up_date) ? "Missed" : "Upcoming"}
                        </Badge>
                      </div>
                      {fuOutcome && <Badge variant="secondary" className="text-[9px] mt-1">{fuOutcome}</Badge>}
                      {fu.note && <p className="text-muted-foreground mt-1 line-clamp-1">{fu.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Follow-up Detail Modal */}
          <FollowUpDetailModal
            followUp={selectedFollowUp}
            leadName={lead.name}
            leadId={lead.id}
            open={!!selectedFollowUp}
            onClose={() => setSelectedFollowUp(null)}
            onRefresh={() => { fetchFollowUps(); onRefresh(); }}
          />

          <Separator />

          {/* Payments */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">💰 Payment Tracking</h4>
            {[
              { key: "payment_10_percent", amountKey: "payment_10_amount", label: "10% Advance", paid: lead.payment_10_percent, amount: lead.payment_10_amount },
              { key: "payment_50_percent", amountKey: "payment_50_amount", label: "50% Payment", paid: lead.payment_50_percent, amount: lead.payment_50_amount },
              { key: "payment_100_percent", amountKey: "payment_100_amount", label: "100% Completion", paid: lead.payment_100_percent, amount: lead.payment_100_amount },
            ].map(p => (
              <div key={p.key} className="flex items-center gap-3">
                <Checkbox
                  checked={p.paid}
                  onCheckedChange={checked => updateLead({ [p.key]: !!checked } as any)}
                />
                <span className="text-sm flex-1">{p.label}</span>
                <Input
                  type="number"
                  placeholder="₹ Amount"
                  className="w-28 h-8 text-xs"
                  defaultValue={p.amount ?? ""}
                  onBlur={e => updateLead({ [p.amountKey]: e.target.value ? Number(e.target.value) : null } as any)}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Files */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1"><FileText className="w-4 h-4" /> Project Files</h4>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading…" : "Upload"}
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleFileUpload} />
            </div>

            <div className="flex flex-wrap gap-2">
              {lead.resume_url && (
                <a href={lead.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                  <FileText className="w-3.5 h-3.5" /> Resume
                </a>
              )}
              {lead.floorplan_url && (
                <a href={lead.floorplan_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                  <FileText className="w-3.5 h-3.5" /> Floor Plan
                </a>
              )}
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs border border-border">
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">{f.file_name}</a>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="outline" className="text-[9px]">{f.file_type}</Badge>
                    <button onClick={() => deleteFile(f)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Meta */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Source: {lead.source?.replace("_", " ") ?? "—"}</p>
            <p>Created: {fmt(lead.created_at)}</p>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" /> ⚡ Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 justify-start text-xs"
                onClick={() => {
                  onClose();
                  navigate(`/studio/finance?tab=payments&action=record&leadId=${lead.id}`);
                }}
              >
                💰 Record Payment
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 justify-start text-xs"
                onClick={() => {
                  onClose();
                  navigate(`/studio/finance?tab=invoices&action=generate&leadId=${lead.id}`);
                }}
              >
                📄 Generate Invoice
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 justify-start text-xs col-span-2"
                onClick={() => {
                  onClose();
                  navigate("/studio/automations");
                }}
              >
                ⚙️ Manage Automations
              </Button>
            </div>
          </div>

          <Separator />

          {/* Tasks */}
          <TasksSection leadId={lead.id} assigneeDefault={lead.assigned_to} />

          <Separator />

          {/* Stage photos */}
          <StagePhotosUploader leadId={lead.id} />

          <Separator />

          {/* Share with client */}
          <div className="flex justify-center">
            <ShareWithClientButton leadId={lead.id} leadName={lead.name} phone={lead.phone} />
          </div>

          <Separator />

          {/* Soft-delete Lead */}
          <div className="pt-2 pb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Move lead to trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{lead.name}</strong> will be hidden from active lists. You can restore it from Settings → Trash within 90 days.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                    const { error } = await supabase.rpc("soft_delete_entity" as any, { _entity: "lead", _id: lead.id });
                    if (error) toast.error(error.message);
                    else { toast.success("Lead moved to trash"); onClose(); onRefresh(); }
                  }}>Move to Trash</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
      <SendWhatsAppDialog
        open={waOpen}
        onClose={() => setWaOpen(false)}
        lead={lead}
        onSent={fetchMessages}
      />
    </Sheet>

  );
};

export default LeadDetailPanel;
