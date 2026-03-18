import { useMemo } from "react";
import {
  formatHour,
  formatPrice,
  formatQty,
  formatSignedQty,
} from "../lib/market";
import { PanelTitle, StatPill } from "./common";

const FLASH_TONES = {
  fill: "rgba(31,138,112,0.14)",
  order: "rgba(195,139,46,0.16)",
  cancel: "rgba(123,117,183,0.14)",
  market: "rgba(46,121,185,0.14)",
};

const classifyHour = (hour) => {
  const spread = hour.a1 - hour.b1;
  const opportunity =
    hour.activity >= 68 &&
    spread <= 2.1 &&
    Math.max(hour.canBuyQty, hour.canSellQty) >= 120;
  const risk =
    Math.abs(hour.positionQty) >= 150 ||
    hour.pendingQty >= 110 ||
    Math.min(hour.canBuyQty, hour.canSellQty) <= 70;

  if (risk) {
    return "risk";
  }
  if (opportunity) {
    return "opportunity";
  }
  return "neutral";
};

const linePathFromHours = (hours, xForIndex, yForValue, getter) =>
  hours
    .map((hour, index) => {
      const x = xForIndex(index);
      const y = yForValue(getter(hour));
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

const spreadAreaPathFromHours = (hours, xForIndex, yForValue) => {
  const askPath = hours
    .map((hour, index) => {
      const x = xForIndex(index);
      const y = yForValue(hour.a1);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const bidPath = hours
    .map((hour, index) => {
      const reverseIndex = hours.length - 1 - index;
      const x = xForIndex(reverseIndex);
      const y = yForValue(hours[reverseIndex].b1);
      return `L ${x} ${y}`;
    })
    .join(" ");

  return `${askPath} ${bidPath} Z`;
};

export function TradingAtlas({
  dayData,
  selectedHour,
  hoveredHour,
  onSelectHour,
  onHoverHourChange,
  flashMap,
  agentConfig,
}) {
  const focusHourIndex = hoveredHour ?? selectedHour;
  const focusHour = dayData[focusHourIndex] ?? dayData[0];

  const metrics = useMemo(() => {
    const displayPrices = dayData
      .flatMap((hour) => [
        hour.lastPrice,
        hour.activeOrderPrice,
        hour.b1,
        hour.a1,
        ...hour.bids.slice(0, 3).map((bid) => bid.price),
        ...hour.asks.slice(0, 3).map((ask) => ask.price),
      ])
      .filter((price) => Number.isFinite(price));

    const maxExecution = Math.max(...dayData.map((hour) => hour.filledQty + hour.pendingQty), 1);
    const maxPosition = Math.max(...dayData.map((hour) => Math.abs(hour.positionQty)), 1);
    const priceMin = Math.floor(Math.min(...displayPrices) - 10);
    const priceMax = Math.ceil(Math.max(...displayPrices) + 10);

    return {
      maxExecution,
      maxPosition,
      priceMin,
      priceMax,
    };
  }, [dayData]);

  const view = {
    width: 1260,
    height: 680,
    left: 102,
    right: 84,
    top: 18,
    bottom: 40,
  };
  const innerWidth = view.width - view.left - view.right;
  const columnWidth = innerWidth / 24;
  const xForIndex = (index) => view.left + index * columnWidth + columnWidth / 2;

  const rows = {
    signal: { top: 12, height: 26, label: "顺手 / 烫手" },
    price: { top: 58, height: 324, label: "成交脊线 / 收放 1-3" },
    flow: { top: 398, height: 32, label: "方向流" },
    position: { top: 450, height: 78, label: "存薯" },
    execution: { top: 548, height: 96, label: "搓成 / 土豆牌" },
  };

  const yForPrice = (price) => {
    const ratio = (price - metrics.priceMin) / Math.max(metrics.priceMax - metrics.priceMin, 1);
    return rows.price.top + rows.price.height - ratio * rows.price.height;
  };

  const positionCenter = rows.position.top + rows.position.height / 2;
  const positionAmplitude = rows.position.height / 2 - 5;
  const executionBottom = rows.execution.top + rows.execution.height;
  const flowMid = rows.flow.top + rows.flow.height / 2;
  const priceTicks = Array.from({ length: 6 }, (_, index) => {
    const ratio = index / 5;
    return {
      y: rows.price.top + ratio * rows.price.height,
      value: metrics.priceMax - ratio * (metrics.priceMax - metrics.priceMin),
    };
  });

  const spreadAreaPath = spreadAreaPathFromHours(dayData, xForIndex, yForPrice);
  const lastPricePath = linePathFromHours(dayData, xForIndex, yForPrice, (hour) => hour.lastPrice);
  const bidOnePath = linePathFromHours(dayData, xForIndex, yForPrice, (hour) => hour.b1);
  const askOnePath = linePathFromHours(dayData, xForIndex, yForPrice, (hour) => hour.a1);

  const flowSegments = dayData.slice(0, -1).map((hour, index) => {
    const nextHour = dayData[index + 1];
    const startX = xForIndex(index);
    const endX = xForIndex(index + 1);
    const meanImbalance = (hour.imbalance + nextHour.imbalance) / 2;
    const amplitude = 4 + Math.abs(meanImbalance) * 10;
    const directionUp = meanImbalance >= 0;

    return {
      d: `M ${startX} ${flowMid} C ${startX + columnWidth * 0.35} ${
        flowMid + (directionUp ? -amplitude : amplitude)
      }, ${endX - columnWidth * 0.35} ${
        flowMid + (directionUp ? -amplitude : amplitude)
      }, ${endX} ${flowMid}`,
      color: meanImbalance >= 0 ? "#1f8a70" : "#cd654a",
      opacity: Math.min(0.88, 0.24 + Math.abs(meanImbalance) * 0.64),
      width: 1.4 + Math.abs(meanImbalance) * 1.8,
    };
  });

  const stars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const x = view.left + ((index * 43) % Math.floor(innerWidth));
        const y = 20 + ((index * 59) % Math.floor(rows.execution.top - 10));
        const radius = index % 4 === 0 ? 1.4 : index % 3 === 0 ? 1.1 : 0.8;
        const opacity = index % 5 === 0 ? 0.34 : 0.14;
        return { x, y, radius, opacity };
      }),
    [innerWidth, rows.execution.top, view.left],
  );

  return (
    <section className="panel-card atlas-card">
      <PanelTitle
        eyebrow="24h 主薯图"
        title="时序薯盘图谱"
        aside={<div className="panel-mini-note">左侧常驻精读，中间只保留成交、价差与前 3 档价格关系</div>}
      />

      <div className="atlas-summary">
        <StatPill label="聚焦时段" value={formatHour(focusHour.hour)} tone="sky" />
        <StatPill label="最新价" value={formatPrice(focusHour.lastPrice)} tone="sell" />
        <StatPill
          label="我方土豆牌"
          value={
            focusHour.activeOrderSide
              ? `${focusHour.activeOrderSide === "buy" ? "收" : "放"} ${formatPrice(focusHour.activeOrderPrice)}`
              : "暂无土豆牌"
          }
          tone={
            focusHour.activeOrderSide === "buy"
              ? "buy"
              : focusHour.activeOrderSide === "sell"
                ? "sell"
                : "neutral"
          }
        />
        <StatPill label="存薯" value={`${formatSignedQty(focusHour.positionQty)} 袋`} tone="sky" />
        <StatPill
          label="搓成 / 未成"
          value={`${formatQty(focusHour.filledQty)} / ${formatQty(focusHour.pendingQty)}`}
          tone="amber"
        />
        <StatPill
          label="盯梢器"
          value={agentConfig[focusHour.hour]?.enabled ? "ON" : "OFF"}
          tone={agentConfig[focusHour.hour]?.enabled ? "buy" : "neutral"}
        />
      </div>

      <div className="atlas-frame atlas-frame-immersive">
        <svg
          className="atlas-svg"
          viewBox={`0 0 ${view.width} ${view.height}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => onHoverHourChange?.(null)}
        >
          <defs>
            <linearGradient id="atlasSpreadFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(205,101,74,0.18)" />
              <stop offset="48%" stopColor="rgba(255,248,238,0.02)" />
              <stop offset="52%" stopColor="rgba(255,248,238,0.02)" />
              <stop offset="100%" stopColor="rgba(31,138,112,0.18)" />
            </linearGradient>
            <linearGradient id="atlasMidGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(46,121,185,0.01)" />
              <stop offset="50%" stopColor="rgba(46,121,185,0.12)" />
              <stop offset="100%" stopColor="rgba(46,121,185,0.01)" />
            </linearGradient>
            <marker
              id="flowArrowGreen"
              markerWidth="7"
              markerHeight="7"
              refX="5"
              refY="3.5"
              orient="auto"
            >
              <path d="M0,0 L7,3.5 L0,7 z" fill="#1f8a70" />
            </marker>
            <marker
              id="flowArrowRed"
              markerWidth="7"
              markerHeight="7"
              refX="5"
              refY="3.5"
              orient="auto"
            >
              <path d="M0,0 L7,3.5 L0,7 z" fill="#cd654a" />
            </marker>
          </defs>

          <rect
            x={view.left}
            y={rows.signal.top}
            width={innerWidth}
            height={rows.execution.top + rows.execution.height - rows.signal.top}
            fill="url(#atlasMidGlow)"
          />

          {stars.map((star) => (
            <circle
              key={`${star.x}-${star.y}`}
              cx={star.x}
              cy={star.y}
              r={star.radius}
              fill="rgba(255,255,255,0.92)"
              opacity={star.opacity}
              className="atlas-star"
              style={{
                animationDelay: `${(star.x + star.y) % 7}s`,
                animationDuration: `${4 + ((star.x + star.y) % 5)}s`,
              }}
            />
          ))}

          {[rows.signal, rows.price, rows.flow, rows.position, rows.execution].map((row) => (
            <g key={row.label}>
              <rect
                x={view.left}
                y={row.top}
                width={innerWidth}
                height={row.height}
                fill="rgba(16,38,50,0.035)"
              />
              <text x="14" y={row.top + 17} className="atlas-label">
                {row.label}
              </text>
            </g>
          ))}

          {priceTicks.map((tick) => (
            <g key={`tick-${tick.value}`}>
              <line
                x1={view.left}
                x2={view.width - view.right}
                y1={tick.y}
                y2={tick.y}
                className="atlas-price-guide"
              />
              <text
                x={view.width - view.right + 8}
                y={tick.y + 3}
                textAnchor="start"
                className="atlas-price-mark"
              >
                {formatPrice(tick.value)}
              </text>
            </g>
          ))}

          <path d={spreadAreaPath} className="atlas-spread-area" />
          <path d={bidOnePath} className="atlas-book-edge atlas-book-edge-bid" />
          <path d={askOnePath} className="atlas-book-edge atlas-book-edge-ask" />
          <path d={lastPricePath} className="atlas-last-price-line" />

          {dayData.map((hour, index) => {
            const x = view.left + index * columnWidth;
            const centerX = x + columnWidth / 2;
            const zone = classifyHour(hour);
            const flash = flashMap[hour.hour];
            const isSelected = hour.hour === selectedHour;
            const isFocused = hour.hour === focusHour.hour;
            const priceY = yForPrice(hour.lastPrice);
            const orderY =
              hour.activeOrderPrice != null ? yForPrice(hour.activeOrderPrice) : null;

            return (
              <g key={`hour-${hour.hour}`}>
                <rect
                  x={x + 1}
                  y={rows.signal.top + 1}
                  width={columnWidth - 2}
                  height={rows.signal.height - 2}
                  fill={
                    zone === "opportunity"
                      ? "rgba(31,138,112,0.16)"
                      : zone === "risk"
                        ? "rgba(205,101,74,0.16)"
                        : "rgba(16,38,50,0.05)"
                  }
                />
                <text
                  x={centerX}
                  y={rows.signal.top + 18}
                  textAnchor="middle"
                  className="atlas-signal-text"
                  fill={
                    zone === "opportunity"
                      ? "#1f8a70"
                      : zone === "risk"
                        ? "#cd654a"
                        : "#72838b"
                  }
                >
                  {zone === "opportunity" ? "顺手" : zone === "risk" ? "烫手" : "观察"}
                </text>

                <rect
                  x={x + 3}
                  y={rows.price.top}
                  width={columnWidth - 6}
                  height={rows.price.height}
                  fill={
                    isSelected
                      ? "rgba(229,181,103,0.1)"
                      : flash
                        ? FLASH_TONES[flash.type] || "transparent"
                        : isFocused
                          ? "rgba(46,121,185,0.06)"
                          : "transparent"
                  }
                />

                <line
                  x1={centerX}
                  x2={centerX}
                  y1={yForPrice(hour.asks[2]?.price ?? hour.a1)}
                  y2={yForPrice(hour.bids[2]?.price ?? hour.b1)}
                  className="atlas-column-spine"
                />

                {hour.bids.slice(0, 3).map((bid, levelIndex) => {
                  const barWidth = columnWidth * (0.16 + (3 - levelIndex) * 0.06);
                  const barHeight = 3.8 + (3 - levelIndex) * 1.2;
                  const y = yForPrice(bid.price) - barHeight / 2;
                  return (
                    <g key={`${hour.hour}-bid-${levelIndex}`}>
                      <rect
                        x={centerX - barWidth}
                        y={y}
                        width={barWidth - 2}
                        height={barHeight}
                        rx={barHeight / 2}
                        className={`atlas-depth-band atlas-depth-band-bid atlas-depth-band-l${levelIndex + 1}`}
                        style={{ opacity: 0.42 + (3 - levelIndex) * 0.12 }}
                      />
                      <circle
                        cx={centerX - barWidth}
                        cy={yForPrice(bid.price)}
                        r={1.9 + (3 - levelIndex) * 0.45}
                        className="atlas-depth-node atlas-depth-node-bid"
                      />
                    </g>
                  );
                })}

                {hour.asks.slice(0, 3).map((ask, levelIndex) => {
                  const barWidth = columnWidth * (0.16 + (3 - levelIndex) * 0.06);
                  const barHeight = 3.8 + (3 - levelIndex) * 1.2;
                  const y = yForPrice(ask.price) - barHeight / 2;
                  return (
                    <g key={`${hour.hour}-ask-${levelIndex}`}>
                      <rect
                        x={centerX + 2}
                        y={y}
                        width={barWidth - 2}
                        height={barHeight}
                        rx={barHeight / 2}
                        className={`atlas-depth-band atlas-depth-band-ask atlas-depth-band-l${levelIndex + 1}`}
                        style={{ opacity: 0.42 + (3 - levelIndex) * 0.12 }}
                      />
                      <circle
                        cx={centerX + barWidth}
                        cy={yForPrice(ask.price)}
                        r={1.9 + (3 - levelIndex) * 0.45}
                        className="atlas-depth-node atlas-depth-node-ask"
                      />
                    </g>
                  );
                })}

                <circle
                  cx={centerX}
                  cy={priceY}
                  r={isFocused ? 4.6 : 3.4}
                  className="atlas-price-node"
                />

                {orderY != null ? (
                  <g>
                    <line
                      x1={centerX}
                      x2={centerX}
                      y1={Math.max(rows.price.top + 8, orderY - 18)}
                      y2={Math.min(rows.price.top + rows.price.height - 8, orderY + 18)}
                      className="atlas-order-tether"
                    />
                    <line
                      x1={centerX - 10}
                      x2={centerX + 10}
                      y1={orderY}
                      y2={orderY}
                      className="atlas-order-axis-current"
                    />
                    <circle
                      cx={centerX}
                      cy={orderY}
                      r="8.5"
                      className="atlas-order-beacon"
                    />
                    <circle
                      cx={centerX}
                      cy={orderY}
                      r="3.2"
                      className={`atlas-order-core atlas-order-core-${hour.activeOrderSide}`}
                    />
                    <rect
                      x={centerX + 12}
                      y={orderY - 8}
                      width="34"
                      height="16"
                      rx="8"
                      className="atlas-order-label-bg"
                    />
                    <text
                      x={centerX + 29}
                      y={orderY + 3}
                      textAnchor="middle"
                      className={`atlas-order-label atlas-order-label-${hour.activeOrderSide}`}
                    >
                      {hour.activeOrderSide === "buy" ? "我方收牌" : "我方放牌"}
                    </text>
                  </g>
                ) : null}

                <rect
                  x={x + columnWidth * 0.25}
                  y={hour.positionQty >= 0 ? positionCenter - (Math.abs(hour.positionQty) / metrics.maxPosition) * positionAmplitude : positionCenter}
                  width={columnWidth * 0.5}
                  height={Math.max((Math.abs(hour.positionQty) / metrics.maxPosition) * positionAmplitude, 3)}
                  fill={hour.positionQty >= 0 ? "rgba(31,138,112,0.76)" : "rgba(205,101,74,0.76)"}
                />

                <rect
                  x={x + columnWidth * 0.17}
                  y={executionBottom - (hour.filledQty / metrics.maxExecution) * (rows.execution.height - 8)}
                  width={columnWidth * 0.28}
                  height={Math.max((hour.filledQty / metrics.maxExecution) * (rows.execution.height - 8), 3)}
                  fill="rgba(31,138,112,0.94)"
                />
                <rect
                  x={x + columnWidth * 0.55}
                  y={executionBottom - (hour.pendingQty / metrics.maxExecution) * (rows.execution.height - 8)}
                  width={columnWidth * 0.28}
                  height={Math.max((hour.pendingQty / metrics.maxExecution) * (rows.execution.height - 8), 3)}
                  fill="rgba(195,139,46,0.94)"
                />

                <circle
                  cx={centerX}
                  cy={flowMid}
                  r={agentConfig[hour.hour]?.enabled ? 4.4 : 3.3}
                  fill={agentConfig[hour.hour]?.enabled ? "#1f8a70" : "rgba(22,48,60,0.18)"}
                />

                <text x={centerX} y={view.height - 8} textAnchor="middle" className="atlas-hour-text">
                  {String(hour.hour).padStart(2, "0")}
                </text>

                <rect
                  x={x}
                  y={rows.signal.top}
                  width={columnWidth}
                  height={view.height - rows.signal.top - 12}
                  fill="transparent"
                  onMouseEnter={() => onHoverHourChange?.(hour.hour)}
                  onClick={() => onSelectHour(hour.hour)}
                  style={{ cursor: "pointer" }}
                />
              </g>
            );
          })}

          {flowSegments.map((segment, index) => (
            <path
              key={`flow-${index}`}
              d={segment.d}
              fill="none"
              stroke={segment.color}
              strokeWidth={segment.width}
              strokeOpacity={segment.opacity}
              markerEnd={`url(#${segment.color === "#1f8a70" ? "flowArrowGreen" : "flowArrowRed"})`}
            />
          ))}
        </svg>
      </div>

      <div className="atlas-legend">
        <span><i className="legend-dot legend-dot-blue" />最新成交脊线</span>
        <span><i className="legend-dot legend-dot-corridor" />收一 / 放一价差走廊</span>
        <span><i className="legend-dot legend-dot-bid" />收 1-3 量带</span>
        <span><i className="legend-dot legend-dot-ask" />放 1-3 量带</span>
        <span><i className="legend-dot legend-dot-amber" />当前土豆牌</span>
        <span><i className="legend-dot legend-dot-green" />收薯流 / 已搓成</span>
        <span><i className="legend-dot legend-dot-red" />烫手 / 存薯压力</span>
      </div>
    </section>
  );
}
