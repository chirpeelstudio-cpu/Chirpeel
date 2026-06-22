import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, Trash2, ArrowUp, ArrowDown, Download, Send, Sparkles, Check, 
  Smartphone, Mail, ExternalLink, Loader2, Image as ImageIcon, FileText 
} from "lucide-react";
import { generatePresentation, type PPTXTheme, type PPTXSlideData } from "./pptxTemplates";

interface SlideItem extends PPTXSlideData {
  id: string;
}

const ROOM_SUGGESTIONS = [
  "Living Room",
  "Master Bedroom",
  "Guest Bedroom",
  "Kids Bedroom",
  "Modular Kitchen",
  "Dining Room",
  "Pooja Room",
  "Foyer / Entryway",
  "Balcony",
  "Home Office / Study",
  "Home Theatre",
  "Walk-in Wardrobe"
];

const DEFAULT_SCOPE = 
  "1. Custom modular wardrobe and storage systems\n" +
  "2. Premium kitchen cabinetry with soft-close mechanisms and quartz countertops\n" +
  "3. Designer false ceiling with integrated profile and warm LED lighting\n" +
  "4. Wall paneling, accent textures, and customized wallpaper installation\n" +
  "5. Curated loose furniture sourcing, upholstery, and decorative light fixtures";

export default function DesignModule() {
  // Presentation Configuration
  const [title, setTitle] = useState("DESIGN PORTFOLIO");
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
  const [scopeOfWork, setScopeOfWork] = useState(DEFAULT_SCOPE);
  const [theme, setTheme] = useState<PPTXTheme>("minimalist");
  
  // Slides
  const [slides, setSlides] = useState<SlideItem[]>([]);
  
  // Branding
  const [companyName, setCompanyName] = useState("Chirpeel Studio");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // States
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [generatedPptUrl, setGeneratedPptUrl] = useState("");

  // Load Branding Settings
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("company_settings" as never).select("*").limit(1).maybeSingle();
        if (data) {
          const settings = data as any;
          if (settings.company_name) setCompanyName(settings.company_name);
          if (settings.logo_url) {
            // Convert logo URL to base64 if needed, or check if it starts with http
            // pptxgenjs works best with base64 encoded logos or public CORS-enabled URLs.
            // Let's load the logo and convert it to base64 locally to ensure it embeds properly.
            try {
              const res = await fetch(settings.logo_url);
              const blob = await res.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                setLogoUrl(reader.result as string);
              };
              reader.readAsDataURL(blob);
            } catch (err) {
              console.warn("Could not base64 encode company logo, using raw URL:", err);
              setLogoUrl(settings.logo_url);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load company branding settings:", err);
      }
    })();
  }, []);

  // Handle Drag/Drop File Uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSlides((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            image: base64,
            roomName: "",
            description: "",
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    
    toast({ title: "Upload Successful", description: `${files.length} images added to presentation.` });
    // Reset file input value
    e.target.value = "";
  };

  // Reordering & Deleting Slides
  const moveSlide = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === slides.length - 1) return;
    
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;
    setSlides(newSlides);
  };

  const deleteSlide = (id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Slide Removed" });
  };

  const updateSlideData = (id: string, key: keyof PPTXSlideData, value: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [key]: value } : s))
    );
  };

  // Generate Presentation Helper
  const getPptOptions = () => ({
    title,
    clientName: clientName || "Valued Client",
    projectName: projectName || "Interior Design Project",
    date,
    scopeOfWork,
    theme,
    logoUrl,
    companyName,
    slides: slides.map(({ image, roomName, description }) => ({
      image,
      roomName: roomName || "Interior Design Layout",
      description: description || "Proposed materials, lighting, and finishes layout."
    }))
  });

  // Local Download PPTX
  const handleDownload = async () => {
    if (slides.length === 0) {
      toast({ title: "No Renders Uploaded", description: "Please upload at least one render image.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const blob = await generatePresentation(getPptOptions());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Design_Presentation_${(clientName || "Client").replace(/\s+/g, "_")}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Presentation Downloaded", description: "PPTX file saved successfully." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to generate PPTX", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Upload to Supabase and Open Share Modal
  const handleOpenShare = async () => {
    if (slides.length === 0) {
      toast({ title: "No Renders Uploaded", description: "Please upload at least one render image.", variant: "destructive" });
      return;
    }
    setSharing(true);
    try {
      const blob = await generatePresentation(getPptOptions());
      
      const cleanClient = (clientName || "Client").replace(/[^a-zA-Z0-9]/g, "_");
      const cleanProject = (projectName || "Project").replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `presentations/Design_Presentation_${cleanClient}_${cleanProject}_${Date.now()}.pptx`;

      // Upload blob to company-assets bucket
      const { error } = await supabase.storage
        .from("company-assets")
        .upload(fileName, blob, { 
          contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", 
          upsert: true 
        });

      if (error) throw error;

      // Get public URL
      const { data } = supabase.storage.from("company-assets").getPublicUrl(fileName);
      setGeneratedPptUrl(data.publicUrl);
      setShareModalOpen(true);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to upload presentation", description: err.message, variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  // Share Channels
  const handleWhatsAppShare = () => {
    if (!customerPhone) {
      toast({ title: "Phone number required", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, "");
    const msg = `Hi ${clientName || "Client"},\n\nHere is the interior design presentation proposal prepared by ${companyName} for your project ${projectName || ""}.\n\nYou can view and download the PowerPoint presentation here:\n${generatedPptUrl}\n\nLooking forward to your feedback!`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleEmailShare = () => {
    if (!customerEmail) {
      toast({ title: "Email required", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    const subject = `Design Presentation Proposal - ${projectName || "Interior Project"}`;
    const body = `Hi ${clientName || "Client"},\n\nPlease find the interior design presentation proposal prepared by ${companyName} for your project ${projectName || ""}.\n\nYou can view and download the PowerPoint presentation (.pptx) by clicking the link below:\n\n${generatedPptUrl}\n\nWarm regards,\n${companyName}`;
    const mailto = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            Design Presentations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create premium, logo-watermarked PowerPoint proposals for clients using your 3D render designs.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={handleDownload} disabled={generating || sharing || slides.length === 0} className="w-full sm:w-auto">
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download PPTX
          </Button>
          <Button onClick={handleOpenShare} disabled={generating || sharing || slides.length === 0} className="w-full sm:w-auto">
            {sharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send to Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config Forms */}
        <div className="lg:col-span-1 space-y-6">
          {/* Template Selection */}
          <Card className="border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/90">Select Template Theme</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              {[
                { id: "minimalist", name: "Modern Minimalist", desc: "Clean white & indigo details", colors: ["bg-white", "bg-indigo-600"] },
                { id: "dark", name: "Classic Dark", desc: "Premium charcoal & gold theme", colors: ["bg-slate-900", "bg-amber-600"] },
                { id: "chic", name: "Luxury Chic", desc: "Elegant cream serif layout", colors: ["bg-[#FAF9F6]", "bg-[#B7A57A]"] },
                { id: "creative", name: "Vibrant Creative", desc: "Bold styling with geometric blocks", colors: ["bg-slate-100", "bg-cyan-500"] }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as PPTXTheme)}
                  className={`relative p-3 rounded-xl border text-left flex flex-col justify-between h-28 hover:scale-[1.02] active:scale-[0.98] transition-all ${
                    theme === t.id 
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40" 
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block leading-tight text-foreground">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground block mt-1 leading-normal">{t.desc}</span>
                  </div>
                  <div className="flex items-center justify-between w-full mt-2">
                    <div className="flex gap-1.5 items-center">
                      <span className={`w-3.5 h-3.5 rounded-full border border-border/50 ${t.colors[0]}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border border-border/50 ${t.colors[1]}`} />
                    </div>
                    {theme === t.id && (
                      <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/90">Cover & Presentation Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ppt-client">Client Name</Label>
                <Input id="ppt-client" placeholder="e.g. Mr. Rajesh Sharma" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ppt-project">Project Name</Label>
                <Input id="ppt-project" placeholder="e.g. 3BHK Apartment - Prestige Lakeside" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ppt-title">Presentation Title</Label>
                  <Input id="ppt-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ppt-date">Presentation Date</Label>
                  <Input id="ppt-date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scope of Work */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/90">Scope of Work Slide</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ppt-scope">Scope Items</Label>
                <Textarea 
                  id="ppt-scope" 
                  rows={6} 
                  placeholder="Outline the scope details..." 
                  value={scopeOfWork} 
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  className="text-xs resize-y"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Slide Uploads and Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Area */}
          <Card className="border border-border/85 shadow-sm border-dashed bg-muted/10">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Upload Render Renders</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-4">
                Drag and drop or browse files. Supports PNG, JPG/JPEG renders. Upload multiple images to create slide decks.
              </p>
              <input
                type="file"
                id="render-upload"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button type="button" onClick={() => document.getElementById("render-upload")?.click()} variant="secondary" className="px-5">
                Choose Renders
              </Button>
            </CardContent>
          </Card>

          {/* Render Slide Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/90">Presentation Slides ({slides.length})</h3>
              {slides.length > 1 && <span className="text-[11px] text-muted-foreground">Adjust slide sequence using arrows</span>}
            </div>

            {slides.length === 0 ? (
              <Card className="border border-border/50 py-12 flex flex-col items-center text-center justify-center bg-card">
                <ImageIcon className="w-12 h-12 text-muted-foreground/45 mb-3" />
                <span className="text-sm font-semibold text-muted-foreground/80">No slides created yet.</span>
                <span className="text-xs text-muted-foreground max-w-xs mt-1">Upload render files above to automatically generate slide decks.</span>
              </Card>
            ) : (
              slides.map((s, index) => (
                <Card key={s.id} className="border border-border shadow-sm bg-card overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    {/* Thumbnail Preview */}
                    <div className="w-full md:w-44 h-28 bg-muted rounded-lg overflow-hidden border border-border shrink-0 relative group">
                      <img src={s.image} alt="Render Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const w = window.open();
                            w?.document.write(`<img src="${s.image}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                          }}
                          className="h-8 w-8 text-white hover:bg-white/20"
                          title="Open full preview"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Inputs Form */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Room Name</Label>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="e.g. Master Bedroom"
                              value={s.roomName}
                              onChange={(e) => updateSlideData(s.id, "roomName", e.target.value)}
                              className="text-xs h-8 pr-10"
                            />
                            {/* Fast Dropdown Select Suggestions */}
                            <select
                              onChange={(e) => {
                                updateSlideData(s.id, "roomName", e.target.value);
                                e.target.value = ""; // reset select
                              }}
                              className="absolute inset-y-0 right-0 w-8 opacity-0 cursor-pointer"
                            >
                              <option value="">Select Suggestion</option>
                              {ROOM_SUGGESTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-muted-foreground/60">
                              <span className="text-[10px]">▼</span>
                            </div>
                          </div>
                        </div>
                        <div className="sm:w-24 flex items-end justify-end gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => moveSlide(index, "up")}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={index === slides.length - 1}
                            onClick={() => moveSlide(index, "down")}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteSlide(s.id)}
                            className="h-8 w-8 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground border-transparent hover:border-transparent transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Room / View Details & Material Specifications</Label>
                        <Textarea
                          placeholder="e.g. Features fluted wall panels, warm concealed lighting, laminate wood textures, and metallic trims."
                          value={s.description}
                          onChange={(e) => updateSlideData(s.id, "description", e.target.value)}
                          className="text-xs min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Share / Send to Client Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Share Presentation Proposal
            </DialogTitle>
            <DialogDescription>
              We have generated your presentation and uploaded it to your public bucket storage. Share the download link with your client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Public PPTX Link</Label>
              <div className="flex gap-2">
                <Input value={generatedPptUrl} readOnly className="text-xs bg-muted" />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPptUrl);
                    toast({ title: "Link copied to clipboard" });
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="border-t border-border/80 pt-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Share via WhatsApp</h4>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="client-phone" className="text-xs">Client Phone (with country code)</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="client-phone" placeholder="e.g. +919900001234" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="pl-10 text-xs" />
                  </div>
                </div>
                <Button onClick={handleWhatsAppShare} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <ExternalLink className="w-4 h-4" /> WhatsApp
                </Button>
              </div>
            </div>

            <div className="border-t border-border/80 pt-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Share via Email</h4>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="client-email" className="text-xs">Client Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="client-email" placeholder="e.g. client@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="pl-10 text-xs" />
                  </div>
                </div>
                <Button onClick={handleEmailShare} variant="secondary" className="gap-2">
                  <Mail className="w-4 h-4" /> Email Client
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/50 pt-3">
            <Button variant="ghost" onClick={() => setShareModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
