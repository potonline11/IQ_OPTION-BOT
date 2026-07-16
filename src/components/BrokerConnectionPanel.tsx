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
  AlertTriangle
} from "lucide-react";

interface BrokerConnectionPanelProps {
  connectionMode: "simulation" | "live";
  setConnectionMode: (mode: "simulation" | "live") => void;
  iqEmail: string;
  setIqEmail: (val: string) => void;
  iqPassword: string;
  setIqPassword: (val: string) => void;
  iqAccountType: "demo" | "real";
  setIqAccountType: (val: "demo" | "real") => void;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  onConnect: () => void;
  onDisconnect: () => void;
  brokerAccountInfo: {
    email: string;
    fullname: string;
    loginid: string;
    is_virtual: boolean;
    balance?: number;
  } | null;
  errorMsg: string | null;
  twoFactorToken?: string | null;
  twoFactorType?: string | null;
  twoFactorEmail?: string | null;
  onVerify2FA?: (code: string) => void;
  onCancel2FA?: () => void;
  connectMethod: "credentials" | "ssid";
  setConnectMethod: (val: "credentials" | "ssid") => void;
  manualSSID: string;
  setManualSSID: (val: string) => void;
}

export default function BrokerConnectionPanel({
  connectionMode,
  setConnectionMode,
  iqEmail,
  setIqEmail,
  iqPassword,
  setIqPassword,
  iqAccountType,
  setIqAccountType,
  connectionStatus,
  onConnect,
  onDisconnect,
  brokerAccountInfo,
  errorMsg,
  twoFactorToken,
  twoFactorType,
  twoFactorEmail,
  onVerify2FA,
  onCancel2FA,
  connectMethod,
  setConnectMethod,
  manualSSID,
  setManualSSID
}: BrokerConnectionPanelProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-xl" id="broker_connection_panel">
      {/* Panel Title */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
        <div>
          <h2 className="text-white font-bold tracking-tight text-base flex items-center gap-2">
            <Radio className={`w-5 h-5 ${connectionMode === "live" ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
            <span>ช่องทางเชื่อมต่อตลาด (Market Connection)</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            สลับระหว่างระบบจำลองความเสี่ยง หรือ บัญชีตลาดจริงของโบรกเกอร์ IQ Option
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
        <div className="bg-slate-950 border border-indigo-900/45 p-4 rounded-lg mb-4 text-xs space-y-2 text-slate-300">
          <h4 className="font-bold text-indigo-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            วิธีการเชื่อมต่อพอร์ต IQ Option:
          </h4>
          <ol className="list-decimal pl-4 space-y-1.5">
            <li>
              สมัครหรือใช้บัญชีเทรดของ <strong>IQ Option</strong> (รองรับทั้งบัญชีทดลองเสมือน Demo และบัญชีจริง Real)
            </li>
            <li>
              กรอกอีเมลและรหัสผ่านของคุณในช่องกรอกข้อมูลด้านล่าง
            </li>
            <li>
              เลือกว่าต้องการเชื่อมต่อเพื่อใช้งานในโหมด <strong>บัญชีทดลอง (Demo)</strong> หรือ <strong>บัญชีจริง (Real)</strong>
            </li>
            <li>
              กดเชื่อมต่อ ระบบจะทำการตรวจสอบสิทธิ์แบบปลอดภัยผ่าน Proxy Server เพื่อดึง SSID session และสร้างท่อเชื่อมตรงเข้า WebSocket ของ IQ Option
            </li>
          </ol>
          <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-900/60 p-2 rounded">
            🔒 ข้อมูลของคุณจะถูกส่งอย่างปลอดภัยผ่าน Secure Proxy สำหรับการเข้าสู่ระบบเท่านั้น และไม่มีการจัดเก็บบันทึกรหัสผ่านของคุณในเซิร์ฟเวอร์ภายนอกใดๆ ทั้งสิ้น ปลอดภัยสูงสุด
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
          <span>เชื่อมต่อพอร์ตจริง (IQ Option Live)</span>
        </button>
      </div>

      {/* Conditionally render Live connection configurations */}
      {connectionMode === "live" ? (
        <div className="space-y-4 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
          
          {/* Connection Status Badge */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <span className="text-slate-400 text-xs font-sans">สถานะเชื่อมโบรกเกอร์:</span>
            {connectionStatus === "disconnected" && (
              <span className="px-2.5 py-1 rounded bg-slate-800/50 text-slate-400 text-[10px] font-bold font-mono border border-slate-700">
                ● DISCONNECTED
              </span>
            )}
            {connectionStatus === "connecting" && (
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold font-mono border border-amber-500/25 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping"></span>
                CONNECTING...
              </span>
            )}
            {connectionStatus === "connected" && (
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono border border-emerald-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                CONNECTED (ONLINE)
              </span>
            )}
            {connectionStatus === "error" && (
              <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold font-mono border border-red-500/25">
                ⚠️ AUTH ERROR
              </span>
            )}
          </div>

          {/* Form inputs */}
          {connectionStatus !== "connected" ? (
            twoFactorToken ? (
              <div className="space-y-4 bg-slate-950 p-4 rounded-lg border border-indigo-950">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-sans font-bold text-amber-400">
                    Two-Factor Authentication (2FA)
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] text-slate-300 leading-normal">
                    ระบบตรวจพบการยืนยันตัวตนความปลอดภัยจาก IQ Option (ทางโบรกเกอร์จะส่งรหัสเมื่อเริ่มเชื่อมต่อผ่านเซิร์ฟเวอร์ใหม่เพื่อความปลอดภัย แม้ท่านจะไม่ได้ตั้งค่า 2FA ด้วยตนเองก็ตาม) กรุณาตรวจสอบรหัสทางอีเมลของคุณ
                  </p>
                  {twoFactorEmail && (
                    <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-[10px] text-slate-400 font-mono">
                      ช่องทาง: <strong className="text-slate-200">{twoFactorEmail}</strong> ({twoFactorType})
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-mono uppercase font-bold">
                    6-Digit Security Code (รหัสยืนยัน 6 หลัก)
                  </label>
                  <input
                    type="text"
                    value={twoFactorCode}
                    maxLength={10}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded px-3 py-2 text-sm text-center text-white tracking-[0.5em] font-mono font-bold"
                    placeholder="123456"
                  />
                </div>

                {/* Error indicator */}
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded text-[11px] text-red-400 flex items-start gap-1.5 font-mono leading-normal">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onCancel2FA && onCancel2FA()}
                    className="w-1/3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerify2FA && onVerify2FA(twoFactorCode)}
                    disabled={connectionStatus === "connecting" || twoFactorCode.length < 4}
                    className="w-2/3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-850 border border-amber-500/40 text-white rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ยืนยันรหัสความปลอดภัย</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Connection Method Selector */}
                <div className="flex border-b border-slate-800 pb-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConnectMethod("credentials")}
                    className={`flex-1 py-1.5 px-2 rounded text-[11px] font-sans font-medium transition-all ${
                      connectMethod === "credentials"
                        ? "bg-slate-800 text-indigo-400 border border-slate-700 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    อีเมล & รหัสผ่าน
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectMethod("ssid")}
                    className={`flex-1 py-1.5 px-2 rounded text-[11px] font-sans font-medium transition-all flex items-center justify-center gap-1 ${
                      connectMethod === "ssid"
                        ? "bg-indigo-950/40 text-amber-400 border border-indigo-500/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Key className="w-3 h-3 text-amber-400 shrink-0" />
                    เชื่อมด้วย SSID (แนะนำ)
                  </button>
                </div>

                {connectMethod === "credentials" ? (
                  <>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-mono uppercase font-bold">IQ Option Email / Username</label>
                      <input
                        type="email"
                        value={iqEmail}
                        onChange={(e) => setIqEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded px-3 py-2 text-xs text-slate-200 font-mono"
                        placeholder="your-email@example.com"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-mono uppercase font-bold">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={iqPassword}
                          onChange={(e) => setIqPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded pl-3 pr-10 py-2 text-xs text-slate-200 font-mono"
                          placeholder="กรอกรหัสผ่าน IQ Option"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[11px] font-semibold cursor-pointer"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] text-slate-400 font-mono uppercase font-bold flex items-center gap-1">
                          <Key className="w-3 h-3 text-amber-400" />
                          IQ Option SSID Token
                        </label>
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 rounded font-bold">เสถียรที่สุด 100%</span>
                      </div>
                      <input
                        type="text"
                        value={manualSSID}
                        onChange={(e) => setManualSSID(e.target.value.trim())}
                        className="w-full bg-slate-900 border border-indigo-950/80 focus:border-indigo-500 focus:outline-none rounded px-3 py-2 text-xs text-amber-300 font-mono placeholder:text-slate-600"
                        placeholder="วางรหัส SSID ที่คัดลอกมา เช่น f8a30..."
                      />
                    </div>

                    {/* How to get SSID Instructions Box */}
                    <div className="bg-slate-950/80 border border-slate-900 rounded p-2.5 space-y-1.5 text-[11px] text-slate-400 leading-normal">
                      <span className="font-bold text-slate-200 text-xs block mb-1">💡 วิธีแก้ปัญหาอีเมลเตือนไม่มีรหัสส่งมา (เลี่ยงบล็อก IP):</span>
                      <p className="text-[10px] text-slate-400">
                        เนื่องจากเซิร์ฟเวอร์บอททำงานบน Cloud สิงคโปร์ ทางโบรกเกอร์จึงมองเป็นพื้นที่ใหม่และปฏิเสธส่งรหัส ให้เชื่อมตรงโดยใช้ <strong className="text-amber-400">SSID</strong> จากเครื่องท่านเองดังนี้:
                      </p>
                      <ol className="list-decimal pl-4 text-[10px] space-y-1 text-slate-300">
                        <li>เปิดเว็บ <a href="https://iqoption.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">iqoption.com</a> บนคอมหรือมือถือ แล้วเข้าสู่ระบบ</li>
                        <li>กดปุ่ม <strong className="text-slate-100">F12</strong> (หรือคลิกขวาเลือก <strong>ตรวจสอบ/Inspect</strong>)</li>
                        <li>ไปที่เมนู <strong className="text-slate-100">Application</strong> (เบราว์เซอร์ Chrome) หรือ <strong className="text-slate-100">Storage</strong> (Firefox)</li>
                        <li>เลือก <strong className="text-slate-100">Cookies</strong> ด้านซ้าย -&gt; <code className="text-slate-400">https://iqoption.com</code></li>
                        <li>ค้นหาชื่อคุกกี้ <strong className="text-amber-400">"ssid"</strong> แล้วดับเบิ้ลคลิกเพื่อคัดลอกค่าความปลอดภัย (Value) ทั้งหมดมาวางในช่องด้านบน</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Account Type Selection */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-mono uppercase font-bold">Account Type (ประเภทบัญชีที่เทรด)</label>
                  <select
                    value={iqAccountType}
                    onChange={(e) => setIqAccountType(e.target.value as "demo" | "real")}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded px-2.5 py-2 text-xs text-slate-200"
                  >
                    <option value="demo">บัญชีทดลองเรียนรู้ (Practice Demo Account)</option>
                    <option value="real">บัญชีเทรดเงินจริง (Real Live Account)</option>
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
                  disabled={
                    connectionStatus === "connecting" ||
                    (connectMethod === "credentials" && (!iqEmail.trim() || !iqPassword.trim())) ||
                    (connectMethod === "ssid" && !manualSSID.trim())
                  }
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-850 border border-indigo-500/40 text-white rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors mt-2"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>
                    {connectMethod === "ssid" ? "เชื่อมต่อทันทีด้วย SSID Session" : "เข้าสู่ระบบและเชื่อมต่อ IQ Option"}
                  </span>
                </button>
              </div>
            )
          ) : (
            /* Connected Mode account information */
            <div className="space-y-3 font-mono text-xs">
              
              {/* Connected Account Card details */}
              <div className="bg-slate-950 p-3 rounded border border-slate-900 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                  <span>ผู้ใช้ที่เชื่อมต่อสำเร็จ:</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                    brokerAccountInfo?.is_virtual ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {brokerAccountInfo?.is_virtual ? "DEMO/PRACTICE ACCOUNT" : "REAL/LIVE ACCOUNT"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-slate-300 mt-1">
                  <span className="text-slate-400">Balance ID (Active):</span>
                  <span className="text-white font-bold">{brokerAccountInfo?.loginid}</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">ชื่อนักลงทุน:</span>
                  <span className="text-slate-200">{brokerAccountInfo?.fullname}</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">อีเมลโบรกเกอร์:</span>
                  <span className="text-slate-200 text-[11px]">{brokerAccountInfo?.email}</span>
                </div>
              </div>

              {/* Cloud Bot Active Server Status */}
              <div className="bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-lg text-slate-300 text-[11px] space-y-1.5" id="cloud_bot_status_indicator">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span className="text-emerald-400 font-sans">คลาวด์บอททำงานถาวรอยู่หลังบ้าน (Cloud Bot 24/7 Active)</span>
                </span>
                <p className="leading-relaxed font-sans text-slate-400">
                  ระบบได้บันทึกเซสชัน SSID ของคุณเข้าสู่ระบบคลาวด์ถาวรแล้ว บอทจะวิเคราะห์ตลาดด้วย AI และเปิดออเดอร์โดยอัตโนมัติ <strong>แม้ว่าคุณจะปิดคอมพิวเตอร์ ปิดมือถือ หรือปิดหน้านี้ไป บอทก็จะทำงานและเทรดต่ออย่างต่อเนื่อง 24/7</strong> จนกว่าจะกด "ตัดการเชื่อมต่อ" ด้านล่าง
                </p>
              </div>

              {/* Connected Warning for Real Accounts */}
              {!brokerAccountInfo?.is_virtual && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded text-[10px] text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>โปรดระวังความเสี่ยง:</strong> คุณกำลังเชื่อมต่อกับบัญชีเงินจริงของ IQ Option คำสั่งเทรดอัตโนมัติของ AI จะส่งผลต่อเงินลงทุนจริงของคุณทันที!
                  </span>
                </div>
              )}

              {/* Disconnect button */}
              <button
                onClick={onDisconnect}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Unlink className="w-3.5 h-3.5 text-red-400" />
                <span>ตัดการเชื่อมต่อบัญชี IQ Option</span>
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
            <span className="text-slate-200 font-semibold block mb-0.5">สถานะจำลองความเสี่ยงสมบูรณ์แบบ:</span>
            กำลังรันบนตลาดแบบปิด (Sandbox) คุณสามารถปรับแต่งแท่งเทียน คาดเดาสถานการณ์ความเครียดตลาด และตั้งค่ากลยุทธ์ต่างๆ ได้อย่างปลอดภัยโดยไม่มีความเสี่ยงทางการเงินใดๆ
          </div>
        </div>
      )}
    </div>
  );
}
