import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C } from "../theme";

const PHOTOS = [
  { hue: "#FCA5A5" }, { hue: "#FCD34D" }, { hue: "#86EFAC" },
  { hue: "#93C5FD" }, { hue: "#C4B5FD" }, { hue: "#F9A8D4" },
];

export const ClientPortal: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame: f, fps, config: { damping: 18 } });
  const payProgress = interpolate(f, [40, 130], [10, 60], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const PW = 270; const PH = 540;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at 70% 30%, ${C.primarySoft} 0%, ${C.bg} 60%)`,
      padding: 40, fontFamily: "DM Sans, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 40,
    }}>
      {/* Left text */}
      <div style={{ flex: 1, maxWidth: 380, opacity: phoneIn, transform: `translateX(${(1 - phoneIn) * -30}px)` }}>
        <div style={{
          display: "inline-block", padding: "4px 10px", borderRadius: 99,
          background: C.accentSoft, color: "#92400E", fontSize: 10, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12,
        }}>White-labelled</div>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: C.ink, margin: 0, lineHeight: 1.15 }}>
          Your client opens<br/>a private link.
        </h2>
        <p style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 10, lineHeight: 1.5 }}>
          They see the latest quotation, payment progress, milestones, and stage photos — branded as <strong>your</strong> studio. No login. No app to install.
        </p>
      </div>

      {/* Phone */}
      <div style={{
        width: PW, height: PH, borderRadius: 36, background: "#0F1B3D",
        padding: 10, boxShadow: "0 30px 60px -20px rgba(15,27,61,0.45)",
        opacity: phoneIn, transform: `translateY(${(1 - phoneIn) * 20}px) scale(${0.94 + phoneIn * 0.06})`,
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: 28, background: C.bg,
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          {/* Status bar */}
          <div style={{
            height: 28, background: C.bg, display: "flex",
            justifyContent: "space-between", alignItems: "center", padding: "0 18px",
            fontSize: 10, fontWeight: 700, color: C.ink,
          }}>
            <span>9:41</span><span>●●●●● 100%</span>
          </div>
          {/* Header (your brand) */}
          <div style={{
            background: C.primary, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "white", color: C.primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 15,
            }}>S</div>
            <div>
              <div style={{ color: "white", fontSize: 12.5, fontWeight: 800 }}>Sneha's Project</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 9.5 }}>Powered by your studio</div>
            </div>
          </div>

          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {/* Quote card */}
            <div style={{
              background: C.card, borderRadius: 10, padding: 12,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>
                Latest Quotation
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                3BHK Apartment · Bengaluru
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 9.5, color: C.muted }}>Total</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>₹4,85,000</span>
              </div>
              <div style={{
                marginTop: 8, padding: "5px 0", textAlign: "center",
                background: C.greenSoft, color: C.green, fontSize: 9.5, fontWeight: 800,
                borderRadius: 6, letterSpacing: 0.4,
              }}>✓ APPROVED</div>
            </div>

            {/* Payment */}
            <div style={{
              background: C.card, borderRadius: 10, padding: 12,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: C.inkSoft }}>Payment progress</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: C.primary, fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(payProgress)}%
                </span>
              </div>
              <div style={{ height: 6, background: C.bg, borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${payProgress}%`,
                  background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                  borderRadius: 99,
                }} />
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 5 }}>
                ₹2,91,000 of ₹4,85,000 paid
              </div>
            </div>

            {/* Photo gallery */}
            <div style={{
              background: C.card, borderRadius: 10, padding: 12,
              border: `1px solid ${C.border}`, flex: 1,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>
                Site Updates
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {PHOTOS.map((p, i) => {
                  const start = 60 + i * 8;
                  const sp = spring({ frame: f - start, fps, config: { damping: 16 } });
                  return (
                    <div key={i} style={{
                      aspectRatio: "1", borderRadius: 6,
                      background: `linear-gradient(135deg, ${p.hue}, ${C.bg})`,
                      opacity: sp, transform: `scale(${0.6 + sp * 0.4})`,
                    }} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
