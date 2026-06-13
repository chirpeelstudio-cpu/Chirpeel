import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Plus } from "lucide-react";
import { PROJECT_STATUSES, type Project } from "./types";
import { EmptyState } from "../shared/EmptyState";

interface Props {
  projects: Project[];
  poTotals: Map<string, number>;
  loading: boolean;
  onSelect: (p: Project) => void;
  onRefresh: () => void;
  onAdd?: () => void;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export function ProjectsTable({ projects, poTotals, loading, onSelect, onAdd }: Props) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>PM</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Progress</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Spent</TableHead>
            <TableHead>Target Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
          ) : projects.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="py-0">
              <EmptyState
                asCard={false}
                icon={Briefcase}
                title="No projects yet"
                description="Create your first project to plan milestones, tasks and procurement."
                actionLabel={onAdd ? "New Project" : undefined}
                actionIcon={Plus}
                onAction={onAdd}
              />
            </TableCell></TableRow>
          ) : projects.map(p => {
            const st = PROJECT_STATUSES.find(s => s.key === p.status);
            const spent = poTotals.get(p.id) ?? 0;
            const overBudget = Number(p.budget ?? 0) > 0 && spent > Number(p.budget);
            return (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onSelect(p)}>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  {p.site_address && <div className="text-xs text-muted-foreground truncate max-w-[260px]">{p.site_address}</div>}
                </TableCell>
                <TableCell className="text-sm">{p.project_manager ?? "—"}</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className={st?.pillCls}>{st?.label ?? p.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Progress value={Number(p.progress_pct ?? 0)} className="w-20 h-1.5" />
                    <span className="text-xs w-8 text-right">{Number(p.progress_pct ?? 0).toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatINR(Number(p.budget))}</TableCell>
                <TableCell className={`text-right ${overBudget ? "text-red-600 font-semibold" : ""}`}>{formatINR(spent)}</TableCell>
                <TableCell className="text-sm">{p.target_end_date ? new Date(p.target_end_date).toLocaleDateString("en-IN") : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
