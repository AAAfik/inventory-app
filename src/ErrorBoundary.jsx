// ═══════════════════════════════════════════════════════════════════
// ErrorBoundary.jsx — catches render errors in a module and shows a
// readable panel instead of a blank page.
// ═══════════════════════════════════════════════════════════════════

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[Caesar] module crashed:", error, info?.componentStack);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;
    const { TH = {}, name = "This module", children } = this.props;
    if (!error) return children;

    const bg     = TH.bgCard    || "#111A2C";
    const border = TH.border    || "#212D47";
    const text   = TH.text      || "#E6E9F0";
    const muted  = TH.textMuted || "#8A94A8";
    const danger = TH.danger    || "#D97757";
    const dangerBg = TH.dangerBg || "rgba(217,119,87,.14)";

    return (
      <div style={{
        background: bg, border: `1px solid ${danger}55`, borderRadius: 14,
        padding: "22px 24px", maxWidth: 720, margin: "24px auto",
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: ".12em",
          textTransform: "uppercase", color: danger, marginBottom: 8,
        }}>Something broke</div>

        <div style={{
          fontSize: 19, fontWeight: 500, color: text, marginBottom: 8,
          fontFamily: "'Playfair Display', Georgia, serif",
        }}>{name} could not be displayed</div>

        <div style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 16 }}>
          The rest of the app is still working. Use the sidebar to go elsewhere,
          or reload to try again.
        </div>

        <div style={{
          background: dangerBg, border: `1px solid ${danger}33`, borderRadius: 9,
          padding: "10px 13px", marginBottom: 16,
          fontFamily: "ui-monospace, monospace", fontSize: 12, color: danger,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>{String(error?.message || error)}</div>

        {info?.componentStack && (
          <details style={{ marginBottom: 16 }}>
            <summary style={{ fontSize: 12, color: muted, cursor: "pointer" }}>Technical detail</summary>
            <pre style={{
              fontSize: 10.5, color: muted, whiteSpace: "pre-wrap",
              marginTop: 8, maxHeight: 200, overflow: "auto",
            }}>{info.componentStack}</pre>
          </details>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={this.reset} style={{
            background: "transparent", border: `1px solid ${border}`, borderRadius: 9,
            color: text, padding: "10px 18px", cursor: "pointer",
            fontSize: 13, fontWeight: 500, fontFamily: "inherit",
          }}>Try again</button>
          <button onClick={() => window.location.reload()} style={{
            background: TH.deep || "#16233D", border: `1px solid ${TH.deepBorder || "#26365A"}`,
            borderRadius: 9, color: TH.onDeep || "#fff", padding: "10px 18px",
            cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
          }}>Reload page</button>
        </div>
      </div>
    );
  }
}
