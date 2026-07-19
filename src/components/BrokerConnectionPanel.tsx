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

  const localWebhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/mt5/signal-webhook` 
    : "http://localhost:3000/api/mt5/signal-webhook";

  const mql5Code = `//+------------------------------------------------------------------+
//|                                                AI_Gold_Trader.mq5 |
//|                                  Copyright 2026, AI Quant Trader |
//|                                             https://ai.studio/   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AI Quant Trader"
#property link      "https://ai.studio/"
#property version   "2.00"
#property strict

//--- input parameters
input string   InpWebhookUrl      = "${localWebhookUrl}"; // AI Webhook URL
input double   InpLotSize         = 0.10;                   // Default Lot Size
input int      InpDefaultSLPips   = 100;                    // Default Stop Loss in Pips
input int      InpDefaultTPPips   = 200;                    // Default Take Profit in Pips
input int      InpSlippage        = 30;                     // Slippage in points
input int      InpMagic           = 123456;                 // Magic Number
input int      InpPollIntervalSec = 15;                     // Sync interval (seconds)

datetime last_trade_time = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
   Print("AI Gold Trader EA v2.0 Initialized.");
   Print("Syncing Live Balance & Candles to: ", InpWebhookUrl);
   EventSetTimer(InpPollIntervalSec); // Sync periodically
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
   EventKillTimer();
}

//+------------------------------------------------------------------+
//| Helper to parse double value from JSON manually                  |
//+------------------------------------------------------------------+
double JsonGetDouble(string json, string key, double default_val) {
   string search_key = "\\"" + key + "\\":";
   int index = StringFind(json, search_key);
   if(index < 0) return default_val;
   
   int start = index + StringLen(search_key);
   while(start < StringLen(json) && (StringGetCharacter(json, start) == ' ' || StringGetCharacter(json, start) == ':')) {
      start++;
   }
   
   int end = start;
   while(end < StringLen(json)) {
      ushort c = StringGetCharacter(json, end);
      if((c >= '0' && c <= '9') || c == '.' || c == '-') {
         end++;
      } else {
         break;
      }
   }
   
   if(end > start) {
      string val_str = StringSubstr(json, start, end - start);
      return StringToDouble(val_str);
   }
   return default_val;
}

//+------------------------------------------------------------------+
//| Helper to parse int value from JSON manually                     |
//+------------------------------------------------------------------+
int JsonGetInt(string json, string key, int default_val) {
   return (int)JsonGetDouble(json, key, default_val);
}

//+------------------------------------------------------------------+
//| Timer function to send data & fetch signals                      |
//+------------------------------------------------------------------+
void OnTimer() {
   // 1. Fetch recent candlestick rates (last 30 candles)
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(_Symbol, _Period, 0, 30, rates);
   if(copied <= 0) {
      Print("Failed to copy chart rates for ", _Symbol);
      return;
   }
   
   // 2. Build Candles JSON array
   string candles_json = "[";
   for(int i = copied - 1; i >= 0; i--) {
      string candle = "{\\"time\\":\\"" + TimeToString(rates[i].time, TIME_DATE|TIME_MINUTES) + "\\"," +
                      "\\"open\\":" + DoubleToString(rates[i].open, _Digits) + "," +
                      "\\"high\\":" + DoubleToString(rates[i].high, _Digits) + "," +
                      "\\"low\\":" + DoubleToString(rates[i].low, _Digits) + "," +
                      "\\"close\\":" + DoubleToString(rates[i].close, _Digits) + "," +
                      "\\"epoch\\":" + IntegerToString(rates[i].time) + "," +
                      "\\"volume\\":" + IntegerToString(rates[i].tick_volume) + "}";
      candles_json += candle;
      if(i > 0) candles_json += ",";
   }
   candles_json += "]";
   
   // 3. Build Full POST Payload with real broker data
   string json_body = "{\\"type\\":\\"candles\\"," +
                      "\\"balance\\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + "," +
                      "\\"equity\\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + "," +
                      "\\"loginid\\":\\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\\"," +
                      "\\"server\\":\\"" + AccountInfoString(ACCOUNT_SERVER) + "\\"," +
                      "\\"candles\\":" + candles_json + "}";
                      
   char post[], result[];
   string result_headers;
   string headers = "Content-Type: application/json\\r\\n";
   
   StringToCharArray(json_body, post, 0, WHOLE_ARRAY, CP_UTF8);
   
   // 4. Send WebRequest to the AI Server Webhook
   int res = WebRequest("POST", InpWebhookUrl, headers, 15000, post, result, result_headers);
   
   if(res == 200) {
      string response_text = CharArrayToString(result);
      
      // Update variables from server response config
      int sl_pips = JsonGetInt(response_text, "slPips", InpDefaultSLPips);
      int tp_pips = JsonGetInt(response_text, "tpPips", InpDefaultTPPips);
      double lot_size = JsonGetDouble(response_text, "lotSize", InpLotSize);
      
      // Simple JSON parser (Check for "BUY" or "SELL" signals)
      string action = "HOLD";
      if(StringFind(response_text, "\\"action\\":\\"BUY\\"") >= 0 || StringFind(response_text, "\\"action\\":\\"CALL\\"") >= 0) {
         action = "BUY";
      }
      else if(StringFind(response_text, "\\"action\\":\\"SELL\\"") >= 0 || StringFind(response_text, "\\"action\\":\\"PUT\\"") >= 0) {
         action = "SELL";
      }
      
      Print("Synced successfully with AI Server. Signal: ", action, " | Balance: ", AccountInfoDouble(ACCOUNT_BALANCE));
      
      if(action == "BUY") {
         if(TimeCurrent() - last_trade_time > 60) {
            ExecuteTrade(ORDER_TYPE_BUY, sl_pips, tp_pips, lot_size);
         }
      }
      else if(action == "SELL") {
         if(TimeCurrent() - last_trade_time > 60) {
            ExecuteTrade(ORDER_TYPE_SELL, sl_pips, tp_pips, lot_size);
         }
      }
   } else {
      Print("Error syncing with AI Server. Code: ", res);
   }
}

//+------------------------------------------------------------------+
//| Check if there are any open positions for current magic number   |
//+------------------------------------------------------------------+
bool HasOpenPositions() {
   for(int i = PositionsTotal() - 1; i >= 0; i--) {
      if(PositionGetSymbol(i) == _Symbol) {
         if(PositionGetInteger(POSITION_MAGIC) == InpMagic) {
            return true;
         }
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//| Execute Buy/Sell Trade with custom TP and SL                     |
//+------------------------------------------------------------------+
void ExecuteTrade(ENUM_ORDER_TYPE order_type, int sl_pips, int tp_pips, double lot_size) {
   if(HasOpenPositions()) {
      Print("Skipping order. Position already open for Magic: ", InpMagic);
      return;
   }
   
   MqlTradeRequest request={};
   MqlTradeResult  trade_result={};
   
   request.action       = TRADE_ACTION_DEAL;
   request.symbol       = _Symbol;
   request.volume       = lot_size > 0 ? lot_size : InpLotSize;
   request.type         = order_type;
   
   double price = (order_type == ORDER_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   request.price        = price;
   
   // Calculate SL and TP prices
   double sl_price = 0;
   double tp_price = 0;
   
   if(order_type == ORDER_TYPE_BUY) {
      if(sl_pips > 0) sl_price = price - (sl_pips * _Point);
      if(tp_pips > 0) tp_price = price + (tp_pips * _Point);
   } else if(order_type == ORDER_TYPE_SELL) {
      if(sl_pips > 0) sl_price = price + (sl_pips * _Point);
      if(tp_pips > 0) tp_price = price - (tp_pips * _Point);
   }
   
   request.sl           = sl_price;
   request.tp           = tp_price;
   request.deviation    = InpSlippage;
   request.magic        = InpMagic;
   request.comment      = "XAUUSD AI Quant Trader Order";
   
   if(OrderSend(request, trade_result)) {
      Print("AI Trade executed successfully. Ticket: ", trade_result.order, " | Price: ", price, " | SL: ", sl_price, " | TP: ", tp_price);
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
                    <span>Inbound API Webhook สําหรับ EA ของคุณ (แนะนำ ⭐)</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(localWebhookUrl, 1)}
                    className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition-colors"
                    title="คัดลอกลิงก์ API Webhook"
                  >
                    {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="bg-slate-900 p-2 rounded text-[10px] font-mono text-amber-400 overflow-x-auto whitespace-nowrap scrollbar-thin">
                  {localWebhookUrl}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  นำ URL นี้ไปใส่ในตัวแปร <code className="text-amber-400 font-mono">InpWebhookUrl</code> ของ MQL5 EA เพื่อให้ระบบส่งยอดเงินจริงและข้อมูลแท่งเทียนโบรกเกอร์มาวิเคราะห์บนเว็บโดยตรง
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
