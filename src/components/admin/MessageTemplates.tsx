import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Eye, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Template {
  id: string;
  key: string;
  title: string;
  body: string;
  placeholders: string[];
}

const SAMPLE: Record<string, string> = {
  customer_name: "Mohanraj J",
  company_name: "Chirpeel Interiors",
  quotation_number: "HC-Q-1002",
  pdf_url: "https://tinyurl.com/hc-q-1002",
  total_amount: "INR 4,85,000",
  visit_date: "22 Apr 2026",
  visit_time: "11:00 AM",
  designer_name: "Arun Kumar",
  site_address: "12, Nehru St, Tiruppur",
  amount: "48,500",
  payment_url: "https://tinyurl.com/hc-pay-1002",
  project_name: "3BHK Modular Interiors",
  support_phone: "+91 90030 47474",
  review_url: "https://g.page/r/chirpeel/review",
};

const render = (body: string) =>
  body.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE[k] ?? `{{${k}}}`);

export default function MessageTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeKey, setActiveKey] = useState<string>("");

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("message_templates" as any)
      .select("*")
      .order("title");
    if (error) {
      toast({ title: "Failed to load templates", description: error.message, variant: "destructive" });
    } else {
      const list = (data ?? []) as unknown as Template[];
      setTemplates(list);
      setDrafts(Object.fromEntries(list.map((t) => [t.key, t.body])));
      if (list[0] && !activeKey) setActiveKey(list[0].key);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const active = useMemo(() => templates.find((t) => t.key === activeKey), [templates, activeKey]);

  const handleSave = async (tpl: Template) => {
    setSaving(tpl.key);
    const { error } = await supabase
      .from("message_templates" as any)
      .update({ body: drafts[tpl.key] ?? tpl.body })
      .eq("id", tpl.id);
    setSaving(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template saved", description: tpl.title });
      fetchTemplates();
    }
  };

  const insertPlaceholder = (key: string, ph: string) => {
    setDrafts((d) => ({ ...d, [key]: (d[key] ?? "") + `{{${ph}}}` }));
  };

  if (loading) {
    return <Card className="p-12 text-center text-sm text-muted-foreground">Loading templates…</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <MessageSquare className="w-5 h-5 mt-0.5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Message Templates</h2>
          <p className="text-sm text-muted-foreground">
            Edit customer-facing WhatsApp messages. Use <code className="px-1 py-0.5 bg-muted rounded text-xs">{`{{placeholder}}`}</code> for dynamic values.
          </p>
        </div>
      </div>

      <Tabs value={activeKey} onValueChange={setActiveKey}>
        <TabsList className="flex flex-wrap h-auto justify-start gap-1">
          {templates.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.title}</TabsTrigger>
          ))}
        </TabsList>

        {templates.map((t) => {
          const draft = drafts[t.key] ?? t.body;
          const dirty = draft !== t.body;
          return (
            <TabsContent key={t.key} value={t.key} className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t.title}</CardTitle>
                      <Button size="sm" disabled={!dirty || saving === t.key} onClick={() => handleSave(t)}>
                        <Save className="w-4 h-4 mr-1.5" />
                        {saving === t.key ? "Saving…" : "Save"}
                      </Button>
                    </div>
                    <CardDescription className="text-xs">Key: {t.key}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [t.key]: e.target.value }))}
                      className="min-h-[320px] font-mono text-xs"
                    />
                    {t.placeholders?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Click a placeholder to insert:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {t.placeholders.map((ph) => (
                            <Badge
                              key={ph}
                              variant="outline"
                              className="cursor-pointer hover:bg-accent text-xs font-mono"
                              onClick={() => insertPlaceholder(t.key, ph)}
                            >{`{{${ph}}}`}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-1.5">
                      <Eye className="w-4 h-4" /> Preview
                    </CardTitle>
                    <CardDescription className="text-xs">With sample data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-muted/50 p-4 rounded border border-border min-h-[320px] font-sans">
                      {render(draft)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
