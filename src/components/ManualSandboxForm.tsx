import React, { useState } from "react";
import { Candle } from "../types";
import { Sliders, Code2, RefreshCw, Send, CheckCircle2 } from "lucide-react";

interface ManualSandboxFormProps {
  lastCandle: Candle;
  onUpdateLastCandle: (updatedFields: Partial<Candle>) => void;
  onRunAnalysis: () => void;
}

export default function ManualSandboxForm({
  lastCandle,
  onUpdateLastCandle,
  onRunAnalysis
}: ManualSandboxFormProps) {
  const [open, setOpen] = useState(lastCandle.open);
  const [high, setHigh] = useState(lastCandle.high);
  const [low, setLow] = useState(lastCandle.low);
  const [close, setClose] = useState(lastCandle.close);
  const [volume, setVolume] = useState(lastCandle.volume);

  const handleUpdate = (updates: { open: number; high: number; low: number; close: number; volume: number }) => {
    onUpdateLastCandle({
      open: updates.open,
      high: updates.high,
      low: updates.low,
      close: updates.close,
      volume: updates.volume
    });
  };

  const resetToMatch = (candle: Candle) => {
    setOpen(candle.open);
    setHigh(candle.high);
    setLow(candle.low);
    setClose(candle.close);
    setVolume(candle.volume);
  };

  // Sync inputs if parent candle changes externally (e.g. when loading a scenario)
  React.useEffect(() => {
    resetToMatch(lastCandle);
  }, [lastCandle.time]); // only sync on time change to avoid overwrite while user is typing

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    handleUpdate({ open, high, low, close, volume });
  };

  // Generate the preview string that will be sent inside the prompt
  const promptInputString = JSON.stringify({
    close: Number(close.toFixed(2)),
    ema5: Number(lastCandle.ema5.toFixed(2)),
    ema13: Number(lastCandle.ema13.toFixed(2))
  }, null, 2);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl" id="manual_price_sandbox">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-5">
        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg text-white">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-white font-bold tracking-tight">Manual Candlestick Sandbox</h2>
          <p className="text-slate-400 text-xs font-mono">CUSTOM PRICE ACTION</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Form */}
        <form onSubmit={handleApply} className="lg:col-span-7 space-y-4">
          <p className="text-xs text-slate-400 leading-normal">
            ปรับแต่งราคาเปิด/ปิด และราคาสูงสุด/ต่ำสุดของแท่งเทียนปัจจุบัน เพื่อดูการประเมินสัญญาณของระบบ AI เทรดเดอร์ในรูปแบบของคุณเอง:
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">ราคาเปิด (OPEN PRICE)</label>
              <input
                type="number"
                step="0.01"
                value={open}
                onChange={(e) => setOpen(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">ราคาปิด (CLOSE PRICE)</label>
              <input
                type="number"
                step="0.01"
                value={close}
                onChange={(e) => setClose(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">ราคาสูงสุด (HIGH PRICE)</label>
              <input
                type="number"
                step="0.01"
                value={high}
                onChange={(e) => setHigh(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">ราคาต่ำสุด (LOW PRICE)</label>
              <input
                type="number"
                step="0.01"
                value={low}
                onChange={(e) => setLow(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-mono block mb-1">ปริมาณการซื้อขาย (VOLUME)</label>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ปรับปรุงแท่งเทียนบนกราฟ (Apply to Chart)</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                handleUpdate({ open, high, low, close, volume });
                setTimeout(onRunAnalysis, 100);
              }}
              className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-orange-950/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ส่งข้อมูลตรวจทันที (Apply & Analyze)</span>
            </button>
          </div>
        </form>

        {/* Live Prompt Preview Code */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-900 pb-2 mb-3">
              <span className="flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-orange-400" />
                <span>JSON Prompt Input Preview</span>
              </span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">โครงสร้างส่งตรวจ</span>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-normal mb-3">
              นี่คือโครงสร้าง JSON แท่งเทียนย้อนหลังล่าสุดที่ถูกจัดเตรียมและจัดส่งเข้าไปใน Prompt ให้ AI เทรดเดอร์วิเคราะห์:
            </p>

            <pre className="text-xs font-mono text-orange-400 bg-slate-950 p-3 rounded border border-slate-900 overflow-x-auto max-h-48 leading-relaxed">
{`{
  "close": ${Number(close.toFixed(2))},
  "ema5": ${Number(lastCandle.ema5.toFixed(2))},
  "ema13": ${Number(lastCandle.ema13.toFixed(2))}
}`}
            </pre>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-3 pt-2 border-t border-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>EMA5 และ EMA13 จะคำนวณจากสูตรทางคณิตศาสตร์สถิติกราฟอย่างถูกต้อง</span>
          </div>
        </div>
      </div>
    </div>
  );
}
