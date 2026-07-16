import { MarketScenario } from "../types";
import { enrichCandlesWithEMA } from "../utils/indicators";

// Helper to create starting candles
const buildUptrendCandles = () => {
  const baseData = [
    { time: "09:40", open: 2345.50, high: 2346.80, low: 2344.20, close: 2346.10, volume: 450 },
    { time: "09:41", open: 2346.10, high: 2347.50, low: 2345.80, close: 2347.20, volume: 520 },
    { time: "09:42", open: 2347.20, high: 2348.00, low: 2346.50, close: 2346.90, volume: 480 },
    { time: "09:43", open: 2346.90, high: 2349.10, low: 2346.60, close: 2348.50, volume: 600 },
    { time: "09:44", open: 2348.50, high: 2351.40, low: 2348.10, close: 2350.80, volume: 720 },
    { time: "09:45", open: 2350.80, high: 2352.30, low: 2349.90, close: 2351.50, volume: 680 },
    { time: "09:46", open: 2351.50, high: 2354.00, low: 2351.00, close: 2353.60, volume: 810 },
    { time: "09:47", open: 2353.60, high: 2356.20, low: 2353.20, close: 2355.80, volume: 950 },
    { time: "09:48", open: 2355.80, high: 2358.50, low: 2355.10, close: 2357.90, volume: 1100 },
    { time: "09:49", open: 2357.90, high: 2361.20, low: 2357.50, close: 2360.50, volume: 1300 }, // Current Candle
  ];
  return enrichCandlesWithEMA(baseData);
};

const buildDowntrendCandles = () => {
  const baseData = [
    { time: "14:15", open: 2378.40, high: 2379.20, low: 2377.10, close: 2377.50, volume: 500 },
    { time: "14:16", open: 2377.50, high: 2378.00, low: 2375.40, close: 2375.90, volume: 550 },
    { time: "14:17", open: 2375.90, high: 2376.80, low: 2374.80, close: 2376.20, volume: 490 },
    { time: "14:18", open: 2376.20, high: 2376.50, low: 2373.10, close: 2373.80, volume: 680 },
    { time: "14:19", open: 2373.80, high: 2374.20, low: 2370.50, close: 2371.10, volume: 850 },
    { time: "14:20", open: 2371.10, high: 2372.50, low: 2369.80, close: 2370.20, volume: 730 },
    { time: "14:21", open: 2370.20, high: 2371.00, low: 2367.40, close: 2367.80, volume: 920 },
    { time: "14:22", open: 2367.80, high: 2368.40, low: 2364.50, close: 2365.10, volume: 1050 },
    { time: "14:23", open: 2365.10, high: 2365.90, low: 2361.80, close: 2362.40, volume: 1200 },
    { time: "14:24", open: 2362.40, high: 2363.00, low: 2358.90, close: 2359.50, volume: 1450 }, // Current Candle
  ];
  return enrichCandlesWithEMA(baseData);
};

const buildSidewaysCandles = () => {
  const baseData = [
    { time: "11:02", open: 2365.20, high: 2365.80, low: 2364.70, close: 2365.30, volume: 220 },
    { time: "11:03", open: 2365.30, high: 2365.90, low: 2364.90, close: 2365.00, volume: 180 },
    { time: "11:04", open: 2365.00, high: 2365.50, low: 2364.50, close: 2365.20, volume: 200 },
    { time: "11:05", open: 2365.20, high: 2365.60, low: 2364.80, close: 2365.10, volume: 250 },
    { time: "11:06", open: 2365.10, high: 2365.40, low: 2364.60, close: 2364.90, volume: 190 },
    { time: "11:07", open: 2364.90, high: 2365.30, low: 2364.70, close: 2365.10, volume: 210 },
    { time: "11:08", open: 2365.10, high: 2365.50, low: 2364.50, close: 2364.80, volume: 240 },
    { time: "11:09", open: 2364.80, high: 2365.20, low: 2364.60, close: 2365.00, volume: 170 },
    { time: "11:10", open: 2365.00, high: 2365.40, low: 2364.70, close: 2365.20, volume: 230 },
    { time: "11:11", open: 2365.20, high: 2365.50, low: 2364.60, close: 2364.90, volume: 150 }, // Current Candle
  ];
  return enrichCandlesWithEMA(baseData);
};

const buildVolatileCandles = () => {
  const baseData = [
    { time: "16:30", open: 2355.00, high: 2361.00, low: 2351.20, close: 2359.80, volume: 1400 },
    { time: "16:31", open: 2359.80, high: 2360.50, low: 2348.50, close: 2351.10, volume: 1520 },
    { time: "16:32", open: 2351.10, high: 2358.40, low: 2349.00, close: 2356.50, volume: 1250 },
    { time: "16:33", open: 2356.50, high: 2362.30, low: 2352.00, close: 2353.40, volume: 1680 },
    { time: "16:34", open: 2353.40, high: 2359.50, low: 2345.10, close: 2348.90, volume: 1900 },
    { time: "16:35", open: 2348.90, high: 2357.00, low: 2346.00, close: 2355.20, volume: 1550 },
    { time: "16:36", open: 2355.20, high: 2363.50, low: 2351.00, close: 2362.10, volume: 1800 },
    { time: "16:37", open: 2362.10, high: 2364.00, low: 2344.50, close: 2346.80, volume: 2200 },
    { time: "16:38", open: 2346.80, high: 2358.00, low: 2345.00, close: 2354.30, volume: 2010 },
    { time: "16:39", open: 2354.30, high: 2359.00, low: 2340.50, close: 2342.10, volume: 2500 }, // Current Candle
  ];
  return enrichCandlesWithEMA(baseData);
};

export const marketScenarios: MarketScenario[] = [
  {
    id: "bullish_breakout",
    name: "Bullish EMA Crossover (CALL Trend)",
    description: "แท่งเทียนยกตัวขึ้นต่อเนื่อง เส้น EMA5 ตัดขึ้นเหนือเส้น EMA13 อย่างชัดเจน มีแรงซื้อหนาแน่น เหมาะสำหรับสัญญาณ CALL",
    icon: "TrendingUp",
    candles: buildUptrendCandles()
  },
  {
    id: "bearish_breakout",
    name: "Bearish EMA Crossover (PUT Trend)",
    description: "แท่งเทียนดิ่งลงทำจุดต่ำสุดใหม่ เส้น EMA5 ตัดลงใต้เส้น EMA13 อย่างชัดเจน มีแรงขายคุมตลาด เหมาะสำหรับสัญญาณ PUT",
    icon: "TrendingDown",
    candles: buildDowntrendCandles()
  },
  {
    id: "tight_sideways",
    name: "Narrow Sideways Range (HOLD)",
    description: "ตลาดซึมตัว ราคาไซด์เวย์แคบในช่วงทศนิยมสั้นๆ เส้น EMA5 และ EMA13 ทับซ้อนกัน ไร้ทิศทาง เพื่อรักษาทุน AI ควรสั่ง HOLD ทันที",
    icon: "ArrowRight",
    candles: buildSidewaysCandles()
  },
  {
    id: "volatile_whipsaw",
    name: "Extreme Volatility Whipsaw (HOLD)",
    description: "สภาวะผันผวนรุนแรง มีไส้เทียนยาวทั้งบนและล่าง เกิดการลากกินหยุดทั้งสองฝั่ง ไม่มีความชัดเจน เพื่อรักษาทุน AI ควรสั่ง HOLD",
    icon: "AlertTriangle",
    candles: buildVolatileCandles()
  }
];
