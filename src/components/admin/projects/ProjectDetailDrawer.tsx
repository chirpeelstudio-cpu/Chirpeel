import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pencil, Calendar, MapPin, User, IndianRupee, Trash2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PROJECT_STATUSES, type Project } from "./types";
import { ProjectMilestones } from "./ProjectMilestones";
import { ProjectMaterials } from "./ProjectMaterials";
import { ProjectTasks } from "./ProjectTasks";
import { ProjectVendorPOs } from "./ProjectVendorPOs";
import { ProjectBOQ } from "./ProjectBOQ";

interface Props {
  project: Project | null;
  spent: number;
  onClose: () => void;
  onEdit: (p: Project) => void;
  onRefresh: () => void;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export function ProjectDetailDrawer({ project, spent, onClose, onEdit, onRefresh }: Props) {
  if (!project) return null;
  return (
    <Sheet open={!!project} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0">
        <Inner project={project} spent={spent} onEdit={onEdit} onClose={onClose} onRefresh={onRefresh} />
      </SheetContent>
    </Sheet>
  );
}

function Inner({ project, spent, onEdit, onClose, onRefresh }: { project: Project; spent: number; onEdit: (p: Project) => void; onClose: () => void; onRefresh: () => void; }) {
  const navigate = useNavigate();
  const st = PROJECT_STATUSES.find(s => s.key === project.status);
  const budget = Number(project.budget ?? 0);
  const overBudget = budget > 0 && spent > budget;
  const daysLeft = project.target_end_date
    ? Math.ceil((new Date(project.target_end_date).getTime() - Date.now()) / 86_400_000)
    : null;

  const handleDelete = async () => {
    if (!confirm(`Move "${project.name}" to trash?`)) return;
    const { error } = await supabase.from("projects" as any).update({ deleted_at: new Date().toISOString() }).eq("id", project.id);
    if (error) toast.error(error.message);
    else { toast.success("Project removed"); onClose(); onRefresh(); }
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-3 border-b">
        <SheetTitle className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-lg truncate">{project.name}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="outline" className={st?.pillCls}>{st?.label ?? project.status}</Badge>
              {project.project_type && <Badge variant="outline">{project.project_type}</Badge>}
              {daysLeft !== null && (
                <Badge variant="outline" className={daysLeft < 0 ? "border-red-300 text-red-700 bg-red-50" : ""}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={() => onEdit(project)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
            <Button size="sm" variant="outline" onClick={handleDelete}><Trash2 className="w-3 h-3 text-red-600" /></Button>
          </div>
        </SheetTitle>
      </SheetHeader>

      <div className="px-6 py-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full overflow-x-auto justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="vendors">Vendors & POs</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="boq">BOQ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            <Card className="p-3 grid grid-cols-2 gap-3 text-sm">
              {project.site_address && (
                <div className="col-span-2 flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5" /><span>{project.site_address}</span>
                </div>
              )}
              {project.project_manager && (
                <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" /> {project.project_manager}</div>
              )}
              {project.start_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" /> Start: {new Date(project.start_date).toLocaleDateString("en-IN")}
                </div>
              )}
              {project.target_end_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" /> Target: {new Date(project.target_end_date).toLocaleDateString("en-IN")}
                </div>
              )}
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Number(project.progress_pct ?? 0).toFixed(0)}%</span>
              </div>
              <Progress value={Number(project.progress_pct ?? 0)} />
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Budget vs Spent</span>
                <span className={`font-semibold ${overBudget ? "text-red-600" : ""}`}>{formatINR(spent)} / {formatINR(budget)}</span>
              </div>
              <Progress value={budget > 0 ? Math.min(100, (spent / budget) * 100) : 0} className={overBudget ? "[&>div]:bg-red-500" : ""} />
              {overBudget && <p className="text-[11px] text-red-600 mt-1">Over budget by {formatINR(spent - budget)}</p>}
            </Card>

            <Card className="p-3">
              <p className="text-[11.5px] font-semibold text-foreground flex items-center gap-1 mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    onClose();
                    navigate(`/studio/finance?tab=payments&action=record&leadId=${project.lead_id}`);
                  }}
                  disabled={!project.lead_id}
                >
                  💰 Record Payment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    onClose();
                    navigate(`/studio/finance?tab=invoices&action=generate&leadId=${project.lead_id}`);
                  }}
                  disabled={!project.lead_id}
                >
                  📄 Generate Invoice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    onClose();
                    navigate(`/studio/finance?tab=expenses&action=log&quotationId=${project.quotation_id}`);
                  }}
                  disabled={!project.quotation_id}
                >
                  💵 Log Expense
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    onClose();
                    navigate("/studio/automations");
                  }}
                >
                  ⚙️ Manage Automations
                </Button>
              </div>
            </Card>

            {project.notes && (
              <Card className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="milestones"><ProjectMilestones projectId={project.id} /></TabsContent>
          <TabsContent value="tasks"><ProjectTasks projectId={project.id} /></TabsContent>
          <TabsContent value="vendors"><ProjectVendorPOs projectId={project.id} /></TabsContent>
          <TabsContent value="materials"><ProjectMaterials projectId={project.id} /></TabsContent>
          <TabsContent value="boq"><ProjectBOQ project={project} /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
