import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Info, Mail, Phone, Globe, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { replayWelcomeTour } from "../onboarding/WelcomeTour";

export default function AboutPanel() {
  const [company, setCompany] = useState<any>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    supabase.from("company_settings").select("company_name, email, phone, whatsapp, website").limit(1).maybeSingle()
      .then(({ data }) => setCompany(data));
  }, []);

  const clearDemo = async () => {
    setClearing(true);
    const { data, error } = await supabase.functions.invoke("clear-demo-data");
    setClearing(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Failed to clear demo data");
      return;
    }
    const counts = (data as { deleted?: Record<string, number> })?.deleted ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    toast.success(total > 0 ? `Removed ${total} demo rows` : "No demo data found");
  };

  return (
    <Card className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Info className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">About</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">App Version</div>
          <div className="font-medium">1.0.0</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Build Date</div>
          <div className="font-medium">{new Date().toLocaleDateString()}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Company</div>
          <div className="font-medium">{company?.company_name ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Website</div>
          <div className="font-medium flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />{company?.website ?? "—"}</div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="text-xs text-muted-foreground mb-2">Support</div>
        <div className="space-y-1 text-sm">
          {company?.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> <a className="hover:underline" href={`mailto:${company.email}`}>{company.email}</a></div>}
          {company?.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> <a className="hover:underline" href={`tel:${company.phone}`}>{company.phone}</a></div>}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="text-xs text-muted-foreground mb-2">Demo data</div>
        <p className="text-sm text-muted-foreground mb-3">
          Removes all sample leads, projects, vendors, invoices, payments, expenses
          and pricing presets seeded when your studio was created. Your real data is untouched.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={clearing}>
              {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Clear demo data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the sample rows tagged
                "[DEMO — safe to delete]". Anything you've created or edited will stay.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearDemo}>Yes, clear it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="border-t border-border pt-4">
        <div className="text-xs text-muted-foreground mb-2">Onboarding</div>
        <p className="text-sm text-muted-foreground mb-3">
          Replay the 6-step welcome tour to revisit how the studio is organised.
        </p>
        <Button variant="outline" size="sm" onClick={replayWelcomeTour}>
          <Sparkles className="w-4 h-4 mr-2" />
          Replay welcome tour
        </Button>
      </div>
    </Card>
  );
}
