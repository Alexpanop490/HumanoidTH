export default function SynergyTabs() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      <button type="button" style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}>
        Overview
      </button>
      <button type="button" style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}>
        Human-AI Alignment
      </button>
      <button type="button" style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}>
        Robotics Signals
      </button>
    </div>
  );
}
