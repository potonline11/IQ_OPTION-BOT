import React, { useState } from "react";
import { AISignal, Candle } from "../types";
import { TrendingUp, TrendingDown, HelpCircle, ChevronRight, AlertTriangle, Cpu, Code2, ShieldAlert } from "lucide-react";

interface AIAnalysisPanelProps {
  signal: AISignal | null;
  loading: boolean;
  lastCandle: Candle | null;
  error: string | null;
  onRunAnalysis: () => void;
}

export default function AIAnalysisPanel({
  signal,
  loading,
  lastCandle,
  error,
  onRunAnalysis
}: AIAnalysisPanelProps) {
  const [showPayloadDebugger, setShowPayloadDebugger] = useState(false);

  // Confidence Color Helper
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.85) return "text-emerald-500 stroke-emerald-500 border-emerald-500 bg-emerald-500/10";
    if (conf >= 0.75) return "text-emerald-400 stroke-emerald-400 border-emerald-400 bg-emerald-500/5";
    return "text-amber-500 stroke-amber-500 border-amber-500 bg-amber-500/10";
  };

  const formattedPromptInput = lastCandle
    ? JSON.stringify({
        close: lastCandle.close,
        ema5: lastCandle.ema5,
        ema13: lastCandle.ema13,
        volume: lastCandle.volume
      }, null, 2)
    : "ไม่มีข้อมูล";

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between" id="ai_analysis_panel">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg text-white">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-white font-bold tracking-tight">AI Quantitative Decision</h2>
              <p className="text-slate-400 text-xs font-mono">XAUUSD 1M ANALYST</p>
            </div>
          </div>
          
          <button
            onClick={onRunAnalysis}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-xs transition-colors shadow-lg shadow-indigo-950 flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>กำลังวิเคราะห์...</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5" />
                <span>วิเคราะห์แท่งเทียนด่วน</span>
              </>
            )}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-xs flex gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold">เกิดข้อผิดพลาดในการเรียกใช้ AI</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* AI Result Area */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="relative mb-4">
              <div className="w-16 h-16 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin"></div>
              <Cpu className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-slate-300 font-semibold text-sm animate-pulse">กำลังประเมินอัตราคณิตศาสตร์ความเสี่ยง...</p>
            <p className="text-slate-500 text-xs mt-1">ประมวลผลอินดิเคเตอร์ EMA5 / EMA13 ของทองคำในแท่ง 1m</p>
          </div>
        ) : signal ? (
          <div className="space-y-6">
            {/* Visual Action Indicator Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-8 flex items-center gap-4">
                {signal.action === "CALL" && (
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <TrendingUp className="w-8 h-8 animate-bounce" />
                  </div>
                )}
                {signal.action === "PUT" && (
                  <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400 flex-shrink-0">
                    <TrendingDown className="w-8 h-8 animate-bounce" />
                  </div>
                )}
                {signal.action === "HOLD" && (
                  <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 flex-shrink-0">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-xs font-mono">คำสั่งแนะนำ</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700">1 Min</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className={`text-3xl font-extrabold tracking-wider ${
                      signal.action === "CALL" ? "text-emerald-400" :
                      signal.action === "PUT" ? "text-red-400" : "text-amber-400"
                    }`}>
                      {signal.action}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {signal.action === "CALL" && "(ซื้อขึ้น)"}
                      {signal.action === "PUT" && "(ซื้อลง)"}
                      {signal.action === "HOLD" && "(พักการเข้าออเดอร์)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidence Circle Gauge */}
              <div className="md:col-span-4 flex flex-col items-center md:items-end justify-center">
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${getConfidenceColor(signal.confidence)}`}>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-400">WIN RATE มั่นใจ</div>
                    <div className="text-lg font-bold font-mono leading-none">{(signal.confidence * 100).toFixed(0)}%</div>
                  </div>
                  
                  {/* Miniature Circle indicator */}
                  <div className="relative w-8 h-8 flex-shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={signal.confidence >= 0.75 ? "text-emerald-400" : "text-amber-500"}
                        strokeWidth="3.5"
                        strokeDasharray={`${(signal.confidence * 100).toFixed(0)}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Technical Commentary Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="text-xs font-semibold text-indigo-400 mb-1.5 font-mono uppercase tracking-wide flex items-center gap-1">
                <span>ความเห็นเชิงวิเคราะห์ของ AI (Thai Technical Commentary)</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed font-sans">
                {signal.reason}
              </p>
              
              {/* Strict Rule Display */}
              {signal.action === "HOLD" && (
                <div className="mt-3 pt-3 border-t border-slate-900/60 flex items-start gap-1.5 text-[11px] text-amber-400 leading-normal">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span>
                    <strong>กฎเหล็กคุ้มครองทุน:</strong> ตลาดมีความผันผวนสูง ไซด์เวย์แคบ หรือระดับความมั่นใจไม่ถึงเกณฑ์ขั้นต่ำ 75% ระบบแนะนำให้หลีกเลี่ยงเพื่อรักษาวินัยทางการเงินและปกป้องทุน
                  </span>
                </div>
              )}

              {/* Confidence Warning for CALL/PUT under 75% */}
              {(signal.action === "CALL" || signal.action === "PUT") && signal.confidence < 0.75 && (
                <div className="mt-3 pt-3 border-t border-slate-900/60 flex items-start gap-1.5 text-[11px] text-amber-400 leading-normal">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400 animate-pulse" />
                  <span>
                    <strong>ระงับออเดอร์อัตโนมัติ:</strong> แม้ว่า AI วิเคราะห์แนะนำให้ <strong>{signal.action}</strong> แต่ความมั่นใจ <strong>{(signal.confidence * 100).toFixed(0)}%</strong> ต่ำกว่าเกณฑ์ปลอดภัย <strong>75%</strong> ระบบจึง <strong>ไม่เปิดออเดอร์อัตโนมัติ</strong> ในแท่งนี้เพื่อปกป้องเงินทุนและพอร์ตของคุณ
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-64 border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6 bg-slate-950/20">
            <Cpu className="w-10 h-10 text-slate-700 mb-2" />
            <p className="text-slate-400 text-sm font-semibold">ยังไม่มีการเรียกใช้สัญญาณ</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs">
              กดปุ่ม <strong className="text-slate-500">"วิเคราะห์แท่งเทียนด่วน"</strong> ด้านบน เพื่อให้สุดยอด AI Quantitative Trader คำนวณสัญญาณ CALL, PUT หรือ HOLD จากอินดิเคเตอร์ปัจจุบัน
            </p>
          </div>
        )}
      </div>

      {/* Debugger Payload Section */}
      <div className="mt-6 pt-4 border-t border-slate-800/80">
        <button
          onClick={() => setShowPayloadDebugger(!showPayloadDebugger)}
          className="w-full flex items-center justify-between text-slate-500 hover:text-slate-300 text-xs font-mono transition-colors focus:outline-none cursor-pointer"
        >
          <span className="flex items-center gap-1">
            <Code2 className="w-3.5 h-3.5" />
            <span>AI Payload Inspector ({showPayloadDebugger ? "ซ่อน" : "ตรวจสอบโครงสร้าง JSON"})</span>
          </span>
          <ChevronRight className={`w-4 h-4 transform transition-transform ${showPayloadDebugger ? "rotate-90" : ""}`} />
        </button>

        {showPayloadDebugger && (
          <div className="mt-3 space-y-3 animate-fadeIn">
            {/* Input prompt data sent */}
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">JSON INPUT DATA (ข้อมูลส่งตรวจ):</span>
              <pre className="text-[11px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-cyan-400 overflow-x-auto max-h-32">
                {formattedPromptInput}
              </pre>
            </div>

            {/* Expected Output constraint */}
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">SYSTEM INSTRUCTION (บทบาทที่ถูกตีกรอบ):</span>
              <div className="text-[11px] font-sans bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-400">
                คุณเป็นสุดยอด AI นักเทรดระดับโลก (Quantitative Trader) วิเคราะห์ความเสี่ยงและทำกำไรระยะสั้นในตลาด Binary Options 1 นาที...
              </div>
            </div>

            {/* Expected Schema */}
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">JSON OUTPUT SCHEMAS (โครงสร้างบังคับ):</span>
              <pre className="text-[10px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-emerald-400">
{`{
  "action": "CALL" | "PUT" | "HOLD",
  "confidence": 0.00 - 1.00,
  "reason": "เหตุผลสั้นๆ เชิงเทคนิค"
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
