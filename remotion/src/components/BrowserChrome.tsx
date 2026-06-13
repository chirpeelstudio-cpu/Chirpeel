import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

export const BrowserChrome: React.FC<{ url: string; children: React.ReactNode }> = ({ url, children }) => (
  <AbsoluteFill style={{ background: C.bg, padding: 40, fontFamily: "DM Sans, sans-serif" }}>
    <div style={{
      flex: 1, background: C.card, borderRadius: 18,
      boxShadow: C.shadow, overflow: "hidden", display: "flex", flexDirection: "column",
      border: `1px solid ${C.border}`,
    }}>
      <div style={{
        height: 44, background: "#F8FAFD", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 18px", gap: 14,
      }}>
        <div style={{ display: "flex", gap: 7 }}>
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#FF5F56" }} />
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#FFBD2E" }} />
          <span style={{ width: 11, height: 11, borderRadius: 99, background: "#27C93F" }} />
        </div>
        <div style={{
          flex: 1, height: 26, background: C.card, borderRadius: 7,
          border: `1px solid ${C.border}`, display: "flex", alignItems: "center",
          padding: "0 12px", fontSize: 12, color: C.muted, fontWeight: 500,
        }}>
          🔒 {url}
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
  </AbsoluteFill>
);

export const SidebarMock: React.FC<{ active: string }> = ({ active }) => {
  const items = [
    { id: "overview", label: "Overview", icon: "▦" },
    { id: "pipeline", label: "Pipeline", icon: "◫" },
    { id: "leads", label: "Leads", icon: "◉" },
    { id: "quotation", label: "Quotation", icon: "▤" },
    { id: "projects", label: "Projects", icon: "◆" },
    { id: "vendors", label: "Vendors", icon: "▷" },
    { id: "finance", label: "Finance", icon: "₹" },
  ];
  return (
    <div style={{
      width: 200, background: "#FAFBFE", borderRight: `1px solid ${C.border}`,
      padding: "18px 12px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px 14px" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: C.primary,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 14, fontWeight: 800,
        }}>S</div>
        <span style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>StudioCRM</span>
      </div>
      {items.map((it) => (
        <div key={it.id} style={{
          padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          color: active === it.id ? C.primary : C.inkSoft,
          background: active === it.id ? C.primarySoft : "transparent",
          display: "flex", alignItems: "center", gap: 9,
        }}>
          <span style={{ width: 14, textAlign: "center", opacity: 0.85 }}>{it.icon}</span>
          {it.label}
        </div>
      ))}
    </div>
  );
};
