import { COLORS, FONTS } from "../theme";

export function PanelTitle({ eyebrow, title, aside }) {
  return (
    <div className="panel-head">
      <div>
        {eyebrow ? <div className="panel-eyebrow">{eyebrow}</div> : null}
        <h2 className="panel-title">{title}</h2>
      </div>
      {aside ? <div>{aside}</div> : null}
    </div>
  );
}

export function TooltipCard({ children }) {
  return (
    <div
      style={{
        background: COLORS.panelRaised,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        padding: "12px 14px",
        boxShadow: "0 14px 40px rgba(15, 42, 54, 0.18)",
        fontFamily: FONTS.body,
        color: COLORS.ink,
        fontSize: 12,
        lineHeight: 1.7,
      }}
    >
      {children}
    </div>
  );
}

export function StatPill({ label, value, tone = "neutral" }) {
  const styles = {
    buy: { color: COLORS.buy, background: COLORS.positiveBg },
    sell: { color: COLORS.sell, background: COLORS.negativeBg },
    amber: { color: COLORS.amber, background: COLORS.amberBg },
    sky: { color: COLORS.sky, background: COLORS.skyBg },
    neutral: { color: COLORS.ink, background: "rgba(22,48,60,0.06)" },
  };
  const current = styles[tone] || styles.neutral;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        background: current.background,
        color: current.color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <span style={{ fontSize: 10, color: COLORS.inkSoft }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
