import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Receipt } from "lucide-react";

interface Row {
  id: string;
  amount_inr: number;
  status: string;
  charged_at: string;
  short_url: string | null;
  razorpay_invoice_id: string | null;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
}

const STATUS_TONE: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  issued: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  failed: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
};

export default function ChargeHistory() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("subscription_invoices")
        .select("id, amount_inr, status, charged_at, short_url, razorpay_invoice_id")
        .order("charged_at", { ascending: false })
        .limit(12);
      if (!alive) return;
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="w-4 h-4" /> Charge history
        </CardTitle>
        <CardDescription>Last 12 subscription charges.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
              <div>
                <p className="font-medium">{formatDate(r.charged_at)}</p>
                <p className="text-xs text-muted-foreground">{r.razorpay_invoice_id ?? "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`capitalize ${STATUS_TONE[r.status] ?? ""}`}>{r.status}</Badge>
                <span className="font-semibold tabular-nums">₹{r.amount_inr.toLocaleString("en-IN")}</span>
                {r.short_url && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={r.short_url} target="_blank" rel="noreferrer" aria-label="View invoice">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}