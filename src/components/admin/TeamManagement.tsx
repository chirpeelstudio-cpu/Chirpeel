import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Info, Loader2, UserCog, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { AppRole, Permissions } from "@/hooks/useCurrentUserPermissions";
import UpgradeGate from "@/components/billing/UpgradeGate";

const SECTIONS: { key: keyof Permissions; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "leads", label: "Leads" },
  { key: "quotation", label: "Quotation" },
  { key: "messages", label: "Messages" },
  { key: "finance", label: "Finance" },
  { key: "settings", label: "Settings" },
  { key: "branding", label: "Branding" },
  { key: "team", label: "Team" },
];

const ROLE_PRESETS: Record<AppRole, Permissions> = {
  owner:     { overview:true, pipeline:true, leads:true, quotation:true, messages:true, finance:true, settings:true, branding:true, team:true, vendors:true, projects:true, marketing:true },
  admin:     { overview:true, pipeline:true, leads:true, quotation:true, messages:true, finance:true, settings:true, branding:true, team:true, vendors:true, projects:true, marketing:true },
  manager:   { overview:true, pipeline:true, leads:true, quotation:true, messages:true, finance:true, settings:false, branding:false, team:false, vendors:true, projects:true, marketing:true },
  designer:  { overview:true, pipeline:true, leads:true, quotation:true, messages:false, finance:false, settings:false, branding:false, team:false, vendors:false, projects:true, marketing:false },
  sales:     { overview:true, pipeline:true, leads:true, quotation:false, messages:true, finance:false, settings:false, branding:false, team:false, vendors:false, projects:false, marketing:true },
  accounts:  { overview:true, pipeline:true, leads:true, quotation:true, messages:false, finance:true, settings:false, branding:false, team:false, vendors:true, projects:true, marketing:false },
  installer: { overview:true, pipeline:true, leads:true, quotation:false, messages:false, finance:false, settings:false, branding:false, team:false, vendors:false, projects:true, marketing:false },
};

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role_label: string | null;
  active: boolean;
  permissions: Permissions;
}

export default function TeamManagement() {
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: ur }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap: Record<string, AppRole[]> = {};
    (ur ?? []).forEach((r: { user_id: string; role: string }) => {
      roleMap[r.user_id] = [...(roleMap[r.user_id] ?? []), r.role as AppRole];
    });
    setMembers((profiles ?? []) as unknown as ProfileRow[]);
    setRoles(roleMap);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("profiles").update({ active }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(active ? "Activated" : "Deactivated"); fetchAll(); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-muted/40 border-border flex gap-3 items-start">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          Login emails like <code className="px-1 py-0.5 bg-muted rounded">designer1@chirpeel.com</code> work as login IDs immediately.
          To actually <strong>receive mail</strong> at that address, configure MX records on <code className="px-1 py-0.5 bg-muted rounded">chirpeel.com</code> with an email host (Google Workspace, Zoho, etc.).
          Team members log in at <code className="px-1 py-0.5 bg-muted rounded">chirpeel.com/team</code>.
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><UserCog className="w-5 h-5" /> Team Members</h2>
        <UpgradeGate kind="team_member">
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Team Member
          </Button>
        </UpgradeGate>
        <Dialog open={open} onOpenChange={setOpen}>
          <AddMemberDialog onClose={() => setOpen(false)} onCreated={fetchAll} />
        </Dialog>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email (login)</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No team members yet.</TableCell></TableRow>
              )}
              {members.map(m => {
                const r = roles[m.id] ?? [];
                const allowed = SECTIONS.filter(s => m.permissions?.[s.key]).map(s => s.label);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{m.email}</TableCell>
                    <TableCell><Badge variant="secondary">{r[0] ?? m.role_label ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">{allowed.join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.active ? "default" : "outline"}>{m.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(m.id, !m.active)}>
                        {m.active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <EditMemberDialog
            member={editing}
            currentRole={(roles[editing.id]?.[0] as AppRole) ?? "designer"}
            onClose={() => setEditing(null)}
            onSaved={fetchAll}
          />
        )}
      </Dialog>
    </div>
  );
}

function EditMemberDialog({
  member, currentRole, onClose, onSaved,
}: { member: ProfileRow; currentRole: AppRole; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(member.full_name ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [role, setRole] = useState<AppRole>(currentRole);
  const [perms, setPerms] = useState<Permissions>(member.permissions ?? ROLE_PRESETS[currentRole]);
  const [active, setActive] = useState<boolean>(member.active);
  const [submitting, setSubmitting] = useState(false);

  const save = async () => {
    setSubmitting(true);
    const { error: pErr } = await supabase.from("profiles").update({
      full_name: fullName,
      phone: phone || null,
      role_label: role.charAt(0).toUpperCase() + role.slice(1),
      permissions: perms as unknown as Record<string, boolean>,
      active,
    }).eq("id", member.id);

    if (pErr) { setSubmitting(false); toast.error(pErr.message); return; }

    if (role !== currentRole) {
      await supabase.from("user_roles").delete().eq("user_id", member.id);
      const { error: rErr } = await supabase.from("user_roles").insert({ user_id: member.id, role });
      if (rErr) { setSubmitting(false); toast.error(rErr.message); return; }
    }

    setSubmitting(false);
    toast.success("Team member updated");
    onSaved(); onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit Team Member</DialogTitle>
        <DialogDescription>Update role, permissions and details for {member.email}.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Full name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
        </div>
        <div>
          <Label>Login email</Label>
          <Input value={member.email ?? ""} disabled />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={v => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="accounts">Accounts</SelectItem>
                <SelectItem value="installer">Installer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={active ? "active" : "inactive"} onValueChange={v => setActive(v === "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Dashboard sections this user can access</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPerms(ROLE_PRESETS[role])}>
              Reset to {role} defaults
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-md">
            {SECTIONS.map(s => (
              <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={perms[s.key]} onCheckedChange={(v) => setPerms(p => ({ ...p, [s.key]: !!v }))} />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddMemberDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("designer");
  const [perms, setPerms] = useState<Permissions>(ROLE_PRESETS.designer);
  const [submitting, setSubmitting] = useState(false);

  const onRoleChange = (r: AppRole) => { setRole(r); setPerms(ROLE_PRESETS[r]); };

  const submit = async () => {
    if (!fullName || !email || !password) { toast.error("Name, email and password required"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-team-account", {
      body: {
        email, password, full_name: fullName, phone: phone || undefined,
        role, role_label: role.charAt(0).toUpperCase() + role.slice(1), permissions: perms,
      },
    });
    setSubmitting(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Failed");
      return;
    }
    toast.success("Team member created");
    onCreated(); onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogDescription>Creates a login account and assigns role + permissions.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Full name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
        </div>
        <div><Label>Login email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="designer1@chirpeel.com" /></div>
        <div><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 chars" /></div>
        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={v => onRoleChange(v as AppRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="designer">Designer</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="accounts">Accounts</SelectItem>
              <SelectItem value="installer">Installer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block">Dashboard sections this user can access</Label>
          <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-md">
            {SECTIONS.map(s => (
              <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={perms[s.key]} onCheckedChange={(v) => setPerms(p => ({ ...p, [s.key]: !!v }))} />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Create account
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
