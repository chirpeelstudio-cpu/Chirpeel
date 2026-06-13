import { Check, ArrowRight, Calendar, Banknote, FileText } from "lucide-react";
import { useScriptedClock, Cursor, cursorPosition, pulseAt, lerp, ease } from "./AnimatedCursor";

/* ============================================================
 *  LEADS PIPELINE — cursor drags "Priya R." card from
 *  Quotation column into a "Won" celebration; pile gets a 🔥 hot tag.
 *  Loop: 9s
 * ========================================================== */
export function LeadsMockup() {
  const DURATION = 9000;
  const { ref, t, reduced } = useScriptedClock(DURATION);

  // Cursor path in % of mockup. Pick from the "New" col → drop to "Quotation".
  // Columns are roughly centered at x ≈ 22 / 52 / 82 (3 cols).
  const path = [
    { x: 95, y: 95, from: 0.0, to: 0.05 },              // start bottom-right
    { x: 22, y: 55, from: 0.05, to: 0.22 },             // glide to "Karthik R" card in New
    { x: 22, y: 55, from: 0.22, to: 0.28, click: true },// grab
    { x: 82, y: 50, from: 0.28, to: 0.55, click: true },// drag across to Quotation col
    { x: 82, y: 50, from: 0.55, to: 0.62 },             // drop
    { x: 82, y: 50, from: 0.62, to: 0.85 },             // hover to admire
    { x: 95, y: 95, from: 0.85, to: 1.0 },              // exit
  ];
  const c = cursorPosition(path, t);
  const dragging = t >= 0.22 && t <= 0.62;
  const dropped = t >= 0.6;
  const dropPulse = pulseAt(t, 0.6, 0.05);
  const hotPop = t >= 0.65 ? Math.min(1, (t - 0.65) / 0.08) : 0;

  // Reactive counts
  const newCount = dropped ? 11 : 12;
  const quoteCount = dropped ? 6 : 5;

  const cols = [
    {
      key: "new",
      name: "New",
      count: newCount,
      color: "bg-sky-500",
      deals: [
        { id: "k", name: "Karthik R · Pollachi villa", value: "₹18L", hot: true, animated: true },
        { id: "m", name: "Meera S. · Bengaluru duplex", value: "₹9L" },
      ],
    },
    {
      key: "site",
      name: "Site visit",
      count: 7,
      color: "bg-amber-500",
      deals: [
        { id: "j", name: "Jai K. · Mumbai showroom", value: "₹26L", hot: true },
        { id: "a", name: "Anjali · Pune 2BHK", value: "₹6L" },
      ],
    },
    {
      key: "quote",
      name: "Quotation",
      count: quoteCount,
      color: "bg-primary",
      deals: [{ id: "p", name: "Priya R. · Modular kitchen", value: "₹4.5L" }],
    },
  ];

  // Karthik card animated transform during drag
  // Original position: col-1, row-1 (top of New). Destination: col-3, slot below Priya.
  // We translate using % of card width.
  const dragT = t < 0.22 ? 0 : t > 0.62 ? 1 : ease((t - 0.22) / (0.62 - 0.22));
  const tx = lerp(0, 100, dragT) * 3.05; // ~ 3 col widths in %
  const ty = lerp(0, 1, dragT) * -2;     // tiny lift
  const lift = dragging ? 1 : dropped ? 0 : 0;

  return (
    <div ref={ref} className="relative rounded-2xl border border-foreground/10 bg-background/95 backdrop-blur shadow-2xl p-4 overflow-hidden">
      <div className="flex items-center gap-2 text-xs font-semibold mb-3">
        <span className="px-2 py-0.5 rounded-md bg-accent text-accent-foreground">Leads pipeline</span>
        <span className="text-muted-foreground">24 active · ₹62L weighted</span>
      </div>
      <div className="grid grid-cols-3 gap-2 relative">
        {cols.map((col, ci) => {
          const isDropTarget = col.key === "quote";
          return (
            <div
              key={col.name}
              className={`bg-muted/40 rounded-xl p-2 transition-colors duration-300 ${
                isDropTarget && dragging ? "bg-primary/10 ring-2 ring-primary/40" : ""
              } ${isDropTarget && dropPulse ? "bg-primary/20" : ""}`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${col.color}`} /> {col.name}
                <span className={`text-[10px] ml-auto tabular-nums ${
                  isDropTarget && dropped ? "text-primary font-bold" : "text-muted-foreground"
                }`}>{col.count}</span>
              </div>
              <div className="space-y-1.5">
                {col.deals.map((d) => {
                  const isAnimated = ci === 0 && d.id === "k";
                  if (isAnimated) {
                    return (
                      <div
                        key={d.id}
                        className="bg-background rounded-lg border border-border p-2 text-[11px] relative z-10"
                        style={{
                          transform: `translate(${tx}%, ${ty}px) scale(${1 + lift * 0.04})`,
                          boxShadow: dragging
                            ? "0 12px 24px rgba(15,27,61,0.18)"
                            : dropPulse
                            ? "0 0 0 4px hsl(var(--primary) / 0.25)"
                            : "none",
                          transition: dragging ? "none" : "transform 250ms ease-out, box-shadow 300ms ease-out",
                        }}
                      >
                        <div className="font-semibold truncate">{d.name}</div>
                        <div className="flex items-center justify-between mt-1 text-muted-foreground">
                          <span>{d.value}</span>
                          <span
                            className="text-[9px] font-bold text-amber-600"
                            style={{
                              opacity: hotPop,
                              transform: `scale(${0.6 + hotPop * 0.4})`,
                              transformOrigin: "right center",
                            }}
                          >
                            🔥 Hot
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={d.id} className="bg-background rounded-lg border border-border p-2 text-[11px]">
                      <div className="font-semibold truncate">{d.name}</div>
                      <div className="flex items-center justify-between mt-1 text-muted-foreground">
                        <span>{d.value}</span>
                        {(d as any).hot && <span className="text-[9px] font-bold text-amber-600">🔥 Hot</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <Cursor x={c.x} y={c.y} click={c.holding || dropPulse} hidden={reduced} />
    </div>
  );
}

/* ============================================================
 *  QUOTATION — cursor walks down each room row (highlight sweep),
 *  total counts up, then clicks "Pay" → "Sent" pill flips to "Paid".
 *  Loop: 8s
 * ========================================================== */
export function QuoteMockup() {
  const DURATION = 8000;
  const { ref, t, reduced } = useScriptedClock(DURATION);

  const rooms = [
    { name: "Modular kitchen", brand: "Hettich · Greenply", total: 342000, label: "₹3,42,000" },
    { name: "Master bedroom wardrobe", brand: "Hafele · Merino", total: 218000, label: "₹2,18,000" },
    { name: "TV unit & storage", brand: "Ebco · Century", total: 112000, label: "₹1,12,000" },
  ];
  // Highlight windows for each row
  const rowWindows = [0.08, 0.22, 0.36];
  const rowHL = (i: number) => {
    const start = rowWindows[i];
    const local = (t - start) / 0.1;
    if (local < 0 || local > 1) return 0;
    return Math.sin(local * Math.PI); // 0→1→0
  };

  // Total counts up between 0.08 and 0.5
  const totalT = Math.max(0, Math.min(1, (t - 0.08) / 0.4));
  const total = Math.round(ease(totalT) * 812160);
  const totalLabel = `₹${total.toLocaleString("en-IN")}`;

  // Pay button click at 0.7
  const payClick = pulseAt(t, 0.7, 0.05);
  const paid = t >= 0.72;

  // Cursor path
  const path = [
    { x: 95, y: 95, from: 0.0, to: 0.04 },
    { x: 30, y: 32, from: 0.04, to: 0.12 },             // row 1
    { x: 30, y: 32, from: 0.12, to: 0.16, click: true },
    { x: 30, y: 48, from: 0.16, to: 0.24 },             // row 2
    { x: 30, y: 48, from: 0.24, to: 0.28, click: true },
    { x: 30, y: 64, from: 0.28, to: 0.36 },             // row 3
    { x: 30, y: 64, from: 0.36, to: 0.40, click: true },
    { x: 78, y: 92, from: 0.40, to: 0.68 },             // pay button
    { x: 78, y: 92, from: 0.68, to: 0.74, click: true },
    { x: 78, y: 92, from: 0.74, to: 0.92 },
    { x: 95, y: 95, from: 0.92, to: 1.0 },
  ];
  const c = cursorPosition(path, t);

  return (
    <div ref={ref} className="relative rounded-2xl border border-foreground/10 bg-background/95 backdrop-blur shadow-2xl p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quotation HC-2026-0042</div>
          <div className="font-display font-bold text-lg">Karthik R · Pollachi villa</div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full transition-colors duration-300 ${
            paid ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"
          }`}
          style={{
            transform: payClick ? "scale(1.12)" : "scale(1)",
            transition: "transform 200ms ease-out, background-color 300ms",
          }}
        >
          {paid ? "Paid" : "Sent"}
        </span>
      </div>
      <div className="rounded-xl border border-border divide-y divide-border text-[12px] overflow-hidden">
        {rooms.map((r, i) => {
          const hl = rowHL(i);
          return (
            <div
              key={r.name}
              className="flex items-center justify-between p-2.5 relative"
              style={{
                background: `hsl(var(--primary) / ${hl * 0.08})`,
              }}
            >
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-[10px] text-muted-foreground">{r.brand}</div>
              </div>
              <div className="font-semibold tabular-nums">{r.label}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Subtotal · GST 18% · Total</span>
        <span className="font-bold tabular-nums">{totalLabel}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button className="flex-1 text-[11px] font-semibold bg-primary text-primary-foreground rounded-lg py-2 inline-flex items-center justify-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Download PDF
        </button>
        <button
          className="flex-1 text-[11px] font-semibold bg-foreground text-background rounded-lg py-2 inline-flex items-center justify-center gap-1.5"
          style={{
            transform: payClick ? "scale(0.96)" : "scale(1)",
            boxShadow: payClick ? "0 0 0 4px hsl(var(--primary) / 0.25)" : "none",
            transition: "transform 180ms ease-out, box-shadow 220ms ease-out",
          }}
        >
          <Banknote className="w-3.5 h-3.5" /> Pay ₹1.6L advance
        </button>
      </div>
      <Cursor x={c.x} y={c.y} click={payClick} hidden={reduced} />
    </div>
  );
}

/* ============================================================
 *  PROJECTS — progress bar fills 0→62%, milestones get checked
 *  in sequence, vendor PO row slides in at the end.
 *  Loop: 9s
 * ========================================================== */
export function ProjectsMockup() {
  const DURATION = 9000;
  const { ref, t, reduced } = useScriptedClock(DURATION);

  // Progress fills between 0.05..0.55
  const progT = Math.max(0, Math.min(1, (t - 0.05) / 0.5));
  const progress = Math.round(ease(progT) * 62);

  // Milestone check windows
  const checkAt = [0.15, 0.32, 0.5, 0.7];
  const checked = checkAt.map((at) => t >= at);
  const flashes = checkAt.map((at) => pulseAt(t, at, 0.05));

  const milestones = [
    { name: "Civil & plumbing", date: "Done · Mar 2" },
    { name: "Carpentry frame-up", date: "Done · Mar 18" },
    { name: "Laminate & finish", date: "On site · Apr 5" },
    { name: "Final handover", date: "Scheduled · Apr 20" },
  ];

  // Vendor PO slides in at 0.78
  const poT = Math.max(0, Math.min(1, (t - 0.78) / 0.12));
  const poEase = ease(poT);

  // Cursor path: tap each milestone in turn, end at "Track"
  const path = [
    { x: 95, y: 95, from: 0.0, to: 0.04 },
    { x: 12, y: 30, from: 0.04, to: 0.14 },             // m1
    { x: 12, y: 30, from: 0.14, to: 0.18, click: true },
    { x: 12, y: 42, from: 0.18, to: 0.30 },             // m2
    { x: 12, y: 42, from: 0.30, to: 0.34, click: true },
    { x: 12, y: 54, from: 0.34, to: 0.48 },             // m3
    { x: 12, y: 54, from: 0.48, to: 0.52, click: true },
    { x: 12, y: 66, from: 0.52, to: 0.68 },             // m4
    { x: 12, y: 66, from: 0.68, to: 0.72, click: true },
    { x: 88, y: 95, from: 0.72, to: 0.92 },             // track
    { x: 95, y: 95, from: 0.92, to: 1.0 },
  ];
  const c = cursorPosition(path, t);
  const trackPulse = pulseAt(t, 0.92, 0.06);

  return (
    <div ref={ref} className="relative rounded-2xl border border-foreground/10 bg-background/95 backdrop-blur shadow-2xl p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project</div>
          <div className="font-display font-bold text-lg">Bengaluru duplex · Meera S.</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Progress</div>
          <div className="font-bold tabular-nums">{progress}%</div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
          style={{ width: `${progress}%`, transition: "none" }}
        />
      </div>
      <div className="space-y-2">
        {milestones.map((m, i) => {
          const isDone = checked[i];
          const flash = flashes[i];
          return (
            <div
              key={m.name}
              className="flex items-center gap-2.5 text-[12px] rounded-md px-1 -mx-1"
              style={{
                background: flash ? "hsl(var(--primary) / 0.08)" : "transparent",
                transition: "background-color 240ms ease-out",
              }}
            >
              <span
                className={`w-4 h-4 rounded-full inline-flex items-center justify-center transition-colors duration-300 ${
                  isDone ? "bg-primary text-primary-foreground" : "border-2 border-border"
                }`}
                style={{
                  transform: flash ? "scale(1.25)" : "scale(1)",
                  transition: "transform 220ms ease-out, background-color 240ms",
                }}
              >
                {isDone && <Check className="w-2.5 h-2.5" />}
              </span>
              <span className={`flex-1 ${isDone ? "" : "font-semibold"}`}>{m.name}</span>
              <span className="text-[10px] text-muted-foreground">{m.date}</span>
            </div>
          );
        })}
      </div>
      <div
        className="mt-4 rounded-xl bg-muted/40 p-3"
        style={{
          opacity: poEase,
          transform: `translateX(${(1 - poEase) * 32}px)`,
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Vendor PO</div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-semibold">Sundaram Wood Works</span>
          <span className="text-muted-foreground">PO-118 · ₹84,200</span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Delivery Mar 28</span>
          <span
            className="text-primary font-semibold inline-flex items-center gap-0.5"
            style={{
              transform: trackPulse ? "translateX(4px)" : "translateX(0)",
              transition: "transform 220ms ease-out",
            }}
          >
            Track <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
      <Cursor x={c.x} y={c.y} click={c.holding || trackPulse} hidden={reduced} />
    </div>
  );
}
