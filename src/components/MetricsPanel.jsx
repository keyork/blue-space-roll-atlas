import {
  formatHour,
  formatPrice,
  formatQty,
  formatSignedQty,
} from "../lib/market";
import { COLORS } from "../theme";
import { PanelTitle } from "./common";

function MetricBar({ label, value, maxValue, tone }) {
  const tones = {
    buy: COLORS.buy,
    sell: COLORS.sell,
    amber: COLORS.amber,
    sky: COLORS.sky,
  };
  return (
    <div className="metric-bar-row">
      <div className="metric-bar-head">
        <span>{label}</span>
        <strong>{formatQty(value)}</strong>
      </div>
      <div className="metric-bar-track">
        <div
          className="metric-bar-fill"
          style={{
            width: `${Math.max(3, Math.min(100, (value / Math.max(maxValue, 1)) * 100))}%`,
            background: tones[tone],
          }}
        />
      </div>
    </div>
  );
}

export function MetricsPanel({ hourData }) {
  const maxCapacity = Math.max(hourData.canBuyQty, hourData.canSellQty, hourData.filledQty, 1);
  const positionPercent = ((hourData.positionQty + 240) / 480) * 100;

  return (
    <section className="panel-card">
      <PanelTitle
        eyebrow="时段切面"
        title={`${formatHour(hourData.hour)} 市场切面`}
        aside={<div className="panel-mini-note">存薯、边界、成交与土豆牌在同一视图内对照</div>}
      />

      <div className="metrics-hero">
        <div className="metrics-spot">
          <div className="metrics-spot-label">参考成交价</div>
          <div className="metrics-spot-price">{formatPrice(hourData.lastPrice)}</div>
          <div className="metrics-spot-sub">薯元 / 袋</div>
        </div>

        <div className="metrics-position">
          <div className="metric-bar-head">
            <span>存薯量</span>
            <strong>{formatSignedQty(hourData.positionQty)} 袋</strong>
          </div>
          <div className="position-track">
            <div className="position-axis" />
            <div
              className="position-fill"
              style={{
                left: hourData.positionQty >= 0 ? "50%" : `${positionPercent}%`,
                width: `${Math.abs(hourData.positionQty) / 240 * 50}%`,
                background: hourData.positionQty >= 0 ? COLORS.buy : COLORS.sell,
              }}
            />
          </div>
          <div className="position-scale">
            <span>-240</span>
            <span>0</span>
            <span>+240</span>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span>可收量上限</span>
          <strong>{formatQty(hourData.canBuyQty)}</strong>
          <small>当前余量</small>
        </div>
        <div className="metric-card">
          <span>可放量上限</span>
          <strong>{formatQty(hourData.canSellQty)}</strong>
          <small>当前可放空间</small>
        </div>
        <div className="metric-card">
          <span>已搓成量</span>
          <strong>{formatQty(hourData.filledQty)}</strong>
          <small>该时段累计搓成</small>
        </div>
        <div className="metric-card">
          <span>未搓成量</span>
          <strong>{formatQty(hourData.pendingQty)}</strong>
          <small>当前土豆牌待成交</small>
        </div>
      </div>

      <div className="metric-bars">
        <MetricBar label="可收量占用" value={hourData.pendingQty} maxValue={hourData.canBuyQty} tone="buy" />
        <MetricBar label="成交完成度" value={hourData.filledQty} maxValue={maxCapacity} tone="amber" />
        <MetricBar label="薯盘活跃度" value={hourData.activity} maxValue={100} tone="sky" />
      </div>

      <div className="active-order-card">
        <div>
          <div className="active-order-label">当前活动土豆牌</div>
          <div className="active-order-value">
            {hourData.activeOrderSide
              ? `${hourData.activeOrderSide === "buy" ? "收牌" : "放牌"} @ ${formatPrice(hourData.activeOrderPrice)}`
              : "暂无活动土豆牌"}
          </div>
        </div>
        <div className="active-order-badges">
          <span className="badge-chip">锁定方向 {hourData.lockedSide ? (hourData.lockedSide === "buy" ? "收" : "放") : "未锁定"}</span>
          <span className="badge-chip">未成 {formatQty(hourData.pendingQty)} 袋</span>
        </div>
      </div>
    </section>
  );
}
