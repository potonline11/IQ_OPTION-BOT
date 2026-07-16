import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { WebSocketServer, WebSocket as WS } from "ws";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client Lazily (avoids crashing on startup if API key is missing)
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper function to call Gemini API with retry logic and model fallback to handle 503/429 demand spike errors
async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  contents: any,
  config: any,
  fallbackModels: string[] = ["gemini-3.1-flash-lite", "gemini-flash-latest"]
): Promise<any> {
  const modelsToTry = [primaryModel, ...fallbackModels];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempts = 3;
    let delay = 1000; // start with 1 second delay

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`[Gemini API] Attempting call (model: ${model}, attempt: ${attempt}/${attempts})...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: contents,
          config: config
        });
        return response; // Success!
      } catch (err: any) {
        lastError = err;
        const errStr = String(err);
        const status = err.status || err.statusCode || (err.error && err.error.code);
        
        console.warn(
          `[Gemini API] Attempt ${attempt} for model ${model} failed:`, 
          err.message || errStr
        );

        const isRetryable = 
          status === 503 || 
          status === 429 || 
          !status || 
          errStr.includes("demand") || 
          errStr.includes("temporary") || 
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("503");

        if (isRetryable && attempt < attempts) {
          console.log(`[Gemini API] Retryable error. Waiting ${delay}ms before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5; // exponential backoff factor
        } else {
          break; // break the attempt loop to try the next fallback model
        }
      }
    }
    
    console.warn(`[Gemini API] Model ${model} failed after all retry attempts. Trying next fallback model...`);
  }

  throw lastError;
}

// IQ Option Login Proxy Endpoint to bypass browser CORS restrictions
app.post("/api/iqoption/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ success: false, error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://auth.iqoption.com/api/v2/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({ identifier, password }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data: any = await response.json();
    if (response.ok && data.code !== "fail") {
      // If two factor is required, explicitly mark it for the client
      if (data.code === "two_factor") {
        res.json({
          success: true,
          twoFactorRequired: true,
          data: {
            code: "two_factor",
            token: data.result?.token || data.token,
            type: data.result?.type || "email",
            email: data.result?.email || data.result?.phone || ""
          }
        });
      } else {
        // Fallback to extract ssid from cookies if not in the response body
        let ssid = data.ssid || data.result?.ssid;
        if (!ssid) {
          const cookies = response.headers.get("set-cookie") || 
                          (typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie().join(", ") : "");
          if (cookies) {
            const match = cookies.match(/ssid=([^;\s]+)/i);
            if (match) {
              ssid = match[1];
            }
          }
        }
        if (ssid) {
          if (!data.result) data.result = {};
          data.ssid = ssid;
          data.result.ssid = ssid;
        }
        res.json({ success: true, data });
      }
    } else {
      res.status(response.status || 401).json({ success: false, error: data.message || "การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูลเข้าใช้งาน" });
    }
  } catch (err: any) {
    console.error("IQ Option Proxy Login Error:", err);
    if (err.name === 'AbortError') {
      res.status(504).json({ success: false, error: "การเชื่อมต่อกับ IQ Option ใช้เวลานานเกินไป กรุณากดเชื่อมต่อใหม่อีกครั้ง" });
      return;
    }
    res.status(500).json({ success: false, error: err.message || "ข้อผิดพลาดภายในระบบจำลอง" });
  }
});

// IQ Option Login Verification Proxy Endpoint for Two-Factor Authentication (2FA)
app.post("/api/iqoption/login/verify", async (req, res) => {
  try {
    const { token, code } = req.body;
    if (!token || !code) {
      res.status(400).json({ success: false, error: "กรุณาระบุรหัสความปลอดภัยและรหัสอ้างอิงโทเค็น" });
      return;
    }

    console.log(`[IQ Option 2FA] Verifying 2FA code with token: ${token.substring(0, 8)}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://auth.iqoption.com/api/v2/login/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({ token, code }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data: any = await response.json();
    if (response.ok && data.code !== "fail") {
      // Fallback to extract ssid from cookies if not in the response body
      let ssid = data.ssid || data.result?.ssid;
      if (!ssid) {
        const cookies = response.headers.get("set-cookie") || 
                        (typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie().join(", ") : "");
        if (cookies) {
          const match = cookies.match(/ssid=([^;\s]+)/i);
          if (match) {
            ssid = match[1];
          }
        }
      }
      if (ssid) {
        if (!data.result) data.result = {};
        data.ssid = ssid;
        data.result.ssid = ssid;
      }
      res.json({ success: true, data });
    } else {
      res.status(response.status || 401).json({ success: false, error: data.message || "รหัสยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่อีกครั้ง" });
    }
  } catch (err: any) {
    console.error("IQ Option Proxy Login Verify Error:", err);
    if (err.name === 'AbortError') {
      res.status(504).json({ success: false, error: "การเชื่อมต่อเพื่อยืนยันรหัสความปลอดภัยใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง" });
      return;
    }
    res.status(500).json({ success: false, error: err.message || "ข้อผิดพลาดในการตรวจสอบระบบยันยืนสองชั้น (2FA)" });
  }
});

// AI Analysis Endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    const { candles } = req.body;

    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      res.status(400).json({ error: "Candles data is required and must be an array" });
      return;
    }

    // Format candles for the prompt
    const formattedCandles = candles.map(c => ({
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      ema5: c.ema5,
      ema13: c.ema13,
      volume: c.volume
    }));

    const promptText = `จงวิเคราะห์ข้อมูลแท่งเทียน Gold (XAUUSD) ย้อนหลังเพื่อส่งสัญญาณในแท่งถัดไป:
${JSON.stringify(formattedCandles, null, 2)}

คำสั่ง: จงตอบกลับในรูปแบบ JSON ที่สะอาดที่สุด โดยห้ามมีตัวอักษรอื่นนอกจากโครงสร้างนี้:
{
"action": "CALL" หรือ "PUT" หรือ "HOLD",
"confidence": 0.00 - 1.00,
"reason": "เหตุผลสั้นๆ เชิงเทคนิค"
}`;

    const systemInstruction = `คุณเป็นสุดยอด AI นักเทรดระดับโลก (Quantitative Trader) เชี่ยวชาญการวิเคราะห์ความเสี่ยงและทำกำไรระยะสั้นในตลาด Binary Options 1 นาที หน้าที่ของคุณคือวิเคราะห์ข้อมูลที่ได้รับอย่างเยือกเย็น แม่นยำ และไร้อารมณ์ หากสภาวะตลาดมีความผันผวนสูง, ไซด์เวย์แคบ, หรือราคาไม่มีทิศทางชัดเจน คุณต้องสั่ง HOLD ทันทีเพื่อรักษาทุน คุณจะให้สัญญาณ CALL หรือ PUT ก็ต่อเมื่อมี Win Rate มั่นใจสูงเกิน 70% (confidence >= 0.70) เท่านั้น`;

    const ai = getGeminiClient();
    
    // Call the robust retry and fallback mechanism instead of a single raw API call
    const response = await generateWithRetryAndFallback(
      ai,
      "gemini-3.5-flash",
      promptText,
      {
        systemInstruction: systemInstruction,
        temperature: 0.2, // low temperature for precise, technical, objective decisions
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "Must be 'CALL', 'PUT', or 'HOLD'",
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence value between 0.00 and 1.00 representing probability of winning",
            },
            reason: {
              type: Type.STRING,
              description: "Short technical reason in Thai language explaining the indicators and decision",
            },
          },
          required: ["action", "confidence", "reason"],
        },
      }
    );

    const replyText = response.text;
    if (!replyText) {
      throw new Error("No response text received from Gemini");
    }

    const parsedResult = JSON.parse(replyText.trim());
    res.json({
      success: true,
      data: parsedResult,
      rawResponse: replyText,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Gemini API Error in server.ts:", error);
    
    // Clean up error message to be extremely polite and friendly for the UI in Thai
    let cleanErrorMessage = "ระบบวิเคราะห์ AI กำลังปรับปรุงคิวประมวลผลชั่วคราว กรุณากดทดลองส่งใหม่อีกครั้งในอีกสักครู่";
    if (error.message && !error.message.includes("503") && !error.message.includes("demand")) {
      cleanErrorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: cleanErrorMessage
    });
  }
});

// EMA calculation logic on the server
function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prevEma = data[0];
  ema.push(Number(prevEma.toFixed(2)));
  for (let i = 1; i < data.length; i++) {
    const currentEma = data[i] * k + prevEma * (1 - k);
    ema.push(Number(currentEma.toFixed(2)));
    prevEma = currentEma;
  }
  return ema;
}

function enrichCandlesWithEMA(candles: any[]): any[] {
  const closes = candles.map(c => c.close);
  const ema5Values = calculateEMA(closes, 5);
  const ema13Values = calculateEMA(closes, 13);
  return candles.map((candle, index) => ({
    ...candle,
    ema5: ema5Values[index] ?? candle.close,
    ema13: ema13Values[index] ?? candle.close,
  }));
}

// Cloud Bot Persistent State Management
const STATE_FILE = path.join(process.cwd(), "cloud_bot_state.json");

let cachedBalances: any[] = [];

const cloudBot = {
  ssid: "",
  status: "disconnected" as "disconnected" | "connecting" | "connected" | "error",
  errorMsg: null as string | null,
  accountType: "demo" as "demo" | "real",
  autoTrade: false,
  investAmount: 10,
  balance: 10000,
  brokerEmail: "",
  brokerName: "ผู้ใช้นักลงทุน",
  brokerLoginId: "",
  trades: [] as any[],
  candles: [] as any[],
  activeSignal: null as any,
  socket: null as WS | null,
  heartbeatTimer: null as any,
  activeAssetId: 74,
  activeAssetName: "XAUUSD",
  
  broadcast(msgObj: any) {
    const raw = JSON.stringify(msgObj);
    clients.forEach(client => {
      if (client.readyState === WS.OPEN) {
        client.send(raw);
      }
    });
  }
};

const clients = new Set<WS>();

interface SystemLog {
  timestamp: string;
  type: "info" | "success" | "warn" | "error" | "sent" | "received";
  message: string;
}

const systemLogs: SystemLog[] = [];

function addSystemLog(type: "info" | "success" | "warn" | "error" | "sent" | "received", message: string) {
  const logEntry: SystemLog = {
    timestamp: new Date().toLocaleTimeString('th-TH', { hour12: false }),
    type,
    message
  };
  systemLogs.push(logEntry);
  if (systemLogs.length > 100) {
    systemLogs.shift();
  }
  console.log(`[System Log] [${type.toUpperCase()}] ${message}`);
  cloudBot.broadcast({
    name: "cloud-bot-log",
    log: logEntry
  });
}

function saveCloudBotState() {
  try {
    const state = {
      ssid: cloudBot.ssid,
      status: cloudBot.status,
      errorMsg: cloudBot.errorMsg,
      accountType: cloudBot.accountType,
      autoTrade: cloudBot.autoTrade,
      investAmount: cloudBot.investAmount,
      balance: cloudBot.balance,
      brokerEmail: cloudBot.brokerEmail,
      brokerName: cloudBot.brokerName,
      brokerLoginId: cloudBot.brokerLoginId,
      trades: cloudBot.trades.slice(0, 50), // keep last 50 trades
      candles: cloudBot.candles,
      activeSignal: cloudBot.activeSignal,
      activeAssetId: cloudBot.activeAssetId,
      activeAssetName: cloudBot.activeAssetName
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("[Cloud Bot] Error saving state:", err);
  }
}

function syncActiveBalanceFromAccountType() {
  if (cachedBalances.length > 0) {
    const targetType = cloudBot.accountType === "demo" ? 4 : 1;
    const selectedBalance = cachedBalances.find((b: any) => b.type === targetType);
    if (selectedBalance) {
      cloudBot.balance = selectedBalance.amount;
      cloudBot.brokerLoginId = selectedBalance.id.toString();
      console.log(`[Cloud Bot] AccountType switched to ${cloudBot.accountType}. Synced balance to ${cloudBot.balance} (ID: ${cloudBot.brokerLoginId})`);
      
      // Send change-balance message to broker
      if (cloudBot.socket && cloudBot.socket.readyState === WS.OPEN) {
        cloudBot.socket.send(JSON.stringify({
          name: "sendMessage",
          msg: {
            name: "change-balance",
            version: "1.0",
            body: { balance_id: selectedBalance.id }
          }
        }));
      }
      
      saveCloudBotState();
      
      cloudBot.broadcast({
        name: "cloud-bot-sync",
        balance: cloudBot.balance,
        brokerLoginId: cloudBot.brokerLoginId,
        accountType: cloudBot.accountType
      });
    }
  }
}

function syncActiveAssetSubscription(oldId: number) {
  if (cloudBot.activeAssetId === oldId) return;
  console.log(`[Cloud Bot] Dynamic Asset Switched from ${oldId} to ${cloudBot.activeAssetId}. Re-subscribing stream...`);
  
  // Clear local state
  cloudBot.candles = [];
  cloudBot.activeSignal = null;
  saveCloudBotState();
  
  cloudBot.broadcast({
    name: "cloud-bot-sync",
    candles: [],
    activeSignal: null,
    activeAssetId: cloudBot.activeAssetId,
    activeAssetName: cloudBot.activeAssetName
  });

  if (cloudBot.status === "connected" && cloudBot.socket && cloudBot.socket.readyState === WS.OPEN) {
    try {
      // Unsubscribe from old
      cloudBot.socket.send(JSON.stringify({
        name: "unsubscribeMessage",
        msg: {
          name: "candle-generated",
          params: {
            routingFilters: {
              active_id: oldId,
              size: 60
            }
          }
        }
      }));
      
      // Subscribe to new
      cloudBot.socket.send(JSON.stringify({
        name: "subscribeMessage",
        msg: {
          name: "candle-generated",
          params: {
            routingFilters: {
              active_id: cloudBot.activeAssetId,
              size: 60
            }
          }
        }
      }));

      // Request initial historical candles
      cloudBot.socket.send(JSON.stringify({
        name: "sendMessage",
        msg: {
          name: "get-candles",
          version: "2.0",
          body: {
            active_id: cloudBot.activeAssetId,
            size: 60,
            to: Math.floor(Date.now() / 1000),
            count: 15
          }
        }
      }));
    } catch (err) {
      console.error("[Cloud Bot] Error sending asset re-subscription messages:", err);
    }
  }
}

function loadCloudBotState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[Cloud Bot] Error loading state:", err);
  }
  return null;
}

let isAnalyzing = false;

async function runServerAIAnalysis(candles: any[]) {
  try {
    console.log("[Cloud Bot AI] Running background Gemini AI Analysis on completed candles...");
    
    // Format candles for prompt (last 10 candles)
    const formattedCandles = candles.slice(-10).map(c => ({
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      ema5: c.ema5,
      ema13: c.ema13,
      volume: c.volume
    }));

    const promptText = `จงวิเคราะห์ข้อมูลแท่งเทียน Gold (XAUUSD) ย้อนหลังเพื่อส่งสัญญาณในแท่งถัดไป:
${JSON.stringify(formattedCandles, null, 2)}

คำสั่ง: จงตอบกลับในรูปแบบ JSON ที่สะอาดที่สุด โดยห้ามมีตัวอักษรอื่นนอกจากโครงสร้างนี้:
{
"action": "CALL" หรือ "PUT" หรือ "HOLD",
"confidence": 0.00 - 1.00,
"reason": "เหตุผลสั้นๆ เชิงเทคนิค"
}`;

    const systemInstruction = `คุณเป็นสุดยอด AI นักเทรดระดับโลก (Quantitative Trader) เชี่ยวชาญการวิเคราะห์ความเสี่ยงและทำกำไรระยะสั้นในตลาด Binary Options 1 นาที หน้าที่ของคุณคือวิเคราะห์ข้อมูลที่ได้รับอย่างเยือกเย็น แม่นยำ และไร้อารมณ์ หากสภาวะตลาดมีความผันผวนสูง, ไซด์เวย์แคบ, หรือราคาไม่มีทิศทางชัดเจน คุณต้องสั่ง HOLD ทันทีเพื่อรักษาทุน คุณจะให้สัญญาณ CALL หรือ PUT ก็ต่อเมื่อมี Win Rate มั่นใจสูงเกิน 70% (confidence >= 0.70) เท่านั้น`;

    const ai = getGeminiClient();
    const response = await generateWithRetryAndFallback(
      ai,
      "gemini-3.5-flash",
      promptText,
      {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "Must be 'CALL', 'PUT', or 'HOLD'",
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence value between 0.00 and 1.00",
            },
            reason: {
              type: Type.STRING,
              description: "Short technical reason in Thai language explaining the decision",
            },
          },
          required: ["action", "confidence", "reason"],
        },
      }
    );

    const replyText = response.text;
    if (!replyText) {
      throw new Error("No response text received from Gemini");
    }

    const signal = JSON.parse(replyText.trim());
    console.log(`[Cloud Bot AI] Analysis result: Action: ${signal.action}, Confidence: ${signal.confidence}`);
    
    // Update cloud bot state
    cloudBot.activeSignal = {
      action: signal.action || "HOLD",
      confidence: signal.confidence || 0,
      reason: signal.reason || "",
      timestamp: new Date().toISOString()
    };
    saveCloudBotState();

    // Broadcast update
    cloudBot.broadcast({
      name: "cloud-bot-signal",
      signal: cloudBot.activeSignal
    });

    addSystemLog("info", `🤖 [ระบบ AI วิเคราะห์สำเร็จ] สัญญาณ: ${signal.action} (${Math.round(signal.confidence * 100)}%) | เหตุผล: ${signal.reason}`);

    // If auto-trading is enabled, place order
    if (cloudBot.autoTrade && (signal.action === "CALL" || signal.action === "PUT") && signal.confidence >= 0.70) {
      const expirationEpoch = Math.floor((Date.now() + 60000) / 60000) * 60; // Next minute mark
      placeIqOptionTrade(signal.action as "CALL" | "PUT", cloudBot.investAmount, expirationEpoch);
    }
  } catch (err: any) {
    console.error("[Cloud Bot AI] Error in runServerAIAnalysis:", err);
    addSystemLog("error", `❌ [ระบบ AI] เกิดข้อผิดพลาดในการวิเคราะห์: ${err.message || err}`);
  }
}

function triggerServerAIAnalysis() {
  if (isAnalyzing) {
    console.log("[Cloud Bot] AI analysis is already running. Skipping...");
    return;
  }
  if (cloudBot.candles.length < 5) {
    console.log("[Cloud Bot] Not enough candles to run AI analysis.");
    return;
  }
  isAnalyzing = true;
  runServerAIAnalysis(cloudBot.candles)
    .catch(err => {
      console.error("[Cloud Bot] Background analysis failed:", err);
    })
    .finally(() => {
      isAnalyzing = false;
    });
}

function placeIqOptionTrade(action: "CALL" | "PUT", amount: number, expirationEpoch: number) {
  if (!cloudBot.socket || cloudBot.socket.readyState !== WS.OPEN) {
    addSystemLog("error", "❌ ไม่สามารถส่งคำสั่งเทรดได้เนื่องจากไม่ได้เชื่อมต่อกับโบรกเกอร์");
    return;
  }

  let balanceIdInt = parseInt(cloudBot.brokerLoginId || "0", 10);
  
  // If the stored ID is invalid or default placeholder, try to find a valid one from cachedBalances
  if (isNaN(balanceIdInt) || balanceIdInt <= 0 || balanceIdInt === 12345) {
    const targetType = cloudBot.accountType === "demo" ? 4 : 1;
    if (cachedBalances && cachedBalances.length > 0) {
      const selectedBalance = cachedBalances.find((b: any) => b.type === targetType);
      if (selectedBalance && selectedBalance.id) {
        balanceIdInt = parseInt(selectedBalance.id.toString(), 10);
        cloudBot.brokerLoginId = balanceIdInt.toString();
        saveCloudBotState();
        console.log(`[Cloud Bot] Dynamically recovered balance ID: ${balanceIdInt}`);
      }
    }
  }

  // If we STILL do not have a valid balance ID, abort the trade to prevent IQ Option from disconnecting the socket!
  if (isNaN(balanceIdInt) || balanceIdInt <= 0 || balanceIdInt === 12345) {
    addSystemLog("error", `❌ [ระบบ AI] ไม่สามารถส่งคำสั่งเทรดได้เนื่องจากไม่พบบัญชีเทรดที่ถูกต้อง (Balance ID: ${cloudBot.brokerLoginId || "ไม่มีข้อมูล"}) กรุณาลองเลือกประเภทบัญชี (Demo/Real) ใหม่อีกครั้งเพื่อดึงข้อมูลจากเซิร์ฟเวอร์`);
    console.warn(`[Cloud Bot] Place trade aborted: Invalid Balance ID (${cloudBot.brokerLoginId})`);
    return;
  }

  // Robust Expiration Epoch Calculation with 35-second safety buffer (matching client side)
  const currentEpoch = Math.floor(Date.now() / 1000);
  const secondsLeftInMinute = 60 - (currentEpoch % 60);
  const calculatedExpiration = secondsLeftInMinute < 35 
    ? currentEpoch + secondsLeftInMinute + 60 
    : currentEpoch + secondsLeftInMinute;

  const finalAmount = Number(amount);
  const finalActiveId = Math.floor(Number(cloudBot.activeAssetId));

  console.log(`[Cloud Bot] Sending BUY order to IQ Option: Action: ${action}, Amount: ${finalAmount}, Expiration: ${calculatedExpiration}, Asset: ${finalActiveId}, Balance ID: ${balanceIdInt}`);
  
  const formattedTime = new Date(calculatedExpiration * 1000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  addSystemLog("sent", `🤖 [ระบบ AI อัตโนมัติ] ส่งคำสั่งเทรดอัตโนมัติ: ${action} สัญญา | ยอดเงินลงทุน: $${finalAmount} USD | สิ้นสุดสัญญาเวลา ${formattedTime}`);

  cloudBot.socket?.send(JSON.stringify({
    name: "sendMessage",
    msg: {
      name: "binary-options.open-option",
      version: "1.0",
      body: {
        user_balance_id: balanceIdInt,
        active_id: finalActiveId,
        option_type_id: 3, // Turbo Option
        direction: action.toLowerCase(),
        price: finalAmount,
        expired: calculatedExpiration,
        refund_value: 0
      }
    }
  }));
}

function handleIqOptionMessage(data: any) {
  try {
    // 1. Forward raw message to all connected client browsers instantly
    cloudBot.broadcast(data);

    // 2. Process message for background state updates
    if (data.name === "profile") {
      const p = data.msg;
      if (p) {
        const balances = p.balances || [];
        cachedBalances = balances;
        const targetType = cloudBot.accountType === "demo" ? 4 : 1;
        let selectedBalance = balances.find((b: any) => b.type === targetType);
        if (!selectedBalance && balances.length > 0) {
          selectedBalance = balances[0];
        }
        
        const balanceId = selectedBalance ? selectedBalance.id : p.balance_id;
        const balanceAmount = selectedBalance ? selectedBalance.amount : p.balance;
        
        cloudBot.brokerEmail = p.email || "";
        cloudBot.brokerName = p.first_name || p.name || "ผู้ใช้นักลงทุน";
        cloudBot.brokerLoginId = balanceId?.toString() || p.id?.toString() || "12345";
        cloudBot.balance = balanceAmount;
        cloudBot.status = "connected";
        cloudBot.errorMsg = null;
        reconnectAttempts = 0; // Reset reconnect attempts upon successful connection & authentication
        
        console.log(`[Cloud Bot] Authenticated successfully as ${cloudBot.brokerName} (${cloudBot.brokerEmail}). Balance: ${cloudBot.balance}`);
        addSystemLog("success", `✅ ยืนยันสิทธิ์กับโบรกเกอร์สำเร็จ! ยินดีต้อนรับคุณ ${cloudBot.brokerName} (${cloudBot.brokerEmail}) | ประเภทบัญชีคลาวด์: ${cloudBot.accountType === "demo" ? "บัญชีทดลอง (DEMO)" : "บัญชีเงินจริง (REAL)"} | ยอดเงินคงเหลือ: $${cloudBot.balance} USD (Balance ID: ${cloudBot.brokerLoginId})`);
        saveCloudBotState();

        // Switch balance on IQ Option if mismatch
        if (balanceId && balanceId !== p.balance_id) {
          addSystemLog("info", `🔄 กำลังส่งคำขอสลับประเภทพอร์ตให้ตรงกับที่เลือก (ไปยัง Balance ID: ${balanceId})...`);
          cloudBot.socket?.send(JSON.stringify({
            name: "sendMessage",
            msg: {
              name: "change-balance",
              version: "1.0",
              body: { balance_id: balanceId }
            }
          }));
        }

        // Subscribe to candle stream
        addSystemLog("info", `📈 กำลังขอเชื่อมต่อสัญญาณกราฟราคาสำหรับ ${cloudBot.activeAssetName} (ID: ${cloudBot.activeAssetId}) และจำลองความถี่แท่งเทียน 1 นาที...`);
        cloudBot.socket?.send(JSON.stringify({
          name: "subscribeMessage",
          msg: {
            name: "candle-generated",
            params: {
              routingFilters: {
                active_id: cloudBot.activeAssetId,
                size: 60
              }
            }
          }
        }));

        // Request initial historical candles
        addSystemLog("info", `📊 กำลังดาวน์โหลดข้อมูลแท่งเทียนประวัติศาสตร์ย้อนหลังเพื่อวิเคราะห์ตัวบ่งชี้ EMA...`);
        cloudBot.socket?.send(JSON.stringify({
          name: "sendMessage",
          msg: {
            name: "get-candles",
            version: "2.0",
            body: {
              active_id: cloudBot.activeAssetId,
              size: 60,
              to: Math.floor(Date.now() / 1000),
              count: 15
            }
          }
        }));
      }
    }
    
    else if (data.name === "balances" || data.name === "balance") {
      const balMsg = data.msg;
      if (balMsg) {
        const balancesList = Array.isArray(balMsg) ? balMsg : (balMsg.balances || []);
        if (balancesList.length > 0) {
          cachedBalances = balancesList;
          const targetType = cloudBot.accountType === "demo" ? 4 : 1;
          const activeBal = balancesList.find((b: any) => b.type === targetType);
          if (activeBal) {
            cloudBot.balance = activeBal.amount;
            if (activeBal.id) {
              cloudBot.brokerLoginId = activeBal.id.toString();
              console.log(`[Cloud Bot] Dynamically synced balance ID to ${cloudBot.brokerLoginId} (${cloudBot.accountType})`);
            }
          }
        } else if (typeof balMsg.amount === "number") {
          cloudBot.balance = balMsg.amount;
        }
        saveCloudBotState();
      }
    }
    
    else if (data.name === "candles") {
      const candleList = data.msg?.data || data.msg;
      if (candleList && Array.isArray(candleList)) {
        const parsedCandles = candleList.map((c: any) => ({
          time: new Date((c.from || c.epoch) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          open: parseFloat(c.open),
          high: parseFloat(c.high ?? c.max),
          low: parseFloat(c.low ?? c.min),
          close: parseFloat(c.close),
          epoch: c.from || c.epoch,
          volume: c.volume || 100
        }));
        
        parsedCandles.sort((a: any, b: any) => a.epoch - b.epoch);
        cloudBot.candles = enrichCandlesWithEMA(parsedCandles);
        saveCloudBotState();
        
        // Trigger initial AI analysis background task if idle
        if (!cloudBot.activeSignal) {
          triggerServerAIAnalysis();
        }
      }
    }
    
    else if (data.name === "candle-generated") {
      const o = data.msg;
      if (!o || o.active_id !== cloudBot.activeAssetId) return;
      const startOfMinute = o.from;
      
      if (cloudBot.candles.length === 0) {
        console.log("[Cloud Bot] Candles array is empty. Initializing with the first live tick and requesting historical data...");
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
        cloudBot.candles = [candleData];
        saveCloudBotState();
        
        // Force request historical candles to backfill properly
        cloudBot.socket?.send(JSON.stringify({
          name: "sendMessage",
          msg: {
            name: "get-candles",
            version: "2.0",
            body: {
              active_id: cloudBot.activeAssetId,
              size: 60,
              to: Math.floor(Date.now() / 1000),
              count: 15
            }
          }
        }));
        return;
      }
      
      const copy = [...cloudBot.candles];
      const lastCandle = copy[copy.length - 1];
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
      if (lastCandle && lastCandle.epoch === startOfMinute) {
        copy[copy.length - 1] = candleData;
      } else if (lastCandle && startOfMinute > (lastCandle.epoch || 0)) {
        copy.push(candleData);
        if (copy.length > 15) copy.shift();
        didChangeMin = true;
      } else {
        return;
      }
      
      cloudBot.candles = enrichCandlesWithEMA(copy);
      
      if (didChangeMin) {
        console.log(`[Cloud Bot] Minute completed. Running Gemini Auto-Trading analysis...`);
        triggerServerAIAnalysis();
      }
      
      saveCloudBotState();
    }
    
    else if (data.name === "api_game_bet_error") {
      const errorMsg = data.msg?.message || "ส่งออเดอร์ไม่สำเร็จ (เช่น ตลาดปิด หรือยอดเงินไม่พอ)";
      console.warn(`[Cloud Bot] Order rejected by broker: ${errorMsg}`);
      addSystemLog("error", `❌ ออเดอร์ถูกปฏิเสธโดยโบรกเกอร์: ${errorMsg}`);
      cloudBot.broadcast({
        name: "cloud-bot-trade-rejected",
        error: errorMsg
      });
    }
    
    else if (data.name === "option") {
      const opt = data.msg;
      if (opt) {
        // If the option contains error or is rejected, ignore it
        if (opt.error || opt.status === "rejected" || opt.message) {
          const errText = opt.message || opt.error || "ออเดอร์ถูกปฏิเสธ";
          console.warn("[Cloud Bot] Option opened with error or rejected:", errText);
          addSystemLog("error", `❌ โบรกเกอร์แจ้งเงื่อนไขผิดพลาด: ${errText}`);
          return;
        }

        const contractId = opt.id?.toString() || opt.option_id?.toString();
        const investAmount = opt.amount || opt.price || cloudBot.investAmount;
        const tradeAction = opt.direction?.toUpperCase() === "CALL" ? "CALL" : "PUT";
        const tradeId = "trade_" + Math.random().toString(36).substring(2, 9);
        
        const newTrade = {
          id: tradeId,
          timestamp: new Date().toISOString(),
          investAmount: investAmount,
          entryPrice: opt.price || cloudBot.candles[cloudBot.candles.length - 1]?.close || 0,
          action: tradeAction as "CALL" | "PUT",
          aiAction: cloudBot.activeSignal ? cloudBot.activeSignal.action : "HOLD",
          aiConfidence: cloudBot.activeSignal ? cloudBot.activeSignal.confidence : 0,
          status: "PENDING" as "PENDING" | "WIN" | "LOSS",
          contract_id: contractId,
          expired_epoch: opt.expired
        };
        
        if (!cloudBot.trades.some(t => t.contract_id === contractId)) {
          cloudBot.trades = [newTrade, ...cloudBot.trades];
          console.log(`[Cloud Bot] Trade placed & confirmed by IQ Option. Contract ID: ${contractId}`);
          saveCloudBotState();
        }
      }
    }
  } catch (err) {
    console.error("[Cloud Bot] Error in handleIqOptionMessage:", err);
  }
}

let reconnectTimer: any = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

function attemptCloudBotReconnect() {
  if (reconnectTimer) return;
  if (!cloudBot.ssid) {
    console.log("[Cloud Bot] No SSID token available for auto-reconnect. Resetting status to disconnected.");
    cloudBot.status = "disconnected";
    saveCloudBotState();
    cloudBot.broadcast({
      name: "cloud-bot-sync",
      status: "disconnected"
    });
    return;
  }

  if (reconnectAttempts >= maxReconnectAttempts) {
    console.warn(`[Cloud Bot] Max reconnect attempts (${maxReconnectAttempts}) reached. Giving up.`);
    cloudBot.status = "error";
    cloudBot.errorMsg = "การเชื่อมต่อขาดหาย และไม่สามารถเชื่อมต่อใหม่ได้โดยอัตโนมัติ กรุณากดเชื่อมต่อใหม่อีกครั้ง";
    saveCloudBotState();
    cloudBot.broadcast({
      name: "cloud-bot-sync",
      status: "error",
      errorMsg: cloudBot.errorMsg
    });
    return;
  }

  reconnectAttempts++;
  const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds backoff
  console.log(`[Cloud Bot] Auto-reconnecting attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${backoff / 1000}s...`);

  cloudBot.status = "connecting";
  saveCloudBotState();
  cloudBot.broadcast({
    name: "cloud-bot-sync",
    status: "connecting"
  });

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectCloudBot(cloudBot.ssid);
  }, backoff);
}

function connectCloudBot(ssid: string) {
  if (cloudBot.socket) {
    try {
      cloudBot.socket.close();
    } catch {}
  }
  
  // If this is a fresh connection request (not an automatic retry), reset attempts
  if (reconnectAttempts === 0) {
    reconnectAttempts = 0;
  }
  cloudBot.ssid = ssid;
  cloudBot.errorMsg = null;
  saveCloudBotState();
  
  // Broadcast connecting status
  cloudBot.broadcast({
    name: "cloud-bot-sync",
    status: "connecting",
    ssid: ssid
  });

  console.log("[Cloud Bot] Connecting background WebSocket to IQ Option...");
  const ws = new WS("wss://ws.iqoption.com/echo/websocket", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  cloudBot.socket = ws;

  ws.on("open", () => {
    console.log("[Cloud Bot] WebSocket opened. Authenticating with SSID...");
    ws.send(JSON.stringify({
      name: "ssid",
      msg: ssid
    }));

    // Start periodic heartbeat keep-alive every 10 seconds to prevent broker timeout disconnects
    if (cloudBot.heartbeatTimer) {
      clearInterval(cloudBot.heartbeatTimer);
    }
    cloudBot.heartbeatTimer = setInterval(() => {
      if (cloudBot.socket && cloudBot.socket.readyState === WS.OPEN) {
        cloudBot.socket.send(JSON.stringify({ name: "heartbeat", msg: "" }));
      }
    }, 10000);
  });

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      handleIqOptionMessage(parsed);
    } catch (err) {
      console.error("[Cloud Bot] Error parsing WebSocket message:", err);
    }
  });

  ws.on("error", (err) => {
    console.error("[Cloud Bot] WebSocket error:", err);
    cloudBot.status = "error";
    cloudBot.errorMsg = "ไม่สามารถเชื่อมต่อโบรกเกอร์: " + err.message;
    saveCloudBotState();
    
    cloudBot.broadcast({
      name: "proxy-error",
      msg: cloudBot.errorMsg
    });
  });

  ws.on("close", () => {
    console.log("[Cloud Bot] WebSocket connection closed");
    if (cloudBot.heartbeatTimer) {
      clearInterval(cloudBot.heartbeatTimer);
      cloudBot.heartbeatTimer = null;
    }
    
    // If we're not disconnected (explicit stop) or currently connecting (re-attempt), auto reconnect
    if (cloudBot.status !== "disconnected") {
      console.log("[Cloud Bot] Lost connection unexpectedly. Triggering auto-reconnection...");
      attemptCloudBotReconnect();
    }
  });
}

function disconnectCloudBot() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  
  if (cloudBot.heartbeatTimer) {
    clearInterval(cloudBot.heartbeatTimer);
    cloudBot.heartbeatTimer = null;
  }
  if (cloudBot.socket) {
    try {
      cloudBot.socket.close();
    } catch {}
    cloudBot.socket = null;
  }
  cloudBot.status = "disconnected";
  cloudBot.ssid = "";
  cloudBot.brokerEmail = "";
  cloudBot.brokerName = "ผู้ใช้นักลงทุน";
  cloudBot.brokerLoginId = "";
  cloudBot.trades = [];
  cloudBot.candles = [];
  cloudBot.activeSignal = null;
  saveCloudBotState();
  console.log("[Cloud Bot] Disconnected and state cleared.");
}

function initCloudBot() {
  const saved = loadCloudBotState();
  if (saved) {
    console.log("[Cloud Bot] Restoring saved state...");
    cloudBot.ssid = saved.ssid || "";
    cloudBot.accountType = saved.accountType || "demo";
    cloudBot.autoTrade = saved.autoTrade !== undefined ? saved.autoTrade : false;
    cloudBot.investAmount = saved.investAmount || 10;
    cloudBot.balance = saved.balance || 10000;
    cloudBot.brokerEmail = saved.brokerEmail || "";
    cloudBot.brokerName = saved.brokerName || "ผู้ใช้นักลงทุน";
    cloudBot.brokerLoginId = saved.brokerLoginId || "";
    cloudBot.trades = saved.trades || [];
    cloudBot.candles = saved.candles || [];
    cloudBot.activeSignal = saved.activeSignal || null;
    cloudBot.activeAssetId = saved.activeAssetId !== undefined ? Number(saved.activeAssetId) : 74;
    cloudBot.activeAssetName = saved.activeAssetName || "XAUUSD";
    
    if (saved.status === "connected" && cloudBot.ssid) {
      console.log("[Cloud Bot] Auto-reconnecting background session...");
      connectCloudBot(cloudBot.ssid);
    }
  }
}

// REST endpoints for Cloud Bot
app.get("/api/cloud-bot/status", (req, res) => {
  res.json({
    success: true,
    data: {
      ssid: cloudBot.ssid,
      status: cloudBot.status,
      errorMsg: cloudBot.errorMsg,
      accountType: cloudBot.accountType,
      autoTrade: cloudBot.autoTrade,
      investAmount: cloudBot.investAmount,
      balance: cloudBot.balance,
      brokerEmail: cloudBot.brokerEmail,
      brokerName: cloudBot.brokerName,
      brokerLoginId: cloudBot.brokerLoginId,
      trades: cloudBot.trades,
      candles: cloudBot.candles,
      activeSignal: cloudBot.activeSignal,
      activeAssetId: cloudBot.activeAssetId,
      activeAssetName: cloudBot.activeAssetName
    }
  });
});

app.get("/api/cloud-bot/logs", (req, res) => {
  res.json({
    success: true,
    data: systemLogs
  });
});

app.post("/api/cloud-bot/configure", (req, res) => {
  const { autoTrade, investAmount, accountType, activeAssetId, activeAssetName } = req.body;
  if (autoTrade !== undefined) cloudBot.autoTrade = autoTrade;
  if (investAmount !== undefined) cloudBot.investAmount = Number(investAmount);
  if (accountType !== undefined) {
    cloudBot.accountType = accountType;
    syncActiveBalanceFromAccountType();
  }
  
  const oldAssetId = cloudBot.activeAssetId;
  if (activeAssetId !== undefined) {
    cloudBot.activeAssetId = Number(activeAssetId);
    cloudBot.activeAssetName = activeAssetName || "XAUUSD";
  }
  
  saveCloudBotState();
  
  if (activeAssetId !== undefined && Number(activeAssetId) !== oldAssetId) {
    syncActiveAssetSubscription(oldAssetId);
  } else {
    cloudBot.broadcast({
      name: "cloud-bot-sync",
      autoTrade: cloudBot.autoTrade,
      investAmount: cloudBot.investAmount,
      accountType: cloudBot.accountType,
      activeAssetId: cloudBot.activeAssetId,
      activeAssetName: cloudBot.activeAssetName
    });
  }
  
  res.json({ 
    success: true, 
    data: { 
      autoTrade: cloudBot.autoTrade, 
      investAmount: cloudBot.investAmount, 
      accountType: cloudBot.accountType,
      activeAssetId: cloudBot.activeAssetId,
      activeAssetName: cloudBot.activeAssetName
    } 
  });
});

app.post("/api/cloud-bot/stop", (req, res) => {
  disconnectCloudBot();
  res.json({ success: true });
});

// Configure Vite or serve static assets
async function startServer() {
  // Initialize cloud bot from saved local state
  initCloudBot();

  // Background interval to resolve pending trades on close price at expiration epoch
  setInterval(() => {
    if (cloudBot.status !== "connected" || cloudBot.candles.length === 0) return;
    const lastCandle = cloudBot.candles[cloudBot.candles.length - 1];
    const lastCandleEpoch = lastCandle.epoch || Math.floor(Date.now() / 1000);
    
    let changed = false;
    cloudBot.trades = cloudBot.trades.map(t => {
      if (t.status === "PENDING" && t.expired_epoch && (lastCandleEpoch >= t.expired_epoch || Date.now() / 1000 >= t.expired_epoch)) {
        changed = true;
        const exitPrice = lastCandle.close;
        let status: "WIN" | "LOSS" = "LOSS";
        if (t.action === "CALL" && exitPrice > t.entryPrice) status = "WIN";
        if (t.action === "PUT" && exitPrice < t.entryPrice) status = "WIN";
        
        const payout = status === "WIN" ? Number((t.investAmount * 1.85).toFixed(2)) : 0;
        const profit = status === "WIN" ? Number((t.investAmount * 0.85).toFixed(2)) : -t.investAmount;
        
        console.log(`[Cloud Bot] Resolving Trade: Contract ID: ${t.contract_id}. Entry: ${t.entryPrice}, Exit: ${exitPrice}, Result: ${status}`);
        
        cloudBot.broadcast({
          name: "cloud-bot-trade-resolved",
          tradeId: t.id,
          status,
          exitPrice,
          payout,
          profit
        });

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
    
    if (changed) {
      saveCloudBotState();
    }
  }, 1000);

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Set up WebSocket Proxy for IQ Option (bypass ISP blocking/iframe limits)
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (clientWs, req) => {
    console.log("[WS Proxy] Client browser connected");
    clients.add(clientWs);

    // Sync cloud bot state immediately with client
    clientWs.send(JSON.stringify({
      name: "cloud-bot-sync",
      status: cloudBot.status,
      errorMsg: cloudBot.errorMsg,
      accountType: cloudBot.accountType,
      autoTrade: cloudBot.autoTrade,
      investAmount: cloudBot.investAmount,
      balance: cloudBot.balance,
      brokerEmail: cloudBot.brokerEmail,
      brokerName: cloudBot.brokerName,
      brokerLoginId: cloudBot.brokerLoginId,
      trades: cloudBot.trades,
      candles: cloudBot.candles,
      activeSignal: cloudBot.activeSignal,
      activeAssetId: cloudBot.activeAssetId,
      activeAssetName: cloudBot.activeAssetName
    }));

    // If already connected, push standard profile and candle events to ignite legacy parser in UI
    if (cloudBot.status === "connected") {
      clientWs.send(JSON.stringify({
        name: "profile",
        msg: {
          email: cloudBot.brokerEmail,
          first_name: cloudBot.brokerName,
          id: parseInt(cloudBot.brokerLoginId),
          balance_id: parseInt(cloudBot.brokerLoginId),
          balances: [{
            id: parseInt(cloudBot.brokerLoginId),
            type: cloudBot.accountType === "demo" ? 4 : 1,
            amount: cloudBot.balance
          }]
        }
      }));

      if (cloudBot.candles.length > 0) {
        clientWs.send(JSON.stringify({
          name: "candles",
          msg: {
            data: cloudBot.candles.map(c => ({
              from: c.epoch,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume
            }))
          }
        }));
      }
    }

    clientWs.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.name === "ssid") {
          const ssid = data.msg;
          if (data.accountType !== undefined) {
            cloudBot.accountType = data.accountType;
            console.log(`[WS Proxy] Configured cloud bot accountType to: ${cloudBot.accountType}`);
          }
          console.log(`[WS Proxy] Received connect token (SSID). Initiating Background Cloud Bot for ${cloudBot.accountType}...`);
          connectCloudBot(ssid);
        }
        else if (data.name === "cloud-bot-configure") {
          if (data.autoTrade !== undefined) cloudBot.autoTrade = data.autoTrade;
          if (data.investAmount !== undefined) cloudBot.investAmount = Number(data.investAmount);
          if (data.accountType !== undefined) {
            cloudBot.accountType = data.accountType;
            syncActiveBalanceFromAccountType();
          }
          
          const oldAssetId = cloudBot.activeAssetId;
          if (data.activeAssetId !== undefined) {
            cloudBot.activeAssetId = Number(data.activeAssetId);
            cloudBot.activeAssetName = data.activeAssetName || "XAUUSD";
          }
          
          saveCloudBotState();
          
          if (data.activeAssetId !== undefined && Number(data.activeAssetId) !== oldAssetId) {
            syncActiveAssetSubscription(oldAssetId);
          } else {
            cloudBot.broadcast({
              name: "cloud-bot-sync",
              autoTrade: cloudBot.autoTrade,
              investAmount: cloudBot.investAmount,
              accountType: cloudBot.accountType,
              activeAssetId: cloudBot.activeAssetId,
              activeAssetName: cloudBot.activeAssetName
            });
          }
        }
        else if (data.name === "cloud-bot-stop") {
          disconnectCloudBot();
        }
        else {
          if (cloudBot.socket && cloudBot.socket.readyState === WS.OPEN) {
            cloudBot.socket.send(message.toString());
          }
        }
      } catch (err) {
        if (cloudBot.socket && cloudBot.socket.readyState === WS.OPEN) {
          cloudBot.socket.send(message.toString());
        }
      }
    });

    clientWs.on("close", () => {
      console.log("[WS Proxy] Client browser disconnected");
      clients.delete(clientWs);
    });

    clientWs.on("error", (err) => {
      console.error("[WS Proxy] Connection error:", err);
      clients.delete(clientWs);
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    if (url.includes("/ws-proxy")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });
}

startServer();
