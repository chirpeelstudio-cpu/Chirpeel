import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STAGES = [
  { value: "factory", label: "🏭 Factory" },
  { value: "site", label: "📍 Site" },
  { value: "installation", label: "🔧 Installation" },
  { value: "handover", label: "🎉 Handover" },
];

interface Photo { id: string; stage: string; photo_url: string; caption: string | null; created_at: string; }

export default function StagePhotosUploader({ leadId }: { leadId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stage, setStage] = useState("site");
  const [uploading, setUploading] = useState(false);
  const [creator, setCreator] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("project_stage_photos" as any).select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    setPhotos((data ?? []) as unknown as Photo[]);
  };

  useEffect(() => {
    load();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
        setCreator(data?.full_name || data?.email || null);
      }
    })();
    /* eslint-disable-next-line */
  }, [leadId]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const path = `stages/${leadId}/${stage}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("project-files").upload(path, file);
      if (upErr) { toast.error(upErr.message); continue; }
      const { data: { publicUrl } } = supabase.storage.from("project-files").getPublicUrl(path);
      await supabase.from("project_stage_photos" as any).insert({
        lead_id: leadId, stage, photo_url: publicUrl, uploaded_by: creator,
      } as any);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Photos uploaded");
    load();
  };

  const removePhoto = async (id: string) => {
    const { error } = await supabase.from("project_stage_photos" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Camera className="w-4 h-4 text-primary" /> Project Photos
      </div>

      <div className="flex gap-2">
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="text-xs text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(p => (
            <div key={p.id} className="relative group rounded overflow-hidden border">
              <img src={p.photo_url} alt={p.stage} className="w-full h-24 object-cover" />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-background/80 text-[10px] font-medium capitalize">{p.stage}</div>
              <button onClick={() => removePhoto(p.id)}
                className="absolute top-1 right-1 p-1 rounded bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
