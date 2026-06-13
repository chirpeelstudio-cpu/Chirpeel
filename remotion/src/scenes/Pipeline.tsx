import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserChrome, SidebarMock } from "../components/BrowserChrome";
import { C } from "../theme";

const COLS = [
  { key: "leads",     title: "Leads",     hue: "#94A3B8" },
  { key: "qualified", title: "Qualified", hue: "#06B6D4" },
  { key: "quoted",    title: "Quoted",    hue: "#A855F7" },
  { key: "won",       title: "Won",       hue: "#10B981" },
];

const STATIC_CARDS: Record<string, { name: string; amt: string }[]> = {
  leads:     [{ name: "Anita S.",  amt: "₹3.2L" }, { name: "Kunal R.", amt: "₹6.8L" }],
  qualified: [{ name: "Neha P.",   amt: "₹4.5L" }],
  quoted:    [{ name: "Vikram T.", amt: "₹8.1L" }, { name: "Riya K.",  amt: "₹5.4L" }],
  won:       [{ name: "Arjun D.",  amt: "₹12L"  }],
};

const Card: React.FC<{ name: string; amt: string; tag?: string }> = ({ name, amt, tag }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "10px 12px", marginBottom: 8, boxShadow: "0 1px 2px rgba(15,27,61,0.04)",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: 12.5, color: C.ink }}>{name}</div>
      {tag && <span style={{
        fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99,
        background: C.greenSoft, color: C.green,
      }}>{tag}</span>}
    </div>
    <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{amt} · 3BHK</div>
  </div>
);

export const Pipeline: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Card flies from "qualified" col (1) to "won" col (3) between frames 30-110
  const t = interpolate(f, [30, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Ease-in-out
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const COL_W = 180; const GAP = 14;
  const x = interpolate(eased, [0, 1], [COL_W * 1 + GAP, COL_W * 3 + GAP * 3]);
  const y = interpolate(eased, [0, 1], [54, 54]);
  const lift = interpolate(t, [0, 0.5, 1], [0, -6, 0]);
  const tagOpacity = interpolate(f, [105, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = spring({ frame: f, fps, config: { damping: 18, stiffness: 140 } });

  return (
    <BrowserChrome url="studiocrm.app/app/pipeline">
      <div style={{ display: "flex", height: "100%" }}>
        <SidebarMock active="pipeline" />
        <div style={{ flex: 1, padding: 24, background: C.bg }}>
          <div style={{
            opacity: titleY, transform: `translateY(${(1 - titleY) * 8}px)`, marginBottom: 18,
          }}>
            <h2 style={{ fontSize: 22, color: C.ink, fontWeight: 800, margin: 0 }}>Lead Pipeline</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Drag deals across stages · auto follow-ups</div>
          </div>
          <div style={{ display: "flex", gap: GAP, position: "relative" }}>
            {COLS.map((col) => (
              <div key={col.key} style={{ width: COL_W }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: col.hue, textTransform: "uppercase",
                  letterSpacing: 0.5, marginBottom: 8, display: "flex",
                  alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: col.hue }} />
                  {col.title}
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.5)", borderRadius: 10,
                  padding: 8, minHeight: 200,
                }}>
                  {STATIC_CARDS[col.key].map((c, i) => <Card key={i} name={c.name} amt={c.amt} />)}
                </div>
              </div>
            ))}
            {/* Animated card */}
            <div style={{
              position: "absolute", left: x, top: y + lift, width: COL_W - 16,
              transform: `rotate(${lift / 2}deg) scale(${1 + Math.abs(lift) / 100})`,
              boxShadow: `0 ${8 - lift}px ${20 - lift * 2}px rgba(15,27,61,0.18)`,
              borderRadius: 10, transition: "none",
            }}>
              <Card name="Sneha M." amt="₹9.5L" tag={tagOpacity > 0.5 ? "WON" : undefined} />
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
};
