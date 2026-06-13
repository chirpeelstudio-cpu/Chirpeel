import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserChrome, SidebarMock } from "../components/BrowserChrome";
import { C } from "../theme";

const ROOMS = [
  { name: "Living Room",  area: "320 sqft", value: 142000, items: 12 },
  { name: "Modular Kitchen", area: "180 sqft", value: 198000, items: 18 },
  { name: "Master Bedroom", area: "240 sqft", value: 145000, items: 9 },
];

export const Quotation: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleY = spring({ frame: f, fps, config: { damping: 18 } });

  // Total ticks up
  const totalTarget = 485000;
  const total = Math.round(interpolate(f, [40, 130], [0, totalTarget], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));

  // Send button pulse at end
  const pulse = interpolate(
    f, [130, 138, 146, 150], [1, 1.06, 1, 1.04],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <BrowserChrome url="studiocrm.app/app/quotation/new">
      <div style={{ display: "flex", height: "100%" }}>
        <SidebarMock active="quotation" />
        <div style={{ flex: 1, padding: 24, background: C.bg, display: "flex", flexDirection: "column" }}>
          <div style={{ opacity: titleY, transform: `translateY(${(1 - titleY) * 8}px)`, marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, color: C.ink, fontWeight: 800, margin: 0 }}>New Quotation</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Sneha M · 3BHK Apartment, Bengaluru</div>
          </div>

          <div style={{ display: "flex", gap: 16, flex: 1 }}>
            {/* Rooms */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {ROOMS.map((room, i) => {
                const start = 20 + i * 18;
                const sp = spring({ frame: f - start, fps, config: { damping: 16 } });
                return (
                  <div key={room.name} style={{
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: 14, opacity: sp,
                    transform: `translateY(${(1 - sp) * 16}px) scale(${0.96 + sp * 0.04})`,
                    boxShadow: "0 1px 3px rgba(15,27,61,0.05)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: C.ink, fontSize: 13.5 }}>{room.name}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{room.area}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                        background: C.primarySoft, color: C.primary,
                      }}>{room.items} line items</span>
                      <span style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>
                        ₹{room.value.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div style={{
              width: 220, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 16, alignSelf: "flex-start",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>
                Quote Summary
              </div>
              {[
                { l: "Subtotal",   v: "₹4,11,016" },
                { l: "GST 18%",    v: "₹73,983" },
              ].map((r) => (
                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, color: C.inkSoft }}>
                  <span>{r.l}</span><span style={{ fontWeight: 600 }}>{r.v}</span>
                </div>
              ))}
              <div style={{ height: 1, background: C.border, margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>TOTAL</span>
                <span style={{ fontWeight: 800, fontSize: 22, color: C.primary, fontVariantNumeric: "tabular-nums" }}>
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>
              <button style={{
                marginTop: 14, width: "100%", padding: "10px 14px", background: C.primary,
                color: "white", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13,
                transform: `scale(${pulse})`, boxShadow: pulse > 1 ? "0 8px 20px rgba(23,48,204,0.35)" : "0 2px 6px rgba(23,48,204,0.2)",
                cursor: "pointer",
              }}>
                Send to client →
              </button>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
};
