// Seeds a fresh tenant workspace with editable demo data:
// - 5 brands per category (all 11 categories) with realistic ₹/sqft pricing
// - 3 demo leads, 2 projects, 4 vendors
// - 1 invoice, 2 payments, 2 expenses
// Idempotent: skips whole groups that already have any rows for the tenant.
// All demo rows include "[DEMO — safe to delete]" in their notes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_TAG = "[DEMO — safe to delete]";

type BrandSeed = { key: string; name: string; rate: number };

// Pricing catalog presets — drives the "+ Add Units / Accessories / ..." picker
// in the quotation builder. Each row maps to public.pricing_catalog.
type CatalogSeed = {
  category: "material" | "hardware" | "unit" | "accessory" | "service";
  name: string;
  room_type: "kitchen" | "bedroom" | "living_room" | "all";
  item_category:
    | "core_material" | "units" | "accessories"
    | "painting" | "electrical" | "false_ceiling";
  item_type: "core_material" | "unit_sqft" | "accessory_fixed" | "painting" | "electrical";
  rate_per_sqft?: number;
  fixed_cost?: number;
  cost_rate_per_sqft?: number;
  cost_fixed?: number;
};

const CATALOG_SEEDS: CatalogSeed[] = [
  // ---------- KITCHEN — units (sqft based, uplift on top of material base) ----------
  { category: "unit", name: "Base Unit",      room_type: "kitchen", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 0,  cost_rate_per_sqft: 700 },
  { category: "unit", name: "Wall Unit",      room_type: "kitchen", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 0,  cost_rate_per_sqft: 650 },
  { category: "unit", name: "Tall Unit",      room_type: "kitchen", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 50, cost_rate_per_sqft: 800 },
  { category: "unit", name: "Loft",           room_type: "kitchen", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 0,  cost_rate_per_sqft: 600 },
  { category: "unit", name: "Island Unit",    room_type: "kitchen", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 80, cost_rate_per_sqft: 900 },
  { category: "unit", name: "Crockery Unit",  room_type: "kitchen", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 40, cost_rate_per_sqft: 750 },

  // ---------- KITCHEN — accessories (fixed cost each) ----------
  { category: "accessory", name: "Cutlery Tray",         room_type: "kitchen", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 2200, cost_fixed: 1500 },
  { category: "accessory", name: "Bottle Pull-out",      room_type: "kitchen", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 3500, cost_fixed: 2400 },
  { category: "accessory", name: "Corner Carousel",      room_type: "kitchen", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 8500, cost_fixed: 6000 },
  { category: "accessory", name: "Tandem Basket",        room_type: "kitchen", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 6500, cost_fixed: 4500 },
  { category: "accessory", name: "Waste Bin Pull-out",   room_type: "kitchen", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 4200, cost_fixed: 3000 },
  { category: "accessory", name: "Plate Rack",           room_type: "kitchen", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 3200, cost_fixed: 2200 },

  // ---------- BEDROOM — units ----------
  { category: "unit", name: "Wardrobe (Sliding)",  room_type: "bedroom", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 60, cost_rate_per_sqft: 850 },
  { category: "unit", name: "Wardrobe (Openable)", room_type: "bedroom", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 0,  cost_rate_per_sqft: 700 },
  { category: "unit", name: "Loft Storage",        room_type: "bedroom", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 0,  cost_rate_per_sqft: 600 },
  { category: "unit", name: "Dresser Unit",        room_type: "bedroom", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 30, cost_rate_per_sqft: 750 },
  { category: "unit", name: "Bedside Storage",     room_type: "bedroom", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 20, cost_rate_per_sqft: 700 },
  { category: "unit", name: "TV Unit",             room_type: "bedroom", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 40, cost_rate_per_sqft: 750 },

  // ---------- BEDROOM — accessories ----------
  { category: "accessory", name: "Hanging Rod",       room_type: "bedroom", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 950,  cost_fixed: 600 },
  { category: "accessory", name: "Trouser Rack",      room_type: "bedroom", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 2400, cost_fixed: 1700 },
  { category: "accessory", name: "Tie Rack",          room_type: "bedroom", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 1200, cost_fixed: 800 },
  { category: "accessory", name: "Shoe Rack",         room_type: "bedroom", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 3200, cost_fixed: 2200 },
  { category: "accessory", name: "Drawer Set (3-pc)", room_type: "bedroom", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 4500, cost_fixed: 3200 },
  { category: "accessory", name: "Mirror Panel",      room_type: "bedroom", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 1800, cost_fixed: 1200 },

  // ---------- LIVING ROOM — units ----------
  { category: "unit", name: "TV Unit",           room_type: "living_room", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 50, cost_rate_per_sqft: 800 },
  { category: "unit", name: "Crockery Display",  room_type: "living_room", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 60, cost_rate_per_sqft: 820 },
  { category: "unit", name: "Bookshelf",         room_type: "living_room", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 30, cost_rate_per_sqft: 700 },
  { category: "unit", name: "Shoe Cabinet",      room_type: "living_room", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 20, cost_rate_per_sqft: 680 },
  { category: "unit", name: "Partition Unit",    room_type: "living_room", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 70, cost_rate_per_sqft: 850 },
  { category: "unit", name: "Storage Cabinet",   room_type: "living_room", item_category: "units", item_type: "unit_sqft", rate_per_sqft: 0,  cost_rate_per_sqft: 700 },

  // ---------- LIVING ROOM — accessories ----------
  { category: "accessory", name: "LED Strip Kit (per metre)",  room_type: "living_room", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 350,  cost_fixed: 220 },
  { category: "accessory", name: "Glass Shutter Upgrade",      room_type: "living_room", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 4200, cost_fixed: 3000 },
  { category: "accessory", name: "Soft-Close Hinges (set 10)", room_type: "living_room", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 4500, cost_fixed: 3200 },
  { category: "accessory", name: "Push-to-Open Set (10)",      room_type: "living_room", item_category: "accessories", item_type: "accessory_fixed", fixed_cost: 3800, cost_fixed: 2700 },

  // ---------- ALL ROOMS — painting / electrical / false ceiling ----------
  { category: "service", name: "Interior Emulsion",        room_type: "all", item_category: "painting",      item_type: "painting",   rate_per_sqft: 35, cost_rate_per_sqft: 22 },
  { category: "service", name: "Texture Finish",           room_type: "all", item_category: "painting",      item_type: "painting",   rate_per_sqft: 85, cost_rate_per_sqft: 55 },
  { category: "service", name: "Enamel Trim",              room_type: "all", item_category: "painting",      item_type: "painting",   rate_per_sqft: 55, cost_rate_per_sqft: 36 },

  { category: "service", name: "Concealed Wiring Point",   room_type: "all", item_category: "electrical",    item_type: "electrical", fixed_cost: 850,  cost_fixed: 580 },
  { category: "service", name: "Modular Switch Set",       room_type: "all", item_category: "electrical",    item_type: "electrical", fixed_cost: 1800, cost_fixed: 1250 },
  { category: "service", name: "Spot Light Point",         room_type: "all", item_category: "electrical",    item_type: "electrical", fixed_cost: 650,  cost_fixed: 420 },
  { category: "service", name: "USB Socket Point",         room_type: "all", item_category: "electrical",    item_type: "electrical", fixed_cost: 950,  cost_fixed: 650 },

  { category: "service", name: "Plain Gypsum Ceiling",     room_type: "all", item_category: "false_ceiling", item_type: "unit_sqft",  rate_per_sqft: 95,  cost_rate_per_sqft: 65 },
  { category: "service", name: "Cove Lighting Pelmet",     room_type: "all", item_category: "false_ceiling", item_type: "unit_sqft",  rate_per_sqft: 140, cost_rate_per_sqft: 95 },
  { category: "service", name: "Designer Box Ceiling",     room_type: "all", item_category: "false_ceiling", item_type: "unit_sqft",  rate_per_sqft: 180, cost_rate_per_sqft: 125 },
];

const BRAND_SEEDS: Record<string, BrandSeed[]> = {
  hardware: [
    { key: "hettich", name: "Hettich", rate: 95 },
    { key: "hafele", name: "Hafele", rate: 110 },
    { key: "ebco", name: "Ebco", rate: 70 },
    { key: "blum", name: "Blum", rate: 140 },
    { key: "yale", name: "Yale", rate: 60 },
  ],
  core_material: [
    { key: "century", name: "Century", rate: 85 },
    { key: "greenply", name: "Greenply", rate: 80 },
    { key: "sharon", name: "Sharon", rate: 70 },
    { key: "action_tesa", name: "Action Tesa", rate: 65 },
    { key: "kitply", name: "Kitply", rate: 60 },
  ],
  laminate: [
    { key: "merino", name: "Merino", rate: 75 },
    { key: "greenlam", name: "Greenlam", rate: 70 },
    { key: "stylam", name: "Stylam", rate: 65 },
    { key: "airolam", name: "Airolam", rate: 55 },
    { key: "centurylam", name: "Century Lam", rate: 80 },
  ],
  acrylic: [
    { key: "senosan", name: "Senosan", rate: 220 },
    { key: "rehau_acr", name: "Rehau", rate: 200 },
    { key: "plyneer", name: "Plyneer", rate: 180 },
    { key: "royale_touche", name: "Royale Touche", rate: 160 },
    { key: "asis", name: "Asis", rate: 140 },
  ],
  pu_paint: [
    { key: "asian_pu", name: "Asian PU", rate: 180 },
    { key: "berger_pu", name: "Berger PU", rate: 170 },
    { key: "mrf_pu", name: "MRF PU", rate: 160 },
    { key: "nippon_pu", name: "Nippon PU", rate: 150 },
    { key: "sirca", name: "Sirca", rate: 220 },
  ],
  membrane: [
    { key: "rehau_mem", name: "Rehau", rate: 95 },
    { key: "hettich_mem", name: "Hettich Membrane", rate: 100 },
    { key: "decoply", name: "Decoply", rate: 80 },
    { key: "greenlam_mem", name: "Greenlam Membrane", rate: 85 },
    { key: "local_mem", name: "Local Membrane", rate: 60 },
  ],
  gypsum: [
    { key: "gyproc", name: "Gyproc", rate: 55 },
    { key: "saint_gobain", name: "Saint-Gobain", rate: 60 },
    { key: "usg_boral", name: "USG Boral", rate: 65 },
    { key: "india_gypsum", name: "India Gypsum", rate: 50 },
    { key: "local_gyp", name: "Local Gypsum", rate: 40 },
  ],
  channel: [
    { key: "gypsteel", name: "Gypsteel", rate: 28 },
    { key: "saint_gobain_ch", name: "Saint-Gobain", rate: 32 },
    { key: "boral_ch", name: "Boral", rate: 30 },
    { key: "vasundhara", name: "Vasundhara", rate: 25 },
    { key: "local_ch", name: "Local Channel", rate: 22 },
  ],
  paint: [
    { key: "asian", name: "Asian Paints", rate: 35 },
    { key: "berger", name: "Berger", rate: 32 },
    { key: "nippon", name: "Nippon", rate: 30 },
    { key: "dulux", name: "Dulux", rate: 38 },
    { key: "indigo", name: "Indigo", rate: 28 },
  ],
  wiring: [
    { key: "polycab", name: "Polycab", rate: 25 },
    { key: "finolex", name: "Finolex", rate: 28 },
    { key: "havells_w", name: "Havells", rate: 30 },
    { key: "kei", name: "KEI", rate: 26 },
    { key: "rr_kabel", name: "RR Kabel", rate: 24 },
  ],
  switches: [
    { key: "legrand", name: "Legrand", rate: 180 },
    { key: "schneider", name: "Schneider", rate: 200 },
    { key: "anchor", name: "Anchor", rate: 90 },
    { key: "havells_s", name: "Havells", rate: 110 },
    { key: "gm", name: "GM", rate: 80 },
  ],
};

// ---------- Pricing presets (rooms × categories × material grid) ----------
const ROOM_SEEDS: { key: string; label: string }[] = [
  { key: "kitchen",         label: "Kitchen" },
  { key: "master_bedroom",  label: "Master Bedroom" },
  { key: "kids_bedroom",    label: "Kids Bedroom" },
  { key: "living_room",     label: "Living Room" },
  { key: "wardrobe",        label: "Wardrobe" },
  { key: "tv_unit",         label: "TV Unit" },
  { key: "dining_area",     label: "Dining Area" },
  { key: "pooja_unit",      label: "Pooja Unit" },
  { key: "study_room",      label: "Study Room" },
  { key: "bathroom_vanity", label: "Bathroom Vanity" },
  { key: "foyer",           label: "Foyer" },
  { key: "balcony",         label: "Balcony" },
];

const CATEGORY_SEEDS: { key: string; label: string }[] = [
  { key: "wardrobe",  label: "Wardrobe" },
  { key: "loft",      label: "Loft" },
  { key: "base_unit", label: "Base Unit" },
  { key: "wall_unit", label: "Wall Unit" },
  { key: "tv_unit",   label: "TV Unit" },
  { key: "vanity",    label: "Vanity" },
  { key: "storage",   label: "Storage" },
  { key: "other",     label: "Other" },
];

// Baseline raw material rates (₹/sqft sell, cost). Used for `material` scope and as
// base when filling the per-room pricing grid.
const MATERIAL_BASE_SEEDS: { key: string; label: string; rate: number; cost: number }[] = [
  { key: "plywood_bwp",     label: "Plywood (BWP)",     rate: 320, cost: 230 },
  { key: "plywood_mr",      label: "Plywood (MR)",      rate: 260, cost: 185 },
  { key: "hdhmr",           label: "HDHMR",             rate: 290, cost: 210 },
  { key: "mdf",             label: "MDF",               rate: 220, cost: 155 },
  { key: "particle_board",  label: "Particle Board",    rate: 180, cost: 125 },
];

// Shutter finish uplift presets (used in shutter_finish scope alongside brand uplifts).
const SHUTTER_FINISH_SEEDS: { key: string; label: string; rate: number; cost: number }[] = [
  { key: "laminate",  label: "Laminate Finish", rate: 0,   cost: 0 },
  { key: "acrylic",   label: "Acrylic Finish",  rate: 220, cost: 150 },
  { key: "pu_paint",  label: "PU Paint Finish", rate: 280, cost: 190 },
  { key: "membrane",  label: "Membrane Finish", rate: 120, cost: 80 },
  { key: "veneer",    label: "Veneer Finish",   rate: 350, cost: 240 },
];

// Per-category multiplier for the per-room grid (loft = lighter, kitchen base = denser).
const CATEGORY_MULT: Record<string, number> = {
  wardrobe: 1.10, loft: 0.85, base_unit: 1.15, wall_unit: 1.00,
  tv_unit: 1.05, vanity: 1.10, storage: 0.95, other: 1.00,
};
const ROOM_MULT: Record<string, number> = {
  kitchen: 1.10, master_bedroom: 1.05, kids_bedroom: 1.00, living_room: 1.05,
  wardrobe: 1.05, tv_unit: 1.00, dining_area: 1.00, pooja_unit: 0.95,
  study_room: 0.95, bathroom_vanity: 1.10, foyer: 0.90, balcony: 0.85,
};

// Map BRAND_SEEDS category -> material_pricing scope key.
const BRAND_CATEGORY_TO_SCOPE: Record<string, string> = {
  hardware: "hardware",
  core_material: "core_brand",
  laminate: "laminate",
  acrylic: "acrylic",
  pu_paint: "pu_paint",
  membrane: "membrane",
  gypsum: "gypsum",
  channel: "channel",
  paint: "paint",
  wiring: "wiring",
  switches: "switches",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    // Resolve caller → tenant_id
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Not authenticated" }, 401);
    }
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: member } = await admin
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    const tenantId = (member as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) {
      return json({ error: "No tenant for this user yet — finish onboarding first" }, 400);
    }

    const summary = {
      tenant_id: tenantId,
      brands: 0,
      catalog: 0,
      rooms: 0,
      categories: 0,
      material_rates: 0,
      room_overrides: 0,
      leads: 0,
      projects: 0,
      vendors: 0,
      invoices: 0,
      payments: 0,
      expenses: 0,
    };

    // ---------- BRANDS (skip if any row exists for tenant) ----------
    const { count: brandCount } = await admin
      .from("brand_catalog")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((brandCount ?? 0) === 0) {
      const rows: Record<string, unknown>[] = [];
      let order = 0;
      for (const [category, brands] of Object.entries(BRAND_SEEDS)) {
        for (const b of brands) {
          rows.push({
            tenant_id: tenantId,
            category,
            key: b.key,
            name: b.name,
            rate_per_sqft: b.rate,
            sort_order: order++,
            active: true,
            is_preset: true,
          });
        }
      }
      const { error } = await admin
        .from("brand_catalog")
        .upsert(rows, { onConflict: "tenant_id,category,key", ignoreDuplicates: true });
      if (error) console.error("brand_catalog insert", error);
      else summary.brands = rows.length;
    }

    // ---------- PRICING CATALOG (units / accessories / painting / electrical / false-ceiling) ----------
    const { count: catalogCount } = await admin
      .from("pricing_catalog")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((catalogCount ?? 0) === 0) {
      const catalogRows = CATALOG_SEEDS.map((c, idx) => ({
        tenant_id: tenantId,
        category: c.category,
        name: c.name,
        room_type: c.room_type,
        item_category: c.item_category,
        item_type: c.item_type,
        rate_per_sqft: c.rate_per_sqft ?? 0,
        fixed_cost: c.fixed_cost ?? 0,
        cost_rate_per_sqft: c.cost_rate_per_sqft ?? 0,
        cost_fixed: c.cost_fixed ?? 0,
        active: true,
        sort_order: idx,
        description: `${DEMO_TAG} Demo preset — edit name/price or delete anytime.`,
      }));
      const { error } = await admin.from("pricing_catalog").insert(catalogRows);
      if (error) console.error("pricing_catalog insert", error);
      else summary.catalog = catalogRows.length;
    }

    // ---------- PRICING ROOMS ----------
    const { count: roomCount } = await admin
      .from("pricing_rooms")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((roomCount ?? 0) === 0) {
      const roomRows = ROOM_SEEDS.map((r, i) => ({
        tenant_id: tenantId, key: r.key, label: r.label,
        sort_order: i * 10, is_preset: true, active: true,
      }));
      // pricing_rooms.key has a GLOBAL unique index — use upsert with ignoreDuplicates
      const { error } = await admin
        .from("pricing_rooms")
        .upsert(roomRows, { onConflict: "tenant_id,key", ignoreDuplicates: true });
      if (error) console.error("pricing_rooms insert", error);
      else summary.rooms = roomRows.length;
    }

    // ---------- PRICING ITEM CATEGORIES ----------
    const { count: catCount } = await admin
      .from("pricing_item_categories")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((catCount ?? 0) === 0) {
      const catRows = CATEGORY_SEEDS.map((c, i) => ({
        tenant_id: tenantId, key: c.key, label: c.label,
        sort_order: i * 10, is_preset: true, active: true,
      }));
      const { error } = await admin
        .from("pricing_item_categories")
        .upsert(catRows, { onConflict: "tenant_id,key", ignoreDuplicates: true });
      if (error) console.error("pricing_item_categories insert", error);
      else summary.categories = catRows.length;
    }

    // ---------- MATERIAL PRICING (default ₹/sqft per scope) ----------
    const { count: matRateCount } = await admin
      .from("material_pricing")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((matRateCount ?? 0) === 0) {
      const matRows: Record<string, unknown>[] = [];
      let order = 0;
      // Base material types
      MATERIAL_BASE_SEEDS.forEach((m) => {
        matRows.push({
          tenant_id: tenantId, scope: "material", key: m.key, label: m.label,
          rate_per_sqft: m.rate, cost_rate_per_sqft: m.cost, sort_order: order++,
        });
      });
      // Shutter finish presets
      SHUTTER_FINISH_SEEDS.forEach((s) => {
        matRows.push({
          tenant_id: tenantId, scope: "shutter_finish", key: s.key, label: s.label,
          rate_per_sqft: s.rate, cost_rate_per_sqft: s.cost, sort_order: order++,
        });
      });
      // Brand-driven uplifts (mirrors BRAND_SEEDS so matrix shows every brand)
      for (const [brandCategory, brands] of Object.entries(BRAND_SEEDS)) {
        const scope = BRAND_CATEGORY_TO_SCOPE[brandCategory];
        if (!scope) continue;
        brands.forEach((b) => {
          matRows.push({
            tenant_id: tenantId, scope, key: b.key, label: b.name,
            rate_per_sqft: b.rate,
            cost_rate_per_sqft: Math.round(b.rate * 0.7),
            sort_order: order++,
          });
        });
      }
      const { error } = await admin
        .from("material_pricing")
        .upsert(matRows, { onConflict: "tenant_id,scope,key", ignoreDuplicates: true });
      if (error) console.error("material_pricing insert", error);
      else summary.material_rates = matRows.length;
    }

    // ---------- MATERIAL × ROOM × CATEGORY GRID ----------
    const { count: gridCount } = await admin
      .from("material_room_pricing")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((gridCount ?? 0) === 0) {
      const gridRows: Record<string, unknown>[] = [];
      MATERIAL_BASE_SEEDS.forEach((m) => {
        ROOM_SEEDS.forEach((room) => {
          CATEGORY_SEEDS.forEach((cat) => {
            const rMul = ROOM_MULT[room.key] ?? 1;
            const cMul = CATEGORY_MULT[cat.key] ?? 1;
            const rate = Math.round(m.rate * rMul * cMul);
            const cost = Math.round(m.cost * rMul * cMul);
            gridRows.push({
              tenant_id: tenantId,
              material_key: m.key,
              room_key: room.key,
              category_key: cat.key,
              rate_per_sqft: rate,
              cost_rate_per_sqft: cost,
            });
          });
        });
      });
      // Insert in chunks of 500 to stay under request limits
      let inserted = 0;
      for (let i = 0; i < gridRows.length; i += 500) {
        const chunk = gridRows.slice(i, i + 500);
        const { error } = await admin
          .from("material_room_pricing")
          .upsert(chunk, { onConflict: "tenant_id,material_key,room_key,category_key", ignoreDuplicates: true });
        if (error) { console.error("material_room_pricing insert", error); break; }
        inserted += chunk.length;
      }
      summary.room_overrides = inserted;
    }

    // ---------- LEADS (only seed if no leads exist) ----------
    let karthikLeadId: string | null = null;
    let meeraLeadId: string | null = null;
    const { count: leadCount } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((leadCount ?? 0) === 0) {
      const leadRows = [
        {
          tenant_id: tenantId, name: "Karthik R (Demo)", phone: "+91 90000 11111",
          email: "karthik.demo@example.com", city: "Pollachi", source: "referral",
          project_type: "3BHK", budget: "15-20L", timeline: "2-3 months",
          stage: "negotiation", status: "in_progress",
          details: `${DEMO_TAG} Demo lead — modular kitchen + wardrobes for villa.`,
        },
        {
          tenant_id: tenantId, name: "Meera S (Demo)", phone: "+91 90000 22222",
          email: "meera.demo@example.com", city: "Tirupur", source: "instagram",
          project_type: "Duplex", budget: "10-15L", timeline: "1-2 months",
          stage: "site_visit", status: "in_progress",
          details: `${DEMO_TAG} Demo lead — full-home interiors for duplex.`,
        },
        {
          tenant_id: tenantId, name: "Anand V (Demo)", phone: "+91 90000 33333",
          email: "anand.demo@example.com", city: "Erode", source: "google_ads",
          project_type: "4BHK", budget: "15-20L", timeline: "3-6 months",
          stage: "leads", status: "new_lead",
          details: `${DEMO_TAG} Demo lead — interiors for new bungalow.`,
        },
      ];
      const { data: insertedLeads, error } = await admin
        .from("leads").insert(leadRows).select("id, name");
      if (error) console.error("leads insert", error);
      else {
        summary.leads = insertedLeads?.length ?? 0;
        karthikLeadId = insertedLeads?.find((l: { name: string }) => l.name.startsWith("Karthik"))?.id ?? null;
        meeraLeadId = insertedLeads?.find((l: { name: string }) => l.name.startsWith("Meera"))?.id ?? null;
      }
    }

    // ---------- PROJECTS ----------
    let pollachiProjectId: string | null = null;
    const { count: projCount } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((projCount ?? 0) === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const end1 = new Date(); end1.setDate(end1.getDate() + 45);
      const end2 = new Date(); end2.setDate(end2.getDate() + 60);
      const projRows = [
        {
          tenant_id: tenantId, name: "Pollachi villa interior (Demo)",
          lead_id: karthikLeadId, project_type: "3BHK",
          site_address: "Pollachi, Tamil Nadu", status: "in_progress",
          progress_pct: 35, budget: 1840000, project_manager: "Studio Owner",
          start_date: today, target_end_date: end1.toISOString().slice(0, 10),
          notes: `${DEMO_TAG} Demo project showing an in-progress build.`,
        },
        {
          tenant_id: tenantId, name: "Tirupur duplex (Demo)",
          lead_id: meeraLeadId, project_type: "Duplex",
          site_address: "Tirupur, Tamil Nadu", status: "planning",
          progress_pct: 10, budget: 1260000, project_manager: "Studio Owner",
          start_date: today, target_end_date: end2.toISOString().slice(0, 10),
          notes: `${DEMO_TAG} Demo project in planning phase.`,
        },
      ];
      const { data: insertedProjects, error } = await admin
        .from("projects").insert(projRows).select("id, name");
      if (error) console.error("projects insert", error);
      else {
        summary.projects = insertedProjects?.length ?? 0;
        pollachiProjectId = insertedProjects?.find((p: { name: string }) => p.name.startsWith("Pollachi"))?.id ?? null;
      }
    }

    // ---------- VENDORS ----------
    const { count: vendorCount } = await admin
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((vendorCount ?? 0) === 0) {
      const vendorRows = [
        { tenant_id: tenantId, name: "Hettich Hardware (Demo)", category: "hardware",
          contact_person: "Sales Rep", phone: "+91 90000 44444", email: "sales@hettich.demo",
          payment_terms: "30 days", rating: 5, active: true,
          notes: `${DEMO_TAG} Demo vendor for cabinet hardware.` },
        { tenant_id: tenantId, name: "Merino Industries (Demo)", category: "laminate",
          contact_person: "Regional Sales", phone: "+91 90000 55555", email: "sales@merino.demo",
          payment_terms: "Advance + delivery", rating: 4, active: true,
          notes: `${DEMO_TAG} Demo vendor for laminates.` },
        { tenant_id: tenantId, name: "Greenply Plywood (Demo)", category: "core_material",
          contact_person: "Distributor", phone: "+91 90000 66666", email: "trade@greenply.demo",
          payment_terms: "15 days", rating: 4, active: true,
          notes: `${DEMO_TAG} Demo vendor for plywood.` },
        { tenant_id: tenantId, name: "JK Carpentry Works (Demo)", category: "carpenter",
          contact_person: "Mr. Karthik", phone: "+91 90000 77777", email: null,
          payment_terms: "Weekly", rating: 5, active: true,
          notes: `${DEMO_TAG} Demo vendor — local carpentry crew.` },
      ];
      const { error } = await admin.from("vendors").insert(vendorRows);
      if (error) console.error("vendors insert", error);
      else summary.vendors = vendorRows.length;
    }

    // ---------- FINANCE: invoice + payments + expenses ----------
    const { count: invCount } = await admin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    let demoInvoiceId: string | null = null;
    if ((invCount ?? 0) === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      const { data: invRow, error } = await admin.from("invoices").insert({
        tenant_id: tenantId,
        invoice_number: "INV/DEMO/0001",
        lead_id: karthikLeadId,
        customer_name: "Karthik R (Demo)",
        customer_phone: "+91 90000 11111",
        customer_email: "karthik.demo@example.com",
        customer_address: "Pollachi, Tamil Nadu",
        milestone: "10",
        milestone_label: "Booking advance 10%",
        amount: 180000,
        gst_enabled: true,
        gst_rate: 18,
        gst_amount: 32400,
        total_amount: 212400,
        issue_date: today,
        due_date: dueDate.toISOString().slice(0, 10),
        status: "paid",
        paid_amount: 212400,
        paid_on: today,
        notes: `${DEMO_TAG} Demo invoice for booking advance.`,
      }).select("id").single();
      if (error) console.error("invoice insert", error);
      else { summary.invoices = 1; demoInvoiceId = invRow?.id ?? null; }
    }

    const { count: payCount } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((payCount ?? 0) === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const past = new Date(); past.setDate(past.getDate() - 14);
      const payRows = [
        { tenant_id: tenantId, lead_id: karthikLeadId, invoice_id: demoInvoiceId,
          paid_on: past.toISOString().slice(0, 10), amount: 212400, mode: "upi",
          reference: "DEMO-UPI-001", milestone: "10",
          notes: `${DEMO_TAG} Booking advance payment received.` },
        { tenant_id: tenantId, lead_id: karthikLeadId, invoice_id: null,
          paid_on: today, amount: 400000, mode: "bank",
          reference: "DEMO-NEFT-002", milestone: "50",
          notes: `${DEMO_TAG} Production milestone payment.` },
      ];
      const { error } = await admin.from("payments").insert(payRows);
      if (error) console.error("payments insert", error);
      else summary.payments = payRows.length;
    }

    const { count: expCount } = await admin
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if ((expCount ?? 0) === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const past = new Date(); past.setDate(past.getDate() - 7);
      const expRows = [
        { tenant_id: tenantId, lead_id: karthikLeadId,
          expense_date: past.toISOString().slice(0, 10), category: "material",
          vendor: "Greenply Plywood (Demo)", description: "Plywood sheets 19mm x 20",
          amount: 45000, payment_mode: "bank", reference: "DEMO-BILL-001",
          notes: `${DEMO_TAG} Material purchase for Pollachi villa.` },
        { tenant_id: tenantId, lead_id: karthikLeadId,
          expense_date: today, category: "labour",
          vendor: "JK Carpentry Works (Demo)", description: "Week 2 labour wages",
          amount: 22000, payment_mode: "cash", reference: null,
          notes: `${DEMO_TAG} Carpenter wages.` },
      ];
      const { error } = await admin.from("expenses").insert(expRows);
      if (error) console.error("expenses insert", error);
      else summary.expenses = expRows.length;
    }

    return json({ ok: true, summary }, 200);
  } catch (e) {
    console.error("seed-starter-data error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}