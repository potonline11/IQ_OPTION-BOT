import React, { useState, useEffect, useRef } from "react";
import { Candle, AISignal, Trade, MarketScenario } from "./types";
import { marketScenarios } from "./data/scenarios";
import { generateNextCandle, enrichCandlesWithEMA } from "./utils/indicators";
import CandlestickChart from "./components/CandlestickChart";
import AIAnalysisPanel from "./components/AIAnalysisPanel";
import TradingPanel from "./components/TradingPanel";
import ScenarioSelector from "./components/ScenarioSelector";
import ManualSandboxForm from "./components/ManualSandboxForm";
import BrokerConnectionPanel from "./components/BrokerConnectionPanel";
import { 
  Cpu, 
  Layers, 
  History, 
  BarChart3, 
  RefreshCw, 
  UserCheck, 
  Play, 
  Pause, 
  FastForward, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Award
} from "lucide-react";

export default function App() {
  // 1. Core State
  const [candles, setCandles] = useState<Candle[]>(marketScenarios[0].candles);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(marketScenarios[0].id);
  const [balance, setBalance] = useState<number>(10000);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeSignal, setActiveSignal] = useState<AISignal | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2. Simulation Timeline Controls
  const [candleTimer, setCandleTimer] = useState<number>(0); // 0 to 59 seconds within 1m candle
  const [simulationSpeed, setSimulationSpeed] = useState<"paused" | "normal" | "fast">("normal"); // normal = 1s, fast = 3s per tick
  const [autoTrade, setAutoTrade] = useState<boolean>(false);
  const [investAmount, setInvestAmount] = useState<number>(100);

  // 3. Live Broker Connection State
  const [connectionMode, setConnectionMode] = useState<"simulation" | "live">("simulation");
  const [mt5Server, setMt5Server] = useState<string>("");
  const [mt5Login, setMt5Login] = useState<string>("");
  const [mt5Password, setMt5Password] = useState<string>("");
  const [mt5WebhookUrl, setMt5WebhookUrl] = useState<string>("");
  const [mt5AccountType, setMt5AccountType] = useState<"demo" | "real">("demo");
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [brokerAccountInfo, setBrokerAccountInfo] = useState<{
    server: string;
    loginid: string;
    is_virtual: boolean;
    balance?: number;
  } | null>(null);
  const [brokerErrorMsg, setBrokerErrorMsg] = useState<string | null>(null);
  const [tradeErrorMsg, setTradeErrorMsg] = useState<string | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<number>(74);
  const [activeAssetName, setActiveAssetName] = useState<string>("XAUUSD");
  const [lotSize, setLotSize] = useState<number>(0.10);
  const [slPips, setSlPips] = useState<number>(200);
  const [tpPips, setTpPips] = useState<number>(300);

  // V98.3 EMA & Day Trade Limit states
  const [dayTradeLimitEnabled, setDayTradeLimitEnabled] = useState<boolean>(false);
  const [maxDailyTrades, setMaxDailyTrades] = useState<number>(10);
  const [dailyTakeProfitLimit, setDailyTakeProfitLimit] = useState<number>(100);
  const [dailyStopLossLimit, setDailyStopLossLimit] = useState<number>(50);
  const [fastEmaPeriod, setFastEmaPeriod] = useState<number>(5);
  const [slowEmaPeriod, setSlowEmaPeriod] = useState<number>(13);

  // Maintain reference to current candles, trades, balance, activeSignal, etc.
  const candlesRef = useRef<Candle[]>(candles);
  const tradesRef = useRef<Trade[]>(trades);
  const balanceRef = useRef<number>(balance);
  const activeScenarioIdRef = useRef<string>(activeScenarioId);
  const activeSignalRef = useRef<AISignal | null>(activeSignal);
  const activeAssetIdRef = useRef<number>(activeAssetId);
  
  useEffect(() => {
    activeAssetIdRef.current = activeAssetId;
  }, [activeAssetId]);
  
  // MT5 Credentials and AutoTrade Refs for websocket closures
  const mt5ServerRef = useRef<string>("");
  const mt5LoginRef = useRef<string>("");
  const mt5PasswordRef = useRef<string>("");
  const mt5WebhookUrlRef = useRef<string>("");
  const mt5AccountTypeRef = useRef<"demo" | "real">("demo");
  const autoTradeRef = useRef<boolean>(false);
  const connectionModeRef = useRef<"simulation" | "live">("simulation");

  useEffect(() => {
    connectionModeRef.current = connectionMode;
  }, [connectionMode]);

  // WebSocket and Pending Request References
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    activeScenarioIdRef.current = activeScenarioId;
  }, [activeScenarioId]);

  useEffect(() => {
    activeSignalRef.current = activeSignal;
  }, [activeSignal]);

  useEffect(() => {
    mt5ServerRef.current = mt5Server;
  }, [mt5Server]);

  useEffect(() => {
    mt5LoginRef.current = mt5Login;
  }, [mt5Login]);

  useEffect(() => {
    mt5PasswordRef.current = mt5Password;
  }, [mt5Password]);

  useEffect(() => {
    mt5WebhookUrlRef.current = mt5WebhookUrl;
  }, [mt5WebhookUrl]);

  useEffect(() => {
    mt5AccountTypeRef.current = mt5AccountType;
  }, [mt5AccountType]);

  useEffect(() => {
    autoTradeRef.current = autoTrade;
  }, [autoTrade]);

  // Load saved broker credentials and check if background cloud bot is already active on mount
  useEffect(() => {
    const savedServer = localStorage.getItem("mt5_server");
    const savedLogin = localStorage.getItem("mt5_login");
    const savedPassword = localStorage.getItem("mt5_password");
    const savedWebhookUrl = localStorage.getItem("mt5_webhook_url");
    const savedAccountType = localStorage.getItem("mt5_account_type");
    const savedLots = localStorage.getItem("mt5_lots");
    const savedSl = localStorage.getItem("mt5_sl");
    const savedTp = localStorage.getItem("mt5_tp");

    if (savedServer) setMt5Server(savedServer);
    if (savedLogin) setMt5Login(savedLogin);
    if (savedPassword) setMt5Password(savedPassword);
    if (savedWebhookUrl) setMt5WebhookUrl(savedWebhookUrl);
    if (savedAccountType === "real" || savedAccountType === "demo") {
      setMt5AccountType(savedAccountType);
    }
    if (savedLots) setLotSize(parseFloat(savedLots));
    if (savedSl) setSlPips(parseInt(savedSl));
    if (savedTp) setTpPips(parseInt(savedTp));

    const checkCloudBotStatus = async () => {
      try {
        const res = await fetch("/api/cloud-bot/status");
        const json = await res.json();
        if (json.success && json.data) {
          const bot = json.data;
          
          if (bot.dayTradeLimitEnabled !== undefined) setDayTradeLimitEnabled(bot.dayTradeLimitEnabled);
          if (bot.maxDailyTrades !== undefined) setMaxDailyTrades(bot.maxDailyTrades);
          if (bot.dailyTakeProfitLimit !== undefined) setDailyTakeProfitLimit(bot.dailyTakeProfitLimit);
          if (bot.dailyStopLossLimit !== undefined) setDailyStopLossLimit(bot.dailyStopLossLimit);
          if (bot.fastEmaPeriod !== undefined) setFastEmaPeriod(bot.fastEmaPeriod);
          if (bot.slowEmaPeriod !== undefined) setSlowEmaPeriod(bot.slowEmaPeriod);

          if (bot.status === "connected") {
            setConnectionMode("live");
            setConnectionStatus("connected");
            setBalance(bot.balance);
            setAutoTrade(bot.autoTrade);
            if (bot.trades && bot.trades.length > 0) {
              setTrades(bot.trades);
            }
            if (bot.candles && bot.candles.length > 0) {
              setCandles(bot.candles);
            }
            if (bot.activeSignal) {
              setActiveSignal(bot.activeSignal);
            }
            if (bot.accountType) {
              setMt5AccountType(bot.accountType);
              localStorage.setItem("mt5_account_type", bot.accountType);
            }
            if (bot.brokerLoginId) {
              setBrokerAccountInfo({
                server: bot.brokerServer || "Local MT5",
                loginid: bot.brokerLoginId,
                is_virtual: bot.accountType === "demo",
                balance: bot.balance
              });
            }
            // Auto-reconnect browser WS proxy to stream real-time updates
            connectWebSocket(bot.brokerLoginId || "MT5_User", bot.accountType);
          }
        }
      } catch (err) {
        console.error("Error checking background cloud bot status:", err);
      }
    };
    checkCloudBotStatus();
  }, []);

  // 4. AI Analysis Request Handlers
  const runAIAnalysis = async (candlesToAnalyze: Candle[]) => {
    setLoading(true);
    setError(null);
    try {
      // Use the last 10 candles for a robust moving average prompt context
      const recentCandles = candlesToAnalyze.slice(-10);
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          candles: recentCandles,
          fastEma: fastEmaPeriod,
          slowEma: slowEmaPeriod
        }),
      });
      
      const result = await response.json();
      if (result.success && result.data) {
        setActiveSignal(result.data);
        
        // Auto Trade Trigger (Simulation Mode only; Live Mode auto-trading is handled 24/7 by the Server Cloud Bot)
        if (connectionModeRef.current === "simulation" && autoTradeRef.current && result.data && (result.data.action === "CALL" || result.data.action === "PUT")) {
          if (result.data.confidence >= 0.75) {
            console.log(`[Simulation] Confidence >= 75% (${result.data.confidence}). Triggering simulated auto-trade: ${result.data.action}`);
            handlePlaceTrade(result.data.action, 10); // default simulated amount 10 USD
          }
        }
      } else {
        throw new Error(result.error || "วิเคราะห์ล้มเหลว");
      }
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message || "ไม่สามารถเชื่อมต่อเครื่องวิเคราะห์ AI ได้");
    } finally {
      setLoading(false);
    }
  };

  // Run AI analysis automatically on mount with initial candles
  useEffect(() => {
    runAIAnalysis(marketScenarios[0].candles);
  }, []);

  // WebSocket Message Router for IQ Option
  const onWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.name === "proxy-error") {
        setConnectionStatus("error");
        setBrokerErrorMsg(data.msg || "เกิดข้อผิดพลาดในการเชื่อมต่อผ่านเซิร์ฟเวอร์สำรอง");
        return;
      }

      // Handle server-side Cloud Bot state sync
      if (data.name === "cloud-bot-sync") {
        if (data.status) {
          setConnectionStatus(data.status);
          if (data.status === "disconnected") {
            // Keep the account info populated so the user is not abruptly logged out
            console.log("[Cloud Bot] State synced: disconnected. Retaining login state for manual or auto-reconnect.");
          }
        }
        if (data.brokerEmail) {
          setBrokerAccountInfo({
            email: data.brokerEmail,
            fullname: data.brokerName || "ผู้ใช้นักลงทุน",
            loginid: data.brokerLoginId || "",
            is_virtual: data.accountType === "demo",
            balance: data.balance
          });
        }
        if (data.balance !== undefined) {
          setBalance(data.balance);
        }
        if (data.autoTrade !== undefined) {
          setAutoTrade(data.autoTrade);
        }
        if (data.investAmount !== undefined) {
          setInvestAmount(data.investAmount);
        }
        if (data.activeAssetId !== undefined) {
          setActiveAssetId(Number(data.activeAssetId));
        }
        if (data.activeAssetName !== undefined) {
          setActiveAssetName(data.activeAssetName);
        }
        if (data.trades) {
          setTrades(data.trades);
        }
        if (data.candles && data.candles.length > 0) {
          setCandles(data.candles);
        }
        if (data.activeSignal) {
          setActiveSignal(data.activeSignal);
        }
        return;
      }

      if (data.name === "cloud-bot-ai-signal") {
        setActiveSignal(data.signal);
        setTradeErrorMsg(null);
        return;
      }

      if (data.name === "cloud-bot-trade-resolved") {
        setTrades(prev => {
          const exists = prev.some(t => t.id === data.tradeId);
          if (!exists) return prev;
          return prev.map(t => {
            if (t.id === data.tradeId) {
              return {
                ...t,
                status: data.status,
                exitPrice: data.exitPrice,
                payout: data.payout,
                profit: data.profit,
                resolvedAt: new Date().toISOString()
              };
            }
            return t;
          });
        });
        setTradeErrorMsg(null);
        return;
      }

      if (data.name === "cloud-bot-trade-rejected") {
        console.warn("[Cloud Bot] Trade rejected by broker:", data.error);
        setTradeErrorMsg(data.error);
        return;
      }

      // 1. Handshake response / Profile info
      if (data.name === "profile") {
        const p = data.msg;
        if (p) {
          const balances = p.balances || [];
          const targetType = mt5AccountTypeRef.current === "demo" ? 4 : 1;
          let selectedBalance = balances.find((b: any) => b.type === targetType);
          if (!selectedBalance && balances.length > 0) {
            selectedBalance = balances[0];
          }
          
          const balanceId = selectedBalance ? selectedBalance.id : p.balance_id;
          const balanceAmount = selectedBalance ? selectedBalance.amount : p.balance;
          
          setBrokerAccountInfo({
            server: p.server || "MT5 Server",
            loginid: balanceId?.toString() || p.id?.toString() || "12345",
            is_virtual: mt5AccountTypeRef.current === "demo",
            balance: balanceAmount
          });
          setBalance(balanceAmount);
          setConnectionStatus("connected");
          setBrokerErrorMsg(null);
          
          // Switch to selected balance id if not current active
          if (balanceId && balanceId !== p.balance_id) {
            wsRef.current?.send(JSON.stringify({
              name: "sendMessage",
              msg: {
                name: "change-balance",
                version: "1.0",
                body: {
                  balance_id: balanceId
                }
              }
            }));
          }

          // Immediately Subscribe to active asset 1-minute real-time candle stream!
          wsRef.current?.send(JSON.stringify({
            name: "subscribeMessage",
            msg: {
              name: "candle-generated",
              params: {
                routingFilters: {
                  active_id: activeAssetIdRef.current, // Dynamic active asset ID
                  size: 60       // 1-minute
                }
              }
            }
          }));

          // Fetch historical candles for initial chart rendering
          wsRef.current?.send(JSON.stringify({
            name: "sendMessage",
            msg: {
              name: "get-candles",
              version: "2.0",
              body: {
                active_id: activeAssetIdRef.current,
                size: 60,
                to: Math.floor(Date.now() / 1000),
                count: 15
              }
            }
          }));
        }
      }
      
      // 2. Real-time balance update push notification
      else if (data.name === "balances" || data.name === "balance") {
        const balMsg = data.msg;
        if (balMsg) {
          const balancesList = Array.isArray(balMsg) ? balMsg : (balMsg.balances || []);
          if (balancesList.length > 0) {
            const targetType = mt5AccountTypeRef.current === "demo" ? 4 : 1;
            const activeBal = balancesList.find((b: any) => b.type === targetType);
            if (activeBal) {
              setBalance(activeBal.amount);
              setBrokerAccountInfo(prev => prev ? { ...prev, balance: activeBal.amount } : null);
            }
          } else if (typeof balMsg.amount === "number") {
            setBalance(balMsg.amount);
            setBrokerAccountInfo(prev => prev ? { ...prev, balance: balMsg.amount } : null);
          }
        }
      }
      
      // 3. Gold historical candles
      else if (data.name === "candles") {
        const candleList = data.msg?.data || data.msg;
        if (candleList && Array.isArray(candleList)) {
          const parsedCandles: Candle[] = candleList.map((c: any) => ({
            time: new Date((c.from || c.epoch) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open: parseFloat(c.open),
            high: parseFloat(c.high ?? c.max),
            low: parseFloat(c.low ?? c.min),
            close: parseFloat(c.close),
            epoch: c.from || c.epoch,
            volume: c.volume || 100
          }));
          
          parsedCandles.sort((a, b) => a.epoch - b.epoch);
          const enriched = enrichCandlesWithEMA(parsedCandles, fastEmaPeriod, slowEmaPeriod);
          setCandles(enriched);
          
          // Trigger AI analysis on the initial candles
          runAIAnalysis(enriched);
        }
      }
      
      // 4. Real-time Candle Tick Stream Update
      else if (data.name === "candle-generated") {
        const o = data.msg;
        if (!o || o.active_id !== activeAssetIdRef.current) return;
        const startOfMinute = o.from; // epoch seconds
        
        setCandles(prev => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          const lastCandle = copy[copy.length - 1] as any;
          
          const candleTime = new Date(startOfMinute * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const candleData = {
            time: candleTime,
            open: parseFloat(o.open),
            high: parseFloat(o.high ?? o.max),
            low: parseFloat(o.low ?? o.min),
            close: parseFloat(o.close),
            epoch: startOfMinute,
            volume: o.volume || 100
          };
          
          let didChangeMin = false;
          if (lastCandle.epoch === startOfMinute) {
            copy[copy.length - 1] = candleData;
          } else if (startOfMinute > (lastCandle.epoch || 0)) {
            copy.push(candleData);
            if (copy.length > 15) copy.shift();
            didChangeMin = true;
          } else {
            return prev;
          }
          
          const enriched = enrichCandlesWithEMA(copy, fastEmaPeriod, slowEmaPeriod);
          
          // Trigger AI analysis as soon as a candle completes/rolls-over!
          if (didChangeMin) {
            runAIAnalysis(enriched);
          }
          
          return enriched;
        });
      }
      
      else if (data.name === "api_game_bet_error") {
        const errorMsg = data.msg?.message || "ส่งออเดอร์ไม่สำเร็จ (เช่น ตลาดปิด หรือยอดเงินไม่พอ)";
        console.warn(`[IQ Option] Order rejected by broker: ${errorMsg}`);
        setTradeErrorMsg(errorMsg);
      }
      
      // 5. Option Open Confirmation
      else if (data.name === "option") {
        const opt = data.msg;
        if (opt) {
          // Ignore rejected or error option messages
          if (opt.error || opt.status === "rejected" || opt.message) {
            const errStr = opt.message || opt.error || "ส่งออเดอร์ไม่สำเร็จ";
            console.warn("[IQ Option] Option failed or rejected:", errStr);
            setTradeErrorMsg(errStr);
            return;
          }

          setTradeErrorMsg(null);

          const contractId = opt.id?.toString() || opt.option_id?.toString();
          const investAmount = opt.amount || opt.price || 10;
          const tradeAction = opt.direction?.toUpperCase() === "CALL" ? "CALL" : "PUT";
          const tradeId = "trade_" + Math.random().toString(36).substring(2, 9);
          
          const newTrade: Trade = {
            id: tradeId,
            timestamp: new Date().toISOString(),
            investAmount: investAmount,
            entryPrice: opt.price || candlesRef.current[candlesRef.current.length - 1]?.close || 0,
            action: tradeAction as "CALL" | "PUT",
            aiAction: activeSignalRef.current ? activeSignalRef.current.action : "HOLD",
            aiConfidence: activeSignalRef.current ? activeSignalRef.current.confidence : 0,
            status: "PENDING",
            contract_id: contractId,
            expired_epoch: opt.expired
          };
          
          setTrades(prev => {
            if (prev.some(t => t.contract_id === contractId)) return prev;
            return [newTrade, ...prev];
          });
        }
      }
    } catch (err) {
      console.error("Error parsing IQ Option WS message:", err);
    }
  };

  const connectWebSocket = (loginid: string, overrideAccountType?: "demo" | "real") => {
    // Close pre-existing socket
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Dynamically construct secure WebSocket Proxy URL based on active window location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const proxyUrl = `${protocol}//${host}/ws-proxy`;
    
    console.log(`[MT5 Bridge] Connecting to secure cloud WS proxy: ${proxyUrl}`);
    const ws = new WebSocket(proxyUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      const activeType = overrideAccountType || mt5AccountType;
      console.log(`[MT5 Bridge] WS proxy tunnel opened. Authenticating with account type: ${activeType}`);
      // Authenticate immediately with our MT5 configuration
      ws.send(JSON.stringify({
        name: "mt5-auth",
        loginid: loginid,
        accountType: activeType
      }));
    };
    
    ws.onmessage = onWebSocketMessage;
    
    ws.onerror = (err) => {
      console.error("MT5 WS error:", err);
      setConnectionStatus("error");
      setBrokerErrorMsg(
        "ไม่สามารถเชื่อมต่อโบรกเกอร์ผ่านเซิร์ฟเวอร์สำรองได้ กรุณาตรวจสอบอินเทอร์เน็ตของท่าน หรือลองเชื่อมใหม่อีกครั้ง"
      );
    };
    
    ws.onclose = () => {
      // Avoid overwriting error state if an error has already occurred
      setConnectionStatus(prev => prev === "error" ? "error" : "disconnected");
    };
  };

  const handleConnectBroker = async () => {
    setBrokerErrorMsg(null);

    if (!mt5Server.trim() || !mt5Login.trim()) {
      setBrokerErrorMsg("กรุณากรอกชื่อเซิร์ฟเวอร์และเลขบัญชี MT5");
      return;
    }
    
    setConnectionStatus("connecting");
    
    try {
      localStorage.setItem("mt5_server", mt5Server.trim());
      localStorage.setItem("mt5_login", mt5Login.trim());
      localStorage.setItem("mt5_password", mt5Password.trim());
      localStorage.setItem("mt5_webhook_url", mt5WebhookUrl.trim());
      localStorage.setItem("mt5_account_type", mt5AccountType);

      const res = await fetch("/api/mt5/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server: mt5Server.trim(),
          loginid: mt5Login.trim(),
          password: mt5Password.trim(),
          webhookUrl: mt5WebhookUrl.trim(),
          accountType: mt5AccountType
        })
      });
      
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถเชื่อมต่อสะพาน MT5 ได้");
      }
      
      setBrokerAccountInfo({
        server: mt5Server.trim(),
        loginid: mt5Login.trim(),
        is_virtual: mt5AccountType === "demo",
        balance: result.data?.balance || 10000.00
      });
      setBalance(result.data?.balance || 10000.00);
      setConnectionStatus("connected");
      
      connectWebSocket(mt5Login.trim());
    } catch (err: any) {
      console.error("Broker connection error:", err);
      setConnectionStatus("error");
      setBrokerErrorMsg(err.message || "การเชื่อมต่อสะพานสัญญาณ MT5 ล้มเหลว");
    }
  };

  const handleDisconnectBroker = async () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    try {
      await fetch("/api/cloud-bot/stop", { method: "POST" });
    } catch (err) {
      console.error("Failed to call cloud-bot-stop API:", err);
    }

    setConnectionStatus("disconnected");
    setBrokerAccountInfo(null);
    // Restore simulation candles
    setCandles(marketScenarios[0].candles);
    setBalance(10000);
    setActiveScenarioId(marketScenarios[0].id);
    runAIAnalysis(marketScenarios[0].candles);
  };

  // Check and resolve live trades based on real-time prices at expiration time
  useEffect(() => {
    if (connectionMode !== "live" || connectionStatus !== "connected") return;
    
    const interval = setInterval(() => {
      const currentCandles = candlesRef.current;
      if (currentCandles.length === 0) return;
      const lastCandle = currentCandles[currentCandles.length - 1];
      const lastCandleEpoch = lastCandle.epoch || Math.floor(Date.now() / 1000);
      
      setTrades(prev => {
        let changed = false;
        const nextTrades = prev.map(t => {
          if (t.status === "PENDING" && t.expired_epoch && (lastCandleEpoch >= t.expired_epoch || Date.now() / 1000 >= t.expired_epoch)) {
            changed = true;
            const exitPrice = lastCandle.close;
            let status: "WIN" | "LOSS" = "LOSS";
            if (t.action === "CALL" && exitPrice > t.entryPrice) status = "WIN";
            if (t.action === "PUT" && exitPrice < t.entryPrice) status = "WIN";
            
            const payout = status === "WIN" ? Number((t.investAmount * 1.85).toFixed(2)) : 0;
            const profit = status === "WIN" ? Number((t.investAmount * 0.85).toFixed(2)) : -t.investAmount;
            
            if (payout > 0) {
              setBalance(prevBal => prevBal + payout);
            }
            
            return {
              ...t,
              status,
              exitPrice,
              payout,
              profit,
              resolvedAt: new Date().toISOString()
            };
          }
          return t;
        });
        return changed ? nextTrades : prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [connectionMode, connectionStatus]);

  // Clean up WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Sync Timer Clock with Computer Clock in Live Broker Mode
  useEffect(() => {
    if (connectionMode === "live" && connectionStatus === "connected") {
      const syncInterval = setInterval(() => {
        setCandleTimer(new Date().getSeconds());
      }, 1000);
      return () => clearInterval(syncInterval);
    }
  }, [connectionMode, connectionStatus]);

  // 5. Loading Scenarios
  const handleSelectScenario = (scenario: MarketScenario) => {
    if (connectionMode === "live") {
      alert("ไม่สามารถเปลี่ยนโมเดลจำลองในขณะเชื่อมต่อพอร์ตเทรดจริงได้");
      return;
    }
    setActiveScenarioId(scenario.id);
    setCandles(scenario.candles);
    setCandleTimer(0); // Reset timer to start of candle
    setActiveSignal(null);
    runAIAnalysis(scenario.candles);
  };

  // 6. Place Simulated/Real MT5 Position
  const handlePlaceTrade = async (rawAction: "CALL" | "PUT" | "BUY" | "SELL" | string, amount: number) => {
    const action: "BUY" | "SELL" = (rawAction === "CALL" || rawAction === "BUY") ? "BUY" : "SELL";
    
    if (connectionMode === "live") {
      if (connectionStatus !== "connected") {
        alert("กรุณาเชื่อมต่อพอร์ต MT5 สำเร็จก่อนส่งออเดอร์จริง");
        return;
      }
      
      try {
        const res = await fetch("/api/mt5/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            lotSize: lotSize,
            slPips: slPips,
            tpPips: tpPips,
            symbol: activeAssetName
          })
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || "ไม่สามารถส่งคำสั่งเทรดเข้า MT5 ได้");
        }
      } catch (err: any) {
        setTradeErrorMsg(err.message || "การเชื่อมต่อขัดข้อง");
      }
      return;
    }

    // SIMULATION MODE
    const entryPrice = candles[candles.length - 1]?.close || 2350.0;
    
    // Sl and Tp prices (Assume Gold where 100 pips = $1.00, so 1 pip = 0.01)
    const slPrice = slPips > 0 
      ? (action === "BUY" ? entryPrice - (slPips * 0.01) : entryPrice + (slPips * 0.01))
      : undefined;
    const tpPrice = tpPips > 0
      ? (action === "BUY" ? entryPrice + (tpPips * 0.01) : entryPrice - (tpPips * 0.01))
      : undefined;

    const newTrade: Trade = {
      id: "trade_" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      investAmount: amount, // represent general display invest
      entryPrice: entryPrice,
      action: action,
      aiAction: activeSignal ? activeSignal.action : "HOLD",
      aiConfidence: activeSignal ? activeSignal.confidence : 0,
      status: "PENDING",
      lotSize: lotSize,
      slPips: slPips,
      tpPips: tpPips,
      slPrice,
      tpPrice
    };

    setTrades(prev => [newTrade, ...prev]);
  };

  const handleCloseTrade = (tradeId: string) => {
    setTrades(prev => {
      return prev.map(t => {
        if (t.id === tradeId && t.status === "PENDING") {
          const entry = t.entryPrice;
          const exitPrice = candles[candles.length - 1]?.close || 2350.0;
          const action = t.action;
          const lots = t.lotSize || 0.1;
          
          let pipDiff = 0;
          if (action === "BUY" || action === "CALL") {
            pipDiff = exitPrice - entry;
          } else {
            pipDiff = entry - exitPrice;
          }
          
          const profit = pipDiff * 100 * lots;
          setBalance(prevBal => prevBal + profit);
          
          return {
            ...t,
            status: profit >= 0 ? "WIN" : "LOSS",
            exitPrice,
            profit,
            resolvedAt: new Date().toISOString()
          };
        }
        return t;
      });
    });
  };

  // 6. Manual Candlestick Modifier Updates
  const handleUpdateLastCandle = (updatedFields: Partial<Candle>) => {
    setCandles(prev => {
      const copy = [...prev];
      const lastIndex = copy.length - 1;
      const original = copy[lastIndex];
      const updatedCandle = { ...original, ...updatedFields };
      copy[lastIndex] = updatedCandle as Candle;
      
      // Re-calculate EMAs dynamically so indicator lines update on chart!
      return enrichCandlesWithEMA(copy, fastEmaPeriod, slowEmaPeriod);
    });
  };

  // 7. Simulated Timeline Tick Logic
  useEffect(() => {
    let intervalId: any = null;

    if (simulationSpeed !== "paused" && connectionMode === "simulation") {
      const intervalMs = 1000;
      const ticksPerSecond = simulationSpeed === "fast" ? 3 : 1;

      intervalId = setInterval(() => {
        setCandleTimer((prevTimer) => {
          const nextTimer = prevTimer + ticksPerSecond;

          if (nextTimer >= 60) {
            // Roll over 1-minute Candle! 
            // Resolve active trades and generate a new candle!
            const currentCandles = candlesRef.current;
            const lastCandle = currentCandles[currentCandles.length - 1];
            
            // Deduce market trend bias from the active scenario
            let bias: "up" | "down" | "flat" | "volatile" = "flat";
            if (activeScenarioIdRef.current === "bullish_breakout") bias = "up";
            if (activeScenarioIdRef.current === "bearish_breakout") bias = "down";
            if (activeScenarioIdRef.current === "volatile_whipsaw") bias = "volatile";

            // Generate subsequent candle bar
            const nextCandleRaw = generateNextCandle(lastCandle, bias);
            const updatedCandlesRaw = [...currentCandles, nextCandleRaw];
            
            // Recalculate indicators for the whole series (retains perfect EMA5 and EMA13 curves!)
            const nextCandles = enrichCandlesWithEMA(updatedCandlesRaw, fastEmaPeriod, slowEmaPeriod).slice(-15); // keep max 15 on screen for density

            const finalClosePrice = nextCandles[nextCandles.length - 1].close;

            // Resolve pending trades using SL and TP levels
            const activeTrades = tradesRef.current;
            const updatedTrades = activeTrades.map((t) => {
              if (t.status === "PENDING") {
                const entry = t.entryPrice;
                const slP = t.slPrice;
                const tpP = t.tpPrice;
                const lots = t.lotSize || 0.1;
                const isBuy = t.action === "BUY" || t.action === "CALL";
                
                let hitTp = false;
                let hitSl = false;
                
                if (isBuy) {
                  if (tpP && finalClosePrice >= tpP) hitTp = true;
                  if (slP && finalClosePrice <= slP) hitSl = true;
                } else {
                  if (tpP && finalClosePrice <= tpP) hitTp = true;
                  if (slP && finalClosePrice >= slP) hitSl = true;
                }
                
                if (hitTp || hitSl) {
                  const resolvedPrice = hitTp ? (tpP || finalClosePrice) : (slP || finalClosePrice);
                  const pipDiff = isBuy ? (resolvedPrice - entry) : (entry - resolvedPrice);
                  const profit = pipDiff * 100 * lots;
                  
                  setBalance((prev) => prev + profit);
                  
                  return {
                    ...t,
                    status: profit >= 0 ? "WIN" : "LOSS",
                    exitPrice: resolvedPrice,
                    payout: profit >= 0 ? profit : 0,
                    profit,
                    resolvedAt: new Date().toISOString()
                  };
                }
              }
              return t;
            });

            // Update state
            setCandles(nextCandles);
            setTrades(updatedTrades);

            // Automatically call Gemini to analyze the brand new candle structure!
            runAIAnalysis(nextCandles);

            return 0; // reset timer to start of the new candle
          }

          return nextTimer;
        });
      }, intervalMs);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [simulationSpeed, connectionMode]);

  // Wipe statistics and start fresh
  const handleResetSimulator = () => {
    if (window.confirm("คุณต้องการรีเซ็ตยอดเงินบัญชีจำลองและล้างประวัติการเทรดทั้งหมดหรือไม่?")) {
      setBalance(10000);
      setTrades([]);
      const defaultScenario = marketScenarios[0];
      setActiveScenarioId(defaultScenario.id);
      setCandles(defaultScenario.candles);
      setCandleTimer(0);
      setActiveSignal(null);
      runAIAnalysis(defaultScenario.candles);
    }
  };

  // Compute aggregate metrics
  const totalTradesCount = trades.filter(t => t.status !== "PENDING").length;
  const winTradesCount = trades.filter(t => t.status === "WIN").length;
  const winRate = totalTradesCount > 0 ? (winTradesCount / totalTradesCount) * 100 : 0;
  
  const totalProfitLoss = trades
    .filter(t => t.status !== "PENDING")
    .reduce((sum, t) => sum + (t.profit ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="binary_trader_app_root">
      {/* 1. Header / Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & Status */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-500 rounded-xl shadow-md text-white animate-pulse">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-white font-sans flex items-center gap-1.5">
                  XAUUSD AI Quantitative Trader
                </h1>
                {connectionMode === "live" ? (
                  <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] ${
                    connectionStatus === "connected" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                  } font-bold font-mono px-2 py-0.5 rounded-full uppercase`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === "connected" ? "bg-emerald-400" : "bg-amber-400"} inline-block animate-ping`}></span>
                    {connectionStatus === "connected" ? (brokerAccountInfo?.is_virtual ? "Broker Demo Live" : "Broker Real Live") : "Broker Connecting"}
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-bold font-mono px-2 py-0.5 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block animate-pulse"></span>
                    Simulator Sandbox
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {connectionMode === "live" 
                  ? "ระบบดึงราคา Gold Spot XAU/USD ตลาดจริงและส่งออเดอร์ผ่าน API" 
                  : "ห้องจำลองวิเคราะห์ความเสี่ยงและส่งสัญญาณ Binary Options 1 นาที"}
              </p>
            </div>
          </div>

          {/* Core App Information Display & Account Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            {/* User Account Info */}
            <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>ผู้ใช้: <strong className="text-slate-200">pnmall4u@gmail.com</strong></span>
            </div>

            {/* Model Badge */}
            <div className="bg-indigo-950/20 px-3 py-1.5 rounded-lg border border-indigo-900/30 text-indigo-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-400" />
              <span>Model: <strong className="text-white">gemini-3.5-flash</strong></span>
            </div>

            {/* Portfolio Demo Balance */}
            <div className="bg-slate-950 px-4 py-1 border border-slate-800 rounded-lg text-right">
              <div className="text-[9px] text-slate-500 uppercase font-bold">
                {connectionMode === "live" ? (brokerAccountInfo?.is_virtual ? "บัญชีเดโมจริง (IQ OPTION)" : "บัญชีเงินจริง (IQ OPTION)") : "พอร์ตจำลอง (DEMO)"}
              </div>
              <div className="text-base font-black text-emerald-400">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Ticking timeline controller */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-300 font-medium font-sans">
              ตัวควบคุมเวลาจำลองตลาดทองคำ (Simulation Clock Control)
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setSimulationSpeed("paused")}
              className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                simulationSpeed === "paused"
                  ? "bg-slate-800 text-white font-bold"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title="หยุดนิ่งเวลาตลาด"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
            
            <button
              onClick={() => setSimulationSpeed("normal")}
              className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                simulationSpeed === "normal"
                  ? "bg-indigo-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-300"
              }`}
              title="เวลาปกติ 1วิ = 1วิ"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Normal 1x</span>
            </button>
            
            <button
              onClick={() => setSimulationSpeed("fast")}
              className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                simulationSpeed === "fast"
                  ? "bg-amber-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-300"
              }`}
              title="เร่งความเร็วตลาดจำลอง 3 เท่า เพื่อเห็นผลลัพธ์ของแท่งเทียนด่วน"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Fast 3x (เทรดด่วน)</span>
            </button>
          </div>
        </div>

        {/* Primary Screen Grid (Chart, AI Analyser, Trade Terminal) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Chart, Scenarios, Custom Sandbox) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Chart */}
            <CandlestickChart 
              candles={candles} 
              activeSignal={activeSignal ? { action: activeSignal.action, confidence: activeSignal.confidence } : undefined}
            />

            {/* Sandbox scenarios */}
            <ScenarioSelector
              scenarios={marketScenarios}
              activeScenarioId={activeScenarioId}
              onSelectScenario={handleSelectScenario}
            />

            {/* Manual Sandbox modifiers */}
            <ManualSandboxForm
              lastCandle={candles[candles.length - 1]}
              onUpdateLastCandle={handleUpdateLastCandle}
              onRunAnalysis={() => runAIAnalysis(candles)}
            />

          </div>

          {/* Right Column (AI Terminal & Order Book) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Broker API Integration Control */}
            <BrokerConnectionPanel
              connectionMode={connectionMode}
              setConnectionMode={setConnectionMode}
              mt5Server={mt5Server}
              setMt5Server={setMt5Server}
              mt5Login={mt5Login}
              setMt5Login={setMt5Login}
              mt5Password={mt5Password}
              setMt5Password={setMt5Password}
              mt5WebhookUrl={mt5WebhookUrl}
              setMt5WebhookUrl={setMt5WebhookUrl}
              mt5AccountType={mt5AccountType}
              setMt5AccountType={setMt5AccountType}
              connectionStatus={connectionStatus}
              onConnect={handleConnectBroker}
              onDisconnect={handleDisconnectBroker}
              brokerAccountInfo={brokerAccountInfo}
              errorMsg={brokerErrorMsg}
            />

            {/* AI Analyst Decision Panel */}
            <AIAnalysisPanel
              signal={activeSignal}
              loading={loading}
              lastCandle={candles[candles.length - 1]}
              error={error}
              onRunAnalysis={() => runAIAnalysis(candles)}
            />

            {/* Trade Entry Terminal */}
            <TradingPanel
              balance={balance}
              trades={trades}
              activeSignal={activeSignal}
              lastCandle={candles[candles.length - 1]}
              onPlaceTrade={handlePlaceTrade}
              onCloseTrade={handleCloseTrade}
              candleTimer={candleTimer}
              autoTrade={autoTrade}
              setAutoTrade={setAutoTrade}
              connectionMode={connectionMode}
              accountType={mt5AccountType}
              tradeErrorMsg={tradeErrorMsg}
              activeAssetId={activeAssetId}
              activeAssetName={activeAssetName}
              lotSize={lotSize}
              setLotSize={setLotSize}
              slPips={slPips}
              setSlPips={setSlPips}
              tpPips={tpPips}
              setTpPips={setTpPips}
              
              dayTradeLimitEnabled={dayTradeLimitEnabled}
              setDayTradeLimitEnabled={setDayTradeLimitEnabled}
              maxDailyTrades={maxDailyTrades}
              setMaxDailyTrades={setMaxDailyTrades}
              dailyTakeProfitLimit={dailyTakeProfitLimit}
              setDailyTakeProfitLimit={setDailyTakeProfitLimit}
              dailyStopLossLimit={dailyStopLossLimit}
              setDailyStopLossLimit={setDailyStopLossLimit}
              fastEmaPeriod={fastEmaPeriod}
              setFastEmaPeriod={setFastEmaPeriod}
              slowEmaPeriod={slowEmaPeriod}
              setSlowEmaPeriod={setSlowEmaPeriod}
              
              onConfigureCloudBot={async (config) => {
                // Update local React states first for dynamic responsiveness
                if (config.dayTradeLimitEnabled !== undefined) setDayTradeLimitEnabled(config.dayTradeLimitEnabled);
                if (config.maxDailyTrades !== undefined) setMaxDailyTrades(config.maxDailyTrades);
                if (config.dailyTakeProfitLimit !== undefined) setDailyTakeProfitLimit(config.dailyTakeProfitLimit);
                if (config.dailyStopLossLimit !== undefined) setDailyStopLossLimit(config.dailyStopLossLimit);
                if (config.fastEmaPeriod !== undefined) setFastEmaPeriod(config.fastEmaPeriod);
                if (config.slowEmaPeriod !== undefined) setSlowEmaPeriod(config.slowEmaPeriod);

                if (connectionMode === "live") {
                  const fullConfig = { ...config, accountType: mt5AccountType };
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      name: "cloud-bot-configure",
                      ...fullConfig
                    }));
                  }
                  try {
                    await fetch("/api/cloud-bot/configure", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(fullConfig),
                    });
                  } catch (err) {
                    console.error("[App] Failed to sync configuration via API:", err);
                  }
                } else {
                  if (config.activeAssetId !== undefined) {
                    setActiveAssetId(config.activeAssetId);
                    setActiveAssetName(config.activeAssetName || "XAUUSD");
                  }
                }
              }}
            />

          </div>

        </div>

        {/* 3. Session Statistics Dashboard */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl" id="analytics_metrics_section">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 mb-5 gap-y-3">
            <div>
              <h2 className="text-white font-bold tracking-tight text-base flex items-center gap-1.5">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <span>ผลประกอบการจำลอง (Session Analytics)</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">วิเคราะห์สถิติความแม่นยำและการสะสมเงินรางวัล</p>
            </div>

            <button
              onClick={handleResetSimulator}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเซ็ตพอร์ต ($10,000)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">จำนวนการส่งออเดอร์</span>
              <span className="text-2xl font-black font-mono text-white mt-1 block">
                {totalTradesCount} <span className="text-xs text-slate-500 font-normal">ไม้</span>
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">ชนะออเดอร์ (WIN)</span>
              <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
                {winTradesCount} <span className="text-xs text-slate-500 font-normal">ไม้</span>
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">อัตราชนะ (WIN RATE)</span>
              <span className="text-2xl font-black font-mono text-indigo-400 mt-1 block">
                {winRate.toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">กำไร/ขาดทุนสุทธิ (P/L)</span>
              <span className={`text-2xl font-black font-mono mt-1 block ${
                totalProfitLoss >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Historical Table Log */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl overflow-hidden" id="historical_trades_log">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-indigo-400" />
            <h2 className="text-white font-bold tracking-tight text-base">บันทึกประวัติการเทรด (Trade Log History)</h2>
          </div>

          {trades.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-950/30 border border-slate-850 border-dashed rounded-lg">
              ยังไม่มีการสรุปออเดอร์ในเซสชั่นนี้ เริ่มเทรดจากเทอร์มินัลด้านบน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-mono uppercase tracking-wider bg-slate-950/60">
                    <th className="py-3 px-4">วันเวลาที่เทรด</th>
                    <th className="py-3 px-4">ขนาดออเดอร์</th>
                    <th className="py-3 px-4">ทิศทาง</th>
                    <th className="py-3 px-4">ราคาเข้าออเดอร์</th>
                    <th className="py-3 px-4">ราคาปิดเทรนด์</th>
                    <th className="py-3 px-4">สัญญาณแนะนำของ AI (Win Rate)</th>
                    <th className="py-3 px-4">ผลลัพธ์</th>
                    <th className="py-3 px-4 text-right">กำไรสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                        ${trade.investAmount}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span className={`inline-flex items-center gap-1 ${
                          trade.action === "CALL" ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {trade.action === "CALL" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>{trade.action}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        ${trade.entryPrice.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            trade.aiAction === "CALL" ? "bg-emerald-500/10 text-emerald-400" :
                            trade.aiAction === "PUT" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            AI: {trade.aiAction}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({(trade.aiConfidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {trade.status === "PENDING" ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/25 font-bold text-[10px] animate-pulse">
                            กำลังถือครอง
                          </span>
                        ) : trade.status === "WIN" ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold text-[10px]">
                            สำเร็จ WIN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/25 font-bold text-[10px]">
                            ขาดทุน LOSS
                          </span>
                        )}
                      </td>
                      <td className={`py-3.5 px-4 font-mono font-bold text-right ${
                        trade.status === "PENDING" ? "text-slate-400" :
                        trade.status === "WIN" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {trade.status === "PENDING" ? "-" : (
                          trade.status === "WIN" ? `+$${trade.profit}` : `-$${Math.abs(trade.profit ?? 0)}`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* 5. Footer */}
      <footer className="bg-slate-900 border-t border-slate-850 py-6 px-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>
            🔥 AI Quantitative Trader Simulator & Sandbox Interface for Educational Purposes Only
          </p>
          <p className="text-slate-600">
            ระบบจำลองเพื่อความรู้คณิตศาสตร์สถิติและการควบคุมความเสี่ยงอย่างเป็นกลาง • ลิขสิทธิ์ความปลอดภัยเซิร์ฟเวอร์ Gemini API
          </p>
        </div>
      </footer>
    </div>
  );
}
