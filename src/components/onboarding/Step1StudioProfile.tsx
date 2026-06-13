import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { OnboardingState } from "@/pages/Onboarding";

interface Props {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}

export default function Step1StudioProfile({ state, update }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      toast({ title: "Logo too large", description: "Max 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      update({ logo_url: urlData.publicUrl });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Your studio profile</h2>
        <p className="text-sm text-muted-foreground mt-1">This appears on quotations, invoices, and your client portal.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="company_name">Studio name *</Label>
          <Input id="company_name" required className="mt-1.5" placeholder="Acme Interiors"
            value={state.company_name} onChange={(e) => update({ company_name: e.target.value })} />
        </div>

        <div className="sm:col-span-2">
          <Label>Logo</Label>
          <div className="mt-1.5 flex items-center gap-4 p-4 border border-dashed border-border rounded-lg bg-muted/40">
            {state.logo_url ? (
              <img src={state.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-contain bg-card border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
            <label className="flex-1">
              <input type="file" accept="image/*" className="hidden" onChange={handleLogo} disabled={uploading} />
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <span className="cursor-pointer">
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Upload logo</>}
                </span>
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, or SVG · max 2MB</p>
            </label>
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" className="mt-1.5" placeholder="+91 98765 43210"
            value={state.phone} onChange={(e) => update({ phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="email">Contact email</Label>
          <Input id="email" type="email" className="mt-1.5" placeholder="hello@studio.com"
            value={state.email} onChange={(e) => update({ email: e.target.value })} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="address">Studio address</Label>
          <Textarea id="address" rows={2} className="mt-1.5" placeholder="Street, City, State, PIN"
            value={state.address} onChange={(e) => update({ address: e.target.value })} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="gstin">GSTIN <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="gstin" className="mt-1.5" placeholder="22AAAAA0000A1Z5"
            value={state.gstin} onChange={(e) => update({ gstin: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
