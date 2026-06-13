import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemedDocument } from "./PdfThemePanel";
import type { PdfTheme } from "@/hooks/usePdfTheme";
import {
  PDF_THEME_PRESETS,
  detectActivePreset,
  ALL_PRESET_FONTS,
  type PdfThemePreset,
} from "./pdf-theme-presets";

interface Props {
  currentTheme: PdfTheme;
  onApply: (preset: PdfThemePreset) => void;
}

const presetFontHref = (() => {
  const families = ALL_PRESET_FONTS.map(
    (f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`,
  ).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
})();

export default function PdfThemeGallery({ currentTheme, onApply }: Props) {
  const activeId = detectActivePreset(currentTheme);

  return (
    <Card className="p-4 space-y-3">
      {/* Preload all preset fonts so thumbnails render correctly */}
      <link rel="stylesheet" href={presetFontHref} />

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">Choose a theme</h3>
          <p className="text-xs text-muted-foreground">
            Pick a ready-made style, then fine-tune below. Your logo, bank details and terms text are kept.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PDF_THEME_PRESETS.map((preset) => {
          const isActive = activeId === preset.id;
          // Build a synthetic theme so the thumbnail reflects the preset, not the current draft.
          const previewTheme: PdfTheme = {
            ...currentTheme,
            ...preset.values,
          };
          return (
            <div
              key={preset.id}
              className={cn(
                "rounded-lg border bg-background overflow-hidden flex flex-col transition-all",
                isActive
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border hover:border-primary/40",
              )}
            >
              {/* Thumbnail */}
              <div className="relative h-44 overflow-hidden bg-muted/30 border-b border-border">
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-0 left-0"
                  style={{
                    width: "454%",
                    height: "454%",
                    transform: "scale(0.22)",
                    transformOrigin: "top left",
                  }}
                >
                  <ThemedDocument theme={previewTheme} kind="quotation" />
                </div>
                {isActive && (
                  <Badge className="absolute top-2 right-2 gap-1">
                    <Check className="w-3 h-3" /> Current
                  </Badge>
                )}
              </div>

              {/* Meta */}
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div>
                  <div className="font-semibold text-sm leading-tight">{preset.name}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">
                    {preset.description}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {preset.swatch.map((c) => (
                    <span
                      key={c}
                      className="w-4 h-4 rounded-full border border-border/60"
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>

                <Button
                  size="sm"
                  variant={isActive ? "secondary" : "default"}
                  className="mt-auto"
                  onClick={() => onApply(preset)}
                  disabled={isActive}
                >
                  {isActive ? "Applied" : "Apply theme"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}