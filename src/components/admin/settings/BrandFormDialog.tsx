import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import type { BrandCategory } from "@/components/admin/quotation/brands";
import { BRAND_CATEGORY_LABEL } from "@/components/admin/quotation/brands";
import type { BrandCatalogRow } from "@/hooks/useBrandCatalog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: BrandCategory;
  /** When provided, edit mode. Otherwise create mode. */
  brand?: BrandCatalogRow | null;
  /** Largest sort_order currently in this category, used to append new brands. */
  nextSortOrder: number;
  onSaved: () => void;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

/** Map BrandCategory to material_pricing scope so we can mirror rate writes. */
const scopeForCategory = (c: BrandCategory): string =>
  c === "core_material" ? "core_brand" : c;

export const BrandFormDialog = ({ open, onOpenChange, category, brand, nextSortOrder, onSaved }: Props) => {
  const { toast } = useToast();
  const isEdit = !!brand;
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [rate, setRate] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(brand?.name ?? "");
      setKey(brand?.key ?? "");
      setKeyTouched(!!brand);
      setRate(Number(brand?.rate_per_sqft ?? 0));
      setActive(brand?.active ?? true);
      setLogoUrl(brand?.logo_url ?? null);
      setLogoFile(null);
      setPreviewUrl(null);
    }
  }, [open, brand]);

  // auto-slug key while name is being typed (only in create mode and before user touches key)
  useEffect(() => {
    if (!isEdit && !keyTouched) setKey(slugify(name));
  }, [name, isEdit, keyTouched]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 1024 * 1024) {
      toast({ title: "Logo too large", description: "Max 1 MB", variant: "destructive" });
      return;
    }
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(f.type)) {
      toast({ title: "Unsupported format", description: "PNG, JPG, SVG or WEBP only", variant: "destructive" });
      return;
    }
    setLogoFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return logoUrl;
    const ext = logoFile.name.split(".").pop() || "png";
    const path = `brands/${category}/${key || slugify(name)}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, logoFile, {
      cacheControl: "3600", upsert: true,
    });
    if (error) {
      toast({ title: "Logo upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const finalKey = (key || slugify(name)).trim();
    if (!finalKey) {
      toast({ title: "Key required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const finalLogo = await uploadLogo();
    if (logoFile && !finalLogo) { setSaving(false); return; }

    const payload = {
      category,
      key: finalKey,
      name: name.trim(),
      logo_url: finalLogo,
      rate_per_sqft: rate || 0,
      sort_order: brand?.sort_order ?? nextSortOrder,
      active,
    };

    let error;
    if (isEdit && brand) {
      const res = await supabase.from("brand_catalog" as never).update(payload as never).eq("id", brand.id);
      error = res.error;
    } else {
      const res = await supabase.from("brand_catalog" as never).insert(payload as never);
      error = res.error;
    }
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Mirror rate into material_pricing so existing computeUnitRate keeps working.
    const scope = scopeForCategory(category);
    const { data: existing } = await supabase
      .from("material_pricing" as never)
      .select("id")
      .eq("scope", scope)
      .eq("key", finalKey)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("material_pricing" as never)
        .update({ rate_per_sqft: rate || 0, label: name.trim() } as never)
        .eq("id", (existing as { id: string }).id);
    } else {
      await supabase.from("material_pricing" as never).insert({
        scope, key: finalKey, label: name.trim(), rate_per_sqft: rate || 0,
        sort_order: brand?.sort_order ?? nextSortOrder,
      } as never);
    }

    toast({ title: isEdit ? "Brand updated" : "Brand added" });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const showPreview = previewUrl ?? logoUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit brand" : "Add brand"} — {BRAND_CATEGORY_LABEL[category]}</DialogTitle>
          <DialogDescription className="text-xs">
            Logo is optional. PNG / JPG / SVG / WEBP, max 1 MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Brand name *</Label>
            <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Godrej" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-key">Internal key</Label>
            <Input
              id="brand-key"
              value={key}
              onChange={(e) => { setKey(slugify(e.target.value)); setKeyTouched(true); }}
              placeholder="auto from name"
              disabled={isEdit && brand?.is_preset}
            />
            {isEdit && brand?.is_preset && (
              <p className="text-[11px] text-muted-foreground">Preset brand — key locked.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-rate">Price uplift (₹/sqft)</Label>
            <Input
              id="brand-rate"
              type="number"
              min={0}
              step="1"
              value={rate || ""}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Logo</Label>
            <div
              className="flex items-center gap-3 border border-dashed border-border rounded-md p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
            >
              <div className="h-14 w-14 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {showPreview ? (
                  <img src={showPreview} alt="preview" className="max-h-14 max-w-14 object-contain" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Button type="button" size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
                  {showPreview ? "Replace" : "Upload"} logo
                </Button>
                {showPreview && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setLogoFile(null); setPreviewUrl(null); setLogoUrl(null); }}
                    className="ml-1 text-destructive"
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Remove
                  </Button>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">Drag & drop or click to upload.</p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="cursor-pointer">Active</Label>
              <p className="text-[11px] text-muted-foreground">Inactive brands won't show in quotation selectors.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Save changes" : "Add brand"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
