import React, { useState } from "react";
import { 
  ShieldCheck, 
  Key, 
  Settings, 
  Unlink, 
  Link2, 
  ToggleLeft, 
  ToggleRight,
  HelpCircle,
  TrendingUp,
  Radio,
  UserCheck,
  AlertTriangle,
  Server,
  Code,
  Copy,
  Check
} from "lucide-react";

interface BrokerConnectionPanelProps {
  connectionMode: "simulation" | "live";
  setConnectionMode: (mode: "simulation" | "live") => void;
  mt5Server: string;
  setMt5Server: (val: string) => void;
  mt5Login: string;
  setMt5Login: (val: string) => void;
  mt5Password: string;
  setMt5Password: (val: string) => void;
  mt5WebhookUrl: string;
  setMt5WebhookUrl: (val: string) => void;
  mt5AccountType: "demo" | "real";
  setMt5AccountType: (val: "demo" | "real") => void;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  onConnect: () => void;
  onDisconnect: () => void;
  brokerAccountInfo: {
    server: string;
    loginid: string;
    is_virtual: boolean;
    balance?: number;
  } | null;
  errorMsg: string | null;
}

export default function BrokerConnectionPanel({
  connectionMode,
  setConnectionMode,
  mt5Server,
  setMt5Server,
  mt5Login,
  setMt5Login,
  mt5Password,
  setMt5Password,
  mt5WebhookUrl,
  setMt5WebhookUrl,
  mt5AccountType,
  setMt5AccountType,
  connectionStatus,
  onConnect,
  onDisconnect,
  brokerAccountInfo,
  errorMsg
}: BrokerConnectionPanelProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const localSignalUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/mt5/signals` 
    : "http://localhost:3000/api/mt5/signals";

  const mql5Code = `//+------------------------------------------------------------------+
//|                                                AI_Gold_Trader.mq5 |
//|                                  Copyright 2026, AI Quant Trader |
//|                                             https://ai.studio/   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AI Quant Trader"
#property link      "https://ai.studio/"
#property version   "1.00"
#property strict

//--- input parameters
input string   InpSignalUrl = "${localSignalUrl}"; // AI Signal API URL
input double   InpLotSize   = 0.10;                  // Default Lot Size
input int      InpSlippage  = 30;                    // Slippage in points
input int      InpMagic     = 123456;                // Magic Number

datetime last_trade_time = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
   Print("AI Gold Trader EA Initialized. Polling URL: ", InpSignalUrl);
   EventSetTimer(30); // Poll every 30 seconds
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
   EventKillTimer();
}

//+------------------------------------------------------------------+
//| Timer function to poll signals                                   |
//+------------------------------------------------------------------+
void OnTimer() {
   char post[], result[];
   string headers = "Content-Type: application/json\\r\\n";
   string result_headers;
   
   int res = WebRequest("GET", InpSignalUrl, headers, 15000, post, result, result_headers);
   
   if(res == 200) {
      string json = CharArrayToString(result);
      // Simple JSON parser (Check for "BUY" or "SELL" signals)
      if(StringFind(json, "\\"action\\":\\"BUY\\"") >= 0 || StringFind(json, "\\"action\\":\\"CALL\\"") >= 0) {
         if(TimeCurrent() - last_trade_time > 60) {
            ExecuteTrade(ORDER_TYPE_BUY);
         }
      }
      else if(StringFind(json, "\\"action\\":\\"SELL\\"") >= 0 || StringFind(json, "\\"action\\":\\"PUT\\"") >= 0) {
         if(TimeCurrent() - last_trade_time > 60) {
            ExecuteTrade(ORDER_TYPE_SELL);
         }
      }
   } else {
      Print("Error fetching AI signals. Code: ", res);
   }
}

//+------------------------------------------------------------------+
//| Execute Buy/Sell Trade                                           |
//+------------------------------------------------------------------+
void ExecuteTrade(ENUM_ORDER_TYPE order_type) {
   MqlTradeRequest request={};
   MqlTradeResult  trade_result={};
   
   request.action       = TRADE_ACTION_DEAL;
   request.symbol       = _Symbol;
   request.volume       = InpLotSize;
   request.type         = order_type;
   request.price        = (order_type == ORDER_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   request.deviation    = InpSlippage;
   request.magic        = InpMagic;
   request.comment      = "AI Quantitative Trader Signal";
   
   if(OrderSend(request, trade_result)) {
      Print("AI Trade executed successfully. Ticket: ", trade_result.order);
      last_trade_time = TimeCurrent();
   } else {
      Print("Trade execution failed. Error: ", GetLastError());
   }
}`;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-xl" id="broker_connection_panel">
      {/* Panel Title */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
        <div>
          <h2 className="text-white font-bold tracking-tight text-base flex items-center gap-2">
            <Radio className={`w-5 h-5 ${connectionMode === "live" ? "text-indigo-400 animate-pulse" : "text-slate-400"}`} />
            <span>ช่องทางเชื่อมต่อ MetaTrader 5 (MT5 Bridge)</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            สลับระหว่างระบบจำลองความเสี่ยง หรือส่งคำสั่งเทรดตรงไปยังพอร์ต MT5 ของคุณ
          </p>
        </div>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-850 cursor-pointer"
          title="คู่มือการเชื่อมต่อ"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Help Instructions Box */}
      {showHelp && (
        <div className="bg-slate-950 border border-indigo-900/45 p-4 rounded-lg mb-4 text-xs space-y-2.5 text-slate-300 leading-relaxed">
          <h4 className="font-bold text-indigo-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            วิธีการเชื่อมต่อพอร์ต MT5 (เลือกได้ 2 วิธี):
          </h4>
          
          <div className="space-y-2">
            <p className="font-semibold text-slate-200">วิธีที่ 1: ส่งคำสั่งเทรดออกผ่าน Webhook (Outbound Webhook)</p>
            <ol className="list-decimal pl-4 space-y-1">
               <li>ติดตั้ง EA หรือ Webhook Bridge ในโปรแกรม MT5 ของคุณ (เช่น EAs ที่รองรับ Webhook)</li>
               <li>กรอกลิงก์ Webhook URL ของ EA ของคุณในช่องตั้งค่าด้านล่าง</li>
               <li>เมื่อ AI วิเคราะห์พบสัญญาณซื้อขาย บอทจะทำการยิง POST request ไปยังลิงก์ของคุณทันที</li>
            </ol>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-800/60">
            <p className="font-semibold text-slate-200">วิธีที่ 2: ใช้ MT5 EA เข้ามาดึงสัญญาณ (Inbound API - แนะนำ ⭐)</p>
            <ol className="list-decimal pl-4 space-y-1">
               <li>เปิดโปรแกรม <strong>MetaEditor</strong> บน MT5 แล้วสร้าง Expert Advisor ใหม่</li>
               <li>คัดลอกโค้ด <strong>MQL5 Script</strong> ในหัวข้อด้านล่างไปวางแล้วกด Compile</li>
               <li>นำ EA ไปลากใส่กราฟ Gold (XAUUSD) ใน MT5 แล้วเปิดใช้งาน <strong>Allow WebRequest</strong> เพื่อให้ระบบเริ่มดึงสัญญาณ AI อัตโนมัติ</li>
            </ol>
          </div>

          <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-900/60 p-2 rounded">
            🔒 ระบบนี้ทำหน้าที่เป็นตัวกลางในการส่งสัญญาณเชิงปริมาณ (Quant signals) ผ่าน Secure API โดยไม่มีการเปิดเผยพอร์ตหรือทำอันตรายใดๆ ต่อสินทรัพย์ของคุณ
          </p>
        </div>
      )}

      {/* Connection Mode Toggle buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setConnectionMode("simulation")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
            connectionMode === "simulation"
              ? "bg-slate-800 border-slate-700 text-white font-bold shadow"
              : "bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300"
          }`}
        >
          <ToggleLeft className="w-4 h-4" />
          <span>โหมดจำลอง (Simulator)</span>
        </button>

        <button
          onClick={() => setConnectionMode("live")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
            connectionMode === "live"
              ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-300 font-bold shadow-md shadow-indigo-950/40"
              : "bg-slate-950 border-slate-900 text-slate-500 hover:text-indigo-400"
          }`}
        >
          <ToggleRight className="w-4 h-4 text-indigo-400" />
          <span>เชื่อมต่อ MT5 (Live Bridge)</span>
        </button>
      </div>

      {/* Conditionally render Live connection configurations */}
      {connectionMode === "live" ? (
        <div className="space-y-4 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
          
          {/* Connection Status Badge */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <span className="text-slate-400 text-xs font-sans">สถานะสะพานเชื่อม MT5:</span>
            {connectionStatus === "disconnected" && (
              <span className="px-2.5 py-1 rounded bg-slate-800/50 text-slate-400 text-[10px] font-bold font-mono border border-slate-700">
                ● OFFLINE
              </span>
            )}
            {connectionStatus === "connecting" && (
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold font-mono border border-amber-500/25 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping"></span>
                ACTIVATING...
              </span>
            )}
            {connectionStatus === "connected" && (
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono border border-emerald-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                ACTIVE (LIVE STREAM)
              </span>
            )}
            {connectionStatus === "error" && (
              <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold font-mono border border-red-500/25">
                ⚠️ BRIDGE ERROR
              </span>
            )}
          </div>

          {/* Form inputs */}
          {connectionStatus !== "connected" ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1 font-mono uppercase font-bold flex items-center gap-1">
                  <Server className="w-3 h-3" /> MT5 Broker Server Name
                </label>
                <input
                  type="text"
                  value={mt5Server}
                  onChange={(e) => setMt5Server(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded px-3 py-2 text-xs text-slate-200 font-mono"
                  placeholder="e.g. Exness-MT5-Real, XM-Demo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-mono uppercase font-bold">MT5 Account Login ID</label>
                  <input
                    type="text"
                    value={mt5Login}
                    onChange={(e) => setMt5Login(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded px-3 py-2 text-xs text-slate-200 font-mono"
                    placeholder="e.g. 50012345"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-mono uppercase font-bold">MT5 Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={mt5Password}
                      onChange={(e) => setMt5Password(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded pl-3 pr-10 py-2 text-xs text-slate-200 font-mono"
                      placeholder="MT5 Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px] font-semibold cursor-pointer font-sans"
                    >
                      {showPassword ? "ซ่อน" : "ดู"}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono uppercase font-bold flex justify-between items-center">
                  <span>MT5 EA Webhook URL (Outbound)</span>
                  <span className="text-[9px] text-slate-600 font-normal">ใส่เพื่อส่งสัญญาออก</span>
                </label>
                <input
                  type="text"
                  value={mt5WebhookUrl}
                  onChange={(e) => setMt5WebhookUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-indigo-950 focus:border-indigo-500 focus:outline-none rounded px-3 py-2 text-xs text-indigo-300 font-mono"
                  placeholder="e.g. http://your-vps-ip:8080/trade"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1 font-mono uppercase font-bold">MT5 Account Type</label>
                <select
                  value={mt5AccountType}
                  onChange={(e) => setMt5AccountType(e.target.value as "demo" | "real")}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="demo">บัญชีทดลอง (MT5 Practice Demo Account)</option>
                  <option value="real">บัญชีเทรดจริง (MT5 Real Live Account)</option>
                </select>
              </div>

              {/* Error indicator */}
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded text-[11px] text-red-400 flex items-start gap-1.5 font-mono leading-normal">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Connect button */}
              <button
                onClick={onConnect}
                disabled={connectionStatus === "connecting" || !mt5Login.trim() || !mt5Server.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-850 border border-indigo-500/40 text-white rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors mt-2"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>เปิดการทำงาน MT5 Bridge & API Stream</span>
              </button>
            </div>
          ) : (
            /* Connected Mode account information */
            <div className="space-y-4 font-mono text-xs">
              
              {/* Connected Account Card details */}
              <div className="bg-slate-950 p-3 rounded border border-slate-900 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                  <span>ผู้ใช้ที่เชื่อมต่อสะพานสัญญาณ:</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                    brokerAccountInfo?.is_virtual ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {brokerAccountInfo?.is_virtual ? "DEMO/PRACTICE" : "REAL/LIVE ACCOUNT"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-slate-300 mt-1">
                  <span className="text-slate-400">เลขพอร์ต MT5:</span>
                  <span className="text-white font-bold">{brokerAccountInfo?.loginid}</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">โบรกเกอร์เซิร์ฟเวอร์:</span>
                  <span className="text-slate-200">{brokerAccountInfo?.server}</span>
                </div>

                {brokerAccountInfo?.balance !== undefined && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">บาลานซ์พอร์ต:</span>
                    <span className="text-emerald-400 font-bold">${brokerAccountInfo.balance.toLocaleString()} USD</span>
                  </div>
                )}
              </div>

              {/* Copyable API Endpoint Card */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-indigo-950/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-indigo-400 font-sans font-bold flex items-center gap-1">
                    <Code className="w-3.5 h-3.5" />
                    <span>Inbound API Endpoint สําหรับ EA ของคุณ</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(localSignalUrl, 1)}
                    className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition-colors"
                    title="คัดลอกลิงก์ API"
                  >
                    {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="bg-slate-900 p-2 rounded text-[10px] font-mono text-amber-400 overflow-x-auto whitespace-nowrap scrollbar-thin">
                  {localSignalUrl}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  ตั้งค่าใน MT5 EA ของคุณให้ส่ง HTTP GET มายัง URL นี้เพื่อรับสัญญาณอัพเดททันทีจากคลาวด์บอท AI
                </p>
              </div>

              {/* Copy MQL5 EA Template */}
              <div className="border-t border-slate-900 pt-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-slate-400 font-bold font-sans">MQL5 EA Template Script:</span>
                  <button
                    onClick={() => copyToClipboard(mql5Code, 2)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-sans font-medium flex items-center gap-1"
                  >
                    {copiedIndex === 2 ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>คัดลอกสำเร็จ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>คัดลอกโค้ด MQL5</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-900 text-[10px] text-slate-500 font-mono max-h-[140px] overflow-y-auto scrollbar-thin">
                  <pre className="text-left select-all">{mql5Code}</pre>
                </div>
              </div>

              {/* Cloud Bot Active Server Status */}
              <div className="bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-lg text-slate-300 text-[11px] space-y-1.5" id="cloud_bot_status_indicator">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span className="text-emerald-400 font-sans font-bold">คลาวด์บอทส่งสัญญาน 24 ชั่วโมง (Cloud Signals Live)</span>
                </span>
                <p className="leading-relaxed font-sans text-slate-400 text-xs">
                  ระบบได้บันทึกพอร์ตเชื่อมต่อเรียบร้อยแล้ว บอทจะเริ่มวิเคราะห์ตลาด Gold ด้วย AI และกระจายสัญญาณเทรดโดยอัตโนมัติ <strong>แม้ว่าคุณจะปิดหน้านี้ไป EA บน MT5 ของคุณก็จะยังสามารถขอสัญญาณจากเซิร์ฟเวอร์ของเราและเข้าออเดอร์ได้ 24 ชั่วโมง</strong>
                </p>
              </div>

              {/* Disconnect button */}
              <button
                onClick={onDisconnect}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Unlink className="w-3.5 h-3.5 text-red-400" />
                <span>ปิดสะพานเชื่อมสัญญาณ MT5</span>
              </button>
            </div>
          )}

        </div>
      ) : (
        /* Simulation Mode description */
        <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-850/80 text-xs text-slate-400 leading-relaxed font-sans flex items-start gap-3">
          <div className="p-2 bg-indigo-500/5 rounded-lg text-indigo-400 border border-indigo-500/10 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-200 font-semibold block mb-0.5">สถานะจำลองความเสี่ยง MT5 Sandbox:</span>
            กำลังวิเคราะห์ในโหมด Sandbox คุณสามารถจำลองคำสั่งซื้อ (BUY) หรือสั่งขาย (SELL) ทองคำแบบ Real-time, ปรับขนาดล็อต (Lot), และตั้งค่าจุดตัดขาดทุน (SL) และทำกำไร (TP) ได้อย่างอิสระและปลอดภัย
          </div>
        </div>
      )}
    </div>
  );
}
