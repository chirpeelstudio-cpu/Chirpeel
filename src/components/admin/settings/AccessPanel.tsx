import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUserPermissions, type Permissions } from "@/hooks/useCurrentUserPermissions";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean;
  permissions: Permissions;
}

const MODULES: { key: keyof Permissions; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "pipeline", label: "Pipeline" },
  { key: "leads", label: "Leads" },
  { key: "quotation", label: "Quotation" },
  { key: "projects", label: "Projects" },
  { key: "vendors", label: "Vendors" },
  { key: "messages", label: "Messages" },
  { key: "finance", label: "Finance" },
  { key: "team", label: "Team" },
  { key: "branding", label: "Branding" },
  { key: "settings", label: "Settings" },
];

export default function AccessPanel() {
  const { isAdmin, loading: permsLoading } = useCurrentUserPermissions();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, active, permissions").order("full_name");
      setProfiles((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const togglePerm = async (profileId: string, key: keyof Permissions) => {
    const target = profiles.find(p => p.id === profileId);
    if (!target) return;
    const next = { ...(target.permissions ?? {}), [key]: !target.permissions?.[key] } as Permissions;
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, permissions: next } : p));
    const { error } = await supabase.from("profiles").update({ permissions: next as any }).eq("id", profileId);
    if (error) {
      toast.error("Could not update permission");
      // revert
      setProfiles(prev => prev.map(p => p.id === profileId ? target : p));
    } else {
      toast.success("Permission updated");
    }
  };

  if (permsLoading || loading) {
    return <Card className="p-6"><Loader2 className="w-5 h-5 animate-spin" /></Card>;
  }

  if (!isAdmin) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Only administrators can manage access permissions.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Access Control</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Toggle per-module access for each teammate. Admins always have access to everything.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left p-2 sticky left-0 bg-card">Member</th>
              {MODULES.map(m => (
                <th key={m.key} className="p-2 text-xs font-medium text-muted-foreground whitespace-nowrap">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-2 sticky left-0 bg-card">
                  <div className="font-medium">{p.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </td>
                {MODULES.map(m => (
                  <td key={m.key} className="p-2 text-center">
                    <Switch
                      checked={!!p.permissions?.[m.key]}
                      onCheckedChange={() => togglePerm(p.id, m.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
