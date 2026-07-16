import { Candle } from "../types";

/**
 * Calculates Exponential Moving Average (EMA) for a series of numbers
 * @param data Array of numbers (e.g., closing prices)
 * @param period EMA period (e.g., 5 or 13)
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  
  const k = 2 / (period + 1);
  const ema: number[] = [];
  
  // Start with simple moving average or first value
  let prevEma = data[0];
  ema.push(Number(prevEma.toFixed(2)));
  
  for (let i = 1; i < data.length; i++) {
    const currentEma = data[i] * k + prevEma * (1 - k);
    ema.push(Number(currentEma.toFixed(2)));
    prevEma = currentEma;
  }
  
  return ema;
}

/**
 * Takes an array of candles with missing EMA values and calculates them dynamically based on close prices.
 */
export function enrichCandlesWithEMA(candles: Omit<Candle, "ema5" | "ema13">[]): Candle[] {
  const closes = candles.map(c => c.close);
  const ema5Values = calculateEMA(closes, 5);
  const ema13Values = calculateEMA(closes, 13);
  
  return candles.map((candle, index) => ({
    ...candle,
    ema5: ema5Values[index] ?? candle.close,
    ema13: ema13Values[index] ?? candle.close,
  })) as Candle[];
}

/**
 * Simulates a new gold candle based on previous candle parameters
 */
export function generateNextCandle(prevCandle: Candle, trend: "up" | "down" | "flat" | "volatile"): Omit<Candle, "ema5" | "ema13"> {
  const currentPrice = prevCandle.close;
  let changePercent = 0.0005; // 0.05% typical 1m move
  
  if (trend === "volatile") {
    changePercent = 0.0015; // 0.15% for volatility
  }
  
  const maxMove = currentPrice * changePercent;
  let move = (Math.random() - 0.5) * maxMove;
  
  if (trend === "up") {
    move = (Math.random() * 0.7 - 0.2) * maxMove; // Bias positive
  } else if (trend === "down") {
    move = (Math.random() * 0.7 - 0.5) * maxMove; // Bias negative
  } else if (trend === "flat") {
    move = (Math.random() - 0.5) * (maxMove * 0.4); // Narrow moves
  }
  
  const nextClose = Number((currentPrice + move).toFixed(2));
  const open = prevCandle.close;
  
  const spread = Math.random() * (maxMove * 0.8);
  const high = Number((Math.max(open, nextClose) + spread * 0.5).toFixed(2));
  const low = Number((Math.min(open, nextClose) - spread * 0.5).toFixed(2));
  
  const volume = Math.floor(Math.random() * 800 + 400);
  
  // Generate a random time HH:MM (+1 minute)
  const [h, m] = prevCandle.time.split(":").map(Number);
  let nextM = m + 1;
  let nextH = h;
  if (nextM >= 60) {
    nextM = 0;
    nextH = (h + 1) % 24;
  }
  const timeStr = `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;
  
  return {
    time: timeStr,
    open,
    high,
    low,
    close: nextClose,
    volume
  };
}
