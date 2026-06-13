export type BoqCategory = "wood" | "false_ceiling" | "lighting" | "electrical" | "paint";

export const BOQ_CATEGORIES: { key: BoqCategory; label: string; vendorCategories: string[] }[] = [
  { key: "wood",          label: "Wood Material",  vendorCategories: ["carpenter", "core_material", "laminate", "hardware"] },
  { key: "false_ceiling", label: "False Ceiling",  vendorCategories: ["carpenter", "other"] },
  { key: "lighting",      label: "Lighting",       vendorCategories: ["electrician", "appliance", "other"] },
  { key: "electrical",    label: "Electrical",     vendorCategories: ["electrician", "hardware", "other"] },
  { key: "paint",         label: "Paint",          vendorCategories: ["painter", "other"] },
];

export const BOQ_UNITS = ["nos", "sheet", "sqft", "rft", "litre", "kg", "bag", "coil"];

export interface BoqProduct {
  id: string;
  category: BoqCategory;
  name: string;
  unit: string;
  default_rate: number;
  description: string | null;
  active: boolean;
  is_preset: boolean;
  sort_order: number;
}

export interface BoqProductVendor {
  id: string;
  boq_product_id: string;
  vendor_id: string;
  is_preferred: boolean;
  unit_rate: number | null;
}

export interface ProjectBoqItem {
  id: string;
  project_id: string;
  boq_product_id: string | null;
  category: BoqCategory;
  item_name: string;
  unit: string;
  quantity: number;
  rate: number;
  total: number;
  vendor_id: string | null;
  notes: string | null;
  po_id: string | null;
  sort_order: number;
}
