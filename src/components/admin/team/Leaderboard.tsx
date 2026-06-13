import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp, Clock, IndianRupee } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Range = "7d" | "30d" | "quarter" | "all";

interface ProfileLite { id: string; full_name: string | null; email: string | null; }
interface LeadLite { id: string; assigned_to: string | null; status: string | null; stage: string | null; created_at: string; }
interface FollowUpLite { lead_id: string; created_at: string; }
interface PaymentLite { amount: number; lead_id: string | null; paid_on: string; }

function rangeStart(r: Range): Date | null {
  const now = new Date();
  if (r === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (r === "30d") return new Date(now.getTime() - 30 * 86400000);
  if (r === "quarter") return new Date(now.getTime() - 90 * 86400000);
  return null;
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function Leaderboard() {
  const [range, setRange] = useState<Range>("30d");
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpLite[]>([]);
  const [payments, setPayments] = useState<PaymentLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = rangeStart(range);
      const startIso = start?.toISOString();

      const [{ data: p }, leadsRes, fuRes, payRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").eq("active", true),
        startIso
          ? supabase.from("leads").select("id, assigned_to, status, stage, created_at").is("deleted_at", null).gte("created_at", startIso)
          : supabase.from("leads").select("id, assigned_to, status, stage, created_at").is("deleted_at", null),
        supabase.from("lead_follow_ups").select("lead_id, created_at"),
        startIso
          ? supabase.from("payments").select("amount, lead_id, paid_on").is("deleted_at", null).gte("paid_on", startIso.slice(0, 10))
          : supabase.from("payments").select("amount, lead_id, paid_on").is("deleted_at", null),
      ]);

      setProfiles((p ?? []) as ProfileLite[]);
      setLeads((leadsRes.data ?? []) as LeadLite[]);
      setFollowUps((fuRes.data ?? []) as FollowUpLite[]);
      setPayments((payRes.data ?? []) as PaymentLite[]);
      setLoading(false);
    })();
  }, [range]);

  const rows = useMemo(() => {
    // Index follow-ups by lead -> earliest
    const firstFu: Record<string, number> = {};
    followUps.forEach(f => {
      const t = new Date(f.created_at).getTime();
      if (!(f.lead_id in firstFu) || t < firstFu[f.lead_id]) firstFu[f.lead_id] = t;
    });

    const leadIdToOwner: Record<string, string | null> = {};
    leads.forEach(l => { leadIdToOwner[l.id] = l.assigned_to; });

    return profiles.map(p => {
      const name = p.full_name || p.email || "—";
      const mine = leads.filter(l => l.assigned_to === name);
      const handled = mine.length;
      const won = mine.filter(l => l.stage === "won" || l.status === "converted").length;
      const conversion = handled ? (won / handled) * 100 : 0;

      const myWonIds = new Set(mine.filter(l => l.stage === "won" || l.status === "converted").map(l => l.id));
      const revenue = payments
        .filter(pay => pay.lead_id && myWonIds.has(pay.lead_id))
        .reduce((s, x) => s + Number(x.amount || 0), 0);

      // Avg response = (firstFollowUp - leadCreated) for leads that have a follow-up
      const responses: number[] = [];
      mine.forEach(l => {
        const f = firstFu[l.id];
        if (f) {
          const diff = (f - new Date(l.created_at).getTime()) / 3600000; // hours
          if (diff >= 0) responses.push(diff);
        }
      });
      const avgResponseH = responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : null;

      return { name, handled, won, conversion, revenue, avgResponseH };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [profiles, leads, followUps, payments]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Team Leaderboard</h3>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="quarter">Last quarter</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right"><div className="flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3" />Conv %</div></TableHead>
                <TableHead className="text-right"><div className="flex items-center justify-end gap-1"><IndianRupee className="w-3 h-3" />Revenue</div></TableHead>
                <TableHead className="text-right"><div className="flex items-center justify-end gap-1"><Clock className="w-3 h-3" />Avg response</div></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No data for this range.</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">
                    {i === 0 && r.revenue > 0 && <span className="mr-1">🥇</span>}
                    {i === 1 && r.revenue > 0 && <span className="mr-1">🥈</span>}
                    {i === 2 && r.revenue > 0 && <span className="mr-1">🥉</span>}
                    {r.name}
                  </TableCell>
                  <TableCell className="text-right">{r.handled}</TableCell>
                  <TableCell className="text-right">{r.won}</TableCell>
                  <TableCell className="text-right">{r.conversion.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-semibold">{inr(r.revenue)}</TableCell>
                  <TableCell className="text-right">
                    {r.avgResponseH == null ? "—" : r.avgResponseH < 1 ? `${Math.round(r.avgResponseH * 60)} min` : `${r.avgResponseH.toFixed(1)} h`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
