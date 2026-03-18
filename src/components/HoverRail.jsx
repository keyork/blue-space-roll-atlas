import {
  formatBookQty,
  formatHour,
  formatPrice,
  formatQty,
  formatSignedQty,
} from "../lib/market";

function LadderList({ hourData, maxQty }) {
  const levels = [
    ...[...hourData.bids].reverse().map((level, index) => ({
      side: "buy",
      label: `收${hourData.bids.length - index}`,
      ...level,
    })),
    ...hourData.asks.map((level, index) => ({
      side: "sell",
      label: `放${index + 1}`,
      ...level,
    })),
  ];

  return (
    <div className="hover-rail-ladder">
      <div className="hover-rail-ladder-title">收10 → 收1 → 放1 → 放10</div>
      <div className="hover-rail-ladder-list">
        {levels.map((level, index) => {
          const ratio = maxQty > 0 ? level.qty / maxQty : 0;
          const isActiveOrder =
            hourData.activeOrderSide === level.side && hourData.activeOrderPrice === level.price;
          return (
            <div
              key={`${level.side}-${level.price}-${index}`}
              className={`hover-rail-level ${isActiveOrder ? "is-active-order" : ""}`}
            >
              <div className="hover-rail-level-meta">
                <span>{level.label}</span>
                <strong>{formatPrice(level.price)}</strong>
              </div>
              <div className="hover-rail-level-bar">
                <div
                  className={`hover-rail-level-fill hover-rail-level-fill-${level.side}`}
                  style={{ width: `${Math.max(3, ratio * 100)}%` }}
                />
                {isActiveOrder ? <div className="hover-rail-order-pin" /> : null}
              </div>
              <div className="hover-rail-level-qty">
                {isActiveOrder ? (
                  <span className={`hover-rail-order-badge hover-rail-order-badge-${level.side}`}>
                    我方 {formatBookQty(hourData.pendingQty)}
                  </span>
                ) : (
                  formatBookQty(level.qty)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HoverRail({ hourData }) {
  if (!hourData) {
    return <aside className="hover-rail-shell" aria-hidden="true" />;
  }

  const maxQty = Math.max(
    ...hourData.bids.map((bid) => bid.qty),
    ...hourData.asks.map((ask) => ask.qty),
    1,
  );

  return (
    <aside className="hover-rail-shell">
      <div className="hover-rail-track" />
      <div className="hover-rail-body">
        <div className="hover-rail-kicker">Focus Rail</div>
        <div className="hover-rail-hour">{formatHour(hourData.hour)}</div>

        <div className="hover-rail-prices">
          <div className="hover-rail-chip hover-rail-chip-last">
            <span>最新成交</span>
            <strong>{formatPrice(hourData.lastPrice)}</strong>
          </div>
          <div className="hover-rail-chip hover-rail-chip-order">
            <span>当前土豆牌</span>
            <strong>
              {hourData.activeOrderPrice != null
                ? `${hourData.activeOrderSide === "buy" ? "收" : "放"} ${formatPrice(hourData.activeOrderPrice)}`
                : "—"}
            </strong>
            <small className="hover-rail-order-note">
              {hourData.activeOrderPrice != null ? `${formatQty(hourData.pendingQty)} 袋，贴 ${hourData.activeOrderPrice === (hourData.activeOrderSide === "buy" ? hourData.b1 : hourData.a1) ? "1" : "2"} 档` : "当前无我方土豆牌"}
            </small>
          </div>
        </div>

        <div className="hover-rail-metrics">
          <div>
            <span>存薯</span>
            <strong>{formatSignedQty(hourData.positionQty)}</strong>
          </div>
          <div>
            <span>搓成</span>
            <strong>{formatQty(hourData.filledQty)}</strong>
          </div>
          <div>
            <span>未成</span>
            <strong>{formatQty(hourData.pendingQty)}</strong>
          </div>
          <div>
            <span>价差</span>
            <strong>{formatPrice(hourData.a1 - hourData.b1)}</strong>
          </div>
        </div>

        <div className="hover-rail-ladders">
          <LadderList hourData={hourData} maxQty={maxQty} />
        </div>
      </div>
    </aside>
  );
}
