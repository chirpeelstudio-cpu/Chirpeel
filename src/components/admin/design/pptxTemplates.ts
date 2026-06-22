import pptxgen from "pptxgenjs";

export type PPTXTheme = "minimalist" | "dark" | "chic" | "creative";

export interface PPTXSlideData {
  image: string; // Base64 data URI (data:image/...) or web URL
  roomName: string;
  description: string;
}

export interface PPTXGeneratorOptions {
  title: string;
  clientName: string;
  projectName: string;
  date: string;
  scopeOfWork: string;
  theme: PPTXTheme;
  logoUrl: string | null;
  companyName: string;
}

interface ThemeConfig {
  bgColor: string;
  titleColor: string;
  textColor: string;
  accentColor: string;
  fontTitle: string;
  fontBody: string;
  hasBorder: boolean;
  borderColor?: string;
}

const THEME_CONFIGS: Record<PPTXTheme, ThemeConfig> = {
  minimalist: {
    bgColor: "FFFFFF",
    titleColor: "111827", // Charcoal
    textColor: "374151", // Gray-700
    accentColor: "4F46E5", // Indigo
    fontTitle: "Segoe UI",
    fontBody: "Segoe UI",
    hasBorder: false,
  },
  dark: {
    bgColor: "111827", // Midnight gray
    titleColor: "F9FAFB", // Off-white
    textColor: "D1D5DB", // Gray-300
    accentColor: "D97706", // Muted Gold
    fontTitle: "Arial",
    fontBody: "Arial",
    hasBorder: false,
  },
  chic: {
    bgColor: "FAF9F6", // Cream / Alabaster
    titleColor: "292524", // Stone-800 (Warm Black)
    textColor: "57534E", // Stone-600 (Muted Brown)
    accentColor: "B7A57A", // Champagne Gold
    fontTitle: "Georgia",
    fontBody: "Georgia",
    hasBorder: true,
    borderColor: "E7E5E4",
  },
  creative: {
    bgColor: "F3F4F6", // Cool Light Gray
    titleColor: "000000",
    textColor: "1F2937",
    accentColor: "06B6D4", // Cyan/Teal
    fontTitle: "Trebuchet MS",
    fontBody: "Segoe UI",
    hasBorder: false,
  },
};

export async function generatePresentation(options: PPTXGeneratorOptions): Promise<Blob> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9"; // Widescreen (10.0 x 5.625 inches)
  
  const cfg = THEME_CONFIGS[options.theme];
  
  // Helper: Create general slide with background and optional borders
  const createBaseSlide = () => {
    const s = pptx.addSlide();
    s.background = { fill: cfg.bgColor };
    
    // Add border for elegant/chic themes
    if (cfg.hasBorder && cfg.borderColor) {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: 0.25,
        y: 0.25,
        w: 9.5,
        h: 5.125,
        line: { color: cfg.borderColor, width: 1 },
        fill: { color: "none" }
      });
    }
    return s;
  };

  // Helper: Draw watermark/branding logo or text in bottom right corner
  const addWatermark = (slide: pptxgen.Slide) => {
    if (options.logoUrl) {
      try {
        slide.addImage({
          data: options.logoUrl, // pptxgenjs accepts base64 data URIs directly
          x: 8.8,
          y: 5.0,
          w: 0.8,
          h: 0.4,
          sizing: { type: "contain" }
        });
      } catch (err) {
        console.warn("Failed to add image watermark to slide, falling back to text:", err);
        addTextWatermark(slide);
      }
    } else {
      addTextWatermark(slide);
    }
  };

  const addTextWatermark = (slide: pptxgen.Slide) => {
    slide.addText(options.companyName, {
      x: 7.5,
      y: 5.1,
      w: 2.1,
      h: 0.3,
      fontSize: 10,
      fontFace: cfg.fontBody,
      color: cfg.accentColor,
      align: "right",
      bold: true
    });
  };

  // ==========================================
  // SLIDE 1: FRONT COVER
  // ==========================================
  const coverSlide = createBaseSlide();
  
  if (options.theme === "creative") {
    // Creative theme: Geometric background color block on left
    coverSlide.addShape(pptx.shapes.RECTANGLE, {
      x: 0,
      y: 0,
      w: 3.5,
      h: 5.625,
      fill: { color: cfg.accentColor }
    });
    
    // Vertical subtitle in block
    coverSlide.addText("DESIGN PRESENTATION", {
      x: 0.2,
      y: 1.5,
      w: 3.1,
      h: 2.5,
      fontSize: 24,
      fontFace: cfg.fontTitle,
      color: "FFFFFF",
      bold: true,
      align: "center",
      valign: "middle"
    });

    // Content on right
    coverSlide.addText(options.projectName, {
      x: 4.0,
      y: 1.5,
      w: 5.5,
      h: 1.2,
      fontSize: 32,
      fontFace: cfg.fontTitle,
      color: cfg.titleColor,
      bold: true
    });

    coverSlide.addText(`Prepared for: ${options.clientName}\nDate: ${options.date}`, {
      x: 4.0,
      y: 3.0,
      w: 5.5,
      h: 1.0,
      fontSize: 14,
      fontFace: cfg.fontBody,
      color: cfg.textColor,
      lineSpacing: 22
    });

    coverSlide.addText(`By: ${options.companyName}`, {
      x: 4.0,
      y: 4.3,
      w: 5.5,
      h: 0.5,
      fontSize: 14,
      fontFace: cfg.fontBody,
      color: cfg.accentColor,
      bold: true
    });

  } else if (options.theme === "dark") {
    // Dark theme: Minimalist but heavy, with premium layout lines
    coverSlide.addShape(pptx.shapes.RECTANGLE, {
      x: 1.0,
      y: 1.0,
      w: 8.0,
      h: 0.05,
      fill: { color: cfg.accentColor }
    });

    coverSlide.addText(options.projectName, {
      x: 1.0,
      y: 1.3,
      w: 8.0,
      h: 1.5,
      fontSize: 40,
      fontFace: cfg.fontTitle,
      color: cfg.titleColor,
      bold: true,
      align: "center"
    });

    coverSlide.addText("DESIGN PORTFOLIO PRESENTATION", {
      x: 1.0,
      y: 2.8,
      w: 8.0,
      h: 0.4,
      fontSize: 12,
      fontFace: cfg.fontTitle,
      color: cfg.accentColor,
      bold: true,
      align: "center"
    });

    coverSlide.addText(`CLIENT: ${options.clientName.toUpperCase()}   |   DATE: ${options.date}`, {
      x: 1.0,
      y: 3.5,
      w: 8.0,
      h: 0.4,
      fontSize: 12,
      fontFace: cfg.fontBody,
      color: cfg.textColor,
      align: "center"
    });

    coverSlide.addText(options.companyName.toUpperCase(), {
      x: 1.0,
      y: 4.3,
      w: 8.0,
      h: 0.5,
      fontSize: 16,
      fontFace: cfg.fontBody,
      color: cfg.titleColor,
      bold: true,
      align: "center"
    });
  } else if (options.theme === "chic") {
    // Chic / Classic theme: Centered elegant layouts with borders
    coverSlide.addText(options.companyName.toUpperCase(), {
      x: 1.0,
      y: 1.0,
      w: 8.0,
      h: 0.5,
      fontSize: 16,
      fontFace: cfg.fontBody,
      color: cfg.accentColor,
      bold: true,
      align: "center"
    });

    coverSlide.addText(options.projectName, {
      x: 1.0,
      y: 1.8,
      w: 8.0,
      h: 1.4,
      fontSize: 36,
      fontFace: cfg.fontTitle,
      color: cfg.titleColor,
      italic: true,
      align: "center"
    });

    coverSlide.addShape(pptx.shapes.RECTANGLE, {
      x: 4.0,
      y: 3.3,
      w: 2.0,
      h: 0.02,
      fill: { color: cfg.accentColor }
    });

    coverSlide.addText(`Client: ${options.clientName}\nDate: ${options.date}`, {
      x: 1.0,
      y: 3.6,
      w: 8.0,
      h: 1.0,
      fontSize: 12,
      fontFace: cfg.fontBody,
      color: cfg.textColor,
      align: "center",
      lineSpacing: 20
    });
  } else {
    // Modern Minimalist cover
    coverSlide.addText("DESIGN PROPOSAL", {
      x: 1.0,
      y: 1.2,
      w: 8.0,
      h: 0.4,
      fontSize: 12,
      fontFace: cfg.fontTitle,
      color: cfg.accentColor,
      bold: true
    });

    coverSlide.addText(options.projectName, {
      x: 1.0,
      y: 1.7,
      w: 8.0,
      h: 1.3,
      fontSize: 38,
      fontFace: cfg.fontTitle,
      color: cfg.titleColor,
      bold: true
    });

    coverSlide.addText(`Prepared For:\n${options.clientName}`, {
      x: 1.0,
      y: 3.2,
      w: 3.5,
      h: 1.0,
      fontSize: 14,
      fontFace: cfg.fontBody,
      color: cfg.textColor,
      bold: false
    });

    coverSlide.addText(`Presented By:\n${options.companyName}\nDate: ${options.date}`, {
      x: 5.0,
      y: 3.2,
      w: 4.0,
      h: 1.0,
      fontSize: 14,
      fontFace: cfg.fontBody,
      color: cfg.textColor
    });
  }

  // ==========================================
  // SLIDE 2: SCOPE OF WORK
  // ==========================================
  const scopeSlide = createBaseSlide();
  addWatermark(scopeSlide);

  // Section Indicator
  scopeSlide.addText("SECTION 01", {
    x: 0.6,
    y: 0.4,
    w: 8.8,
    h: 0.3,
    fontSize: 10,
    fontFace: cfg.fontTitle,
    color: cfg.accentColor,
    bold: true
  });

  // Title
  scopeSlide.addText("Scope of Work", {
    x: 0.6,
    y: 0.7,
    w: 8.8,
    h: 0.6,
    fontSize: 24,
    fontFace: cfg.fontTitle,
    color: cfg.titleColor,
    bold: true
  });

  // Accent Line
  scopeSlide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6,
    y: 1.3,
    w: 8.8,
    h: 0.02,
    fill: { color: cfg.accentColor }
  });

  // Content Paragraph
  scopeSlide.addText(options.scopeOfWork || "No scope of work details configured for this project.", {
    x: 0.6,
    y: 1.6,
    w: 8.8,
    h: 3.2,
    fontSize: 13,
    fontFace: cfg.fontBody,
    color: cfg.textColor,
    valign: "top",
    lineSpacing: 24
  });

  // ==========================================
  // SLIDES 3+: RENDERS
  // ==========================================
  options.slides.forEach((slideData, idx) => {
    const slide = createBaseSlide();
    addWatermark(slide);

    // Section Indicator
    slide.addText(`RENDER VIEW ${String(idx + 1).padStart(2, "0")}`, {
      x: 0.6,
      y: 0.3,
      w: 8.8,
      h: 0.3,
      fontSize: 10,
      fontFace: cfg.fontTitle,
      color: cfg.accentColor,
      bold: true
    });

    // Room/View Title
    slide.addText(slideData.roomName, {
      x: 0.6,
      y: 0.6,
      w: 8.8,
      h: 0.5,
      fontSize: 22,
      fontFace: cfg.fontTitle,
      color: cfg.titleColor,
      bold: true
    });

    // Render image positioning on Left (x: 0.6, y: 1.2, w: 5.5, h: 3.8)
    if (slideData.image) {
      try {
        slide.addImage({
          data: slideData.image, // Base64 data URI (data:image/...) or web URL
          x: 0.6,
          y: 1.2,
          w: 5.5,
          h: 3.8,
          sizing: { type: "contain" }
        });
      } catch (err) {
        console.error("Failed to add slide image to PPTX:", err);
        // Fallback rectangle if image rendering fails
        slide.addShape(pptx.shapes.RECTANGLE, {
          x: 0.6,
          y: 1.2,
          w: 5.5,
          h: 3.8,
          fill: { color: "E5E7EB" },
          line: { color: "D1D5DB", width: 1 }
        });
        slide.addText("Render Image failed to load", {
          x: 0.6,
          y: 2.8,
          w: 5.5,
          h: 0.5,
          fontSize: 12,
          fontFace: cfg.fontBody,
          color: "6B7280",
          align: "center"
        });
      }
    }

    // Room description on Right (x: 6.4, y: 1.2, w: 3.0, h: 3.8)
    slide.addText(slideData.description || "No view description provided.", {
      x: 6.4,
      y: 1.2,
      w: 3.0,
      h: 3.8,
      fontSize: 12,
      fontFace: cfg.fontBody,
      color: cfg.textColor,
      valign: "top",
      lineSpacing: 20
    });
  });

  // Generate output blob
  const pptxBuffer = await pptx.write("blob");
  return pptxBuffer as Blob;
}
