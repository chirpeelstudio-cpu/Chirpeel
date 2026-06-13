import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserChrome, SidebarMock } from "../components/BrowserChrome";
import { C } from "../theme";

const KPIS = [
  { label: "Invoices",   value: 47,       prefix: "" },
  { label: "Collected",  value: 2840000,  prefix: "₹" },
  { label: "Outstanding", value: 412000,  prefix: "₹" },
];

// Revenue chart points (12 weeks)
const POINTS = [12, 18, 14, 22, 28, 24, 32, 38, 35, 44, 48, 56];

export const Finance: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = spring({ frame: f, fps, config: { damping: 18 } });

  // Chart draw progress
  const chartT = interpolate(f, [25, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Donut sweep
  const donutT = interpolate(f, [60, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const r = 38;
  const C_ = 2 * Math.PI * r;

  const W = 380, H = 130, P = 14;
  const xs = POINTS.map((_, i) => P + (i * (W - P * 2)) / (POINTS.length - 1));
  const max = Math.max(...POINTS);
  const ys = POINTS.map((v) => H - P - ((v / max) * (H - P * 2)));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const areaPath = `${path} L ${xs[xs.length - 1]} ${H - P} L ${xs[0]} ${H - P} Z`;

  return (
    <BrowserChrome url="studiocrm.app/app/finance">
      <div style={{ display: "flex", height: "100%" }}>
        <SidebarMock active="finance" />
        <div style={{ flex: 1, padding: 24, background: C.bg }}>
          <div style={{ opacity: titleY, transform: `translateY(${(1 - titleY) * 8}px)`, marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, color: C.ink, fontWeight: 800, margin: 0 }}>Finance Overview</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>FY 2026-27 · April–March</div>
          </div>

          {/* KPI tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            {KPIS.map((k, i) => {
              const start = 12 + i * 8;
              const sp = spring({ frame: f - start, fps, config: { damping: 16 } });
              const v = Math.round(interpolate(
                f, [start + 6, start + 60], [0, k.value],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ));
              return (
                <div key={k.label} style={{
                  background: C.card, borderRadius: 10, padding: 14,
                  border: `1px solid ${C.border}`,
                  opacity: sp, transform: `translateY(${(1 - sp) * 12}px)`,
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                    {k.prefix}{v.toLocaleString("en-IN")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart + donut */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>
                Revenue trend
              </div>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#grad)" opacity={chartT} />
                <path d={path} fill="none" stroke={C.primary} strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round"
                  pathLength={1} strokeDasharray={1} strokeDashoffset={1 - chartT}
                />
                {chartT > 0.95 && (
                  <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4} fill={C.accent}
                    stroke="white" strokeWidth={2} />
                )}
              </svg>
            </div>
            <div style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>
                Aging
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
                <svg width={110} height={110} viewBox="0 0 110 110">
                  <circle cx={55} cy={55} r={r} fill="none" stroke={C.bg} strokeWidth={14} />
                  <circle cx={55} cy={55} r={r} fill="none" stroke={C.green} strokeWidth={14}
                    strokeDasharray={C_} strokeDashoffset={C_ * (1 - donutT * 0.65)}
                    transform="rotate(-90 55 55)" strokeLinecap="round"
                  />
                  <circle cx={55} cy={55} r={r} fill="none" stroke={C.accent} strokeWidth={14}
                    strokeDasharray={C_} strokeDashoffset={C_ * (1 - donutT * 0.25)}
                    transform={`rotate(${-90 + 360 * 0.65 * donutT} 55 55)`} strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 6 }}>
                <span style={{ color: C.green, fontWeight: 700 }}>● Current</span>{"  "}
                <span style={{ color: C.accent, fontWeight: 700 }}>● 30d</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
};
