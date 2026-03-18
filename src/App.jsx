import { useEffect, useMemo, useRef, useState } from "react";
import { HoverRail } from "./components/HoverRail";
import { MetricsPanel } from "./components/MetricsPanel";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { TradingAtlas } from "./components/TradingAtlas";
import { TradingDesk } from "./components/TradingDesk";
import { useFlash } from "./hooks/useFlash";
import {
  EVENT_LIMIT,
  TICK_INTERVAL_MS,
  cancelManualOrder,
  createDefaultAgentConfig,
  createInitialMarket,
  deriveMarketEvents,
  describeTradeDate,
  formatEventTime,
  formatHour,
  formatPrice,
  placeManualOrder,
  summarizeDay,
  tickMarket,
} from "./lib/market";

export default function App() {
  const [market, setMarket] = useState(createInitialMarket);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(10);
  const [hoveredHour, setHoveredHour] = useState(null);
  const [agentOn, setAgentOn] = useState(true);
  const [agentConfig, setAgentConfig] = useState(createDefaultAgentConfig);
  const [events, setEvents] = useState([]);
  const eventId = useRef(0);
  const { flashMap, trigger } = useFlash();

  const appendEvent = (type, msg, hour) => {
    const id = ++eventId.current;
    setEvents((current) =>
      [{ id, type, msg, time: formatEventTime(), hour }, ...current].slice(0, EVENT_LIMIT),
    );
    if (hour != null) {
      trigger(hour, type);
    }
  };

  useEffect(() => {
    if (!selectedDate && market.dates.length > 0) {
      setSelectedDate(market.dates[0]);
    }
  }, [market.dates, selectedDate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMarket((previous) => {
        const nextMarket = tickMarket(previous);
        const liveDate = previous.dates[0];
        deriveMarketEvents(previous.data[liveDate], nextMarket.data[liveDate]).forEach((event) => {
          appendEvent(event.type, event.msg, event.hour);
        });
        return nextMarket;
      });
    }, TICK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const dayData = market.data[selectedDate] ?? [];
  const selectedHourData = dayData[selectedHour] ?? dayData[0];
  const railHourData = hoveredHour != null ? dayData[hoveredHour] : selectedHourData;
  const summary = useMemo(() => summarizeDay(dayData), [dayData]);
  const activeAgentCount = useMemo(
    () => Object.values(agentConfig).filter((config) => config.enabled).length,
    [agentConfig],
  );

  const handleOrder = (order) => {
    const nextMarket = placeManualOrder(market, selectedDate, order);
    if (nextMarket === market) {
      return;
    }

    setMarket(nextMarket);
    appendEvent(
      "order",
      `${formatHour(order.hour)} 手动${order.side === "buy" ? "收" : "放"}牌 ${order.qty} 袋 @ ${formatPrice(order.price)}`,
      order.hour,
    );
  };

  const handleCancel = (hour) => {
    const activeHour = market.data[selectedDate]?.[hour];
    if (!activeHour?.activeOrderSide) {
      return;
    }

    setMarket(cancelManualOrder(market, selectedDate, hour));
    appendEvent(
      "cancel",
      `${formatHour(hour)} 手动撤下${activeHour.activeOrderSide === "buy" ? "收" : "放"}牌，原价 ${formatPrice(activeHour.activeOrderPrice)}`,
      hour,
    );
  };

  return (
    <div className="trading-app">
      <section className="overview-shell">
        <header className="top-frame">
          <div className="top-brand">
            <div className="top-kicker">蓝色空间市场观测</div>
            <h1>时序薯盘图谱</h1>
            <p>面向小时土豆时段的连续市场界面，突出薯盘、存薯、边界与盯梢器逐小时配置。</p>
          </div>

          <div className="top-stats">
            <div className="shell-chip">
              <span>市场状态</span>
              <strong>Signal Online</strong>
            </div>
            <div className="shell-chip">
              <span>总搓成</span>
              <strong>{summary.totalFilled} 袋</strong>
            </div>
            <div className="shell-chip">
              <span>活跃时段</span>
              <strong>{summary.activeOrderHours} / 24</strong>
            </div>
            <div className="shell-chip">
              <span>盯梢器</span>
              <strong>{activeAgentCount} / 24</strong>
            </div>
          </div>
        </header>

        <div className="date-section">
          <div className="date-section-label">
            <span>观测日范围</span>
            <strong>未来开放薯档</strong>
          </div>
          <div className="date-rail">
            {market.dates.map((dateKey) => {
              const info = describeTradeDate(dateKey);
              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`date-tile ${selectedDate === dateKey ? "is-active" : ""}`}
                  onClick={() => setSelectedDate(dateKey)}
                >
                  <span>T+{info.offset}</span>
                  <strong>{info.short}</strong>
                  <small>{info.weekday}</small>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="workspace-grid">
        <aside className="hover-column">
          <HoverRail hourData={railHourData} />
        </aside>

        <section className="market-stage">
          {dayData.length > 0 ? (
            <>
              <TradingAtlas
                dayData={dayData}
                selectedHour={selectedHour}
                onSelectHour={setSelectedHour}
                hoveredHour={hoveredHour}
                onHoverHourChange={setHoveredHour}
                flashMap={flashMap}
                agentConfig={agentConfig}
              />
              <div className="detail-grid">
                <OrderBookPanel hourData={selectedHourData} />
                <MetricsPanel hourData={selectedHourData} />
              </div>
            </>
          ) : null}
        </section>

        <aside className="desk-column">
          {selectedHourData ? (
            <TradingDesk
              selectedHour={selectedHour}
              hourData={selectedHourData}
              events={events}
              onOrder={handleOrder}
              onCancelOrder={handleCancel}
              agentOn={agentOn}
              onToggleAgent={() => setAgentOn((value) => !value)}
              agentConfig={agentConfig}
              onChangeAgentConfig={setAgentConfig}
            />
          ) : null}
        </aside>
      </main>
    </div>
  );
}
