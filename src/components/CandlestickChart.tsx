import React, { useMemo, useState } from "react";
import { Candle, ActionType } from "../types";

interface CandlestickChartProps {
  candles: Candle[];
  activeSignal?: {
    action: ActionType;
    confidence: number;
  };
}

export default function CandlestickChart({ candles, activeSignal }: CandlestickChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG dimensions
  const height = 320;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 45;

  // Find min and max values to scale prices
  const { minPrice, maxPrice, priceStep } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 2300, maxPrice: 2400, priceStep: 10 };
    
    let min = Infinity;
    let max = -Infinity;
    
    candles.forEach((c) => {
      const candidates = [c.low, c.high, c.ema5, c.ema13];
      candidates.forEach((val) => {
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });
    
    // Add 10% margin above and below
    const diff = max - min;
    const margin = diff === 0 ? 5 : diff * 0.15;
    const finalMin = min - margin;
    const finalMax = max + margin;
    
    return {
      minPrice: Number(finalMin.toFixed(2)),
      maxPrice: Number(finalMax.toFixed(2)),
      priceStep: Number(((finalMax - finalMin) / 5).toFixed(2))
    };
  }, [candles]);

  // Handle scaling functions
  const getX = (index: number, width: number) => {
    const chartWidth = width - paddingLeft - paddingRight;
    const spacing = chartWidth / Math.max(1, candles.length - 1);
    return paddingLeft + index * spacing;
  };

  const getY = (price: number) => {
    const chartHeight = height - paddingTop - paddingBottom;
    const priceRange = maxPrice - minPrice;
    if (priceRange === 0) return paddingTop + chartHeight / 2;
    return height - paddingBottom - ((price - minPrice) / priceRange) * chartHeight;
  };

  // Generate price gridlines
  const gridlines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + i * priceStep;
      lines.push(price);
    }
    return lines;
  }, [minPrice, priceStep]);

  // Compute EMA path strings
  const { ema5Path, ema13Path } = useMemo(() => {
    // We assume a dynamic width container inside useMemo but since it's responsive, 
    // we'll compute points for a constant relative viewport width of 600, 
    // and let SVG viewBox handle perfect fluid scaling!
    const width = 800; 
    let p5 = "";
    let p13 = "";
    
    candles.forEach((c, idx) => {
      const x = getX(idx, width);
      const y5 = getY(c.ema5);
      const y13 = getY(c.ema13);
      
      if (idx === 0) {
        p5 = `M ${x} ${y5}`;
        p13 = `M ${x} ${y13}`;
      } else {
        p5 += ` L ${x} ${y5}`;
        p13 += ` L ${x} ${y13}`;
      }
    });
    
    return { ema5Path: p5, ema13Path: p13 };
  }, [candles, minPrice, maxPrice]);

  const viewWidth = 800;

  // Selected item metrics
  const activeCandle = hoveredIndex !== null ? candles[hoveredIndex] : candles[candles.length - 1];

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 shadow-xl select-none" id="candlestick_chart_container">
      {/* Top Bar with real-time stats of the current/hovered candle */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-900 pb-3 mb-4 text-xs font-mono gap-y-2">
        <div className="flex flex-wrap items-center gap-x-4">
          <span className="text-slate-400 font-sans font-semibold text-sm">GOLD (XAUUSD) 1M</span>
          <span className="text-slate-500">เวลา: <strong className="text-slate-300">{activeCandle?.time}</strong></span>
          <span className="text-slate-500">O: <strong className={activeCandle?.close >= activeCandle?.open ? "text-emerald-400" : "text-red-400"}>{activeCandle?.open.toFixed(2)}</strong></span>
          <span className="text-slate-500">H: <strong className="text-emerald-400">{activeCandle?.high.toFixed(2)}</strong></span>
          <span className="text-slate-500">L: <strong className="text-red-400">{activeCandle?.low.toFixed(2)}</strong></span>
          <span className="text-slate-500">C: <strong className={activeCandle?.close >= activeCandle?.open ? "text-emerald-400" : "text-red-400"}>{activeCandle?.close.toFixed(2)}</strong></span>
        </div>
        
        <div className="flex gap-x-4">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-yellow-400 inline-block rounded-full"></span>
            <span className="text-yellow-400 font-semibold">EMA(5): {activeCandle?.ema5.toFixed(2)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block rounded-full"></span>
            <span className="text-cyan-400 font-semibold">EMA(13): {activeCandle?.ema13.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* Main SVG Area */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${viewWidth} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          {/* Price Grid Lines */}
          {gridlines.map((price, idx) => {
            const y = getY(price);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={viewWidth - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Time Labels on bottom */}
          {candles.map((candle, idx) => {
            // Show every 2nd or 3rd time label to avoid overlap
            if (idx % 2 !== 0 && idx !== candles.length - 1) return null;
            const x = getX(idx, viewWidth);
            return (
              <g key={`time-${idx}`}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={height - paddingBottom}
                  stroke="#0f172a"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - paddingBottom + 16}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {candle.time}
                </text>
              </g>
            );
          })}

          {/* Candlesticks (rect and shadows) */}
          {candles.map((c, idx) => {
            const x = getX(idx, viewWidth);
            const yOpen = getY(c.open);
            const yClose = getY(c.close);
            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const isBullish = c.close >= c.open;
            
            const candleWidth = Math.max(4, (viewWidth - paddingLeft - paddingRight) / candles.length * 0.5);
            const candleHeight = Math.max(1.5, Math.abs(yClose - yOpen));
            const candleTop = Math.min(yOpen, yClose);

            const strokeColor = isBullish ? "#10b981" : "#ef4444";
            const fillColor = isBullish ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)";

            return (
              <g 
                key={`candle-${idx}`}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-crosshair"
              >
                {/* Vertical Shadow Lines (High/Low) */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />

                {/* Candle Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={candleTop}
                  width={candleWidth}
                  height={candleHeight}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  rx="1"
                />

                {/* Interactive hover active rect */}
                <rect
                  x={x - candleWidth}
                  y={paddingTop}
                  width={candleWidth * 2}
                  height={height - paddingTop - paddingBottom}
                  fill="transparent"
                  className="hover:fill-slate-800/10 transition-colors"
                />

                {/* Highlight last candle with a soft glow pulse */}
                {idx === candles.length - 1 && (
                  <circle
                    cx={x}
                    cy={yClose}
                    r="5"
                    className="fill-emerald-500 animate-ping opacity-75"
                    style={{ animationDuration: "2s" }}
                  />
                )}
              </g>
            );
          })}

          {/* EMA Curves */}
          <path
            d={ema5Path}
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={ema13Path}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active AI Signal Overlay Indicator on the final candle */}
          {activeSignal && activeSignal.action !== "HOLD" && (
            (() => {
              const lastIdx = candles.length - 1;
              const x = getX(lastIdx, viewWidth);
              const lastCandle = candles[lastIdx];
              const yAnchor = activeSignal.action === "CALL" ? getY(lastCandle.high) - 25 : getY(lastCandle.low) + 25;
              const isCall = activeSignal.action === "CALL";
              const arrowColor = isCall ? "#10b981" : "#ef4444";
              
              return (
                <g className="animate-bounce" style={{ animationDuration: "3s" }}>
                  {/* Arrow Pointing */}
                  <polygon
                    points={
                      isCall
                        ? `${x},${yAnchor} ${x - 8},${yAnchor + 10} ${x + 8},${yAnchor + 10}`
                        : `${x},${yAnchor} ${x - 8},${yAnchor - 10} ${x + 8},${yAnchor - 10}`
                    }
                    fill={arrowColor}
                  />
                  <rect
                    x={x - 22}
                    y={isCall ? yAnchor + 10 : yAnchor - 24}
                    width="44"
                    height="14"
                    rx="3"
                    fill={isCall ? "rgba(16, 185, 129, 0.95)" : "rgba(239, 68, 68, 0.95)"}
                  />
                  <text
                    x={x}
                    y={isCall ? yAnchor + 20 : yAnchor - 14}
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    {activeSignal.action}
                  </text>
                </g>
              );
            })()
          )}

          {/* Active Hover Crosshair Line */}
          {hoveredIndex !== null && (
            <g>
              <line
                x1={getX(hoveredIndex, viewWidth)}
                y1={paddingTop}
                x2={getX(hoveredIndex, viewWidth)}
                y2={height - paddingBottom}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1={paddingLeft}
                y1={getY(candles[hoveredIndex].close)}
                x2={viewWidth - paddingRight}
                y2={getY(candles[hoveredIndex].close)}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}
        </svg>
      </div>
      
      {/* Footer Info */}
      <div className="flex justify-between items-center mt-3 text-slate-500 text-[10px] font-mono">
        <span>* วาดเส้น EMA 5 (เหลือง) และ EMA 13 (ฟ้า) เพื่อวิเคราะห์เทรนด์ระยะสั้น</span>
        <span>ความถี่แท่งเทียน: 1m</span>
      </div>
    </div>
  );
}
