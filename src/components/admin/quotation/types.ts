export type CatalogCategory = "material" | "hardware" | "unit" | "accessory" | "service";
export type ItemCategory = "core_material" | "units" | "accessories" | "painting" | "electrical" | "false_ceiling";
export type ItemType = "core_material" | "unit_sqft" | "accessory_fixed" | "painting" | "electrical";
export type RoomTypeKey = "kitchen" | "bedroom" | "living_room" | "all";

export interface PricingItem {
  id: string;
  category: CatalogCategory;
  name: string;
  rate_per_sqft: number;
  fixed_cost: number;
  description: string | null;
  active: boolean;
  sort_order: number;
  room_type: RoomTypeKey | null;
  item_category: ItemCategory | null;
  item_type: ItemType | null;
}

export interface QuotationLineItem {
  id?: string;
  tempId: string;
  catalog_id: string | null;
  item_name: string;
  item_category: ItemCategory;
  item_type: ItemType;
  width_ft: number;
  height_ft: number;
  area_sqft: number;
  quantity: number;
  rate: number; // computed effective rate (core+uplift OR fixed OR custom)
  /** Internal cost (₹/sqft, ₹/unit, or lumpsum cost) — used for margin tracking. Defaults to 0. */
  cost_rate?: number;
  pricing_mode: "sqft" | "fixed" | "lumpsum";
  total_cost: number;
  notes: string | null;
  sort_order: number;
}

/** Total internal cost of a line item (parallels calcLineItemTotal but uses cost_rate). */
export const calcLineItemCost = (
  li: Pick<QuotationLineItem, "pricing_mode" | "area_sqft" | "quantity" | "cost_rate">,
): number => {
  const qty = li.quantity || 1;
  const cost = li.cost_rate || 0;
  if (li.pricing_mode === "sqft") return (li.area_sqft || 0) * cost * qty;
  if (li.pricing_mode === "fixed") return cost * qty;
  return cost; // lumpsum
};

/** Sum internal cost across all line items in a room. */
export const calcRoomCost = (
  r: Pick<QuotationRoom, "line_items">,
): number => {
  return (r.line_items ?? []).reduce((s, li) => s + calcLineItemCost(li), 0);
};

export type MaterialPricingScope =
  | "material"
  | "hardware"
  | "core_brand"
  | "laminate"
  | "shutter_finish"
  | "acrylic"
  | "pu_paint"
  | "membrane"
  | "gypsum"
  | "channel"
  | "paint"
  | "wiring"
  | "switches";

export interface MaterialPricingRow {
  id: string;
  scope: MaterialPricingScope;
  key: string;
  label: string;
  rate_per_sqft: number;
  sort_order: number;
}

export type MaterialPricingMatrix = Record<MaterialPricingScope, MaterialPricingRow[]>;

/* -------------------------------------------------------------------------- */
/* Per-room × per-category material overrides                                  */
/* -------------------------------------------------------------------------- */

/** Row stored in `material_room_pricing` table. */
export interface MaterialRoomPricingRow {
  id: string;
  material_key: string;
  room_key: string;
  category_key: string;
  rate_per_sqft: number;
}

/** Sub-categories used as columns in the per-room price matrix. */
export const ITEM_CATEGORY_PRESETS = [
  { key: "wardrobe", label: "Wardrobe" },
  { key: "loft", label: "Loft" },
  { key: "base_unit", label: "Base Unit" },
  { key: "wall_unit", label: "Wall Unit" },
  { key: "tv_unit", label: "TV Unit" },
  { key: "vanity", label: "Vanity" },
  { key: "storage", label: "Storage" },
  { key: "other", label: "Other" },
] as const;

export type ItemCategoryPresetKey = typeof ITEM_CATEGORY_PRESETS[number]["key"];

/** Slugify a room preset name to a stable key (e.g. "Master Bedroom" -> "master_bedroom"). */
export const roomSlug = (roomName: string | null | undefined): string => {
  if (!roomName) return "";
  return roomName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
};

/** Best-effort guess of an item category preset from a line-item / unit name. */
export const inferCategoryKey = (name: string | null | undefined): ItemCategoryPresetKey => {
  const n = (name || "").toLowerCase();
  if (n.includes("wardrobe")) return "wardrobe";
  if (n.includes("loft")) return "loft";
  if (n.includes("tv")) return "tv_unit";
  if (n.includes("vanity")) return "vanity";
  if (n.includes("base") || n.includes("kitchen base") || n.includes("counter")) return "base_unit";
  if (n.includes("wall") && n.includes("unit")) return "wall_unit";
  if (n.includes("overhead") || n.includes("upper")) return "wall_unit";
  if (n.includes("storage") || n.includes("shoe") || n.includes("crockery") || n.includes("drawer")) return "storage";
  return "other";
};

/** Indexed map: material_key -> room_key -> category_key -> rate. */
export type MaterialRoomOverrides = Record<string, Record<string, Record<string, number>>>;

/* -------------------------------------------------------------------------- */
/* Admin-managed rooms / categories / room×category enable map                */
/* -------------------------------------------------------------------------- */

export interface PricingRoom {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_preset: boolean;
  active: boolean;
}

export interface PricingItemCategory {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_preset: boolean;
  active: boolean;
}

export interface RoomCategoryMapRow {
  id: string;
  room_key: string;
  category_key: string;
  enabled: boolean;
}

/** room_key -> category_key -> enabled. Missing entry defaults to enabled = true. */
export type RoomCategoryEnabledMap = Record<string, Record<string, boolean>>;

export const buildRoomCategoryEnabledMap = (rows: RoomCategoryMapRow[]): RoomCategoryEnabledMap => {
  const m: RoomCategoryEnabledMap = {};
  rows.forEach((r) => {
    (m[r.room_key] ||= {})[r.category_key] = r.enabled;
  });
  return m;
};

export const isCategoryEnabled = (
  map: RoomCategoryEnabledMap | null | undefined,
  roomKey: string,
  categoryKey: string,
): boolean => {
  const v = map?.[roomKey]?.[categoryKey];
  return v === undefined ? true : v;
};

export const buildRoomOverrides = (rows: MaterialRoomPricingRow[]): MaterialRoomOverrides => {
  const m: MaterialRoomOverrides = {};
  rows.forEach((r) => {
    if (!r.rate_per_sqft) return;
    (m[r.material_key] ||= {});
    (m[r.material_key][r.room_key] ||= {});
    m[r.material_key][r.room_key][r.category_key] = Number(r.rate_per_sqft);
  });
  return m;
};

export const lookupRoomOverride = (
  overrides: MaterialRoomOverrides | null | undefined,
  materialKey: string | null | undefined,
  roomKey: string | null | undefined,
  categoryKey: string | null | undefined,
): number | null => {
  if (!overrides || !materialKey || !roomKey || !categoryKey) return null;
  const v = overrides[materialKey]?.[roomKey]?.[categoryKey];
  return typeof v === "number" && v > 0 ? v : null;
};

export const buildPricingMatrix = (rows: MaterialPricingRow[]): MaterialPricingMatrix => {
  const matrix: MaterialPricingMatrix = {
    material: [], hardware: [], core_brand: [], laminate: [], shutter_finish: [],
    acrylic: [], pu_paint: [], membrane: [], gypsum: [], channel: [], paint: [], wiring: [], switches: [],
  };
  rows.forEach((r) => matrix[r.scope]?.push(r));
  (Object.keys(matrix) as Array<keyof MaterialPricingMatrix>).forEach((k) =>
    matrix[k].sort((a, b) => a.sort_order - b.sort_order),
  );
  return matrix;
};

const lookupRate = (rows: MaterialPricingRow[], key: string | null | undefined): number => {
  if (!key) return 0;
  return Number(rows.find((r) => r.key === key)?.rate_per_sqft || 0);
};

/** Resolve the effective material base rate, honouring per-room/category overrides. */
const resolveMaterialBase = (
  matrix: MaterialPricingMatrix | null,
  materialKey: string | null | undefined,
  overrides?: MaterialRoomOverrides | null,
  roomKey?: string | null,
  categoryKey?: string | null,
): { rate: number; isOverride: boolean } => {
  const override = lookupRoomOverride(overrides, materialKey, roomKey, categoryKey);
  if (override !== null) return { rate: override, isOverride: true };
  return { rate: matrix ? lookupRate(matrix.material, materialKey) : 0, isOverride: false };
};

/**
 * Compute per-sqft rate for a unit_sqft line-item from the active material type
 * + the quotation's selected hardware / core / laminate brands.
 * Optional roomKey + categoryKey consult the per-room override table.
 */
export const computeUnitRate = (
  matrix: MaterialPricingMatrix | null,
  materialKey: string | null | undefined,
  hardwareBrand: string | null | undefined,
  coreBrand: string | null | undefined,
  laminateBrand: string | null | undefined,
  shutterFinishKey?: string | null | undefined,
  overrides?: MaterialRoomOverrides | null,
  roomKey?: string | null,
  categoryKey?: string | null,
): number => {
  if (!matrix) return 0;
  const material = resolveMaterialBase(matrix, materialKey, overrides, roomKey, categoryKey).rate;
  const hardware = lookupRate(matrix.hardware, hardwareBrand);
  const core = lookupRate(matrix.core_brand, coreBrand);
  const laminate = lookupRate(matrix.laminate, laminateBrand);
  const shutter = lookupRate(matrix.shutter_finish, shutterFinishKey);
  return material + hardware + core + laminate + shutter;
};

export const computeRateBreakdown = (
  matrix: MaterialPricingMatrix | null,
  materialKey: string | null | undefined,
  hardwareBrand: string | null | undefined,
  coreBrand: string | null | undefined,
  laminateBrand: string | null | undefined,
  shutterFinishKey?: string | null | undefined,
  overrides?: MaterialRoomOverrides | null,
  roomKey?: string | null,
  categoryKey?: string | null,
) => {
  const base = matrix
    ? resolveMaterialBase(matrix, materialKey, overrides, roomKey, categoryKey)
    : { rate: 0, isOverride: false };
  return {
    material: base.rate,
    materialIsOverride: base.isOverride,
    hardware: matrix ? lookupRate(matrix.hardware, hardwareBrand) : 0,
    core: matrix ? lookupRate(matrix.core_brand, coreBrand) : 0,
    laminate: matrix ? lookupRate(matrix.laminate, laminateBrand) : 0,
    shutter: matrix ? lookupRate(matrix.shutter_finish, shutterFinishKey) : 0,
  };
};

export interface QuotationRoom {
  id?: string;
  tempId: string;
  room_name: string;
  room_type: RoomTypeKey | null;
  /** Selected material type key (e.g. 'bwp_plywood') for dynamic pricing matrix. */
  material_type_key?: string | null;
  width_ft: number;
  height_ft: number;
  depth_ft: number | null;
  area_sqft: number;
  quantity: number;
  // Legacy single material/hardware (kept for backward compat)
  material_id: string | null;
  material_name: string | null;
  material_rate: number;
  hardware_id: string | null;
  hardware_name: string | null;
  hardware_rate: number;
  hardware_fixed: number;
  // Core material applied to all per-sqft units in this room
  core_material_id: string | null;
  core_material_name: string | null;
  core_material_rate: number;
  shutter_finish: string | null;
  shutter_finish_key?: string | null;
  custom_cost: number;
  notes: string | null;
  total_cost: number;
  sort_order: number;
  line_items: QuotationLineItem[];
}

export interface Quotation {
  id?: string;
  quotation_number?: string;
  lead_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  project_location: string | null;
  project_name: string | null;
  project_type: string | null;
  sales_person: string | null;
  quotation_date: string;
  validity_days: number;
  subtotal: number;
  discount_type: "percent" | "amount";
  discount_value: number;
  discount_amount: number;
  gst_enabled: boolean;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  template_format: "detailed" | "summary" | "premium";
  terms_conditions: string | null;
  notes: string | null;
  status: "draft" | "sent" | "approved" | "rejected";
  pdf_url: string | null;
  sent_at: string | null;
  last_sent_at?: string | null;
  revision_count?: number;
  hardware_brand: string | null;
  core_material_brand: string | null;
  laminate_brand: string | null;
  /** Extended brand picks: { acrylic, pu_paint, membrane, gypsum, channel, paint, wiring, switches } */
  brand_selections: Record<string, string | null> | null;
  created_at?: string;
  /** Approval workflow status (source of truth; legacy `status` mirrors key transitions). */
  workflow_status?: "draft" | "internal_review" | "sent" | "negotiation" | "approved" | "rejected";
  submitted_for_review_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  negotiation_started_at?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
  /** Razorpay payment link surface for booking advance */
  payment_link_url?: string | null;
  payment_link_id?: string | null;
  payment_status?: string | null;
  payment_link_created_at?: string | null;
  client_approved_at?: string | null;
  auto_project_id?: string | null;
}

export const ROOM_PRESETS = [
  "Kitchen",
  "Master Bedroom",
  "Kids Bedroom",
  "Living Room",
  "Wardrobe",
  "TV Unit",
  "Dining Area",
  "Pooja Unit",
  "Study Room",
  "Bathroom Vanity",
  "Foyer",
  "Balcony",
];

export const PROJECT_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK", "Villa", "Office", "Clinic", "Retail", "Commercial", "Restaurant"];

export const COMMERCIAL_ROOM_PRESETS = ["Reception", "Waiting Area", "Room 1", "Room 2", "Room 3"];

export const COMMERCIAL_PROJECT_TYPES = ["Commercial", "Restaurant"];

export const COMMERCIAL_UNIT_PRESETS = [
  "Reception Table",
  "MD Table",
  "Workstations",
  "Custom Furniture",
  "Custom Item",
];

export const DEFAULT_TERMS = `1. Quotation valid for 15 days from date of issue.
2. 10% advance payment to confirm the order, 50% payment before starting production, and the remaining 40% before final installation.
3. Civil work, plumbing & electrical changes are not included.
4. Site measurements will be re-verified before production.
5. Any additional work will be charged extra as per actuals.
6. GST extra as applicable.`;

export const calcLineItemTotal = (li: Pick<QuotationLineItem, "pricing_mode" | "area_sqft" | "quantity" | "rate">): number => {
  const qty = li.quantity || 1;
  if (li.pricing_mode === "sqft") return (li.area_sqft || 0) * (li.rate || 0) * qty;
  if (li.pricing_mode === "fixed") return (li.rate || 0) * qty;
  return li.rate || 0; // lumpsum
};

export const calcRoomTotal = (
  r: Pick<QuotationRoom, "area_sqft" | "quantity" | "material_rate" | "hardware_rate" | "hardware_fixed" | "custom_cost"> & {
    line_items?: QuotationLineItem[];
  },
): number => {
  const area = (r.area_sqft || 0) * (r.quantity || 1);
  const materialCost = area * (r.material_rate || 0);
  const hardwareCost = area * (r.hardware_rate || 0) + (r.hardware_fixed || 0);
  const lineItemsCost = (r.line_items ?? []).reduce((s, li) => s + (li.total_cost || calcLineItemTotal(li)), 0);
  return materialCost + hardwareCost + lineItemsCost + (r.custom_cost || 0);
};

export const calcPricingSummary = (
  rooms: QuotationRoom[],
  discountType: "percent" | "amount",
  discountValue: number,
  gstEnabled: boolean,
  gstRate: number,
) => {
  const subtotal = rooms.reduce((sum, r) => sum + (r.total_cost || 0), 0);
  const discount_amount = discountType === "percent" ? (subtotal * (discountValue || 0)) / 100 : discountValue || 0;
  const afterDiscount = Math.max(0, subtotal - discount_amount);
  const gst_amount = gstEnabled ? (afterDiscount * (gstRate || 0)) / 100 : 0;
  const total_amount = afterDiscount + gst_amount;
  return { subtotal, discount_amount, gst_amount, total_amount };
};

export const detectRoomType = (name: string): RoomTypeKey => {
  const n = name.toLowerCase();
  if (n.includes("kitchen")) return "kitchen";
  if (n.includes("bedroom") || n.includes("wardrobe") || n.includes("master") || n.includes("kids")) return "bedroom";
  if (n.includes("living") || n.includes("tv") || n.includes("dining")) return "living_room";
  return "all";
};

export const formatINR = (n: number): string =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export interface QuotationSendHistoryEntry {
  id: string;
  quotation_id: string;
  version: number;
  sent_at: string;
  sent_by: string | null;
  channel: string;
  pdf_url: string | null;
  message_body: string | null;
  note: string | null;
  is_revision: boolean;
}
