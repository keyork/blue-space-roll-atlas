import { useEffect, useMemo, useRef, useState } from "react";
import { HOURS, formatHour, formatPrice, formatQty, formatSignedQty } from "../lib/market";
import { COLORS, EVENT_STYLES } from "../theme";
import { PanelTitle, StatPill } from "./common";

function AgentRow({ hour, config, onChange }) {
  return (
    <div className="agent-row">
      <div className="agent-hour">{formatHour(hour)}</div>
      <div className="agent-inputs">
        <input
          type="number"
          value={config.min}
          onChange={(event) => onChange({ ...config, min: Number(event.target.value) })}
        />
        <input
          type="number"
          value={config.max}
          onChange={(event) => onChange({ ...config, max: Number(event.target.value) })}
        />
        <input
          type="number"
          value={config.ratio}
          onChange={(event) => onChange({ ...config, ratio: Number(event.target.value) })}
        />
        <input
          type="number"
          value={config.maxQ}
          onChange={(event) => onChange({ ...config, maxQ: Number(event.target.value) })}
        />
      </div>
      <button
        type="button"
        className={`agent-toggle ${config.enabled ? "is-on" : ""}`}
        onClick={() => onChange({ ...config, enabled: !config.enabled })}
      >
        {config.enabled ? "启用" : "关闭"}
      </button>
    </div>
  );
}

export function TradingDesk({
  selectedHour,
  hourData,
  events,
  onOrder,
  onCancelOrder,
  agentOn,
  onToggleAgent,
  agentConfig,
  onChangeAgentConfig,
}) {
  const [tab, setTab] = useState("trade");
  const [side, setSide] = useState("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const feedRef = useRef(null);

  useEffect(() => {
    if (!hourData) {
      return;
    }
    setPrice(formatPrice(side === "buy" ? hourData.b1 : hourData.a1));
  }, [hourData, side]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const enabledAgentCount = useMemo(
    () => Object.values(agentConfig).filter((config) => config.enabled).length,
    [agentConfig],
  );

  const hasOrder = hourData?.activeOrderSide != null;
  const canBuy = !hasOrder && (!hourData?.lockedSide || hourData.lockedSide === "buy");
  const canSell = !hasOrder && (!hourData?.lockedSide || hourData.lockedSide === "sell");
  const accent = side === "buy" ? COLORS.buy : COLORS.sell;

  return (
    <section className="desk-shell">
      <div className="desk-topbar">
        <div>
          <div className="panel-eyebrow">操作台</div>
          <h2 className="desk-title">自动盯梢器 + 手动盯盘</h2>
        </div>
        <button
          type="button"
          className={`desk-agent-switch ${agentOn ? "is-on" : ""}`}
          onClick={onToggleAgent}
        >
          盯梢器 {agentOn ? "ON" : "OFF"}
          <span>{enabledAgentCount}/24</span>
        </button>
      </div>

      <div className="desk-tabs">
        {[
          ["trade", "搓牌操作"],
          ["agent", "逐小时盯梢器配置"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`desk-tab ${tab === key ? "is-active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "trade" ? (
        <div className="desk-scroll">
          <section className="desk-card">
            <PanelTitle
              eyebrow="当前时段"
              title={`${formatHour(selectedHour)} 手动挂牌`}
              aside={<StatPill label="存薯" value={`${formatSignedQty(hourData.positionQty)} 袋`} tone="sky" />}
            />

            <div className="desk-current-grid">
              <div>
                <span>收一</span>
                <strong style={{ color: COLORS.buy }}>{formatPrice(hourData.b1)}</strong>
              </div>
              <div>
                <span>放一</span>
                <strong style={{ color: COLORS.sell }}>{formatPrice(hourData.a1)}</strong>
              </div>
              <div>
                <span>已搓成</span>
                <strong>{formatQty(hourData.filledQty)}</strong>
              </div>
              <div>
                <span>未搓成</span>
                <strong>{formatQty(hourData.pendingQty)}</strong>
              </div>
            </div>

            {hasOrder ? (
              <div className="desk-order-state">
                <div>
                  <div className="desk-order-state-title">
                    当前已有{hourData.activeOrderSide === "buy" ? "收" : "放"}牌
                  </div>
                  <div className="desk-order-state-meta">
                    {formatQty(hourData.pendingQty)} 袋 @ {formatPrice(hourData.activeOrderPrice)}
                  </div>
                </div>
                <button type="button" className="outline-button" onClick={() => onCancelOrder(selectedHour)}>
                  撤牌
                </button>
              </div>
            ) : (
              <>
                <div className="desk-side-toggle">
                  <button
                    type="button"
                    disabled={!canBuy}
                    className={side === "buy" ? "is-buy-active" : ""}
                    onClick={() => setSide("buy")}
                  >
                    收薯
                  </button>
                  <button
                    type="button"
                    disabled={!canSell}
                    className={side === "sell" ? "is-sell-active" : ""}
                    onClick={() => setSide("sell")}
                  >
                    放薯
                  </button>
                </div>

                {hourData.lockedSide ? (
                <div className="desk-lock-note">
                  当前时段已锁定{hourData.lockedSide === "buy" ? "收" : "放"}方向，仅允许同方向土豆牌。
                </div>
                ) : null}

                <div className="desk-form-grid">
                  <label>
                    <span>土豆牌价格</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>土豆牌数量</span>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  style={{ background: accent }}
                  onClick={() => {
                    if (!price || !quantity) {
                      return;
                    }
                    onOrder({
                      side,
                      price: Number(price),
                      qty: Number(quantity),
                      hour: selectedHour,
                    });
                    setQuantity("");
                  }}
                >
                  提交{side === "buy" ? "收" : "放"}牌
                </button>
              </>
            )}
          </section>

          <section className="desk-card">
            <PanelTitle
              eyebrow="实时流"
              title="市场流"
              aside={<div className="panel-mini-note">最新动静固定显示在顶部</div>}
            />
            <div ref={feedRef} className="desk-feed">
              {events.length === 0 ? (
                <div className="desk-empty">等待市场和薯盘事件…</div>
              ) : (
                events.map((event) => {
                  const style = EVENT_STYLES[event.type] || EVENT_STYLES.market;
                  return (
                    <div key={event.id} className="feed-item">
                      <div
                        className="feed-chip"
                        style={{ color: style.color, background: style.background }}
                      >
                        {style.icon}
                      </div>
                      <div className="feed-body">
                        <div className="feed-message">{event.msg}</div>
                        <div className="feed-time">{event.time}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="desk-scroll">
          <section className="desk-card">
            <PanelTitle
              eyebrow="盯梢器参数矩阵"
              title="每个小时单独配置"
              aside={<StatPill label="已启用时段" value={`${enabledAgentCount} / 24`} tone="amber" />}
            />
            <div className="agent-batch">
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  const nextConfig = {};
                  Object.entries(agentConfig).forEach(([hour, config]) => {
                    nextConfig[hour] = { ...config, enabled: true };
                  });
                  onChangeAgentConfig(nextConfig);
                }}
              >
                全部启用
              </button>
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  const nextConfig = {};
                  Object.entries(agentConfig).forEach(([hour, config]) => {
                    nextConfig[hour] = { ...config, enabled: false };
                  });
                  onChangeAgentConfig(nextConfig);
                }}
              >
                全部禁用
              </button>
            </div>

            <div className="agent-head">
              <span>时段</span>
              <span>价格边界 / 薯量比例 / 最大薯量</span>
              <span>状态</span>
            </div>

            <div className="agent-list">
              {HOURS.map((hour) => (
                <AgentRow
                  key={hour}
                  hour={hour}
                  config={agentConfig[hour]}
                  onChange={(nextConfig) =>
                    onChangeAgentConfig({
                      ...agentConfig,
                      [hour]: nextConfig,
                    })
                  }
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
