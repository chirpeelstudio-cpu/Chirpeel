import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BrandCategory, BrandOption } from "@/components/admin/quotation/brands";

export interface BrandCatalogRow {
  id: string;
  category: BrandCategory;
  key: string;
  name: string;
  logo_url: string | null;
  rate_per_sqft: number;
  sort_order: number;
  active: boolean;
  is_preset: boolean;
}

/** Fetch all brand_catalog rows (active + inactive). Use for admin Brands panel. */
export const useAllBrands = () => {
  const [rows, setRows] = useState<BrandCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("brand_catalog" as never)
      .select("*")
      .order("category")
      .order("sort_order");
    setRows((data ?? []) as unknown as BrandCatalogRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { rows, loading, reload };
};

/** Fetch active brands grouped by category for use in selectors. */
export const useActiveBrandsByCategory = () => {
  const [byCategory, setByCategory] = useState<Record<BrandCategory, BrandOption[]>>({
    hardware: [], core_material: [], laminate: [], acrylic: [], pu_paint: [],
    membrane: [], gypsum: [], channel: [], paint: [], wiring: [], switches: [],
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("brand_catalog" as never)
      .select("*")
      .eq("active", true)
      .order("sort_order");
    const next: Record<BrandCategory, BrandOption[]> = {
      hardware: [], core_material: [], laminate: [], acrylic: [], pu_paint: [],
      membrane: [], gypsum: [], channel: [], paint: [], wiring: [], switches: [],
    };
    ((data ?? []) as unknown as BrandCatalogRow[]).forEach((r) => {
      if (next[r.category]) {
        next[r.category].push({ id: r.key, name: r.name, logo: r.logo_url });
      }
    });
    setByCategory(next);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { byCategory, loading, reload };
};
