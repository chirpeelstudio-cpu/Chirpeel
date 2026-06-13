import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserChrome, SidebarMock } from "../components/BrowserChrome";
import { C } from "../theme";

const STAGES = ["Design", "Manufacturing", "Installation", "Handover"];
const TASKS = [
  "Site measurement & finalization",
  "Design freeze with customer",
  "Material order placed",
  "Factory production",
  "Site installation",
  "Final handover & client sign-off",
];

export const Projects: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = spring({ frame: f, fps, config: { damping: 18 } });
  const progress = interpolate(f, [30, 130], [0, 67], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const filledStages = interpolate(progress, [0, 100], [0, 4]);

  return (
    <BrowserChrome url="studiocrm.app/app/projects/sneha-3bhk">
      <div style={{ display: "flex", height: "100%" }}>
        <SidebarMock active="projects" />
        <div style={{ flex: 1, padding: 24, background: C.bg }}>
          <div style={{ opacity: titleY, transform: `translateY(${(1 - titleY) * 8}px)`, marginBottom: 18 }}>
            <h2 style={{ fontSize: 22, color: C.ink, fontWeight: 800, margin: 0 }}>Sneha M — 3BHK Bengaluru</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Started Aug 12 · Target Oct 25</div>
          </div>

          {/* Progress bar */}
          <div style={{
            background: C.card, borderRadius: 12, padding: 18,
            border: `1px solid ${C.border}`, marginBottom: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft }}>Project progress</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.primary, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{ height: 10, background: C.bg, borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                borderRadius: 99, transition: "none",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              {STAGES.map((s, i) => {
                const done = i + 0.5 < filledStages;
                const active = !done && i < filledStages;
                return (
                  <div key={s} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", flex: 1,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 99,
                      background: done ? C.primary : active ? C.accent : C.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 10, fontWeight: 800,
                    }}>{done ? "✓" : i + 1}</span>
                    <span style={{ fontSize: 10.5, marginTop: 4, color: done ? C.ink : C.muted, fontWeight: 600 }}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks list */}
          <div style={{
            background: C.card, borderRadius: 12, padding: 16,
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>
              Tasks
            </div>
            {TASKS.map((task, i) => {
              const checkAt = 35 + i * 14;
              const checked = f > checkAt;
              const sp = spring({ frame: f - checkAt, fps, config: { damping: 12, stiffness: 200 } });
              return (
                <div key={task} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 0", borderBottom: i === TASKS.length - 1 ? "none" : `1px solid ${C.border}`,
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 5,
                    border: `1.5px solid ${checked ? C.green : C.border}`,
                    background: checked ? C.green : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 11, fontWeight: 800,
                    transform: checked ? `scale(${0.8 + sp * 0.2})` : "scale(1)",
                  }}>{checked ? "✓" : ""}</span>
                  <span style={{
                    fontSize: 12.5, color: checked ? C.muted : C.ink,
                    textDecoration: checked && i < 4 ? "line-through" : "none",
                    fontWeight: 600, flex: 1,
                  }}>{task}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
};
