import React, { useState, useEffect } from "react";
import { Trade, AISignal, Candle } from "../types";
import { 
  Wallet, 
  Timer, 
  HelpCircle, 
  Flame, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  AlertTriangle,
  Layers,
  Settings,
  X
} from "lucide-react";

interface TradingPanelProps {
  balance: number;
  trades: Trade[];
  activeSignal: AISignal | null;
  lastCandle: Candle | null;
  onPlaceTrade: (action: "BUY" | "SELL", lotSize: number, slPips: number, tpPips: number) => void;
  onCloseTrade?: (tradeId: string) => void;
  candleTimer: number; // 0 to 59 seconds
  autoTrade: boolean;
  setAutoTrade: (val: boolean) => void;
  onConfigureCloudBot?: (config: { 
    autoTrade: boolean; 
    lotSize: number; 
    slPips: number; 
    tpPips: number; 
    activeAssetId?: number; 
    activeAssetName?: string;
    dayTradeLimitEnabled?: boolean;
    maxDailyTrades?: number;
    dailyTakeProfitLimit?: number;
    dailyStopLossLimit?: number;
    fastEmaPeriod?: number;
    slowEmaPeriod?: number;
  }) => void;
  connectionMode?: "simulation" | "live";
  accountType?: "demo" | "real";
  tradeErrorMsg?: string | null;
  activeAssetId?: number;
  activeAssetName?: string;
  lotSize: number;
  setLotSize: (val: number) => void;
  slPips: number;
  setSlPips: (val: number) => void;
  tpPips: number;
  setTpPips: (val: number) => void;
  
  // V98.3 & Day Trade Limit
  dayTradeLimitEnabled: boolean;
  setDayTradeLimitEnabled: (val: boolean) => void;
  maxDailyTrades: number;
  setMaxDailyTrades: (val: number) => void;
  dailyTakeProfitLimit: number;
  setDailyTakeProfitLimit: (val: number) => void;
  dailyStopLossLimit: number;
  setDailyStopLossLimit: (val: number) => void;
  fastEmaPeriod: number;
  setFastEmaPeriod: (val: number) => void;
  slowEmaPeriod: number;
  setSlowEmaPeriod: (val: number) => void;
}

export default function TradingPanel({
  balance,
  trades,
  activeSignal,
  lastCandle,
  onPlaceTrade,
  onCloseTrade,
  candleTimer,
  autoTrade,
  setAutoTrade,
  onConfigureCloudBot,
  connectionMode = "simulation",
  accountType = "demo",
  tradeErrorMsg = null,
  activeAssetId = 74,
  activeAssetName = "XAUUSD",
  lotSize,
  setLotSize,
  slPips,
  setSlPips,
  tpPips,
  setTpPips,
  
  dayTradeLimitEnabled,
  setDayTradeLimitEnabled,
  maxDailyTrades,
  setMaxDailyTrades,
  dailyTakeProfitLimit,
  setDailyTakeProfitLimit,
  dailyStopLossLimit,
  setDailyStopLossLimit,
  fastEmaPeriod,
  setFastEmaPeriod,
  slowEmaPeriod,
  setSlowEmaPeriod
}: TradingPanelProps) {
  const quickLots = [0.01, 0.1, 0.5, 1.0, 2.0];
  const quickSl = [100, 200, 300, 500];
  const quickTp = [150, 300, 500, 800];

  const [showSettings, setShowSettings] = useState(false);

  const handleToggleAutoTrade = (val: boolean) => {
    setAutoTrade(val);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade: val, lotSize, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleQuickLotClick = (lots: number) => {
    setLotSize(lots);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize: lots, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleLotChange = (val: number) => {
    const formatted = Math.max(0.01, Math.min(100.0, Number(val.toFixed(2))));
    setLotSize(formatted);
  };

  const handleLotBlur = () => {
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleSlChange = (val: number) => {
    setSlPips(val);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips: val, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleTpChange = (val: number) => {
    setTpPips(val);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips, tpPips: val, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleDayTradeLimitToggle = (val: boolean) => {
    setDayTradeLimitEnabled(val);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled: val, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleMaxTradesChange = (val: number) => {
    const formatted = Math.max(1, Math.min(100, val));
    setMaxDailyTrades(formatted);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades: formatted, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleDailyTpLimitChange = (val: number) => {
    const formatted = Math.max(10, Math.min(10000, val));
    setDailyTakeProfitLimit(formatted);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit: formatted, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleDailySlLimitChange = (val: number) => {
    const formatted = Math.max(10, Math.min(10000, val));
    setDailyStopLossLimit(formatted);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit: formatted, fastEmaPeriod, slowEmaPeriod
      });
    }
  };

  const handleFastEmaChange = (val: number) => {
    setFastEmaPeriod(val);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod: val, slowEmaPeriod
      });
    }
  };

  const handleSlowEmaChange = (val: number) => {
    setSlowEmaPeriod(val);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ 
        autoTrade, lotSize, slPips, tpPips, activeAssetId, activeAssetName,
        dayTradeLimitEnabled, maxDailyTrades, dailyTakeProfitLimit, dailyStopLossLimit, fastEmaPeriod, slowEmaPeriod: val
      });
    }
  };

  // Helper to calculate MT5 Profit for Gold/FX
  // For Gold (XAUUSD): 1 Lot = 100 oz. Profit = (Current - Entry) * 100 * Lots for BUY
  const getFloatingProfit = (trade: Trade, currentPrice: number) => {
    if (trade.status !== "PENDING") return trade.profit || 0;
    
    const entry = trade.entryPrice;
    const action = trade.action;
    const lots = trade.lotSize || 0.1;
    
    let pipDiff = 0;
    if (action === "BUY" || action === "CALL") {
      pipDiff = currentPrice - entry;
    } else {
      pipDiff = entry - currentPrice;
    }
    
    // Gold contract size multiplier = 100
    const profit = pipDiff * 100 * lots;
    return profit;
  };

  // Automatically trigger AI auto-trade if enabled (Simulation mode only!)
  useEffect(() => {
    if (connectionMode === "simulation" && autoTrade && activeSignal && activeSignal.action !== "HOLD" && activeSignal.confidence >= 0.70) {
      // Find if we already placed a trade during this exact candle to avoid spamming
      const alreadyTradedThisCandle = trades.some(t => {
        const timeDiff = Date.now() - new Date(t.timestamp).getTime();
        return timeDiff < 15000; // was placed in last 15 seconds
      });

      if (!alreadyTradedThisCandle) {
        const actionMapped = (activeSignal.action === "CALL" || activeSignal.action === "BUY") ? "BUY" : "SELL";
        onPlaceTrade(actionMapped, lotSize, slPips, tpPips);
      }
    }
  }, [activeSignal, autoTrade, trades, lotSize, slPips, tpPips, connectionMode]);

  const handleManualTrade = (action: "BUY" | "SELL") => {
    onPlaceTrade(action, lotSize, slPips, tpPips);
  };

  const currentPrice = lastCandle ? lastCandle.close : 2350.0;

  const dailyTradesCount = trades.length;
  const dailyProfitLoss = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const isDayTradeLimitBreached = dayTradeLimitEnabled && (
    dailyTradesCount >= maxDailyTrades ||
    dailyProfitLoss >= dailyTakeProfitLimit ||
    dailyProfitLoss <= -dailyStopLossLimit
  );

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between" id="trading_panel_terminal">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg text-white">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold tracking-tight text-sm font-sans">MT5 Trading Terminal</h2>
              <p className="text-slate-400 text-xs font-mono">
                {connectionMode === "live" ? (accountType === "real" ? "MT5 LIVE PORTFOLIO" : "MT5 LIVE DEMO") : "SANDBOX SIMULATOR"}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block font-mono">
              บัญชีเงินทุน ({connectionMode === "live" ? (accountType === "real" ? "REAL" : "DEMO") : "DEMO"})
            </span>
            <span className="text-xl font-black font-mono text-emerald-400">
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Day Trade Limit Progress Banner */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Day Trade Limit Status
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
              isDayTradeLimitBreached 
                ? "bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse" 
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
            }`}>
              {isDayTradeLimitBreached ? "จำกัดสิทธิ์ / Breached" : "สถานะปกติ / Active"}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 font-mono">ออเดอร์วันนี้</div>
              <div className="font-bold font-mono text-slate-200 mt-0.5">
                {dailyTradesCount} <span className="text-[10px] text-slate-500 font-normal">/ {maxDailyTrades}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${dailyTradesCount >= maxDailyTrades ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (dailyTradesCount / maxDailyTrades) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-mono">ผลกำไรรวมวันนี้ (USD)</div>
              <div className={`font-bold font-mono mt-0.5 ${dailyProfitLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {dailyProfitLoss >= 0 ? "+" : ""}${dailyProfitLoss.toFixed(2)}
              </div>
              <div className="text-[9px] text-slate-500 mt-1 font-sans flex justify-between">
                <span>SL: -${dailyStopLossLimit}</span>
                <span>TP: +${dailyTakeProfitLimit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Rejection Error Banner */}
        {tradeErrorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-lg mb-5 text-xs text-red-400 flex items-start gap-1.5 leading-normal font-sans" id="trade_error_banner">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <strong className="block mb-1.5 font-bold text-red-400">⚠️ ส่งออเดอร์ MT5 ไม่สำเร็จ (Order Rejected)</strong>
              <span className="font-mono text-red-400/90">{tradeErrorMsg}</span>
            </div>
          </div>
        )}

        {/* 1m Candle Status Timer */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-indigo-400" />
              <span>รอบเวลาวิเคราะห์บอท ({activeAssetName} 1M)</span>
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
              {candleTimer}s / 60s
            </span>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <p className="text-slate-300">
              AI จะสแกนข้อมูลและประเมินผลใหม่ทันทีที่จบแต่ละแท่งเทียน (วิเคราะห์แท่ง 1 นาทีต่อเนื่อง)
            </p>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000" 
                style={{ width: `${(candleTimer / 60) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Lot Size Configuration */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs text-slate-400 font-mono block">ขนาดล็อตที่เทรด (LOT SIZE)</label>
            <span className="text-[10px] text-slate-500 font-mono">Min: 0.01 / Max: 100.00</span>
          </div>
          <div className="grid grid-cols-5 gap-2 mb-2">
            {quickLots.map((lots) => (
              <button
                key={lots}
                onClick={() => handleQuickLotClick(lots)}
                className={`py-1.5 rounded font-mono text-xs border transition-all cursor-pointer ${
                  lotSize === lots
                    ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                {lots}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={lotSize}
              onChange={(e) => handleLotChange(Number(e.target.value))}
              onBlur={handleLotBlur}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute right-3 top-2 text-slate-500 text-xs font-mono uppercase">Lots</span>
          </div>
        </div>

        {/* SL and TP Settings */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Stop Loss in Pips */}
          <div>
            <label className="text-[11px] text-slate-400 font-mono block mb-1.5">STOP LOSS (PIPS)</label>
            <select
              value={slPips}
              onChange={(e) => handleSlChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="0">No Stop Loss (0 pips)</option>
              {quickSl.map(pips => (
                <option key={pips} value={pips}>{pips} Pips (${(pips * 0.1).toFixed(1)} USD on 0.10L)</option>
              ))}
            </select>
          </div>

          {/* Take Profit in Pips */}
          <div>
            <label className="text-[11px] text-slate-400 font-mono block mb-1.5">TAKE PROFIT (PIPS)</label>
            <select
              value={tpPips}
              onChange={(e) => handleTpChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="0">No Take Profit (0 pips)</option>
              {quickTp.map(pips => (
                <option key={pips} value={pips}>{pips} Pips (${(pips * 0.1).toFixed(1)} USD on 0.10L)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic collapsible configuration panel for V98.3 EMA and Day Trade Limit */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 rounded-lg py-2 px-3 text-slate-400 hover:text-slate-200 text-xs transition-all mb-4 mt-1 cursor-pointer font-sans"
        >
          <span className="flex items-center gap-1.5 font-mono">
            <Settings className={`w-3.5 h-3.5 text-indigo-400 transition-transform duration-300 ${showSettings ? "rotate-90" : ""}`} />
            ตั้งค่าระบบ V98.3 EMA & Day Trade Limit
          </span>
          <span className="text-[10px] opacity-60 font-mono">{showSettings ? "ซ่อน" : "แสดง"}</span>
        </button>

        {showSettings && (
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 mb-4 space-y-4 shadow-inner">
            {/* Day Trade Limit Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs text-slate-300 font-semibold font-mono block">เปิดระบบ Day Trade Limit</label>
                <span className="text-[10px] text-slate-500 block leading-tight font-sans">ระงับเทรดอัตโนมัติเมื่อชนลิมิตเพื่อคุมความเสี่ยง</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={dayTradeLimitEnabled} 
                  onChange={(e) => handleDayTradeLimitToggle(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              </label>
            </div>

            {dayTradeLimitEnabled && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-400 font-mono block mb-1">เทรดสูงสุด/วัน</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxDailyTrades}
                    onChange={(e) => handleMaxTradesChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 font-mono block mb-1">เป้ากำไร/วัน ($)</label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={dailyTakeProfitLimit}
                    onChange={(e) => handleDailyTpLimitChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 font-mono block mb-1">ลิมิตขาดทุน/วัน ($)</label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={dailyStopLossLimit}
                    onChange={(e) => handleDailySlLimitChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-center"
                  />
                </div>
              </div>
            )}

            {/* EMA 2-Line settings */}
            <div className="border-t border-slate-800/85 pt-3">
              <label className="text-xs text-slate-300 font-semibold font-mono block mb-1.5">ค่าเทคนิค EMA 2 เส้น (V98.3 โโลจิกมหาเทพ)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">เส้น EMA สั้น (Fast)</label>
                  <select
                    value={fastEmaPeriod}
                    onChange={(e) => handleFastEmaChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[3, 5, 7, 9, 10, 12, 15].map(p => (
                      <option key={p} value={p}>EMA {p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">เส้น EMA ยาว (Slow)</label>
                  <select
                    value={slowEmaPeriod}
                    onChange={(e) => handleSlowEmaChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[13, 20, 25, 26, 30, 50, 100].map(p => (
                      <option key={p} value={p}>EMA {p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Auto-Trade Toggle */}
        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3.5 mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
              <Zap className="w-3.5 h-3.5 fill-indigo-400/20" />
              <span>AI Auto-Trade (เทรดอัตโนมัติเข้า MT5)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal mt-0.5 font-sans">
              เปิดออเดอร์เข้าพอร์ตทันทีเมื่อ AI ให้สัญญาณมั่นใจสูงเกิน 70%
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoTrade} 
              onChange={(e) => handleToggleAutoTrade(e.target.checked)} 
              className="sr-only peer" 
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
          </label>
        </div>

        {/* Trade Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => handleManualTrade("BUY")}
            className="group flex flex-col items-center justify-center py-4 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl font-bold border border-emerald-500/20 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
          >
            <ArrowUpCircle className="w-7 h-7 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-sans font-bold">BUY</span>
            <span className="text-[10px] opacity-80 font-normal">สั่งซื้อราคาขึ้น (Long)</span>
          </button>
          
          <button
            onClick={() => handleManualTrade("SELL")}
            className="group flex flex-col items-center justify-center py-4 bg-red-600/90 hover:bg-red-500 text-white rounded-xl font-bold border border-red-500/20 shadow-lg shadow-red-950/20 transition-all cursor-pointer"
          >
            <ArrowDownCircle className="w-7 h-7 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-sans font-bold">SELL</span>
            <span className="text-[10px] opacity-80 font-normal">สั่งขายราคาลง (Short)</span>
          </button>
        </div>
      </div>

      {/* Active trades section */}
      <div className="border-t border-slate-800 pt-4">
        <h3 className="text-xs font-semibold text-slate-400 font-mono mb-3 uppercase tracking-wider">ออเดอร์ที่เปิดค้างอยู่ (MT5 Positions)</h3>
        {trades.filter(t => t.status === "PENDING").length === 0 ? (
          <p className="text-slate-600 text-xs italic text-center py-2">ไม่มีตำแหน่งที่ถือครองอยู่ขณะนี้</p>
        ) : (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
            {trades.filter(t => t.status === "PENDING").map((trade) => {
              const profit = getFloatingProfit(trade, currentPrice);
              const isProfit = profit >= 0;
              const isBuy = trade.action === "BUY" || trade.action === "CALL";
              
              return (
                <div key={trade.id} className="bg-slate-950 border border-slate-800 rounded p-3 flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      isBuy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-300">
                        {trade.lotSize || 0.10} Lots @ {trade.entryPrice.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-slate-500 flex gap-2">
                        <span>SL: {trade.slPips ? `${trade.slPips}` : "None"}</span>
                        <span>TP: {trade.tpPips ? `${trade.tpPips}` : "None"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5 text-right">
                    <div>
                      <div className={`font-bold text-sm ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                        {isProfit ? "+" : ""}${profit.toFixed(2)}
                      </div>
                      <span className="text-[9px] text-slate-500 block">ทองคำ {currentPrice.toFixed(2)}</span>
                    </div>

                    {onCloseTrade && (
                      <button
                        onClick={() => onCloseTrade(trade.id)}
                        className="p-1 hover:bg-slate-900 rounded border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                        title="ปิดออเดอร์ทันที"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
