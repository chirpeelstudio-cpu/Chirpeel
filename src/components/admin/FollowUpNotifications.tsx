import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Clock, AlertTriangle, CheckCircle2, CalendarClock, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { PipelineLead } from "./types";

interface FollowUpReminder {
  id: string;
  lead_id: string;
  follow_up_date: string;
  note: string | null;
  completed: boolean;
  lead_name: string;
  lead_phone: string;
  assigned_to: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // within next 2 hours
}

interface Props {
  leads: PipelineLead[];
  onSelectLead: (lead: PipelineLead) => void;
  onRefresh: () => void;
}

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const FollowUpNotifications = ({ leads, onSelectLead, onRefresh }: Props) => {
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [open, setOpen] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  const fetchReminders = useCallback(async () => {
    const { data: followUps } = await supabase
      .from("lead_follow_ups" as any)
      .select("*")
      .eq("completed", false)
      .order("follow_up_date", { ascending: true });

    if (!followUps) return;

    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const mapped: FollowUpReminder[] = (followUps as any[]).map((fu) => {
      const lead = leads.find((l) => l.id === fu.lead_id);
      const fuDate = new Date(fu.follow_up_date);
      return {
        id: fu.id,
        lead_id: fu.lead_id,
        follow_up_date: fu.follow_up_date,
        note: fu.note,
        completed: fu.completed,
        lead_name: lead?.name || "Unknown",
        lead_phone: lead?.phone || "",
        assigned_to: lead?.assigned_to || null,
        isOverdue: fuDate < now,
        isDueToday: fuDate >= now && fuDate <= todayEnd,
        isDueSoon: fuDate >= now && fuDate <= twoHoursLater,
      };
    });

    // Filter to only overdue + due today
    const active = mapped.filter((r) => r.isOverdue || r.isDueToday);
    setReminders(active);

    // Trigger popup notifications for newly due items
    active.forEach((r) => {
      if ((r.isOverdue || r.isDueSoon) && !lastNotifiedRef.current.has(r.id)) {
        lastNotifiedRef.current.add(r.id);
        const prefix = r.isOverdue ? "⏰ Overdue" : "🔔 Due soon";
        toast.warning(`${prefix}: Follow-up for ${r.lead_name}`, {
          description: r.note || `Phone: ${r.lead_phone}`,
          duration: 10000,
          action: {
            label: "View",
            onClick: () => {
              const lead = leads.find((l) => l.id === r.lead_id);
              if (lead) onSelectLead(lead);
            },
          },
        });
        audioRef.current?.play().catch(() => {});
      }
    });
  }, [leads, onSelectLead]);

  // Poll every 60 seconds
  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 60000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const markDone = async (reminder: FollowUpReminder) => {
    const { error } = await supabase
      .from("lead_follow_ups" as any)
      .update({ completed: true })
      .eq("id", reminder.id);
    if (error) toast.error("Failed to mark as done");
    else {
      toast.success(`Follow-up for ${reminder.lead_name} marked as done`);
      fetchReminders();
      onRefresh();
    }
  };

  const reschedule = async (reminder: FollowUpReminder) => {
    if (!rescheduleDate) return;
    const { error } = await supabase
      .from("lead_follow_ups" as any)
      .update({ follow_up_date: rescheduleDate })
      .eq("id", reminder.id);
    if (error) toast.error("Failed to reschedule");
    else {
      // Also update lead's next_followup_date
      await supabase
        .from("leads")
        .update({ next_followup_date: rescheduleDate } as any)
        .eq("id", reminder.lead_id);
      toast.success(`Follow-up rescheduled for ${reminder.lead_name}`);
      setRescheduleId(null);
      setRescheduleDate("");
      fetchReminders();
      onRefresh();
    }
  };

  const openLead = (reminder: FollowUpReminder) => {
    const lead = leads.find((l) => l.id === reminder.lead_id);
    if (lead) {
      onSelectLead(lead);
      setOpen(false);
    }
  };

  const overdueCount = reminders.filter((r) => r.isOverdue).length;
  const totalCount = reminders.length;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d overdue`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h overdue`;
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m overdue`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className={`w-5 h-5 ${totalCount > 0 ? "text-foreground" : "text-muted-foreground"}`} />
          {totalCount > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${overdueCount > 0 ? "bg-red-500 animate-pulse" : "bg-orange-500"}`}>
              {totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1.5rem)] sm:w-[380px] p-0 max-h-[500px] overflow-hidden" align="end" sideOffset={8}>
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Follow-up Reminders</h3>
            <div className="flex gap-1.5">
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {overdueCount} overdue
                </Badge>
              )}
              {totalCount - overdueCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {totalCount - overdueCount} due today
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[420px] divide-y divide-border">
          {reminders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs mt-1">No pending follow-ups</p>
            </div>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className={`p-3 transition-colors ${r.isOverdue ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-muted/30"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {r.isOverdue ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      )}
                      <span className="text-sm font-semibold truncate">{r.lead_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-5">
                      {r.isOverdue ? (
                        <span className="text-red-600 font-medium">{timeAgo(r.follow_up_date)}</span>
                      ) : (
                        <span>Due: {fmt(r.follow_up_date)}</span>
                      )}
                      {r.assigned_to && <span className="ml-2">• {r.assigned_to}</span>}
                    </p>
                    {r.note && (
                      <p className="text-xs text-muted-foreground mt-1 ml-5 line-clamp-1">{r.note}</p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1.5 mt-2 ml-5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    onClick={() => markDone(r)}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                  </Button>

                  {rescheduleId === r.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="h-7 text-xs w-32"
                      />
                      <Button size="sm" className="h-7 text-xs px-2" onClick={() => reschedule(r)} disabled={!rescheduleDate}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => setRescheduleId(null)}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      onClick={() => { setRescheduleId(r.id); setRescheduleDate(""); }}
                    >
                      <CalendarClock className="w-3 h-3 mr-1" /> Reschedule
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => openLead(r)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" /> Open
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FollowUpNotifications;
