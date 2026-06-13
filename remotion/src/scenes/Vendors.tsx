import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserChrome, SidebarMock } from "../components/BrowserChrome";
import { C } from "../theme";

const STATUSES = [
  { key: "draft",        label: "DRAFT",        color: C.muted,  bg: "#F1F4FA" },
  { key: "sent",         label: "SENT",         color: "#0EA5E9", bg: "#E0F2FE" },
  { key: "accepted",     label: "ACCEPTED",     color: "#A855F7", bg: "#F3E8FF" },
  { key: "delivered",    label: "DELIVERED",    color: C.green,  bg: C.greenSoft },
];

const POS = [
  { num: "PO-2026-0124", vendor: "Hettich India",   amt: "₹1,84,500", item: "Soft-close hardware kit" },
  { num: "PO-2026-0125", vendor: "Centuryply",      amt: "₹2,34,000", item: "BWP plywood — 18mm" },
  { num: "PO-2026-0126", vendor: "Asian Paints",    amt: "₹47,200",   item: "PU & primer set" },
  { num: "PO-2026-0127", vendor: "Greenlam",        amt: "₹68,400",   item: "Laminates (24 sheets)" },
];

export const Vendors: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = spring({ frame: f, fps, config: { damping: 18 } });

  // Status of "live" PO (top one) cycles through stages
  const statusIdx = Math.min(3, Math.floor(interpolate(f, [40, 145], [0, 4], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  })));
  const liveStatus = STATUSES[statusIdx];

  return (
    <BrowserChrome url="studiocrm.app/app/vendors">
      <div style={{ display: "flex", height: "100%" }}>
        <SidebarMock active="vendors" />
        <div style={{ flex: 1, padding: 24, background: C.bg }}>
          <div style={{ opacity: titleY, transform: `translateY(${(1 - titleY) * 8}px)`, marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, color: C.ink, fontWeight: 800, margin: 0 }}>Purchase Orders</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>4 active POs · ₹5,34,100 outstanding</div>
          </div>

          <div style={{
            background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden",
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr 0.9fr 1fr",
              padding: "12px 16px", background: "#FAFBFE", borderBottom: `1px solid ${C.border}`,
              fontSize: 10.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              <span>PO #</span><span>Vendor</span><span>Item</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "center" }}>Status</span>
            </div>
            {POS.map((po, i) => {
              const start = 18 + i * 16;
              const sp = spring({ frame: f - start, fps, config: { damping: 16 } });
              const isLive = i === 0;
              const status = isLive ? liveStatus : STATUSES[Math.min(3, i)];
              return (
                <div key={po.num} style={{
                  display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr 0.9fr 1fr",
                  padding: "13px 16px", borderBottom: i === POS.length - 1 ? "none" : `1px solid ${C.border}`,
                  alignItems: "center", fontSize: 12.5, color: C.ink, fontWeight: 600,
                  opacity: sp, transform: `translateX(${(1 - sp) * -24}px)`,
                  background: isLive ? "rgba(229,233,255,0.25)" : "transparent",
                }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11.5, color: C.primary, fontWeight: 700 }}>{po.num}</span>
                  <span>{po.vendor}</span>
                  <span style={{ color: C.muted, fontSize: 11.5 }}>{po.item}</span>
                  <span style={{ textAlign: "right", fontWeight: 800 }}>{po.amt}</span>
                  <span style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 9px", borderRadius: 99,
                      fontSize: 9.5, fontWeight: 800, color: status.color, background: status.bg,
                      transform: isLive ? `scale(${1 + Math.sin(f / 4) * 0.04})` : "scale(1)",
                    }}>{status.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
};
