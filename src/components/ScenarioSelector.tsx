import React from "react";
import { MarketScenario } from "../types";
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle, ShieldCheck } from "lucide-react";

interface ScenarioSelectorProps {
  scenarios: MarketScenario[];
  activeScenarioId: string;
  onSelectScenario: (scenario: MarketScenario) => void;
}

export default function ScenarioSelector({
  scenarios,
  activeScenarioId,
  onSelectScenario
}: ScenarioSelectorProps) {
  
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "TrendingUp":
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case "TrendingDown":
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      case "ArrowRight":
        return <ArrowRight className="w-5 h-5 text-amber-400" />;
      case "AlertTriangle":
        return <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />;
      default:
        return <TrendingUp className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getExpectationBadge = (id: string) => {
    switch (id) {
      case "bullish_breakout":
        return (
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">
            คาดการณ์: CALL
          </span>
        );
      case "bearish_breakout":
        return (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold rounded">
            คาดการณ์: PUT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded flex items-center gap-0.5">
            <ShieldCheck className="w-3 h-3" />
            คาดการณ์: HOLD
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl" id="market_scenarios_selector">
      <div className="mb-4">
        <h2 className="text-white font-bold tracking-tight text-base flex items-center gap-1.5">
          <span>Sandbox Market Scenarios</span>
          <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">ชุดข้อมูลจำลอง</span>
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          เลือกสภาวะตลาดจำลองเพื่อทดสอบการตอบสนองเชิงเทคนิคและกฎคุมความเสี่ยงของ AI Quantitative Trader
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((sc) => {
          const isActive = sc.id === activeScenarioId;
          return (
            <div
              key={sc.id}
              onClick={() => onSelectScenario(sc)}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer hover:bg-slate-800/40 relative flex flex-col justify-between ${
                isActive
                  ? "bg-indigo-950/20 border-indigo-500/80 shadow-md shadow-indigo-950/10"
                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    {getIcon(sc.icon)}
                  </div>
                  {getExpectationBadge(sc.id)}
                </div>

                <h3 className="text-white font-bold text-xs mb-1.5">{sc.name}</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
                  {sc.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-900/60 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>ราคาล่าสุด:</span>
                <span className="font-bold text-slate-300">
                  ${sc.candles[sc.candles.length - 1].close.toFixed(2)}
                </span>
              </div>
              
              {isActive && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-slate-900"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
