import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CheckCircle2, AlertTriangle, Clock, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FollowUp } from "./types";

const OUTCOMES = [
  "Interested",
  "Not Interested",
  "Call Not Answered",
  "Meeting Scheduled",
  "Converted",
  "Others",
] as const;

interface Props {
  followUp: FollowUp | null;
  leadName: string;
  leadId: string;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const FollowUpDetailModal = ({ followUp, leadName, leadId, open, onClose, onRefresh }: Props) => {
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [reschedule, setReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editOutcome, setEditOutcome] = useState<string>("");
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const resetState = () => {
    setNotes("");
    setOutcome("");
    setReschedule(false);
    setRescheduleDate(undefined);
    setCalendarOpen(false);
    setEditMode(false);
    setEditNote("");
    setEditDate(undefined);
    setEditOutcome("");
    setEditCalendarOpen(false);
    setConfirmDelete(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
      onClose();
    }
  };

  if (!followUp) return null;

  const isOverdue = new Date(followUp.follow_up_date) < new Date() && !followUp.completed;
  const isCompleted = followUp.completed;
  const fuOutcome = (followUp as any).outcome as string | null;
  const fuCompletedAt = (followUp as any).completed_at as string | null;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const enterEditMode = () => {
    setEditNote(followUp.note || "");
    setEditDate(new Date(followUp.follow_up_date));
    setEditOutcome(fuOutcome || "");
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!editDate) {
      toast.error("Please pick a follow-up date");
      return;
    }
    setSaving(true);
    try {
      const updates: any = {
        follow_up_date: editDate.toISOString(),
        note: editNote.trim() || null,
      };
      if (isCompleted) updates.outcome = editOutcome || null;

      const { error } = await supabase
        .from("lead_follow_ups" as any)
        .update(updates)
        .eq("id", followUp.id);
      if (error) throw error;

      // Sync lead's next_followup_date if this is the upcoming one
      if (!isCompleted) {
        await supabase
          .from("leads")
          .update({ next_followup_date: editDate.toISOString() } as any)
          .eq("id", leadId);
      }

      toast.success("Follow-up updated");
      setEditMode(false);
      onRefresh();
    } catch {
      toast.error("Failed to update follow-up");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("lead_follow_ups" as any)
        .delete()
        .eq("id", followUp.id);
      if (error) throw error;
      toast.success("Follow-up deleted");
      setConfirmDelete(false);
      resetState();
      onClose();
      onRefresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveComplete = async () => {
    if (!notes.trim()) {
      toast.error("Please enter follow-up notes");
      return;
    }
    if (!outcome) {
      toast.error("Please select an outcome");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("lead_follow_ups" as any)
        .update({
          completed: true,
          note: notes.trim(),
          outcome,
          completed_at: new Date().toISOString(),
        })
        .eq("id", followUp.id);

      if (error) throw error;

      if (reschedule && rescheduleDate) {
        const { error: insertError } = await supabase
          .from("lead_follow_ups" as any)
          .insert({
            lead_id: leadId,
            follow_up_date: rescheduleDate.toISOString(),
            note: null,
          });
        if (insertError) throw insertError;

        await supabase
          .from("leads")
          .update({ next_followup_date: rescheduleDate.toISOString() } as any)
          .eq("id", leadId);

        toast.success("Follow-up completed & new one scheduled");
      } else {
        toast.success("Follow-up marked as completed");
      }

      resetState();
      onClose();
      onRefresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : isOverdue ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <Clock className="w-5 h-5 text-yellow-500" />
            )}
            Follow-up — {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Date Card */}
          <div className={cn(
            "rounded-lg p-3 border",
            isCompleted ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" :
            isOverdue ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" :
            "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Follow-up Date</p>
                <p className="text-sm font-semibold">{fmt(followUp.follow_up_date)}</p>
              </div>
              <Badge variant={isCompleted ? "default" : isOverdue ? "destructive" : "secondary"}
                className={cn(
                  isCompleted && "bg-green-600 hover:bg-green-700"
                )}>
                {isCompleted ? "Completed" : isOverdue ? "Overdue" : "Upcoming"}
              </Badge>
            </div>
            {fuCompletedAt && (
              <p className="text-xs text-muted-foreground mt-1">Completed on: {fmt(fuCompletedAt)}</p>
            )}
            {fuOutcome && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">{fuOutcome}</Badge>
              </div>
            )}
          </div>

          {/* EDIT MODE */}
          {editMode ? (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Edit Follow-up</p>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditMode(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Date</label>
                <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "dd-MM-yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={(d) => { setEditDate(d); setEditCalendarOpen(false); }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={3} className="text-sm" />
              </div>

              {isCompleted && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Outcome</label>
                  <Select value={editOutcome} onValueChange={setEditOutcome}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Existing note display */}
              {followUp.note && (
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{followUp.note}</p>
                </div>
              )}

              {/* Edit toggle button */}
              <Button variant="outline" size="sm" onClick={enterEditMode} className="w-full gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit Follow-up
              </Button>

              {/* Action form for incomplete follow-ups */}
              {!isCompleted && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Follow-up Notes <span className="text-red-500">*</span></label>
                    <Textarea
                      placeholder="Enter discussion details, client response, next steps…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Follow-up Outcome <span className="text-red-500">*</span></label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTCOMES.map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Reschedule next follow-up?</label>
                      <Switch checked={reschedule} onCheckedChange={setReschedule} />
                    </div>

                    {reschedule && (
                      <div className="space-y-2">
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !rescheduleDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {rescheduleDate ? format(rescheduleDate, "dd-MM-yyyy") : "Pick next follow-up date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                            <Calendar
                              mode="single"
                              selected={rescheduleDate}
                              onSelect={(d) => { setRescheduleDate(d); setCalendarOpen(false); }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {!isCompleted && !editMode && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { resetState(); onClose(); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveComplete} disabled={saving || !notes.trim() || !outcome || (reschedule && !rescheduleDate)}>
              {saving ? "Saving…" : reschedule ? "Save & Reschedule" : "Save & Complete"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this follow-up?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the follow-up entry for <strong>{leadName}</strong>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default FollowUpDetailModal;
