import type { Quotation, QuotationRoom, QuotationLineItem } from "./types";

export interface SnapshotPayload {
  header: Partial<Quotation> & Record<string, any>;
  rooms: Array<Partial<QuotationRoom> & {
    line_items?: Array<Partial<QuotationLineItem> & Record<string, any>>;
  } & Record<string, any>>;
}

export interface FieldDiff {
  field: string;
  a: any;
  b: any;
}

export interface RoomDiff {
  status: "added" | "removed" | "changed" | "same";
  name: string;
  a?: any;
  b?: any;
  fieldDiffs: FieldDiff[];
  itemDiffs: { status: "added" | "removed" | "changed"; name: string; fieldDiffs: FieldDiff[] }[];
  totalA: number;
  totalB: number;
}

const HEADER_COMPARE_FIELDS = [
  "customer_name",
  "customer_phone",
  "customer_email",
  "project_name",
  "project_location",
  "subtotal",
  "discount_amount",
  "gst_amount",
  "total_amount",
  "gst_enabled",
  "gst_rate",
  "discount_type",
  "discount_value",
  "validity_days",
  "sales_person",
] as const;

const ROOM_COMPARE_FIELDS = [
  "room_type",
  "material_type_key",
  "width_ft",
  "height_ft",
  "area_sqft",
  "quantity",
  "material_name",
  "material_rate",
  "hardware_name",
  "shutter_finish",
  "custom_cost",
  "total_cost",
] as const;

const ITEM_COMPARE_FIELDS = [
  "item_category",
  "item_type",
  "pricing_mode",
  "area_sqft",
  "quantity",
  "rate",
  "total_cost",
] as const;

const eq = (a: any, b: any) => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "number" || typeof b === "number") {
    return Number(a || 0) === Number(b || 0);
  }
  return String(a ?? "") === String(b ?? "");
};

const diffFields = <T extends string>(a: any, b: any, fields: readonly T[]): FieldDiff[] => {
  const out: FieldDiff[] = [];
  for (const f of fields) {
    if (!eq(a?.[f], b?.[f])) out.push({ field: f, a: a?.[f], b: b?.[f] });
  }
  return out;
};

export const diffHeaders = (a: SnapshotPayload, b: SnapshotPayload): FieldDiff[] =>
  diffFields(a.header, b.header, HEADER_COMPARE_FIELDS);

export const diffRooms = (a: SnapshotPayload, b: SnapshotPayload): RoomDiff[] => {
  const out: RoomDiff[] = [];
  const aRooms = a.rooms ?? [];
  const bRooms = b.rooms ?? [];
  const matched = new Set<number>();

  aRooms.forEach((ra) => {
    const name = ra.room_name ?? "Unnamed";
    const idxB = bRooms.findIndex((rb, i) => !matched.has(i) && rb.room_name === name);
    if (idxB === -1) {
      out.push({
        status: "removed",
        name,
        a: ra,
        fieldDiffs: [],
        itemDiffs: [],
        totalA: Number(ra.total_cost || 0),
        totalB: 0,
      });
      return;
    }
    matched.add(idxB);
    const rb = bRooms[idxB];
    const fieldDiffs = diffFields(ra, rb, ROOM_COMPARE_FIELDS);

    // line items by name
    const aItems = (ra.line_items ?? []) as any[];
    const bItems = (rb.line_items ?? []) as any[];
    const itemMatched = new Set<number>();
    const itemDiffs: RoomDiff["itemDiffs"] = [];
    aItems.forEach((ia) => {
      const iName = ia.item_name ?? "Item";
      const j = bItems.findIndex((ib, i) => !itemMatched.has(i) && ib.item_name === iName);
      if (j === -1) {
        itemDiffs.push({ status: "removed", name: iName, fieldDiffs: [] });
        return;
      }
      itemMatched.add(j);
      const fd = diffFields(ia, bItems[j], ITEM_COMPARE_FIELDS);
      if (fd.length) itemDiffs.push({ status: "changed", name: iName, fieldDiffs: fd });
    });
    bItems.forEach((ib, i) => {
      if (!itemMatched.has(i)) itemDiffs.push({ status: "added", name: ib.item_name ?? "Item", fieldDiffs: [] });
    });

    out.push({
      status: fieldDiffs.length || itemDiffs.length ? "changed" : "same",
      name,
      a: ra,
      b: rb,
      fieldDiffs,
      itemDiffs,
      totalA: Number(ra.total_cost || 0),
      totalB: Number(rb.total_cost || 0),
    });
  });

  bRooms.forEach((rb, i) => {
    if (matched.has(i)) return;
    out.push({
      status: "added",
      name: rb.room_name ?? "Unnamed",
      b: rb,
      fieldDiffs: [],
      itemDiffs: [],
      totalA: 0,
      totalB: Number(rb.total_cost || 0),
    });
  });

  return out;
};

export const HEADER_FIELD_LABELS: Record<string, string> = {
  customer_name: "Customer name",
  customer_phone: "Phone",
  customer_email: "Email",
  project_name: "Project",
  project_location: "Location",
  subtotal: "Subtotal",
  discount_amount: "Discount",
  gst_amount: "GST",
  total_amount: "Total",
  gst_enabled: "GST enabled",
  gst_rate: "GST rate",
  discount_type: "Discount type",
  discount_value: "Discount value",
  validity_days: "Validity (days)",
  sales_person: "Sales person",
};

export const ROOM_FIELD_LABELS: Record<string, string> = {
  room_type: "Room type",
  material_type_key: "Material",
  width_ft: "Width (ft)",
  height_ft: "Height (ft)",
  area_sqft: "Area (sqft)",
  quantity: "Quantity",
  material_name: "Material name",
  material_rate: "Material rate",
  hardware_name: "Hardware",
  shutter_finish: "Shutter",
  custom_cost: "Custom cost",
  total_cost: "Room total",
};

export const ITEM_FIELD_LABELS: Record<string, string> = {
  item_category: "Category",
  item_type: "Type",
  pricing_mode: "Pricing",
  area_sqft: "Area",
  quantity: "Qty",
  rate: "Rate",
  total_cost: "Total",
};
