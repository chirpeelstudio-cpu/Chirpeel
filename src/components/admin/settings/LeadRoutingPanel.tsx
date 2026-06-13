import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Route } from "lucide-react";
import { toast } from "sonner";

interface Rule {
  id: string;
  name: string;
  match_source: string | null;
  match_city: string | null;
  assign_to: string | null;
  round_robin_pool: string[] | null;
  active: boolean;
}

export default function LeadRoutingPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [sources, setSources] = useState<{ key: string; label: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [draft, setDraft] = useState<Partial<Rule>>({ name: "", match_source: "", match_city: "", assign_to: "", active: true });

  const load = async () => {
    const [{ data: rs }, { data: src }, { data: mem }] = await Promise.all([
      supabase.from("lead_routing_rules" as any).select("*").order("sort_order"),
      supabase.from("lead_sources" as any).select("key, label").eq("active", true),
      supabase.from("profiles").select("id, full_name, email").eq("active", true),
    ]);
    setRules(((rs ?? []) as any[]).map(r => ({ ...r, round_robin_pool: r.round_robin_pool ?? null })));
    setSources((src ?? []) as any);
    setMembers((mem ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.name) return toast.error("Rule name required");
    const { error } = await supabase.from("lead_routing_rules" as any).insert({
      name: draft.name,
      match_source: draft.match_source || null,
      match_city: draft.match_city || null,
      assign_to: draft.assign_to || null,
      active: draft.active ?? true,
      sort_order: rules.length + 1,
    });
    if (error) toast.error(error.message);
    else { setDraft({ name: "", match_source: "", match_city: "", assign_to: "", active: true }); load(); toast.success("Rule added"); }
  };

  const update = async (id: string, patch: Partial<Rule>) => {
    const { error } = await supabase.from("lead_routing_rules" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete rule?")) return;
    const { error } = await supabase.from("lead_routing_rules" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Route className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Lead Routing Rules</h3>
      </div>
      <p className="text-xs text-muted-foreground">When a new lead matches the source and city, auto-assign it to the chosen teammate. Rules are evaluated top-to-bottom; first match wins.</p>

      <div className="space-y-2">
        {rules.map(r => (
          <div key={r.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded border border-border">
            <Input className="col-span-3" value={r.name} onChange={e => update(r.id, { name: e.target.value })} />
            <select className="col-span-2 h-9 rounded border border-input bg-background px-2 text-sm" value={r.match_source ?? ""} onChange={e => update(r.id, { match_source: e.target.value || null })}>
              <option value="">(any source)</option>
              {sources.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <Input className="col-span-2" placeholder="(any city)" value={r.match_city ?? ""} onChange={e => update(r.id, { match_city: e.target.value || null })} />
            <select className="col-span-3 h-9 rounded border border-input bg-background px-2 text-sm" value={r.assign_to ?? ""} onChange={e => update(r.id, { assign_to: e.target.value || null })}>
              <option value="">(unassigned)</option>
              {members.map(m => <option key={m.id} value={m.full_name || m.email || ""}>{m.full_name || m.email}</option>)}
            </select>
            <div className="col-span-1"><Switch checked={r.active} onCheckedChange={v => update(r.id, { active: v })} /></div>
            <Button size="icon" variant="ghost" className="col-span-1" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No routing rules yet. Add one below.</p>}
      </div>

      <div className="grid grid-cols-12 gap-2 items-end pt-3 border-t border-border">
        <div className="col-span-3"><Label className="text-xs">Rule name</Label><Input value={draft.name ?? ""} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Tirupur Google Ads" /></div>
        <div className="col-span-2"><Label className="text-xs">Source</Label>
          <select className="h-9 w-full rounded border border-input bg-background px-2 text-sm" value={draft.match_source ?? ""} onChange={e => setDraft({ ...draft, match_source: e.target.value })}>
            <option value="">(any)</option>
            {sources.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="col-span-2"><Label className="text-xs">City</Label><Input value={draft.match_city ?? ""} onChange={e => setDraft({ ...draft, match_city: e.target.value })} placeholder="(any)" /></div>
        <div className="col-span-3"><Label className="text-xs">Assign to</Label>
          <select className="h-9 w-full rounded border border-input bg-background px-2 text-sm" value={draft.assign_to ?? ""} onChange={e => setDraft({ ...draft, assign_to: e.target.value })}>
            <option value="">(unassigned)</option>
            {members.map(m => <option key={m.id} value={m.full_name || m.email || ""}>{m.full_name || m.email}</option>)}
          </select>
        </div>
        <Button className="col-span-2" onClick={add}><Plus className="w-4 h-4 mr-1.5" />Add</Button>
      </div>

      <p className="text-xs text-muted-foreground italic">Note: Rules are stored now. The auto-assign hook will be wired into the lead-creation pipeline as part of Phase 4 (automation engine).</p>
    </Card>
  );
}
