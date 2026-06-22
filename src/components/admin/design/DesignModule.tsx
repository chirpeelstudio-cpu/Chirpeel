import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, Trash2, ArrowUp, ArrowDown, Download, Send, Sparkles, Check, 
  Smartphone, Mail, ExternalLink, Loader2, Image as ImageIcon, FileText,
  Search, Plus, ArrowLeft, Paintbrush, Calendar, User, Layout, Eye
} from "lucide-react";
import { generatePresentation, type PPTXTheme } from "./pptxTemplates";
import type { PipelineLead } from "@/components/admin/types";

interface SlideItem {
  id: string;
  image: string; // Base64 data URI (data:image/...) or web URL
  roomName: string;
  description: string;
}

interface DesignPresentation {
  id: string;
  leadId: string;
  clientName: string;
  email: string;
  phone: string;
  projectName: string;
  date: string;
  title: string;
  scopeOfWork: string;
  theme: PPTXTheme;
  slides: SlideItem[];
  createdAt: number;
}

interface DesignModuleProps {
  leads: PipelineLead[];
}

const STORAGE_KEY = "chirpeel.design.presentations.v1";

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

export default function DesignModule({ leads = [] }: DesignModuleProps) {
  // Master presentations state (stored in localStorage)
  const [presentations, setPresentations] = useState<DesignPresentation[]>([]);
  
  // Navigation / View states
  const [activePresentationId, setActivePresentationId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create Presentation Form states
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newTheme, setNewTheme] = useState<PPTXTheme>("minimalist");

  // Share Dialog states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePptUrl, setSharePptUrl] = useState("");
  const [shareClientName, setShareClientName] = useState("");
  const [shareProjectName, setShareProjectName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  
  // Loading states
  const [companyName, setCompanyName] = useState("Chirpeel Studio");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Load presentations on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresentations(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load presentations from storage:", err);
    }
  }, []);

  // Save presentations helper
  const savePresentations = (next: DesignPresentation[]) => {
    setPresentations(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to save presentations to storage:", err);
    }
  };

  // Load Branding Settings
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("company_settings" as never).select("*").limit(1).maybeSingle();
        if (data) {
          const settings = data as any;
          if (settings.company_name) setCompanyName(settings.company_name);
          if (settings.logo_url) {
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

  // Active Presentation helper
  const activePresentation = presentations.find(p => p.id === activePresentationId);

  // Handle slide/metadata updates for active presentation (auto-save)
  const updateActivePresentation = (updater: (prev: DesignPresentation) => DesignPresentation) => {
    if (!activePresentationId) return;
    const next = presentations.map(p => {
      if (p.id === activePresentationId) {
        return updater(p);
      }
      return p;
    });
    savePresentations(next);
  };

  // Create presentation flow
  const handleCreatePresentation = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) {
      toast({ title: "Lead required", description: "Please select a customer lead first.", variant: "destructive" });
      return;
    }

    const newPres: DesignPresentation = {
      id: crypto.randomUUID(),
      leadId: lead.id,
      clientName: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      projectName: newProjectName || "Interior Design Proposal",
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      title: "DESIGN PRESENTATION",
      scopeOfWork: DEFAULT_SCOPE,
      theme: newTheme,
      slides: [],
      createdAt: Date.now()
    };

    savePresentations([newPres, ...presentations]);
    setActivePresentationId(newPres.id);
    setCreateModalOpen(false);
    
    // Reset Form
    setSelectedLeadId("");
    setNewProjectName("");
    setNewTheme("minimalist");

    toast({ title: "Design presentation created" });
  };

  // Delete Presentation
  const handleDeletePresentation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this design presentation?")) {
      const next = presentations.filter(p => p.id !== id);
      savePresentations(next);
      if (activePresentationId === id) setActivePresentationId(null);
      toast({ title: "Presentation deleted" });
    }
  };

  // Handle Drag/Drop File Uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activePresentationId) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateActivePresentation(prev => ({
          ...prev,
          slides: [
            ...prev.slides,
            {
              id: crypto.randomUUID(),
              image: base64,
              roomName: "",
              description: "",
            }
          ]
        }));
      };
      reader.readAsDataURL(file);
    });
    
    toast({ title: "Upload Successful", description: `${files.length} images added to presentation.` });
    e.target.value = "";
  };

  // Reordering & Deleting Slides
  const moveSlide = (index: number, direction: "up" | "down") => {
    if (!activePresentation) return;
    const slidesCopy = [...activePresentation.slides];
    
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === slidesCopy.length - 1) return;
    
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = slidesCopy[index];
    slidesCopy[index] = slidesCopy[targetIndex];
    slidesCopy[targetIndex] = temp;

    updateActivePresentation(prev => ({ ...prev, slides: slidesCopy }));
  };

  const deleteSlide = (slideId: string) => {
    updateActivePresentation(prev => ({
      ...prev,
      slides: prev.slides.filter(s => s.id !== slideId)
    }));
    toast({ title: "Slide Removed" });
  };

  const updateSlideData = (slideId: string, key: keyof SlideItem, value: string) => {
    updateActivePresentation(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id === slideId ? { ...s, [key]: value } : s)
    }));
  };

  // Compile PPTX Presentation Options
  const getPptOptions = (p: DesignPresentation) => ({
    title: p.title,
    clientName: p.clientName || "Valued Client",
    projectName: p.projectName || "Interior Design Project",
    date: p.date,
    scopeOfWork: p.scopeOfWork,
    theme: p.theme,
    logoUrl,
    companyName,
    slides: p.slides.map(({ image, roomName, description }) => ({
      image,
      roomName: roomName || "Interior Design Layout",
      description: description || "Proposed materials, lighting, and finishes layout."
    }))
  });

  // Download PPTX
  const handleDownload = async (p: DesignPresentation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (p.slides.length === 0) {
      toast({ title: "No Renders Uploaded", description: "Please upload at least one render image.", variant: "destructive" });
      return;
    }
    setGeneratingId(p.id);
    try {
      const blob = await generatePresentation(getPptOptions(p));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Design_Presentation_${p.clientName.replace(/\s+/g, "_")}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Presentation Downloaded", description: "PPTX file saved successfully." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to generate PPTX", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingId(null);
    }
  };

  // Upload to Supabase and Open Share Modal
  const handleOpenShare = async (p: DesignPresentation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (p.slides.length === 0) {
      toast({ title: "No Renders Uploaded", description: "Please upload at least one render image.", variant: "destructive" });
      return;
    }
    setSharingId(p.id);
    try {
      const blob = await generatePresentation(getPptOptions(p));
      
      const cleanClient = p.clientName.replace(/[^a-zA-Z0-9]/g, "_");
      const cleanProject = p.projectName.replace(/[^a-zA-Z0-9]/g, "_");
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
      
      setSharePptUrl(data.publicUrl);
      setShareClientName(p.clientName);
      setShareProjectName(p.projectName);
      setCustomerPhone(p.phone || "");
      setCustomerEmail(p.email || "");
      setShareModalOpen(true);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to upload presentation", description: err.message, variant: "destructive" });
    } finally {
      setSharingId(null);
    }
  };

  // Share Actions
  const handleWhatsAppShare = () => {
    if (!customerPhone) {
      toast({ title: "Phone number required", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, "");
    const msg = `Hi ${shareClientName},\n\nHere is the interior design presentation proposal prepared by ${companyName} for your project ${shareProjectName || ""}.\n\nYou can view and download the PowerPoint presentation here:\n${sharePptUrl}\n\nLooking forward to your feedback!`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handleEmailShare = () => {
    if (!customerEmail) {
      toast({ title: "Email required", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    const subject = `Design Presentation Proposal - ${shareProjectName || "Interior Project"}`;
    const body = `Hi ${shareClientName},\n\nPlease find the interior design presentation proposal prepared by ${companyName} for your project ${shareProjectName || ""}.\n\nYou can view and download the PowerPoint presentation (.pptx) by clicking the link below:\n\n${sharePptUrl}\n\nWarm regards,\n${companyName}`;
    const mailto = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
  };

  // Filtered Presentations list
  const filteredPresentations = presentations.filter(p => 
    p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* -------------------- 1. LIST VIEW -------------------- */}
      {!activePresentationId && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Paintbrush className="w-6 h-6 text-primary" />
                Designed Customers
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                View already designed presentations or create a new design linked to a customer lead.
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)} className="gap-1.5 self-start sm:self-auto">
              <Plus className="w-4 h-4" /> Create Design
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by client or project..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl border border-border"
            />
          </div>

          {/* Presentations List */}
          {filteredPresentations.length === 0 ? (
            <Card className="border border-border/60 py-16 flex flex-col items-center text-center justify-center bg-card">
              <ImageIcon className="w-14 h-14 text-muted-foreground/35 mb-4" />
              <h3 className="text-base font-bold text-muted-foreground/80">No Design Presentations Found</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-6">
                {searchQuery ? "No presentations match your search query." : "You haven't generated any design proposals yet."}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateModalOpen(true)} variant="secondary" className="gap-1.5">
                  <Plus className="w-4 h-4" /> Start First Design
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPresentations.map((p) => {
                const coverImage = p.slides[0]?.image;
                return (
                  <Card 
                    key={p.id} 
                    onClick={() => setActivePresentationId(p.id)}
                    className="border border-border hover:shadow-md transition-all cursor-pointer bg-card overflow-hidden group flex flex-col justify-between h-fit min-h-[340px]"
                  >
                    {/* Thumbnail Cover */}
                    <div className="h-40 bg-muted relative border-b border-border shrink-0 flex items-center justify-center overflow-hidden">
                      {coverImage ? (
                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center text-primary/55">
                          <ImageIcon className="w-10 h-10 mb-2 stroke-1" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">No Renders Uploaded</span>
                        </div>
                      )}
                      {/* Theme badge */}
                      <span className="absolute top-3 left-3 bg-background/90 text-foreground border border-border/65 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                        {p.theme} Theme
                      </span>
                      {/* Slide count */}
                      <span className="absolute bottom-3 right-3 bg-black/75 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {p.slides.length} {p.slides.length === 1 ? "Slide" : "Slides"}
                      </span>
                    </div>

                    {/* Card Body */}
                    <CardContent className="p-4 flex-1 space-y-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-medium truncate">{p.clientName}</span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors mt-1">
                          {p.projectName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Created: {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </CardContent>

                    {/* Card Footer */}
                    <CardFooter className="p-3 bg-muted/20 border-t border-border flex items-center justify-between shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeletePresentation(p.id, e)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Presentation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={generatingId === p.id}
                          onClick={(e) => handleDownload(p, e)}
                          className="h-8 w-8"
                          title="Download PPTX File"
                        >
                          {generatingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={sharingId === p.id}
                          onClick={(e) => handleOpenShare(p, e)}
                          className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/5"
                          title="Send/Share Proposal"
                        >
                          {sharingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" className="h-8 text-xs font-semibold px-3.5">
                          Edit
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* -------------------- 2. EDITOR VIEW -------------------- */}
      {activePresentationId && activePresentation && (
        <div className="space-y-6">
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActivePresentationId(null)}
                className="h-9 w-9 rounded-lg hover:bg-muted/80"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Edit Presentation
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Designing proposal for **{activePresentation.clientName}** · {activePresentation.projectName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button 
                variant="outline" 
                onClick={() => handleDownload(activePresentation)} 
                disabled={generatingId === activePresentation.id || sharingId === activePresentation.id || activePresentation.slides.length === 0} 
                className="w-full sm:w-auto text-xs"
              >
                {generatingId === activePresentation.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download PPTX
              </Button>
              <Button 
                onClick={() => handleOpenShare(activePresentation)} 
                disabled={generatingId === activePresentation.id || sharingId === activePresentation.id || activePresentation.slides.length === 0} 
                className="w-full sm:w-auto text-xs font-bold"
              >
                {sharingId === activePresentation.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send to Client
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Config inputs */}
            <div className="lg:col-span-1 space-y-6">
              {/* Theme selection */}
              <Card className="border border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Select Template Theme</CardTitle>
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
                      onClick={() => updateActivePresentation(p => ({ ...p, theme: t.id as PPTXTheme }))}
                      className={`relative p-3 rounded-xl border text-left flex flex-col justify-between h-28 hover:scale-[1.02] active:scale-[0.98] transition-all ${
                        activePresentation.theme === t.id 
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
                        {activePresentation.theme === t.id && (
                          <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Cover Slide configuration */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Cover Slide Configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-client">Client Name</Label>
                    <Input 
                      id="edit-client" 
                      value={activePresentation.clientName} 
                      onChange={(e) => updateActivePresentation(p => ({ ...p, clientName: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-project">Project Name</Label>
                    <Input 
                      id="edit-project" 
                      value={activePresentation.projectName} 
                      onChange={(e) => updateActivePresentation(p => ({ ...p, projectName: e.target.value }))} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-title">Front Title</Label>
                      <Input 
                        id="edit-title" 
                        value={activePresentation.title} 
                        onChange={(e) => updateActivePresentation(p => ({ ...p, title: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-date">Date</Label>
                      <Input 
                        id="edit-date" 
                        value={activePresentation.date} 
                        onChange={(e) => updateActivePresentation(p => ({ ...p, date: e.target.value }))} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scope of Work */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Scope of Work Slide</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-scope">Scope items</Label>
                    <Textarea 
                      id="edit-scope" 
                      rows={6} 
                      value={activePresentation.scopeOfWork} 
                      onChange={(e) => updateActivePresentation(p => ({ ...p, scopeOfWork: e.target.value }))}
                      className="text-xs resize-y"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upload & Slides editor */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Uploader */}
              <Card className="border border-border/85 shadow-sm border-dashed bg-muted/10">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Upload Renders</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-4">
                    Drag and drop or browse files. Add PNG/JPG design renders to this client presentation.
                  </p>
                  <input
                    type="file"
                    id="render-edit-upload"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button type="button" onClick={() => document.getElementById("render-edit-upload")?.click()} variant="secondary" className="px-5">
                    Choose Renders
                  </Button>
                </CardContent>
              </Card>

              {/* Slides Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Presentation Slides ({activePresentation.slides.length})</h3>
                  {activePresentation.slides.length > 1 && <span className="text-[11px] text-muted-foreground">Adjust slide sequence using arrows</span>}
                </div>

                {activePresentation.slides.length === 0 ? (
                  <Card className="border border-border/50 py-12 flex flex-col items-center text-center justify-center bg-card">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/45 mb-3" />
                    <span className="text-sm font-semibold text-muted-foreground/80">No slides created yet.</span>
                    <span className="text-xs text-muted-foreground max-w-xs mt-1">Upload render files above to automatically generate slide decks.</span>
                  </Card>
                ) : (
                  activePresentation.slides.map((s, index) => (
                    <Card key={s.id} className="border border-border shadow-sm bg-card overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                        {/* Preview */}
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
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Slide Details */}
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Room Name</Label>
                              <div className="relative">
                                <Input
                                  type="text"
                                  placeholder="e.g. Modular Kitchen"
                                  value={s.roomName}
                                  onChange={(e) => updateSlideData(s.id, "roomName", e.target.value)}
                                  className="text-xs h-8 pr-10"
                                />
                                <select
                                  onChange={(e) => {
                                    updateSlideData(s.id, "roomName", e.target.value);
                                    e.target.value = "";
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
                                disabled={index === activePresentation.slides.length - 1}
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
                            <Label className="text-xs">Room details / Material specifications</Label>
                            <Textarea
                              placeholder="e.g. Modular undercounter drawers, premium acrylic finishes, and integrated warm lighting profiles."
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
        </div>
      )}

      {/* -------------------- 3. CREATE PRESENTATION DIALOG -------------------- */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              New Design Presentation
            </DialogTitle>
            <DialogDescription>
              Select an existing customer lead to generate a design proposal presentation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePresentation} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-select-lead">Select Customer Lead</Label>
              <div className="relative">
                <select
                  id="create-select-lead"
                  value={selectedLeadId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedLeadId(val);
                    const lead = leads.find(l => l.id === val);
                    if (lead) {
                      setNewProjectName(`${lead.project_type || "Interior"} Design Proposal`);
                    }
                  }}
                  required
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="">Select a Customer...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.phone ? `(${l.phone})` : ""} {l.project_type ? `· ${l.project_type}` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <span className="text-[11px]">▼</span>
                </div>
              </div>
              {leads.length === 0 && (
                <p className="text-[10px] text-destructive">
                  No active customer leads found. Please add a lead first.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-project-name">Project Name</Label>
              <Input
                id="create-project-name"
                placeholder="e.g. 3BHK Residence Layout"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-select-theme">Default Theme</Label>
              <div className="relative">
                <select
                  id="create-select-theme"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value as PPTXTheme)}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="minimalist">Modern Minimalist</option>
                  <option value="dark">Classic Dark</option>
                  <option value="chic">Luxury Chic</option>
                  <option value="creative">Vibrant Creative</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <span className="text-[11px]">▼</span>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/50 pt-3">
              <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={leads.length === 0} className="gap-1.5 font-semibold">
                <Plus className="w-4 h-4" /> Start Designing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------- 4. SHARE PRESENTATION DIALOG -------------------- */}
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
                <Input value={sharePptUrl} readOnly className="text-xs bg-muted" />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(sharePptUrl);
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
                  <Label htmlFor="share-phone" className="text-xs">Client Phone (with country code)</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="share-phone" placeholder="e.g. +919900001234" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="pl-10 text-xs" />
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
                  <Label htmlFor="share-email" className="text-xs">Client Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="share-email" placeholder="e.g. client@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="pl-10 text-xs" />
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
