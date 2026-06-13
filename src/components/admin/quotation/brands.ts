// Brand registry for quotation selection (Hardware / Core Material / Laminate)
// Brand logo assets were removed during white-label cleanup; use text fallbacks.
const ebco = null;
const hettich = null;
const hafele = null;
const blum = null;
const centuryply = null;
const greenply = null;
const merino = null;
const greenlam = null;
const praveedh = null;
const rehau = null;
const gyproc = null;
const chirpeel = null;

export type BrandCategory =
  | "hardware"
  | "core_material"
  | "laminate"
  | "acrylic"
  | "pu_paint"
  | "membrane"
  | "gypsum"
  | "channel"
  | "paint"
  | "wiring"
  | "switches";

export type BrandGroupKey = "woodwork" | "false_ceiling" | "paint" | "electrical";

export interface BrandOption {
  id: string;
  name: string;
  logo: string | null; // null = render text badge fallback
}

export const HARDWARE_BRANDS: BrandOption[] = [
  { id: "ebco", name: "Ebco", logo: ebco },
  { id: "hettich", name: "Hettich", logo: hettich },
  { id: "hafele", name: "Hafele", logo: hafele },
  { id: "blum", name: "Blum", logo: blum },
];

export const CORE_MATERIAL_BRANDS: BrandOption[] = [
  { id: "century", name: "Century", logo: centuryply },
  { id: "greenply", name: "Greenply", logo: greenply },
  { id: "sharon", name: "Sharon", logo: null },
  { id: "chirpeel", name: "Chirpeel", logo: chirpeel },
];

export const LAMINATE_BRANDS: BrandOption[] = [
  { id: "merino", name: "Merino", logo: merino },
  { id: "airolam", name: "Airolam", logo: null },
  { id: "greenlam", name: "Greenlam", logo: greenlam },
  { id: "stylam", name: "Stylam", logo: null },
  { id: "centurylam", name: "Century Lam", logo: centuryply },
];

// New brand categories (placeholders for future logo uploads — text chips for now)
export const ACRYLIC_BRANDS: BrandOption[] = [
  { id: "praveedh", name: "Praveedh", logo: praveedh },
  { id: "rehau", name: "Rehau", logo: rehau },
];
export const PU_PAINT_BRANDS: BrandOption[] = [];
export const MEMBRANE_BRANDS: BrandOption[] = [];

export const GYPSUM_BRANDS: BrandOption[] = [
  { id: "saint_gobain_gyproc", name: "Saint-Gobain Gyproc", logo: gyproc },
];
export const CHANNEL_BRANDS: BrandOption[] = [
  { id: "jsw", name: "JSW", logo: null },
  { id: "gyproc", name: "Gyproc", logo: null },
  { id: "import", name: "Import", logo: null },
];
export const PAINT_BRANDS: BrandOption[] = [
  { id: "asian_paints", name: "Asian Paints", logo: null },
  { id: "nippon", name: "Nippon", logo: null },
  { id: "birla_opus", name: "Birla Opus", logo: null },
];
export const WIRING_BRANDS: BrandOption[] = [
  { id: "havells", name: "Havells", logo: null },
  { id: "polycab", name: "Polycab", logo: null },
  { id: "finolex", name: "Finolex", logo: null },
  { id: "v_guard", name: "V-Guard", logo: null },
];
export const SWITCHES_BRANDS: BrandOption[] = [
  { id: "legrand", name: "Legrand", logo: null },
  { id: "anchor", name: "Anchor", logo: null },
  { id: "gm", name: "GM", logo: null },
  { id: "goldmedal", name: "Goldmedal", logo: null },
];

export const BRANDS_BY_CATEGORY: Record<BrandCategory, BrandOption[]> = {
  hardware: HARDWARE_BRANDS,
  core_material: CORE_MATERIAL_BRANDS,
  laminate: LAMINATE_BRANDS,
  acrylic: ACRYLIC_BRANDS,
  pu_paint: PU_PAINT_BRANDS,
  membrane: MEMBRANE_BRANDS,
  gypsum: GYPSUM_BRANDS,
  channel: CHANNEL_BRANDS,
  paint: PAINT_BRANDS,
  wiring: WIRING_BRANDS,
  switches: SWITCHES_BRANDS,
};

export const BRAND_CATEGORY_LABEL: Record<BrandCategory, string> = {
  hardware: "Hardware Brand",
  core_material: "Core Material Brand",
  laminate: "Laminate Brand",
  acrylic: "Acrylic Brand",
  pu_paint: "PU Paint Brand",
  membrane: "Membrane Brand",
  gypsum: "Gypsum Brand",
  channel: "Channel Brand",
  paint: "Paint Brand",
  wiring: "Wiring Brand",
  switches: "Switches & Sockets Brand",
};

export interface BrandGroup {
  key: BrandGroupKey;
  label: string;
  categories: BrandCategory[];
}

export const BRAND_GROUPS: BrandGroup[] = [
  { key: "woodwork", label: "Woodwork", categories: ["hardware", "core_material", "laminate", "acrylic", "pu_paint", "membrane"] },
  { key: "false_ceiling", label: "False Ceiling", categories: ["gypsum", "channel"] },
  { key: "paint", label: "Paint", categories: ["paint"] },
  { key: "electrical", label: "Electrical", categories: ["wiring", "switches"] },
];

/** Categories whose value lives on the legacy top-level quotation columns. */
export const LEGACY_BRAND_CATEGORIES: BrandCategory[] = ["hardware", "core_material", "laminate"];

export const findBrand = (category: BrandCategory, id: string | null | undefined): BrandOption | null => {
  if (!id) return null;
  return BRANDS_BY_CATEGORY[category].find((b) => b.id === id) ?? null;
};

/** Parse a comma-separated CSV of brand ids into BrandOption[]. */
export const parseBrandCsv = (category: BrandCategory, csv: string | null | undefined): BrandOption[] => {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => findBrand(category, id))
    .filter((b): b is BrandOption => b !== null);
};
