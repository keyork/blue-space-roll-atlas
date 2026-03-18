const PRICE_MIN = 0;
const PRICE_MAX = 800;
const SPREAD_MIN = 1.2;
const SPREAD_MAX = 8.4;
const LEVEL_COUNT = 10;
const BOOK_QTY_MIN = 0.001;
const BOOK_QTY_MAX = 1200;
const MAX_POSITION_QTY = 240;
const MAX_FILLED_QTY = 220;
const MAX_PENDING_QTY = 180;
const MAX_LIMIT_QTY = 320;
const MIN_LIMIT_QTY = 40;
const MIN_ACTIVITY = 24;
const MAX_ACTIVITY = 98;

export const TICK_INTERVAL_MS = 3600;
export const EVENT_LIMIT = 80;
export const HOURS = Array.from({ length: 24 }, (_, index) => index);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, ratio) => start + (end - start) * ratio;
const round2 = (value) => Number(value.toFixed(2));
const round3 = (value) => Number(value.toFixed(3));
const rand = (base, variance) => base + (Math.random() - 0.5) * variance;
const randInt = (base, variance) =>
  Math.round(base + (Math.random() - 0.5) * variance);
const pick = (values) => values[Math.floor(Math.random() * values.length)];

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

const clampPosition = (value) => clamp(Math.round(value), -MAX_POSITION_QTY, MAX_POSITION_QTY);
const clampFilled = (value) => clamp(Math.round(value), 0, MAX_FILLED_QTY);
const clampPending = (value) => clamp(Math.round(value), 0, MAX_PENDING_QTY);
const clampLimit = (value) => clamp(Math.round(value), MIN_LIMIT_QTY, MAX_LIMIT_QTY);
const clampActivity = (value) => clamp(Math.round(value), MIN_ACTIVITY, MAX_ACTIVITY);
const normalizeSide = (value) => (value === "buy" || value === "sell" ? value : null);

const cloneHour = (hour) => ({
  ...hour,
  bids: hour.bids.map((bid) => ({ ...bid })),
  asks: hour.asks.map((ask) => ({ ...ask })),
});

const getTradeDates = () => {
  const base = new Date();
  const dates = [];
  let offset = 2;

  while (dates.length < 4 && offset < 12) {
    const nextDate = new Date(base);
    nextDate.setDate(base.getDate() + offset);
    if (!isWeekend(nextDate)) {
      dates.push(formatLocalDate(nextDate));
    }
    offset += 1;
  }

  return dates;
};

const computeLimits = (positionQty, activity, skew = 0) => {
  const buyRoom = 210 - Math.max(positionQty, 0) * 0.48 + activity * 0.8 + skew;
  const sellRoom = 210 - Math.max(-positionQty, 0) * 0.48 + (100 - activity) * 0.8 - skew;
  return {
    canBuyQty: clampLimit(buyRoom),
    canSellQty: clampLimit(sellRoom),
  };
};

const resolveLockedSide = (hour) => {
  const lockedSide = normalizeSide(hour.lockedSide);
  if (lockedSide) {
    return lockedSide;
  }
  if (hour.filledQty <= 0) {
    return null;
  }
  return normalizeSide(hour.activeOrderSide) || (hour.positionQty >= 0 ? "buy" : "sell");
};

const blendBands = (left, right, ratio) => ({
  low: lerp(left.low, right.low, ratio),
  high: lerp(left.high, right.high, ratio),
});

const smoothRatio = (value, start, end) => {
  const ratio = clamp((value - start) / (end - start), 0, 1);
  return ratio * ratio * (3 - 2 * ratio);
};

const getHourPriceBand = (hour) => {
  const dawn = { low: 180, high: 380 };
  const morningPeak = { low: 360, high: 760 };
  const noonValley = { low: 90, high: 220 };
  const eveningPeak = { low: 420, high: 800 };
  const late = { low: 260, high: 520 };

  if (hour <= 4) {
    return dawn;
  }
  if (hour <= 8) {
    return blendBands(dawn, morningPeak, smoothRatio(hour, 4, 8));
  }
  if (hour <= 12) {
    return blendBands(morningPeak, noonValley, smoothRatio(hour, 8, 12));
  }
  if (hour <= 18) {
    return blendBands(noonValley, eveningPeak, smoothRatio(hour, 12, 18));
  }
  if (hour <= 21) {
    return eveningPeak;
  }
  return blendBands(eveningPeak, late, smoothRatio(hour, 21, 23));
};

const buildBook = (midPrice, spread, activity, imbalance, previous = {}) => {
  const bidBase = midPrice - spread / 2;
  const askBase = midPrice + spread / 2;
  const makeJaggedQty = (prevQty, bias, level) => {
    const levelWeight = 1 - level / (LEVEL_COUNT - 1);
    const levelCap = Math.max(BOOK_QTY_MIN, BOOK_QTY_MAX - level * 102);
    const tooth =
      (level % 2 === 0 ? 1 : -1) * (220 + levelWeight * 260) +
      ((level + 1) % 3 === 0 ? 180 : -120);
    const spike =
      Math.random() > 0.62
        ? rand(320 + level * 18, 260)
        : rand(-220 - level * 12, 210);
    const targetQty =
      40 +
      levelWeight * levelWeight * (activity * 7.8 + 180) +
      Math.max(0, bias) * (22 + levelWeight * 34) +
      tooth +
      spike +
      rand(0, 260 + level * 40);

    return round3(
      clamp(
        prevQty * 0.16 + targetQty * 0.84 + rand(0, 90 + level * 18),
        BOOK_QTY_MIN,
        levelCap,
      ),
    );
  };

  const bids = Array.from({ length: LEVEL_COUNT }, (_, level) => {
    const prevQty = previous.bids?.[level]?.qty ?? round3(clamp(rand(420, 520), BOOK_QTY_MIN, BOOK_QTY_MAX));
    const bias = imbalance > 0 ? 14 : -4;
    const offset =
      level === 0
        ? 0
        : 4 +
          level * 1.25 +
          Math.pow(level, 1.42) * 7.2 +
          Math.max(0, activity - 50) * 0.05 +
          Math.random() * 4.5;
    return {
      price: round2(clamp(bidBase - offset, PRICE_MIN, PRICE_MAX)),
      qty: makeJaggedQty(prevQty, bias, level),
    };
  });

  const asks = Array.from({ length: LEVEL_COUNT }, (_, level) => {
    const prevQty = previous.asks?.[level]?.qty ?? round3(clamp(rand(420, 520), BOOK_QTY_MIN, BOOK_QTY_MAX));
    const bias = imbalance < 0 ? 14 : -4;
    const offset =
      level === 0
        ? 0
        : 6 +
          level * 1.8 +
          Math.pow(level, 1.6) * 10.5 +
          Math.max(0, activity - 50) * 0.08 +
          Math.random() * 7.5;
    return {
      price: round2(clamp(askBase + offset, PRICE_MIN, PRICE_MAX)),
      qty: makeJaggedQty(prevQty, bias, level),
    };
  });

  return { bids, asks };
};

const withBestPrices = (hour) => ({
  ...hour,
  b1: hour.bids[0]?.price ?? round2(hour.midPrice - hour.spread / 2),
  a1: hour.asks[0]?.price ?? round2(hour.midPrice + hour.spread / 2),
});

const snapOrderPriceToBook = (hour, side, targetPrice = null) => {
  const levels = (side === "buy" ? hour.bids : hour.asks).slice(0, 2);
  if (!levels?.length) {
    return null;
  }
  if (targetPrice == null || !Number.isFinite(targetPrice)) {
    return levels[0].price;
  }

  return levels.reduce((closest, level) => {
    if (!closest) {
      return level;
    }
    return Math.abs(level.price - targetPrice) < Math.abs(closest.price - targetPrice)
      ? level
      : closest;
  }, null)?.price ?? levels[0].price;
};

const normalizeHour = (hour) => {
  const next = withBestPrices(cloneHour(hour));
  next.anchorPrice = clamp(round2(next.anchorPrice), PRICE_MIN, PRICE_MAX);
  next.lastPrice = clamp(round2(next.lastPrice), PRICE_MIN, PRICE_MAX);
  next.midPrice = clamp(round2(next.midPrice), PRICE_MIN, PRICE_MAX);
  next.spread = clamp(round2(next.spread), SPREAD_MIN, SPREAD_MAX);
  next.positionQty = clampPosition(next.positionQty);
  next.activity = clampActivity(next.activity);
  next.filledQty = clampFilled(next.filledQty);
  next.pendingQty = clampPending(next.pendingQty);
  next.imbalance = clamp(next.imbalance, -1, 1);
  next.lockedSide = resolveLockedSide(next);

  const limits = computeLimits(next.positionQty, next.activity, next.imbalance * 20);
  next.canBuyQty = limits.canBuyQty;
  next.canSellQty = limits.canSellQty;

  if (next.lockedSide && next.activeOrderSide && next.activeOrderSide !== next.lockedSide) {
    next.activeOrderSide = null;
    next.activeOrderPrice = null;
    next.pendingQty = 0;
  }

  if (next.activeOrderSide === "buy") {
    next.pendingQty = Math.min(next.pendingQty, next.canBuyQty);
    next.activeOrderPrice = snapOrderPriceToBook(next, "buy", next.activeOrderPrice);
  } else if (next.activeOrderSide === "sell") {
    next.pendingQty = Math.min(next.pendingQty, next.canSellQty);
    next.activeOrderPrice = snapOrderPriceToBook(next, "sell", next.activeOrderPrice);
  } else {
    next.activeOrderPrice = null;
    next.pendingQty = 0;
  }

  if (next.pendingQty === 0) {
    next.activeOrderSide = null;
    next.activeOrderPrice = null;
  }

  next.change = round2(next.lastPrice - next.anchorPrice);
  return next;
};

const createHour = (hour, dayIndex, previousHour = null) => {
  const band = getHourPriceBand(hour);
  const bandMid = (band.low + band.high) / 2;
  const bandSpan = band.high - band.low;
  const dayWave =
    0.5 +
    Math.sin((hour - 2) / 3.2) * 0.16 +
    Math.cos((hour + 1.4) / 2.35) * 0.12 +
    dayIndex * 0.025;
  const targetAnchor = clamp(
    round2(bandMid + (dayWave - 0.5) * bandSpan + rand(0, bandSpan * 0.08)),
    band.low,
    band.high,
  );
  const activity = clampActivity(randInt(58, 30));
  const imbalance = clamp(rand(0, 1.1), -1, 1);
  const spread = clamp(round2(2.2 + Math.random() * 3.4), SPREAD_MIN, SPREAD_MAX);
  const anchorPrice = clamp(
    round2(
      previousHour
        ? lerp(previousHour.anchorPrice, targetAnchor, 0.42) + rand(0, bandSpan * 0.04)
        : targetAnchor,
    ),
    band.low,
    band.high,
  );
  const targetLastPrice = clamp(
    round2(anchorPrice + rand(0, Math.max(8, bandSpan * 0.05)) + imbalance * 7),
    band.low,
    band.high,
  );
  const lastPrice = clamp(
    round2(
      previousHour
        ? lerp(previousHour.lastPrice, targetLastPrice, 0.46) + rand(0, bandSpan * 0.03)
        : targetLastPrice,
    ),
    band.low,
    band.high,
  );
  const positionQty = clampPosition(randInt(0, 220));
  const { canBuyQty, canSellQty } = computeLimits(positionQty, activity, imbalance * 20);
  const hasFill = Math.random() > 0.45;
  const filledQty = hasFill
    ? clampFilled(Math.min(Math.abs(positionQty) + randInt(18, 16), Math.max(canBuyQty, canSellQty)))
    : 0;
  const lockedSide = filledQty > 0 ? (positionQty >= 0 ? "buy" : "sell") : null;

  const book = buildBook(lastPrice, spread, activity, imbalance, previousHour ?? {});
  let activeOrderSide = null;
  let pendingQty = 0;
  let activeOrderPrice = null;

  if (Math.random() > 0.42) {
    activeOrderSide = lockedSide || pick(["buy", "sell"]);
    pendingQty = clampPending(
      randInt(activeOrderSide === "buy" ? canBuyQty / 2 : canSellQty / 2, 24),
    );
    const targetLevel = Math.random() > 0.52 ? 1 : 0;
    activeOrderPrice =
      activeOrderSide === "buy" ? book.bids[targetLevel].price : book.asks[targetLevel].price;
  }

  return normalizeHour({
    hour,
    anchorPrice,
    lastPrice,
    midPrice: lastPrice,
    spread,
    bids: book.bids,
    asks: book.asks,
    positionQty,
    canBuyQty,
    canSellQty,
    filledQty,
    pendingQty,
    activeOrderSide,
    activeOrderPrice,
    lockedSide,
    activity,
    imbalance,
  });
};

const createDayHours = (dayIndex) => {
  const hours = [];
  let previousHour = null;

  HOURS.forEach((hour) => {
    const nextHour = createHour(hour, dayIndex, previousHour);
    hours.push(nextHour);
    previousHour = nextHour;
  });

  return hours;
};

const updateStaticSignals = (hour) => {
  const anchorPull = (hour.anchorPrice - hour.lastPrice) * 0.2;
  hour.activity = clampActivity(hour.activity + randInt(0, 14));
  hour.imbalance = clamp(hour.imbalance + rand(0, 0.18), -1, 1);
  hour.lastPrice = clamp(
    round2(hour.lastPrice + anchorPull + rand(0, 7.6) + hour.imbalance * 3.2),
    PRICE_MIN,
    PRICE_MAX,
  );
  hour.midPrice = hour.lastPrice;
  hour.spread = clamp(round2(hour.spread + rand(0, 0.28)), SPREAD_MIN, SPREAD_MAX);
  const book = buildBook(hour.lastPrice, hour.spread, hour.activity, hour.imbalance, hour);
  hour.bids = book.bids;
  hour.asks = book.asks;
};

const applyFill = (hour) => {
  if (!hour.activeOrderSide || hour.pendingQty <= 0) {
    return;
  }

  const delta = Math.min(
    clampPending(randInt(16, 10)),
    hour.pendingQty,
    hour.activeOrderSide === "buy" ? hour.canBuyQty : hour.canSellQty,
  );
  if (delta <= 0) {
    return;
  }

  hour.pendingQty = clampPending(hour.pendingQty - delta);
  hour.filledQty = clampFilled(hour.filledQty + delta);
  hour.positionQty = clampPosition(
    hour.positionQty + (hour.activeOrderSide === "buy" ? delta : -delta),
  );
  hour.lockedSide = hour.lockedSide || hour.activeOrderSide;
};

const placeSyntheticOrder = (hour) => {
  if (hour.activeOrderSide) {
    return;
  }

  const side = hour.lockedSide || (hour.imbalance > 0.1 ? "buy" : hour.imbalance < -0.1 ? "sell" : pick(["buy", "sell"]));
  const capacity = side === "buy" ? hour.canBuyQty : hour.canSellQty;
  if (capacity <= 20) {
    return;
  }

  hour.activeOrderSide = side;
  hour.pendingQty = clampPending(randInt(capacity * 0.42, 20));
  const targetLevel = Math.random() > 0.5 ? 1 : 0;
  hour.activeOrderPrice = side === "buy" ? hour.bids[targetLevel].price : hour.asks[targetLevel].price;
};

const repriceOrder = (hour) => {
  if (!hour.activeOrderSide) {
    return;
  }

  hour.activeOrderPrice =
    hour.activeOrderSide === "buy"
      ? snapOrderPriceToBook(hour, "buy", hour.activeOrderPrice + rand(0, 10))
      : snapOrderPriceToBook(hour, "sell", hour.activeOrderPrice + rand(0, 10));
};

const cancelOrder = (hour) => {
  hour.pendingQty = 0;
  hour.activeOrderSide = null;
  hour.activeOrderPrice = null;
};

export const createInitialMarket = () => {
  const dates = getTradeDates();
  const data = {};
  dates.forEach((dateKey, dayIndex) => {
    data[dateKey] = createDayHours(dayIndex);
  });
  return { dates, data };
};

export const tickMarket = (market) => {
  const data = {};
  market.dates.forEach((dateKey) => {
    data[dateKey] = market.data[dateKey].map(cloneHour);
  });

  const liveDate = market.dates[0];
  const liveDay = data[liveDate];
  const touchedHours = new Set();
  while (touchedHours.size < 5) {
    touchedHours.add(Math.floor(Math.random() * HOURS.length));
  }

  touchedHours.forEach((hourIndex) => {
    const hour = liveDay[hourIndex];
    updateStaticSignals(hour);

    const roll = Math.random();
    if (roll < 0.28 && hour.activeOrderSide) {
      applyFill(hour);
    } else if (roll < 0.46 && !hour.activeOrderSide) {
      placeSyntheticOrder(hour);
    } else if (roll < 0.60 && hour.activeOrderSide) {
      repriceOrder(hour);
    } else if (roll < 0.72 && hour.activeOrderSide) {
      cancelOrder(hour);
    }

    liveDay[hourIndex] = normalizeHour(hour);
  });

  return { dates: market.dates, data };
};

export const deriveMarketEvents = (previousDay = [], nextDay = []) => {
  const events = [];

  nextDay.forEach((hour, hourIndex) => {
    const previous = previousDay[hourIndex];
    if (!previous) {
      return;
    }

    const fillDelta = hour.filledQty - previous.filledQty;
    if (fillDelta > 0) {
      events.push({
        type: "fill",
        hour: hourIndex,
        msg: `${formatHour(hourIndex)} 搓成 ${fillDelta} 袋，最新价 ${formatPrice(hour.lastPrice)}`,
      });
    }

    if (!previous.activeOrderSide && hour.activeOrderSide) {
      events.push({
        type: "order",
        hour: hourIndex,
        msg: `${formatHour(hourIndex)} ${hour.activeOrderSide === "buy" ? "收牌" : "放牌"}亮出 ${hour.pendingQty} 袋 @ ${formatPrice(hour.activeOrderPrice)}`,
      });
    }

    if (
      previous.activeOrderSide &&
      hour.activeOrderSide &&
      previous.activeOrderSide === hour.activeOrderSide &&
      previous.activeOrderPrice !== hour.activeOrderPrice
    ) {
      events.push({
        type: "market",
        hour: hourIndex,
        msg: `${formatHour(hourIndex)} ${hour.activeOrderSide === "buy" ? "收牌" : "放牌"}跟价到 ${formatPrice(hour.activeOrderPrice)}`,
      });
    }

    if (previous.activeOrderSide && !hour.activeOrderSide && fillDelta <= 0) {
      events.push({
        type: "cancel",
        hour: hourIndex,
        msg: `${formatHour(hourIndex)} 撤下${previous.activeOrderSide === "buy" ? "收" : "放"}牌，原价 ${formatPrice(previous.activeOrderPrice)}`,
      });
    }
  });

  return events;
};

export const createDefaultAgentConfig = () => {
  const config = {};
  HOURS.forEach((hour) => {
    config[hour] = {
      min: 285 + Math.round(Math.sin(hour / 4) * 16),
      max: 392 + Math.round(Math.cos(hour / 5) * 18),
      ratio: hour >= 9 && hour <= 20 ? 65 : 38,
      maxQ: hour >= 9 && hour <= 20 ? 140 : 80,
      enabled: hour >= 8 && hour <= 20,
    };
  });
  return config;
};

export const placeManualOrder = (market, dateKey, order) => {
  const day = market.data[dateKey];
  if (!day?.[order.hour]) {
    return market;
  }
  if (!Number.isFinite(order.price) || !Number.isFinite(order.qty) || order.qty <= 0) {
    return market;
  }
  if (normalizeSide(order.side) == null) {
    return market;
  }

  const nextDay = day.map(cloneHour);
  const nextHour = nextDay[order.hour];
  if (nextHour.activeOrderSide) {
    return market;
  }
  if (nextHour.lockedSide && nextHour.lockedSide !== order.side) {
    return market;
  }

  const maxAllowed = order.side === "buy" ? nextHour.canBuyQty : nextHour.canSellQty;
  if (maxAllowed <= 0) {
    return market;
  }

  nextHour.activeOrderSide = order.side;
  nextHour.pendingQty = clampPending(Math.min(order.qty, maxAllowed));
  nextHour.activeOrderPrice = snapOrderPriceToBook(nextHour, order.side, order.price);

  nextDay[order.hour] = normalizeHour(nextHour);
  return {
    dates: market.dates,
    data: {
      ...market.data,
      [dateKey]: nextDay,
    },
  };
};

export const cancelManualOrder = (market, dateKey, hourIndex) => {
  const day = market.data[dateKey];
  if (!day?.[hourIndex]) {
    return market;
  }

  const nextDay = day.map(cloneHour);
  cancelOrder(nextDay[hourIndex]);
  nextDay[hourIndex] = normalizeHour(nextDay[hourIndex]);

  return {
    dates: market.dates,
    data: {
      ...market.data,
      [dateKey]: nextDay,
    },
  };
};

export const summarizeDay = (dayData = []) => {
  const totalFilled = dayData.reduce((sum, hour) => sum + hour.filledQty, 0);
  const totalPending = dayData.reduce((sum, hour) => sum + hour.pendingQty, 0);
  const averagePrice =
    dayData.length > 0
      ? round2(dayData.reduce((sum, hour) => sum + hour.lastPrice, 0) / dayData.length)
      : 0;
  const activeOrderHours = dayData.filter((hour) => hour.activeOrderSide).length;
  const buyHeadroom = dayData.reduce((sum, hour) => sum + hour.canBuyQty, 0);
  const sellHeadroom = dayData.reduce((sum, hour) => sum + hour.canSellQty, 0);
  const averageActivity =
    dayData.length > 0
      ? Math.round(dayData.reduce((sum, hour) => sum + hour.activity, 0) / dayData.length)
      : 0;

  return {
    totalFilled,
    totalPending,
    averagePrice,
    activeOrderHours,
    buyHeadroom,
    sellHeadroom,
    averageActivity,
  };
};

export const describeTradeDate = (dateKey) => {
  const date = parseLocalDate(dateKey);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
  return {
    offset: diff,
    short: `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`,
    weekday,
  };
};

export const formatHour = (hour) => `${String(hour).padStart(2, "0")}:00`;
export const formatPrice = (value) =>
  value != null && Number.isFinite(value) ? value.toFixed(2) : "—";
export const formatQty = (value) =>
  value != null && Number.isFinite(value) ? Math.round(value).toLocaleString() : "—";
export const formatBookQty = (value) => {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  if (value >= 100) {
    return Math.round(value).toLocaleString();
  }
  if (value >= 10) {
    return value.toFixed(1);
  }
  if (value >= 1) {
    return value.toFixed(2);
  }
  return value.toFixed(3);
};
export const formatSignedQty = (value) =>
  value != null && Number.isFinite(value)
    ? `${value > 0 ? "+" : value < 0 ? "" : ""}${Math.round(value).toLocaleString()}`
    : "—";
export const formatEventTime = () =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
