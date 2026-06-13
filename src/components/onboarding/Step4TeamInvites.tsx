import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { OnboardingState } from "@/pages/Onboarding";

const ROLES = ["designer", "sales", "manager", "installer"];

interface Props {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}

export default function Step4TeamInvites({ state, update }: Props) {
  const setRow = (idx: number, patch: Partial<{ email: string; role: string }>) => {
    const next = [...state.invites];
    next[idx] = { ...next[idx], ...patch };
    update({ invites: next });
  };
  const add = () => {
    if (state.invites.length >= 3) return;
    update({ invites: [...state.invites, { email: "", role: "designer" }] });
  };
  const remove = (idx: number) => update({ invites: state.invites.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Invite your team</h2>
        <p className="text-sm text-muted-foreground mt-1">Optional — invite up to 3 teammates. You can always add more later.</p>
      </div>

      <div className="space-y-3">
        {state.invites.map((row, idx) => (
          <div key={idx} className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor={`inv-${idx}`} className="text-xs">Email</Label>
              <Input id={`inv-${idx}`} type="email" placeholder="teammate@studio.com"
                value={row.email} onChange={(e) => setRow(idx, { email: e.target.value })} className="mt-1" />
            </div>
            <div className="w-36">
              <Label className="text-xs">Role</Label>
              <Select value={row.role} onValueChange={(v) => setRow(idx, { role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(idx)} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {state.invites.length < 3 && (
          <Button variant="outline" onClick={add} className="w-full">
            <Plus className="w-4 h-4 mr-1.5" /> Add teammate
          </Button>
        )}
      </div>

      <div className="p-4 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
        Invitations are sent by email when you finish setup. You can skip this step if you're starting solo.
      </div>
    </div>
  );
}
