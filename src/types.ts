export interface Candle {
  time: string; // HH:MM
  open: number;
  high: number;
  low: number;
  close: number;
  ema5?: number;
  ema13?: number;
  volume: number;
  epoch?: number;
}

export type ActionType = "CALL" | "PUT" | "BUY" | "SELL" | "HOLD";

export interface AISignal {
  action: ActionType;
  confidence: number;
  reason: string;
}

export interface Trade {
  id: string;
  timestamp: string;
  investAmount: number;
  entryPrice: number;
  exitPrice?: number;
  action: "CALL" | "PUT" | "BUY" | "SELL";
  aiAction: ActionType | "BUY" | "SELL" | "HOLD";
  aiConfidence: number;
  status: "PENDING" | "WIN" | "LOSS";
  payout?: number;
  profit?: number;
  resolvedAt?: string;
  contract_id?: number | string;
  expired_epoch?: number;
  lotSize?: number;
  slPrice?: number;
  tpPrice?: number;
  slPips?: number;
  tpPips?: number;
}

export interface MarketScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  candles: Candle[];
}
