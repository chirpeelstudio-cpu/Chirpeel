import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR } from "./types";
import {
  diffHeaders,
  diffRooms,
  HEADER_FIELD_LABELS,
  ROOM_FIELD_LABELS,
  ITEM_FIELD_LABELS,
  type SnapshotPayload,
} from "./version-diff";
import type { QuotationVersion } from "./workflow-config";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  versionA: QuotationVersion | null;
  versionB: QuotationVersion | null;
}

const fmtVal = (v: any) => {
  if (v == null || v === "") return <span className="text-muted-foreground">—</span>;
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
};

export const VersionCompareDialog = ({ open, onOpenChange, versionA, versionB }: Props) => {
  if (!versionA || !versionB) return null;
  const a = versionA.snapshot as SnapshotPayload;
  const b = versionB.snapshot as SnapshotPayload;
  const headerDiffs = diffHeaders(a, b);
  const roomDiffs = diffRooms(a, b);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Compare v{versionA.version_number} ↔ v{versionB.version_number}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold mb-2">Totals</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded p-2">
                  <div className="text-xs text-muted-foreground">v{versionA.version_number}</div>
                  <div className="font-mono">{formatINR(versionA.total_amount)}</div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-xs text-muted-foreground">v{versionB.version_number}</div>
                  <div className="font-mono">{formatINR(versionB.total_amount)}</div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Header changes</h3>
              {headerDiffs.length === 0 ? (
                <p className="text-muted-foreground text-xs">No header changes.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-1">Field</th>
                      <th className="py-1">v{versionA.version_number}</th>
                      <th className="py-1">v{versionB.version_number}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headerDiffs.map((d) => (
                      <tr key={d.field} className="border-b">
                        <td className="py-1 font-medium">{HEADER_FIELD_LABELS[d.field] ?? d.field}</td>
                        <td className="py-1">{fmtVal(d.a)}</td>
                        <td className="py-1">{fmtVal(d.b)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h3 className="font-semibold mb-2">Rooms</h3>
              {roomDiffs.length === 0 ? (
                <p className="text-muted-foreground text-xs">No rooms.</p>
              ) : (
                <div className="space-y-3">
                  {roomDiffs.map((rd) => (
                    <div key={rd.name + rd.status} className="border rounded p-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            rd.status === "added"
                              ? "border-emerald-500 text-emerald-600"
                              : rd.status === "removed"
                              ? "border-red-500 text-red-600"
                              : rd.status === "changed"
                              ? "border-amber-500 text-amber-600"
                              : ""
                          }
                        >
                          {rd.status}
                        </Badge>
                        <span className="font-medium">{rd.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatINR(rd.totalA)} → {formatINR(rd.totalB)}
                        </span>
                      </div>
                      {rd.fieldDiffs.length > 0 && (
                        <table className="w-full text-xs mt-2">
                          <tbody>
                            {rd.fieldDiffs.map((d) => (
                              <tr key={d.field} className="border-b last:border-0">
                                <td className="py-1 w-1/3">{ROOM_FIELD_LABELS[d.field] ?? d.field}</td>
                                <td className="py-1">{fmtVal(d.a)}</td>
                                <td className="py-1 text-muted-foreground">→</td>
                                <td className="py-1">{fmtVal(d.b)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {rd.itemDiffs.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {rd.itemDiffs.map((id, i) => (
                            <div key={i} className="text-xs border-l-2 pl-2 ml-1">
                              <span className="font-medium">{id.status}</span>: {id.name}
                              {id.fieldDiffs.length > 0 && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({id.fieldDiffs.map((f) => ITEM_FIELD_LABELS[f.field] ?? f.field).join(", ")})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
