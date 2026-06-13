import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Upload, Save, Loader2 } from "lucide-react";

export interface CompanySettings {
  id?: string;
  company_name: string;
  tagline: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  gstin: string | null;
  logo_url: string | null;
  logo_size: "sm" | "md" | "lg" | "xl";
  header_color: string;
  accent_color: string;
  footer_note: string | null;
  client_portal_whatsapp_template: string | null;
}

export const DEFAULT_PORTAL_WA_TEMPLATE =
  "Hi {{company}} team, this is {{name}}{{ref}}. I'd like an update on my project.";

const LOGO_SIZE_PX: Record<string, number> = { sm: 48, md: 72, lg: 96, xl: 128 };

const empty: CompanySettings = {
  company_name: "Chirpeel Interiors",
  tagline: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  gstin: "",
  logo_url: "",
  logo_size: "md",
  header_color: "#0F2C5F",
  accent_color: "#0F2C5F",
  footer_note: "",
  client_portal_whatsapp_template: DEFAULT_PORTAL_WA_TEMPLATE,
};

export default function CompanyBranding() {
  const [s, setS] = useState<CompanySettings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("company_settings" as never).select("*").limit(1).maybeSingle();
      if (data) setS(data as unknown as CompanySettings);
      setLoading(false);
    })();
  }, []);

  const update = <K extends keyof CompanySettings>(key: K, val: CompanySettings[K]) =>
    setS(prev => ({ ...prev, [key]: val }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
      update("logo_url", data.publicUrl);
      toast({ title: "Logo uploaded" });
    }
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...s };
    delete (payload as { id?: string }).id;
    const query = s.id
      ? supabase.from("company_settings" as never).update(payload as never).eq("id", s.id)
      : supabase.from("company_settings" as never).insert(payload as never);
    const { error } = await query;
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Branding saved", description: "Quotations will now use these details." });
    setSaving(false);
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  const logoPx = LOGO_SIZE_PX[s.logo_size] ?? 72;

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      {/* Editor */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold">Company Branding</h2>
          <p className="text-sm text-muted-foreground">These details appear on every quotation header, PDF, and email.</p>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-md border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
              {s.logo_url ? <img src={s.logo_url} alt="logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                {s.logo_url ? "Replace logo" : "Upload logo"}
              </Button>
              {s.logo_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => update("logo_url", "")}>Remove</Button>
              )}
            </div>
            <div className="ml-auto w-40">
              <Label className="text-xs">Logo size</Label>
              <Select value={s.logo_size} onValueChange={(v) => update("logo_size", v as CompanySettings["logo_size"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Company name</Label><Input value={s.company_name} onChange={(e) => update("company_name", e.target.value)} /></div>
          <div><Label>Tagline</Label><Input value={s.tagline ?? ""} onChange={(e) => update("tagline", e.target.value)} placeholder="Premium Modular Interiors" /></div>
        </div>

        {/* Address */}
        <div className="space-y-3">
          <Label>Full address</Label>
          <Input value={s.address_line1 ?? ""} onChange={(e) => update("address_line1", e.target.value)} placeholder="Address line 1" />
          <Input value={s.address_line2 ?? ""} onChange={(e) => update("address_line2", e.target.value)} placeholder="Address line 2" />
          <div className="grid sm:grid-cols-3 gap-3">
            <Input value={s.city ?? ""} onChange={(e) => update("city", e.target.value)} placeholder="City" />
            <Input value={s.state ?? ""} onChange={(e) => update("state", e.target.value)} placeholder="State" />
            <Input value={s.pincode ?? ""} onChange={(e) => update("pincode", e.target.value)} placeholder="Pincode" />
          </div>
        </div>

        {/* Contact */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Phone</Label><Input value={s.phone ?? ""} onChange={(e) => update("phone", e.target.value)} /></div>
          <div><Label>WhatsApp</Label><Input value={s.whatsapp ?? ""} onChange={(e) => update("whatsapp", e.target.value)} /></div>
          <div><Label>Email</Label><Input value={s.email ?? ""} onChange={(e) => update("email", e.target.value)} /></div>
          <div><Label>Website</Label><Input value={s.website ?? ""} onChange={(e) => update("website", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>GSTIN</Label><Input value={s.gstin ?? ""} onChange={(e) => update("gstin", e.target.value)} placeholder="33AAAAA0000A1Z5" /></div>
        </div>

        {/* Client portal WhatsApp greeting */}
        <div className="rounded-lg border border-dashed border-border p-4 space-y-2 bg-muted/30">
          <div className="flex items-baseline justify-between gap-2">
            <Label className="text-sm font-semibold">Client portal WhatsApp greeting</Label>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => update("client_portal_whatsapp_template", DEFAULT_PORTAL_WA_TEMPLATE)}
            >
              Reset to default
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Prefilled message when a customer taps the WhatsApp button on their portal. Uses the WhatsApp number above.
            Available tokens: <code className="text-[11px]">{"{{name}}"}</code>, <code className="text-[11px]">{"{{company}}"}</code>, <code className="text-[11px]">{"{{ref}}"}</code> (project/quotation code).
          </p>
          <Textarea
            rows={3}
            maxLength={500}
            value={s.client_portal_whatsapp_template ?? ""}
            onChange={(e) => update("client_portal_whatsapp_template", e.target.value)}
            placeholder={DEFAULT_PORTAL_WA_TEMPLATE}
          />
          <p className="text-[11px] text-muted-foreground text-right">
            {(s.client_portal_whatsapp_template ?? "").length}/500
          </p>
        </div>

        {/* Colors */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Header color</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={s.header_color} onChange={(e) => update("header_color", e.target.value)} className="h-10 w-14 rounded border border-border cursor-pointer" />
              <Input value={s.header_color} onChange={(e) => update("header_color", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Accent color</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={s.accent_color} onChange={(e) => update("accent_color", e.target.value)} className="h-10 w-14 rounded border border-border cursor-pointer" />
              <Input value={s.accent_color} onChange={(e) => update("accent_color", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <Label>Footer note</Label>
          <Textarea rows={2} value={s.footer_note ?? ""} onChange={(e) => update("footer_note", e.target.value)} />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save branding
          </Button>
        </div>
      </Card>

      {/* Live preview */}
      <div className="lg:sticky lg:top-20 self-start space-y-3">
        <div className="text-sm font-semibold text-muted-foreground">Live preview</div>
        <div className="bg-white rounded-md border border-border p-5 shadow-sm">
          <div className="flex items-start gap-4 pb-4 border-b" style={{ borderColor: s.accent_color + "33" }}>
            {s.logo_url && <img src={s.logo_url} alt="logo" style={{ height: logoPx, width: logoPx }} className="object-contain shrink-0" />}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold leading-tight" style={{ color: s.header_color }}>{s.company_name}</h3>
              {s.tagline && <p className="text-xs text-muted-foreground">{s.tagline}</p>}
              <div className="text-[11px] text-foreground/80 mt-2 space-y-0.5">
                {s.address_line1 && <div>{s.address_line1}</div>}
                {s.address_line2 && <div>{s.address_line2}</div>}
                {(s.city || s.state || s.pincode) && <div>{[s.city, s.state, s.pincode].filter(Boolean).join(", ")}</div>}
                <div className="pt-1">
                  {s.phone && <span>📞 {s.phone}</span>}
                  {s.whatsapp && s.whatsapp !== s.phone && <span> · WA {s.whatsapp}</span>}
                </div>
                {s.email && <div>✉ {s.email}</div>}
                {s.website && <div>🌐 {s.website}</div>}
                {s.gstin && <div className="font-medium">GSTIN: {s.gstin}</div>}
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-muted-foreground mt-4">{s.footer_note}</div>
        </div>
      </div>
    </div>
  );
}
