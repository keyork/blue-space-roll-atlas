import { formatBookQty, formatPrice } from "../lib/market";
import { COLORS } from "../theme";
import { PanelTitle, StatPill } from "./common";

function LevelRow({ bid, ask, maxQty, activeSide, activePrice }) {
  const bidHighlight =
    activeSide === "buy" && bid && Math.abs(bid.price - activePrice) < 0.55;
  const askHighlight =
    activeSide === "sell" && ask && Math.abs(ask.price - activePrice) < 0.55;
  const bidRatio = (bid?.qty ?? 0) / maxQty;
  const askRatio = (ask?.qty ?? 0) / maxQty;

  return (
    <div className="orderbook-row">
      <div className="orderbook-side orderbook-side-buy">
        <div
          className="orderbook-bar orderbook-bar-buy"
          style={{ width: `${bidRatio * 100}%` }}
        />
        <div className="orderbook-qty-block orderbook-qty-block-buy">
          <span className="orderbook-qty">{formatBookQty(bid?.qty)}</span>
        </div>
        <div className="orderbook-meter">
          <div className="orderbook-meter-track">
            <div
              className="orderbook-meter-fill orderbook-meter-fill-buy"
              style={{ width: `${bidRatio * 100}%` }}
            />
          </div>
        </div>
      </div>
      <div className={`orderbook-price-cell ${bidHighlight ? "is-buy-highlight" : ""}`}>
        {formatPrice(bid?.price)}
      </div>
      <div className="orderbook-mid-sep" />
      <div className={`orderbook-price-cell ${askHighlight ? "is-sell-highlight" : ""}`}>
        {formatPrice(ask?.price)}
      </div>
      <div className="orderbook-side orderbook-side-sell">
        <div
          className="orderbook-bar orderbook-bar-sell"
          style={{ width: `${askRatio * 100}%` }}
        />
        <div className="orderbook-qty-block orderbook-qty-block-sell">
          <span className="orderbook-qty">{formatBookQty(ask?.qty)}</span>
        </div>
        <div className="orderbook-meter">
          <div className="orderbook-meter-track">
            <div
              className="orderbook-meter-fill orderbook-meter-fill-sell"
              style={{ width: `${askRatio * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderBookPanel({ hourData }) {
  const maxQty = Math.max(
    ...hourData.bids.map((bid) => bid.qty),
    ...hourData.asks.map((ask) => ask.qty),
    1,
  );

  return (
    <section className="panel-card">
      <PanelTitle
        eyebrow="选中时段"
        title="薯盘收 1-10 / 放 1-10"
        aside={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <StatPill label="收一" value={formatPrice(hourData.b1)} tone="buy" />
            <StatPill label="放一" value={formatPrice(hourData.a1)} tone="sell" />
            <StatPill label="价差" value={formatPrice(hourData.a1 - hourData.b1)} tone="amber" />
          </div>
        }
      />

      <div className="orderbook-head">
        <span>收量</span>
        <span>收价</span>
        <span />
        <span>放价</span>
        <span>放量</span>
      </div>

      <div className="orderbook-body">
        {Array.from({ length: 10 }, (_, index) => {
          const bid = hourData.bids[index];
          const ask = hourData.asks[index];
          return (
            <LevelRow
              key={`${bid?.price}-${ask?.price}-${index}`}
              bid={bid}
              ask={ask}
              maxQty={maxQty}
              activeSide={hourData.activeOrderSide}
              activePrice={hourData.activeOrderPrice}
            />
          );
        })}
      </div>
    </section>
  );
}
