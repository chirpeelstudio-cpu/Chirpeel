import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Save, Send, FileDown, Loader2, MessageCircle, Mail, Eye, CheckCircle2, AlertCircle, Cloud, History, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { RoomCard } from "./RoomCard";
import { PricingSummary } from "./PricingSummary";
import { QuotationPreview } from "./QuotationPreview";
import { BrandSelector } from "./BrandSelector";
import { SendHistory } from "./SendHistory";
import { WorkflowPanel } from "./WorkflowPanel";
import { VersionHistoryTab } from "./VersionHistoryTab";
import { PaymentLinkPanel } from "./PaymentLinkPanel";
import type { WorkflowStatus } from "./workflow-config";
import { BRAND_GROUPS, BRAND_CATEGORY_LABEL, LEGACY_BRAND_CATEGORIES, type BrandCategory } from "./brands";
import { useActiveBrandsByCategory } from "@/hooks/useBrandCatalog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, RefreshCw } from "lucide-react";
import {
  buildPricingMatrix,
  buildRoomOverrides,
  calcLineItemTotal,
  calcPricingSummary,
  calcRoomTotal,
  computeUnitRate,
  DEFAULT_TERMS,
  formatINR,
  inferCategoryKey,
  PROJECT_TYPES,
  roomSlug,
  type MaterialPricingMatrix,
  type MaterialPricingRow,
  type MaterialRoomOverrides,
  type MaterialRoomPricingRow,
  type PricingItem,
  type Quotation,
  type QuotationRoom,
} from "./types";
import type { PipelineLead } from "@/components/admin/types";

interface QuotationBuilderProps {
  quotationId?: string;
  initialLeadId?: string;
  onBack: () => void;
}

const normalizeWhatsappPhone = (value: string) => {
  let phone = value.replace(/\D/g, "");
  if (phone.startsWith("0")) phone = phone.slice(1);
  if (phone.length === 10) phone = `91${phone}`;
  return phone;
};

const getWhatsAppNavigationUrl = (rawUrl: string, fallbackPhone: string) => {
  try {
    const parsed = new URL(rawUrl);
    const isMobileDevice = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (parsed.hostname.includes("web.whatsapp.com")) {
      return rawUrl;
    }

    const decodedText = parsed.searchParams.get("text") ?? "";
    const encodedText = encodeURIComponent(decodedText);
    const phoneFromUrl = parsed.searchParams.get("phone") ?? parsed.pathname.replace(/\//g, "");
    const phone = normalizeWhatsappPhone(phoneFromUrl || fallbackPhone);

    if (!phone) return rawUrl;

    return isMobileDevice
      ? `https://wa.me/${phone}?text=${encodedText}`
      : `https://web.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
  } catch {
    return rawUrl;
  }
};

const emptyRoom = (sortOrder: number): QuotationRoom => ({
  tempId: crypto.randomUUID(),
  room_name: "",
  room_type: null,
  material_type_key: null,
  width_ft: 0,
  height_ft: 0,
  depth_ft: null,
  area_sqft: 0,
  quantity: 1,
  material_id: null,
  material_name: null,
  material_rate: 0,
  hardware_id: null,
  hardware_name: null,
  hardware_rate: 0,
  hardware_fixed: 0,
  core_material_id: null,
  core_material_name: null,
  core_material_rate: 0,
  shutter_finish: null,
  shutter_finish_key: null,
  custom_cost: 0,
  notes: null,
  total_cost: 0,
  sort_order: sortOrder,
  line_items: [],
});

const initialQuotation = (): Quotation => ({
  lead_id: null,
  customer_name: "",
  customer_phone: "",
  customer_email: null,
  customer_address: null,
  project_location: null,
  project_name: null,
  project_type: null,
  sales_person: null,
  quotation_date: new Date().toISOString().slice(0, 10),
  validity_days: 15,
  subtotal: 0,
  discount_type: "percent",
  discount_value: 0,
  discount_amount: 0,
  gst_enabled: true,
  gst_rate: 18,
  gst_amount: 0,
  total_amount: 0,
  template_format: "detailed",
  terms_conditions: DEFAULT_TERMS,
  notes: null,
  status: "draft",
  pdf_url: null,
  sent_at: null,
  hardware_brand: null,
  core_material_brand: null,
  laminate_brand: null,
  brand_selections: {},
});

export const QuotationBuilder = ({ quotationId, initialLeadId, onBack }: QuotationBuilderProps) => {
  const { toast } = useToast();
  const { isAdmin, isManager } = useCurrentUserPermissions();
  const canSeeMargin = isAdmin || isManager;
  const [quotation, setQuotation] = useState<Quotation>(initialQuotation());
  const [rooms, setRooms] = useState<QuotationRoom[]>([]);
  const { byCategory: brandsByCategory } = useActiveBrandsByCategory();
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [matrix, setMatrix] = useState<MaterialPricingMatrix | null>(null);
  const [roomOverrides, setRoomOverrides] = useState<MaterialRoomOverrides | null>(null);
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [view, setView] = useState<"build" | "preview" | "payment" | "history">("build");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<"email" | "whatsapp" | null>(null);
  const [whatsappFallbackUrl, setWhatsappFallbackUrl] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [historyKey, setHistoryKey] = useState(0);
  const [versionsKey, setVersionsKey] = useState(0);

  // Load pricing catalog + leads + pricing matrix + per-room overrides + (existing quotation if editing)
  useEffect(() => {
    (async () => {
      const [{ data: pricingData }, { data: leadsData }, { data: matrixData }, { data: overridesData }] = await Promise.all([
        supabase.from("pricing_catalog").select("*").eq("active", true).order("sort_order"),
        supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("material_pricing" as never).select("*").order("sort_order"),
        supabase.from("material_room_pricing" as never).select("*"),
      ]);
      setPricing((pricingData ?? []) as PricingItem[]);
      setLeads((leadsData ?? []) as unknown as PipelineLead[]);
      setMatrix(buildPricingMatrix((matrixData ?? []) as unknown as MaterialPricingRow[]));
      setRoomOverrides(buildRoomOverrides((overridesData ?? []) as unknown as MaterialRoomPricingRow[]));

      if (quotationId) {
        const { data: q } = await supabase.from("quotations").select("*").eq("id", quotationId).single();
        const { data: rs } = await supabase.from("quotation_rooms").select("*").eq("quotation_id", quotationId).order("sort_order");
        if (q) setQuotation(q as unknown as Quotation);
        if (rs && rs.length) {
          const roomIds = rs.map((r) => r.id);
          const { data: items } = await supabase
            .from("quotation_room_items" as never)
            .select("*")
            .in("quotation_room_id", roomIds)
            .order("sort_order");
          const itemsByRoom: Record<string, unknown[]> = {};
          (items ?? []).forEach((it: { quotation_room_id: string }) => {
            (itemsByRoom[it.quotation_room_id] ||= []).push(it);
          });
          setRooms(rs.map((r) => ({
            ...r,
            tempId: r.id,
            line_items: (itemsByRoom[r.id] ?? []).map((it: { id: string }) => ({ ...it, tempId: it.id })),
          })) as unknown as QuotationRoom[]);
        }
      } else if (rooms.length === 0) {
        setRooms([emptyRoom(0)]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  // When creating a new quotation pre-bound to a lead, prefill from that lead once leads are loaded.
  useEffect(() => {
    if (quotationId || !initialLeadId || leads.length === 0) return;
    const l = leads.find((x) => x.id === initialLeadId);
    if (!l) return;
    setQuotation((q) => {
      if (q.lead_id === l.id) return q;
      return {
        ...q,
        lead_id: l.id,
        customer_name: q.customer_name || l.name || "",
        customer_phone: q.customer_phone || l.phone || "",
        customer_email: q.customer_email || l.email || null,
        project_location: q.project_location || l.city || null,
        project_type: q.project_type || l.project_type || null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLeadId, leads, quotationId]);

  const materials = useMemo(() => pricing.filter((p) => p.category === "material"), [pricing]);
  const hardwares = useMemo(() => pricing.filter((p) => p.category === "hardware"), [pricing]);

  // Recompute totals whenever rooms / discount / gst change
  const summary = useMemo(
    () => calcPricingSummary(rooms, quotation.discount_type, quotation.discount_value, quotation.gst_enabled, quotation.gst_rate),
    [rooms, quotation.discount_type, quotation.discount_value, quotation.gst_enabled, quotation.gst_rate],
  );

  useEffect(() => {
    setQuotation((q) => ({ ...q, ...summary }));
  }, [summary]);

  // Recompute every unit_sqft line-item rate when matrix / overrides / brand / shutter / material / room name changes.
  useEffect(() => {
    if (!matrix) return;
    setRooms((rs) => {
      let mutated = false;
      const next = rs.map((room) => {
        if (!room.line_items?.length) return room;
        const rKey = roomSlug(room.room_name);
        let roomMutated = false;
        const items = room.line_items.map((li) => {
          if (li.item_type !== "unit_sqft") return li;
          const catKey = inferCategoryKey(li.item_name);
          const newRate = computeUnitRate(
            matrix,
            room.material_type_key,
            quotation.hardware_brand,
            quotation.core_material_brand,
            quotation.laminate_brand,
            room.shutter_finish_key,
            roomOverrides,
            rKey,
            catKey,
          );
          if (Math.abs((li.rate || 0) - newRate) < 0.001) return li;
          roomMutated = true;
          const updated = { ...li, rate: newRate };
          updated.total_cost = calcLineItemTotal(updated);
          return updated;
        });
        if (!roomMutated) return room;
        mutated = true;
        const updatedRoom = { ...room, line_items: items };
        updatedRoom.total_cost = calcRoomTotal(updatedRoom);
        return updatedRoom;
      });
      return mutated ? next : rs;
    });
  }, [matrix, roomOverrides, quotation.hardware_brand, quotation.core_material_brand, quotation.laminate_brand, rooms.map(r => `${r.tempId}:${r.shutter_finish_key ?? ""}:${r.material_type_key ?? ""}:${r.room_name}`).join("|")]);

  const updateRoom = (tempId: string, next: QuotationRoom) => {
    setRooms((rs) => rs.map((r) => (r.tempId === tempId ? next : r)));
  };
  const removeRoom = (tempId: string) => setRooms((rs) => rs.filter((r) => r.tempId !== tempId));
  const addRoom = () => setRooms((rs) => [...rs, emptyRoom(rs.length)]);
  const duplicateRoom = (tempId: string) => {
    setRooms((rs) => {
      const idx = rs.findIndex((r) => r.tempId === tempId);
      if (idx < 0) return rs;
      const copy = { ...rs[idx], tempId: crypto.randomUUID(), sort_order: rs.length };
      copy.total_cost = calcRoomTotal(copy);
      return [...rs, copy];
    });
  };

  const applyLead = (leadId: string) => {
    if (leadId === "none") {
      setQuotation((q) => ({ ...q, lead_id: null }));
      return;
    }
    const l = leads.find((x) => x.id === leadId);
    if (!l) return;
    setQuotation((q) => ({
      ...q,
      lead_id: l.id,
      customer_name: l.name || q.customer_name,
      customer_phone: l.phone || q.customer_phone,
      customer_email: l.email || q.customer_email,
      project_location: l.city || q.project_location,
      project_type: l.project_type || q.project_type,
    }));
  };

  const validate = (): string | null => {
    if (!quotation.customer_name.trim()) return "Customer name is required";
    if (!quotation.customer_phone.trim()) return "Phone number is required";
    if (rooms.length === 0) return "Add at least one room";
    if (rooms.some((r) => !r.room_name.trim())) return "Every room needs a name";
    return null;
  };

  const persist = async (opts?: { silent?: boolean }): Promise<string | null> => {
    const error = validate();
    if (error) {
      if (!opts?.silent) toast({ title: "Cannot save", description: error, variant: "destructive" });
      return null;
    }
    setSaving(true);
    try {
      const header = {
        id: quotation.id ?? null,
        lead_id: quotation.lead_id,
        customer_name: quotation.customer_name,
        customer_phone: quotation.customer_phone,
        customer_email: quotation.customer_email,
        customer_address: quotation.customer_address,
        project_location: quotation.project_location,
        project_name: quotation.project_name,
        project_type: quotation.project_type,
        sales_person: quotation.sales_person,
        quotation_date: quotation.quotation_date,
        validity_days: quotation.validity_days,
        subtotal: quotation.subtotal,
        discount_type: quotation.discount_type,
        discount_value: quotation.discount_value,
        discount_amount: quotation.discount_amount,
        gst_enabled: quotation.gst_enabled,
        gst_rate: quotation.gst_rate,
        gst_amount: quotation.gst_amount,
        total_amount: quotation.total_amount,
        template_format: quotation.template_format,
        terms_conditions: quotation.terms_conditions,
        notes: quotation.notes,
        status: quotation.status,
        pdf_url: quotation.pdf_url,
        hardware_brand: quotation.hardware_brand,
        core_material_brand: quotation.core_material_brand,
        laminate_brand: quotation.laminate_brand,
        brand_selections: quotation.brand_selections ?? {},
      };

      const roomsPayload = rooms.map((r, i) => ({
        room_name: r.room_name,
        room_type: r.room_type,
        material_type_key: r.material_type_key ?? null,
        width_ft: r.width_ft || 0,
        height_ft: r.height_ft || 0,
        depth_ft: r.depth_ft,
        area_sqft: r.area_sqft || 0,
        quantity: r.quantity || 1,
        material_id: r.material_id,
        material_name: r.material_name,
        material_rate: r.material_rate || 0,
        hardware_id: r.hardware_id,
        hardware_name: r.hardware_name,
        hardware_rate: r.hardware_rate || 0,
        hardware_fixed: r.hardware_fixed || 0,
        core_material_id: r.core_material_id,
        core_material_name: r.core_material_name,
        core_material_rate: r.core_material_rate || 0,
        shutter_finish: r.shutter_finish,
        custom_cost: r.custom_cost || 0,
        notes: r.notes,
        total_cost: r.total_cost || 0,
        sort_order: i,
        line_items: (r.line_items ?? []).map((li, j) => ({
          catalog_id: li.catalog_id,
          item_name: li.item_name,
          item_category: li.item_category,
          item_type: li.item_type,
          width_ft: li.width_ft || 0,
          height_ft: li.height_ft || 0,
          area_sqft: li.area_sqft || 0,
          quantity: li.quantity || 1,
          rate: li.rate || 0,
          cost_rate: li.cost_rate || 0,
          pricing_mode: li.pricing_mode || "sqft",
          total_cost: li.total_cost || 0,
          notes: li.notes,
          sort_order: j,
        })),
      }));

      // Single atomic RPC: header + rooms + items in one transaction
      const { data, error: rpcErr } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
      }).rpc("save_quotation", { payload: { header, rooms: roomsPayload } });
      if (rpcErr) throw rpcErr;

      const result = data as { id: string; is_new: boolean } | null;
      const newId = result?.id;
      if (!newId) throw new Error("Save returned no quotation id");

      // If new, fetch the generated quotation_number
      if (!quotation.id) {
        const { data: q2 } = await supabase
          .from("quotations")
          .select("id, quotation_number")
          .eq("id", newId)
          .single();
        setQuotation((q) => ({ ...q, id: newId, quotation_number: q2?.quotation_number ?? q.quotation_number }));
      }

      if (!opts?.silent) {
        toast({ title: "Quotation saved", description: `Saved as ${quotation.quotation_number ?? "draft"}` });
      }
      return newId;
    } catch (err: unknown) {
      console.error("Quotation save error:", err);
      const e = err as { code?: string; message?: string; details?: string; hint?: string };
      const parts = [e?.code ? `code ${e.code}` : null, e?.message, e?.details, e?.hint].filter(Boolean);
      const msg = parts.length ? parts.join(" · ") : (typeof err === "string" ? err : "Unknown error");
      if (!opts?.silent) toast({ title: "Save failed", description: msg, variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ---- Auto-save (drafts only, every 30s, debounced 3s after edits)
  const autosaveSignature = useMemo(() => {
    // Cheap signature so the hook only re-fires on real changes
    return JSON.stringify({
      q: { ...quotation, id: undefined, quotation_number: undefined },
      rooms: rooms.map((r) => ({
        ...r,
        tempId: undefined,
        line_items: r.line_items?.map((li) => ({ ...li, tempId: undefined })),
      })),
    });
  }, [quotation, rooms]);

  const autosaveEnabled =
    quotation.status === "draft" &&
    !!quotation.customer_name?.trim() &&
    !!quotation.customer_phone?.trim() &&
    rooms.length > 0 &&
    rooms.every((r) => r.room_name.trim());

  const autosave = useAutoSave({
    value: autosaveSignature,
    enabled: autosaveEnabled,
    onSave: async () => { await persist({ silent: true }); },
  });

  const sendQuotation = async (channel: "email" | "whatsapp", isRevision = false) => {
    if (channel === "email" && !quotation.customer_email) {
      toast({ title: "Email required", description: "Add customer email to send via email", variant: "destructive" });
      return;
    }

    // Detect if running inside an iframe (e.g. Lovable editor preview) — popups are often blocked there
    const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();

    // For WhatsApp, open a blank tab synchronously on the user gesture so the browser doesn't block it later.
    // IMPORTANT: do NOT pass "noopener,noreferrer" — we need to keep a usable handle to navigate the tab afterward.
    let popup: Window | null = null;
    if (channel === "whatsapp" && !inIframe) {
      popup = window.open("", "_blank");
      if (popup) {
        try {
          popup.document.write(
            '<!doctype html><title>Preparing WhatsApp…</title><body style="font-family:system-ui;padding:24px;color:#333">Preparing your WhatsApp message…</body>'
          );
        } catch { /* ignore */ }
      }
      setWhatsappFallbackUrl(null);
    }

    setSending(channel);
    const id = await persist();
    if (!id) {
      setSending(null);
      if (popup) popup.close();
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const sentBy = userData?.user?.email ?? null;

      const { data, error } = await supabase.functions.invoke("send-quotation", {
        body: { quotationId: id, channel, isRevision, revisionNote: revisionNote.trim() || undefined, sentBy },
      });
      if (error) throw error;

      setQuotation((q) => ({
        ...q,
        status: "sent",
        pdf_url: data?.pdf_url ?? q.pdf_url,
        sent_at: q.sent_at ?? new Date().toISOString(),
        last_sent_at: new Date().toISOString(),
        revision_count: data?.revision_count ?? q.revision_count ?? 1,
      }));
      setHistoryKey((k) => k + 1);
      // Auto-snapshot of the sent state
      try {
        await supabase.rpc("snapshot_quotation" as never, {
          _quotation_id: id,
          _label: isRevision ? `Revision sent` : `Sent`,
          _trigger: "send",
        } as never);
        setVersionsKey((k) => k + 1);
      } catch { /* non-blocking */ }
      if (isRevision) setRevisionNote("");

      if (channel === "whatsapp" && data?.whatsapp_url) {
        const navigationUrl = getWhatsAppNavigationUrl(data.whatsapp_url, quotation.customer_phone);
        if (popup && !popup.closed) {
          try {
            popup.location.replace(navigationUrl);
            toast({
              title: isRevision ? "Revised WhatsApp ready" : "WhatsApp ready",
              description: isRevision ? "Opening WhatsApp with the revised message" : "Opening WhatsApp with your message",
            });
          } catch {
            setWhatsappFallbackUrl(navigationUrl);
            toast({ title: "WhatsApp ready", description: "Tap the WhatsApp link below to continue" });
          }
        } else {
          setWhatsappFallbackUrl(navigationUrl);
          toast({
            title: inIframe ? "Open WhatsApp manually" : "Popup blocked",
            description: inIframe
              ? "Auto-open is restricted in the editor preview. Tap the link below."
              : "Tap the WhatsApp link below to continue",
          });
        }
      } else if (channel === "email") {
        toast({
          title: isRevision ? "Revised email sent" : "Email sent",
          description: `Quotation sent to ${quotation.customer_email}`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (popup && !popup.closed) popup.close();
      toast({ title: "Send failed", description: msg, variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const downloadPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <h1 className="text-lg sm:text-xl font-bold">
            {quotation.id ? "Edit Quotation" : "Create Quotation"}
            {quotation.quotation_number && <span className="ml-2 text-sm font-normal text-muted-foreground">{quotation.quotation_number}</span>}
          </h1>
          <Badge variant={quotation.status === "sent" ? "default" : "secondary"} className="capitalize">{quotation.status}</Badge>
      </div>

      {whatsappFallbackUrl && (
        <Card className="p-3 flex items-center justify-between gap-2 flex-wrap border-primary/40 bg-primary/5">
          <div className="text-sm">
            <span className="font-semibold">WhatsApp link ready.</span>{" "}
            <span className="text-muted-foreground">Tap “Open WhatsApp” to continue (auto-open may be restricted in the editor preview).</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(whatsappFallbackUrl); toast({ title: "Copied", description: "WhatsApp link copied" }); }}>
              Copy link
            </Button>
            <Button size="sm" asChild>
              <a href={whatsappFallbackUrl} target="_blank" rel="noopener noreferrer" onClick={() => setWhatsappFallbackUrl(null)}>
                <MessageCircle className="w-4 h-4 mr-1" /> Open WhatsApp
              </a>
            </Button>
          </div>
        </Card>
      )}
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "build" | "preview" | "payment" | "history")}>
            <TabsList>
              <TabsTrigger value="build">Build</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-1" /> Preview</TabsTrigger>
              {quotation.id && <TabsTrigger value="payment"><IndianRupee className="w-4 h-4 mr-1" /> Payment</TabsTrigger>}
              {quotation.id && <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> History</TabsTrigger>}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => persist()} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
          </Button>
          {/* Auto-save indicator */}
          {autosaveEnabled && (
            <span
              className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground"
              title={autosave.lastSavedAt ? `Last saved ${autosave.lastSavedAt.toLocaleTimeString()}` : "Auto-saving drafts every 30s"}
            >
              {autosave.state === "saving" ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
              ) : autosave.state === "saved" && autosave.lastSavedAt ? (
                <><CheckCircle2 className="w-3 h-3 text-primary" /> Saved {Math.max(1, Math.round((Date.now() - autosave.lastSavedAt.getTime()) / 1000))}s ago</>
              ) : autosave.state === "error" ? (
                <><AlertCircle className="w-3 h-3 text-destructive" /> Auto-save failed</>
              ) : autosave.state === "dirty" ? (
                <><Cloud className="w-3 h-3" /> Unsaved changes</>
              ) : (
                <><Cloud className="w-3 h-3" /> Auto-save on</>
              )}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={downloadPdf}><FileDown className="w-4 h-4 mr-1" /> Print</Button>
          {(() => {
            const alreadySent = !!quotation.sent_at || (quotation.revision_count ?? 0) > 0;
            if (alreadySent) {
              return (
                <>
                  <Button
                    size="sm"
                    onClick={() => sendQuotation("whatsapp", true)}
                    disabled={sending !== null}
                    title="Send revised quotation with a 'as discussed' WhatsApp message"
                  >
                    {sending === "whatsapp" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Send Revised (WA)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendQuotation("whatsapp", false)}
                    disabled={sending !== null}
                    title="Resend the original quotation message"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" /> Resend
                  </Button>
                  <Button size="sm" variant="default" onClick={() => sendQuotation("email", true)} disabled={sending !== null}>
                    {sending === "email" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />} Email Revised
                  </Button>
                </>
              );
            }
            return (
              <>
                <Button size="sm" onClick={() => sendQuotation("whatsapp", false)} disabled={sending !== null}>
                  {sending === "whatsapp" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />} WhatsApp
                </Button>
                <Button size="sm" variant="default" onClick={() => sendQuotation("email", false)} disabled={sending !== null}>
                  {sending === "email" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />} Email
                </Button>
              </>
            );
          })()}
        </div>
      </div>

      {quotation.id && (
        <WorkflowPanel
          quotationId={quotation.id}
          workflowStatus={(quotation.workflow_status ?? "draft") as WorkflowStatus}
          isManager={isAdmin || isManager}
          onChanged={(newStatus) => {
            setQuotation((q) => ({ ...q, workflow_status: newStatus }));
            setVersionsKey((k) => k + 1);
          }}
          onSnapshot={async (label) => {
            try {
              const { error } = await supabase.rpc("snapshot_quotation" as never, {
                _quotation_id: quotation.id,
                _label: label ?? null,
                _trigger: "manual",
              } as never);
              if (error) throw error;
              setVersionsKey((k) => k + 1);
              toast({ title: "Snapshot saved" });
            } catch (err) {
              toast({ title: "Snapshot failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
            }
          }}
        />
      )}

      {view === "payment" && quotation.id ? (
        <div className="max-w-4xl mx-auto">
          <PaymentLinkPanel
            quotation={quotation}
            onUpdated={(patch) => setQuotation((q) => ({ ...q, ...patch }))}
          />
        </div>
      ) : view === "history" && quotation.id ? (
        <VersionHistoryTab
          quotationId={quotation.id}
          refreshKey={versionsKey}
          onRestored={async () => {
            // Reload quotation + rooms after restore
            const { data: q } = await supabase.from("quotations").select("*").eq("id", quotation.id!).single();
            const { data: rs } = await supabase.from("quotation_rooms").select("*").eq("quotation_id", quotation.id!).order("sort_order");
            if (q) setQuotation(q as unknown as Quotation);
            if (rs) {
              const roomIds = rs.map((r) => r.id);
              const { data: items } = roomIds.length
                ? await supabase.from("quotation_room_items").select("*").in("quotation_room_id", roomIds)
                : { data: [] as any[] };
              const itemsByRoom: Record<string, any[]> = {};
              (items ?? []).forEach((it: any) => { (itemsByRoom[it.quotation_room_id] ||= []).push(it); });
              setRooms(rs.map((r: any) => ({
                ...(r as any),
                tempId: r.id,
                line_items: (itemsByRoom[r.id] ?? []).map((li: any) => ({ ...li, tempId: li.id })),
              })) as unknown as QuotationRoom[]);
            }
            setView("build");
            setVersionsKey((k) => k + 1);
          }}
        />
      ) : view === "preview" ? (
        <div className="max-w-4xl mx-auto print:max-w-none">
          <QuotationPreview quotation={quotation} rooms={rooms} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Customer */}
            <Card className="p-4 space-y-3">
              <h2 className="font-bold text-sm uppercase text-muted-foreground">Customer Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Link to existing lead (optional)</Label>
                  <Select value={quotation.lead_id ?? "none"} onValueChange={applyLead}>
                    <SelectTrigger><SelectValue placeholder="Select lead to auto-fill" /></SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="none">— No linked lead —</SelectItem>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name} · {l.phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Customer Name *</Label>
                  <Input value={quotation.customer_name} onChange={(e) => setQuotation((q) => ({ ...q, customer_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Phone (WhatsApp) *</Label>
                  <Input value={quotation.customer_phone} onChange={(e) => setQuotation((q) => ({ ...q, customer_phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={quotation.customer_email ?? ""} onChange={(e) => setQuotation((q) => ({ ...q, customer_email: e.target.value || null }))} />
                </div>
                <div>
                  <Label className="text-xs">Project Location</Label>
                  <Input value={quotation.project_location ?? ""} onChange={(e) => setQuotation((q) => ({ ...q, project_location: e.target.value || null }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Street, area, landmark…"
                    value={quotation.customer_address ?? ""}
                    onChange={(e) => setQuotation((q) => ({ ...q, customer_address: e.target.value || null }))}
                  />
                </div>
              </div>
            </Card>

            {/* Project */}
            <Card className="p-4 space-y-3">
              <h2 className="font-bold text-sm uppercase text-muted-foreground">Project Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Project Name</Label>
                  <Input value={quotation.project_name ?? ""} onChange={(e) => setQuotation((q) => ({ ...q, project_name: e.target.value || null }))} />
                </div>
                <div>
                  <Label className="text-xs">Project Type</Label>
                  <Select value={quotation.project_type ?? undefined} onValueChange={(v) => setQuotation((q) => ({ ...q, project_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Sales Person</Label>
                  <Input value={quotation.sales_person ?? ""} onChange={(e) => setQuotation((q) => ({ ...q, sales_person: e.target.value || null }))} />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={quotation.quotation_date} onChange={(e) => setQuotation((q) => ({ ...q, quotation_date: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Validity (days)</Label>
                  <Input type="number" min={1} value={quotation.validity_days} onChange={(e) => setQuotation((q) => ({ ...q, validity_days: parseInt(e.target.value) || 15 }))} />
                </div>
                <div>
                  <Label className="text-xs">Quotation Format</Label>
                  <Select value={quotation.template_format} onValueChange={(v: "detailed" | "summary" | "premium") => setQuotation((q) => ({ ...q, template_format: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="detailed">Detailed (room-wise)</SelectItem>
                      <SelectItem value="summary">Summary (totals only)</SelectItem>
                      <SelectItem value="premium">Premium presentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Brand Selection */}
            <Card className="p-4 space-y-3">
              <div>
                <h2 className="font-bold text-sm uppercase text-muted-foreground">Brand Selection</h2>
                <p className="text-xs text-muted-foreground mt-1">Choose the brands used in this project. Selected brands appear on the final quotation.</p>
              </div>

              {BRAND_GROUPS.map((group, gi) => {
                const selectedCount = group.categories.reduce((n, cat) => {
                  const v = LEGACY_BRAND_CATEGORIES.includes(cat)
                    ? (quotation as unknown as Record<string, string | null>)[`${cat === "core_material" ? "core_material_brand" : cat === "hardware" ? "hardware_brand" : "laminate_brand"}`]
                    : quotation.brand_selections?.[cat] ?? null;
                  return v ? n + 1 : n;
                }, 0);
                return (
                  <Collapsible key={group.key} defaultOpen={gi === 0}>
                    <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{group.label}</span>
                        {selectedCount > 0 && (
                          <Badge variant="secondary" className="h-5 text-[10px]">{selectedCount}</Badge>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 pb-1 space-y-4 px-1">
                      {group.categories.map((cat) => {
                        const options = brandsByCategory[cat] ?? [];
                        const label = BRAND_CATEGORY_LABEL[cat];
                        const isLegacy = LEGACY_BRAND_CATEGORIES.includes(cat);
                        const value = isLegacy
                          ? (cat === "hardware" ? quotation.hardware_brand : cat === "core_material" ? quotation.core_material_brand : quotation.laminate_brand)
                          : (quotation.brand_selections?.[cat] ?? null);

                        const setValue = (id: string | null) => {
                          if (cat === "hardware") setQuotation((q) => ({ ...q, hardware_brand: id }));
                          else if (cat === "core_material") setQuotation((q) => ({ ...q, core_material_brand: id }));
                          else if (cat === "laminate") setQuotation((q) => ({ ...q, laminate_brand: id }));
                          else setQuotation((q) => ({ ...q, brand_selections: { ...(q.brand_selections ?? {}), [cat]: id } }));
                        };

                        if (options.length === 0) {
                          return (
                            <div key={cat} className="space-y-1">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
                              <div className="text-[11px] text-muted-foreground italic px-2 py-3 border border-dashed border-border rounded-md">
                                No brands configured yet — coming soon.
                              </div>
                            </div>
                          );
                        }
                        return (
                          <BrandSelector
                            key={cat}
                            label={label}
                            options={options}
                            value={value}
                            onChange={setValue}
                          />
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </Card>

            {/* Rooms */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm uppercase text-muted-foreground">Rooms ({rooms.length})</h2>
                <Button size="sm" onClick={addRoom}><Plus className="w-4 h-4 mr-1" /> Add Room</Button>
              </div>
              <div className="space-y-3">
                {rooms.map((room, i) => {
                  const isOrphan = !!room.id && (room.total_cost || 0) > 0 && (room.line_items?.length ?? 0) === 0;
                  return (
                    <div key={room.tempId} className="space-y-1">
                      {isOrphan && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          ⚠ Items missing for this room (saved total {formatINR(room.total_cost)}). Re-add the line items and save again to repopulate.
                        </div>
                      )}
                      <RoomCard
                        room={room}
                        index={i}
                        catalog={pricing}
                        matrix={matrix}
                        roomOverrides={roomOverrides}
                        quotationBrands={{
                          hardware: quotation.hardware_brand,
                          core: quotation.core_material_brand,
                          laminate: quotation.laminate_brand,
                        }}
                        projectType={quotation.project_type}
                        showMargin={canSeeMargin}
                        onChange={(next) => updateRoom(room.tempId, next)}
                        onRemove={() => removeRoom(room.tempId)}
                        onDuplicate={() => duplicateRoom(room.tempId)}
                      />
                    </div>
                  );
                })}
                {rooms.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">No rooms yet. Click "Add Room" to begin.</div>
                )}
              </div>
            </Card>

            {/* Terms */}
            <Card className="p-4 space-y-3">
              <h2 className="font-bold text-sm uppercase text-muted-foreground">Terms & Conditions</h2>
              <Textarea rows={6} value={quotation.terms_conditions ?? ""} onChange={(e) => setQuotation((q) => ({ ...q, terms_conditions: e.target.value }))} />
            </Card>
          </div>

          {/* Right column */}
          <div className="lg:col-span-1">
            <PricingSummary
              subtotal={quotation.subtotal}
              discountType={quotation.discount_type}
              discountValue={quotation.discount_value}
              discountAmount={quotation.discount_amount}
              gstEnabled={quotation.gst_enabled}
              gstRate={quotation.gst_rate}
              gstAmount={quotation.gst_amount}
              totalAmount={quotation.total_amount}
              showMargin={canSeeMargin}
              totalCost={rooms.reduce((s, r) => s + (r.line_items ?? []).reduce((ss, li) => {
                const qty = li.quantity || 1;
                const cost = li.cost_rate || 0;
                if (li.pricing_mode === "sqft") return ss + (li.area_sqft || 0) * cost * qty;
                if (li.pricing_mode === "fixed") return ss + cost * qty;
                return ss + cost;
              }, 0), 0)}
              onChange={(patch) => setQuotation((q) => ({
                ...q,
                ...(patch.discountType !== undefined && { discount_type: patch.discountType }),
                ...(patch.discountValue !== undefined && { discount_value: patch.discountValue }),
                ...(patch.gstEnabled !== undefined && { gst_enabled: patch.gstEnabled }),
                ...(patch.gstRate !== undefined && { gst_rate: patch.gstRate }),
              }))}
            />
            <div className="mt-3 text-xs text-muted-foreground text-center">
              Live totals · {rooms.length} {rooms.length === 1 ? "room" : "rooms"} · {formatINR(quotation.total_amount)}
            </div>

            {/* Send status + revision controls */}
            {quotation.id && (
              <Card className="p-3 mt-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  {(quotation.revision_count ?? 0) === 0 ? (
                    <span>Not sent yet</span>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">
                        {(quotation.revision_count ?? 1) > 1
                          ? `Revised ×${quotation.revision_count}`
                          : "Sent ×1"}
                      </span>
                      {quotation.last_sent_at && (
                        <span> · Last sent {new Date(quotation.last_sent_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                      )}
                    </>
                  )}
                </div>
                {((quotation.revision_count ?? 0) > 0 || quotation.sent_at) && (
                  <div>
                    <Label className="text-xs">What changed in this revision? (optional)</Label>
                    <Textarea
                      rows={2}
                      maxLength={300}
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder="e.g. Reduced wardrobe size, switched to Hettich hardware"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Included in the revised WhatsApp/email message and saved in send history.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {quotation.id && (
              <div className="mt-3">
                <SendHistory quotationId={quotation.id} refreshKey={historyKey} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
