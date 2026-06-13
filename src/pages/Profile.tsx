import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera, ArrowLeft, LogOut, LayoutDashboard, Sparkles } from "lucide-react";
import { useProfile, refreshProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import BillingPanel from "@/components/billing/BillingPanel";

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { profile, loading } = useProfile();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [destination, setDestination] = useState<{ label: string; href: string; icon: "dashboard" | "setup" } | null>(null);

  const userId = profile.id;
  const email = profile.email;
  const avatarUrl = profile.avatarUrl;

  useEffect(() => {
    if (!loading && !userId) navigate("/login");
  }, [loading, userId, navigate]);

  useEffect(() => {
    setFullName(profile.fullName);
  }, [profile.fullName]);

  // Figure out where else this user can go (avoid Profile being a dead end).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: roles }, { data: cs }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("company_settings").select("company_name, onboarding_completed_at").limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      const roleSet = new Set((roles ?? []).map((r) => r.role as string));
      const isPrivileged = roleSet.has("admin") || roleSet.has("manager");
      const onboarded = !!(cs?.onboarding_completed_at && cs?.company_name);
      if (!roleSet.size || !onboarded) {
        setDestination({ label: "Continue studio setup", href: "/onboarding", icon: "setup" });
      } else if (isPrivileged) {
        setDestination({ label: "Go to Dashboard", href: "/app", icon: "dashboard" });
      } else {
        setDestination(null);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const initials = (fullName || email || "U")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleAvatarUpload = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `avatars/${userId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("company-assets")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
    const url = data.publicUrl;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", userId);
    setUploading(false);
    if (updErr) {
      toast({ title: "Could not save avatar", description: updErr.message, variant: "destructive" });
      return;
    }
    await refreshProfile({ avatarUrl: url });
    toast({ title: "Avatar updated" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile({ fullName });
    toast({ title: "Profile updated" });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed out" });
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="max-w-xl mx-auto">
          <Skeleton className="h-8 w-20 mb-4" />
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-5">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="border-t border-border pt-6">
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <Helmet><title>Your profile · Chirpeel</title></Helmet>
      <div className="max-w-xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {destination && (
            <Button size="sm" onClick={() => navigate(destination.href)}>
              {destination.icon === "dashboard"
                ? <LayoutDashboard className="w-4 h-4" />
                : <Sparkles className="w-4 h-4" />}
              {destination.label}
            </Button>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Your profile</h1>
            <p className="text-sm text-muted-foreground">Update how others see you in your studio.</p>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="w-20 h-20 border border-border">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName || email} /> : null}
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90 disabled:opacity-50"
                aria-label="Change avatar"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{fullName || "Unnamed"}</p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5"
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled className="mt-1.5 bg-muted/50" />
              <p className="text-xs text-muted-foreground mt-1">Email is managed by your sign-in method.</p>
            </div>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save changes"}
            </Button>
          </form>

          <div className="border-t border-border pt-6">
            <Button type="button" variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
              <LogOut className="w-4 h-4" /> Log out
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <BillingPanel />
        </div>
      </div>
    </div>
  );
}