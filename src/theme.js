export const COLORS = {
  shell: "#0f2a36",
  shellDeep: "#153a49",
  shellGlow: "#e5b567",
  panel: "#f5efe4",
  panelRaised: "#fff8ee",
  panelTint: "#ece2d0",
  line: "rgba(18, 44, 56, 0.14)",
  ink: "#16303c",
  inkSoft: "#5f727b",
  inkFaint: "#93a1a8",
  buy: "#1f8a70",
  sell: "#cd654a",
  amber: "#c38b2e",
  sky: "#2e79b9",
  lilac: "#7b75b7",
  positiveBg: "rgba(31, 138, 112, 0.12)",
  negativeBg: "rgba(205, 101, 74, 0.12)",
  amberBg: "rgba(195, 139, 46, 0.12)",
  skyBg: "rgba(46, 121, 185, 0.12)",
};

export const FONTS = {
  display: "'Fraunces', serif",
  body: "'Space Grotesk', 'Noto Sans SC', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const EVENT_STYLES = {
  fill: { icon: "搓成", color: COLORS.buy, background: COLORS.positiveBg },
  order: { icon: "土豆牌", color: COLORS.amber, background: COLORS.amberBg },
  cancel: { icon: "撤牌", color: COLORS.lilac, background: "rgba(123,117,183,0.12)" },
  market: { icon: "薯盘", color: COLORS.sky, background: COLORS.skyBg },
};
