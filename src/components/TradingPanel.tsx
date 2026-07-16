import React, { useState, useEffect } from "react";
import { Trade, AISignal, Candle } from "../types";
import { Wallet, Timer, HelpCircle, Flame, ArrowUpCircle, ArrowDownCircle, CheckCircle2, XCircle, Zap, AlertTriangle } from "lucide-react";

const AVAILABLE_ASSETS = [
  { id: 74, name: "XAUUSD", label: "Gold Spot (XAU/USD)" },
  { id: 1, name: "EURUSD", label: "EUR/USD" },
  { id: 2, name: "GBPUSD", label: "GBP/USD" },
  { id: 76, name: "EURUSD-OTC", label: "EUR/USD (OTC)" },
  { id: 77, name: "GBPUSD-OTC", label: "GBP/USD (OTC)" },
];

interface TradingPanelProps {
  balance: number;
  trades: Trade[];
  activeSignal: AISignal | null;
  lastCandle: Candle | null;
  onPlaceTrade: (action: "CALL" | "PUT", amount: number) => void;
  candleTimer: number; // 0 to 59 seconds
  autoTrade: boolean;
  setAutoTrade: (val: boolean) => void;
  onConfigureCloudBot?: (config: { autoTrade: boolean; investAmount: number; activeAssetId?: number; activeAssetName?: string }) => void;
  connectionMode?: "simulation" | "live";
  accountType?: "demo" | "real";
  tradeErrorMsg?: string | null;
  activeAssetId?: number;
  activeAssetName?: string;
  investAmount: number;
  setInvestAmount: (val: number) => void;
}

export default function TradingPanel({
  balance,
  trades,
  activeSignal,
  lastCandle,
  onPlaceTrade,
  candleTimer,
  autoTrade,
  setAutoTrade,
  onConfigureCloudBot,
  connectionMode = "simulation",
  accountType = "demo",
  tradeErrorMsg = null,
  activeAssetId = 74,
  activeAssetName = "XAUUSD",
  investAmount,
  setInvestAmount
}: TradingPanelProps) {
  const quickAmounts = [10, 50, 100, 250, 500];

  // Binary options payout rate (85% standard)
  const payoutRate = 0.85;

  // Candle timer: first 30s is "Trading Phase" (entry allowed), last 30s is "Resolution Phase" (locked)
  const isLocked = candleTimer >= 30;
  const secondsLeft = 60 - candleTimer;

  const handleToggleAutoTrade = (val: boolean) => {
    setAutoTrade(val);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ autoTrade: val, investAmount, activeAssetId, activeAssetName });
    }
  };

  const handleQuickAmountClick = (amt: number) => {
    setInvestAmount(amt);
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ autoTrade, investAmount: amt, activeAssetId, activeAssetName });
    }
  };

  const handleCustomAmountChange = (val: number) => {
    setInvestAmount(val);
  };

  const handleCustomAmountBlur = () => {
    if (onConfigureCloudBot) {
      onConfigureCloudBot({ autoTrade, investAmount, activeAssetId, activeAssetName });
    }
  };

  // Automatically trigger AI auto-trade if enabled, inside the open window (Simulation mode only!)
  useEffect(() => {
    if (connectionMode === "simulation" && autoTrade && activeSignal && !isLocked && activeSignal.action !== "HOLD" && activeSignal.confidence >= 0.70) {
      // Find if we already placed a trade during this exact candle timer window to avoid spamming
      const alreadyTradedThisCandle = trades.some(t => {
        const timeDiff = Date.now() - new Date(t.timestamp).getTime();
        return timeDiff < 15000; // was placed in last 15 seconds
      });

      if (!alreadyTradedThisCandle) {
        onPlaceTrade(activeSignal.action as "CALL" | "PUT", investAmount);
      }
    }
  }, [activeSignal, autoTrade, isLocked, trades, investAmount, connectionMode]);

  const handleManualTrade = (action: "CALL" | "PUT") => {
    if (balance < investAmount) {
      alert("ยอดเงินคงเหลือไม่เพียงพอ!");
      return;
    }
    onPlaceTrade(action, investAmount);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between" id="trading_panel_terminal">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg text-white">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold tracking-tight">Trading Terminal</h2>
              <p className="text-slate-400 text-xs font-mono">
                {connectionMode === "live" ? (accountType === "real" ? "REAL PORTFOLIO" : "REAL DEMO PORTFOLIO") : "DEMO PORTFOLIO"}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block font-mono">
              ยอดเงินคงเหลือ ({connectionMode === "live" ? (accountType === "real" ? "REAL" : "DEMO") : "DEMO"})
            </span>
            <span className="text-xl font-black font-mono text-emerald-400">
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Trade Rejection Error Banner */}
        {tradeErrorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-lg mb-5 text-xs text-red-400 flex items-start gap-1.5 leading-normal font-sans" id="trade_error_banner">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <strong className="block mb-1.5 font-bold text-red-400">⚠️ ส่งออเดอร์ไม่สำเร็จ (Order Rejected)</strong>
              {(() => {
                if (tradeErrorMsg.includes("Cannot purchase an option") && tradeErrorMsg.includes("the asset is not available")) {
                  return (
                    <div className="space-y-1.5">
                      <p className="text-red-400/90 font-mono font-medium">{tradeErrorMsg}</p>
                      <div className="text-amber-400 mt-1 font-sans text-xs bg-amber-500/10 border border-amber-500/20 rounded p-2.5 leading-relaxed">
                        <strong>💡 คำแนะนำเชิงปฏิบัติ:</strong> สินทรัพย์นี้ไม่ได้เปิดให้ซื้อขายสัญญา Binary Option (1 นาที) ในตลาดขณะนี้ (เนื่องจากเป็นวันหยุด ตลาดปิด หรือโบรกเกอร์ปิดรับชั่วคราว)
                        <span className="block mt-1.5 text-slate-300">
                          ท่านสามารถแก้ไขได้ง่ายๆ โดยเลือกเปลี่ยนสินทรัพย์เป็น <strong>EUR/USD (OTC)</strong> หรือ <strong>GBP/USD (OTC)</strong> ในหัวข้อ <em>"เลือกสินทรัพย์เทรด"</em> ด้านขวา ซึ่งเป็นตลาดที่เปิดให้ทำกำไรและส่งบอทเทรดได้ตลอด 24 ชั่วโมงครับ
                        </span>
                      </div>
                    </div>
                  );
                }
                if (tradeErrorMsg.toLowerCase().includes("not enough money") || tradeErrorMsg.toLowerCase().includes("insufficient balance") || tradeErrorMsg.toLowerCase().includes("not_enough_balance")) {
                  return (
                    <div className="space-y-1.5">
                      <p className="text-red-400/90 font-mono font-medium">{tradeErrorMsg}</p>
                      <div className="text-amber-400 mt-1 font-sans text-xs bg-amber-500/10 border border-amber-500/20 rounded p-2.5 leading-relaxed">
                        <strong>💡 คำแนะนำเชิงปฏิบัติ:</strong> ยอดเงินคงเหลือในกระเป๋าเงินของคุณไม่เพียงพอกับยอดเงินลงทุนที่คุณกรอกไว้ (กรอก ${investAmount} บัญชีโบรกเกอร์มี $0.00 หรือน้อยกว่า)
                        <span className="block mt-1.5 text-slate-300">
                          โปรดลดจำนวนเงินลงทุน (เช่น ปรับลงมาเหลือ $1, $10) หรือเลือกบัญชีที่มีเงินทุนพร้อมสำหรับการเทรดครับ
                        </span>
                      </div>
                    </div>
                  );
                }
                return <span className="font-mono text-red-400/90">{tradeErrorMsg}</span>;
              })()}
            </div>
          </div>
        )}

        {/* Asset Selection (Only in Live Connection Mode to allow switching off-market hours assets) */}
        {connectionMode === "live" && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-5">
            <label className="text-[11px] text-slate-400 font-bold block mb-2 tracking-wide uppercase">
              เลือกสินทรัพย์เทรด (Broker Asset Selection)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_ASSETS.map((asset) => {
                const isSelected = activeAssetId === asset.id;
                return (
                  <button
                    key={asset.id}
                    onClick={() => {
                      if (onConfigureCloudBot) {
                        onConfigureCloudBot({
                          autoTrade,
                          investAmount,
                          activeAssetId: asset.id,
                          activeAssetName: asset.name,
                        });
                      }
                    }}
                    className={`text-left p-2.5 rounded-lg border transition-all duration-200 flex flex-col justify-between h-[64px] ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold"
                        : "bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    }`}
                  >
                    <span className="text-[9px] font-mono opacity-60">ID: {asset.id}</span>
                    <span className="text-xs font-mono font-bold tracking-tight">{asset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 1m Candle Status Timer */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-indigo-400" />
              <span>รอบเวลาแท่งเทียน 1 นาที ({activeAssetName} 1M)</span>
            </span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              isLocked ? "bg-red-500/10 text-red-400 border border-red-500/25" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
            }`}>
              {isLocked ? "LOCK PHASE (ล็อกราคา)" : "OPEN PHASE (เปิดรับออเดอร์)"}
            </span>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Countdown circular timer */}
            <div className="col-span-4 flex justify-center">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={isLocked ? "text-amber-500" : "text-emerald-400"}
                    strokeWidth="3"
                    strokeDasharray={`${(secondsLeft / 60 * 100).toFixed(0)}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="text-base font-black font-mono text-white leading-none">{secondsLeft}s</span>
                </div>
              </div>
            </div>

            <div className="col-span-8 text-xs text-slate-400 space-y-1">
              {isLocked ? (
                <p className="text-amber-400">
                  ⚠️ <strong>ช่วงปิดงบ:</strong> ปิดรับคำสั่งแท่งปัจจุบัน รอยืนยันราคาปิดแท่งใน {secondsLeft} วินาที
                </p>
              ) : (
                <p className="text-slate-300">
                  ✅ <strong>ช่วงส่งออเดอร์:</strong> คุณสามารถกด CALL หรือ PUT ได้ทันที หรือเปิด AI Auto-Trade คาดการณ์
                </p>
              )}
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div 
                  className={`h-full transition-all duration-1000 ${isLocked ? "bg-amber-500" : "bg-emerald-500"}`} 
                  style={{ width: `${(candleTimer / 60) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Selection */}
        <div className="mb-5">
          <label className="text-xs text-slate-400 font-mono block mb-2">จำนวนเงินลงทุน (INVESTMENT USD)</label>
          <div className="grid grid-cols-5 gap-2 mb-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => handleQuickAmountClick(amt)}
                className={`py-1.5 rounded font-mono text-xs border transition-all cursor-pointer ${
                  investAmount === amt
                    ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-500 font-mono text-sm">$</span>
            <input
              type="number"
              value={investAmount}
              onChange={(e) => handleCustomAmountChange(Math.max(1, Number(e.target.value)))}
              onBlur={handleCustomAmountBlur}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-7 pr-16 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute right-3 top-2 text-slate-500 text-xs font-mono">PAYOUT (85%): ${(investAmount * payoutRate).toFixed(1)}</span>
          </div>
        </div>

        {/* AI Auto-Trade Toggle */}
        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3.5 mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
              <Zap className="w-3.5 h-3.5 fill-indigo-400/20" />
              <span>AI Auto-Trade (เทรดอัตโนมัติตามสัญญาณ)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
              เปิดออเดอร์ทันทีเมื่อ AI ให้สัญญาณมั่นใจสูงเกิน 70%
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
            onClick={() => handleManualTrade("CALL")}
            disabled={isLocked || balance < investAmount}
            className="group flex flex-col items-center justify-center py-4 bg-emerald-600/90 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl font-bold border border-emerald-500/20 shadow-lg shadow-emerald-950/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowUpCircle className="w-7 h-7 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm">CALL</span>
            <span className="text-[10px] opacity-80 font-normal">ซื้อราคาขึ้น (สูงกว่า)</span>
          </button>
          
          <button
            onClick={() => handleManualTrade("PUT")}
            disabled={isLocked || balance < investAmount}
            className="group flex flex-col items-center justify-center py-4 bg-red-600/90 hover:bg-red-500 disabled:bg-slate-800 text-white rounded-xl font-bold border border-red-500/20 shadow-lg shadow-red-950/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowDownCircle className="w-7 h-7 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm">PUT</span>
            <span className="text-[10px] opacity-80 font-normal">ซื้อราคาลง (ต่ำกว่า)</span>
          </button>
        </div>
      </div>

      {/* Active trades section */}
      <div className="border-t border-slate-800 pt-4">
        <h3 className="text-xs font-semibold text-slate-400 font-mono mb-3 uppercase tracking-wider">ออเดอร์เปิดอยู่ (Active Positions)</h3>
        {trades.filter(t => t.status === "PENDING").length === 0 ? (
          <p className="text-slate-600 text-xs italic text-center py-2">ไม่มีออเดอร์ที่ถืออยู่ขณะนี้</p>
        ) : (
          <div className="space-y-2">
            {trades.filter(t => t.status === "PENDING").map((trade) => (
              <div key={trade.id} className="bg-slate-950 border border-slate-800 rounded p-3 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    trade.action === "CALL" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {trade.action}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-300">
                      ลงทุน ${trade.investAmount} @ {trade.entryPrice.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 animate-pulse">
                    <Timer className="w-3 h-3" />
                    <span>รอสิ้นสุดแท่งเทียน</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
