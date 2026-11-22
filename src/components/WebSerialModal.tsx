'use client';

import React, { useState, useEffect, useRef } from 'react';
import { webSerial, SerialStatus } from '@/lib/serial/webSerialManager';
import { usePlotterStore } from '@/store/usePlotterStore';
import {
  Usb,
  X,
  Play,
  Pause,
  Square,
  AlertOctagon,
  Terminal,
  Send,
  Home,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface WebSerialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebSerialModal: React.FC<WebSerialModalProps> = ({ isOpen, onClose }) => {
  const { generatedGcode, preset, validationResult } = usePlotterStore();
  const [status, setStatus] = useState<SerialStatus>({
    isConnected: false,
    baudRate: 115200,
    linesSent: 0,
    totalLines: 0,
    isStreaming: false,
    isPaused: false,
  });

  const [baudRate, setBaudRate] = useState<number>(115200);
  const [logs, setLogs] = useState<Array<{ id: number; text: string; direction: 'tx' | 'rx' | 'sys' }>>([]);
  const [manualCmd, setManualCmd] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubStatus = webSerial.subscribeStatus((st) => setStatus(st));
    const unsubLog = webSerial.subscribeLog((text, direction) => {
      setLogs((prev) => [...prev.slice(-150), { id: Date.now() + Math.random(), text, direction }]);
    });

    return () => {
      unsubStatus();
      unsubLog();
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const isWebSerialAvailable = webSerial.isSupported();

  const handleConnect = async () => {
    if (status.isConnected) {
      await webSerial.disconnect();
    } else {
      await webSerial.connect(baudRate);
    }
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCmd.trim()) return;
    webSerial.sendCommand(manualCmd.trim());
    setManualCmd('');
  };

  const handleStartStream = () => {
    if (!validationResult.isValid) {
      alert('Cannot stream: Toolpath has collision safety violations. Auto-fit elements first.');
      return;
    }
    webSerial.streamGcode(generatedGcode);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 text-xs"
      >
        {/* Header */}
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-200">
              <Usb className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">Direct USB Hardware Link</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    status.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-rose-500'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500">Stream G-code directly to 3D printer / plotter over Web Serial</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {!isWebSerialAvailable ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-amber-900">
              <div className="font-bold flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                <span>Web Serial API Not Supported in Current Browser</span>
              </div>
              <p className="text-xs text-amber-800/80">
                Direct USB connection requires a Chromium-based browser (Google Chrome, Microsoft Edge, Brave, or Opera). In other browsers, download the G-code file and transfer via SD Card, Wi-Fi FTP, or OctoPrint.
              </p>
            </div>
          ) : (
            <>
              {/* Connection Row */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-slate-600 font-mono text-[11px] font-semibold">Baud Rate:</label>
                  <select
                    disabled={status.isConnected}
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className="bg-white text-slate-800 text-xs font-mono rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none"
                  >
                    <option value={115200}>115200 baud (Standard Bambu / Prusa / Marlin)</option>
                    <option value={250000}>250000 baud (High-Speed Marlin)</option>
                    <option value={57600}>57600 baud (Legacy)</option>
                  </select>
                </div>

                <button
                  onClick={handleConnect}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-2 shadow-sm ${
                    status.isConnected
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20'
                  }`}
                >
                  <Usb className="w-3.5 h-3.5" />
                  <span>{status.isConnected ? 'Disconnect USB' : 'Connect Serial Device'}</span>
                </button>
              </div>

              {/* Streaming Progress Bar */}
              {status.isStreaming && (
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-700">
                    <span>
                      Plot Progress: {status.linesSent} / {status.totalLines} lines
                    </span>
                    <span className="text-emerald-600 font-bold">
                      {Math.round((status.linesSent / Math.max(1, status.totalLines)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-150"
                      style={{ width: `${(status.linesSent / Math.max(1, status.totalLines)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Controls Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Manual Jog Controls */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider block font-mono">
                    Manual Jog Controls
                  </span>
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      disabled={!status.isConnected}
                      onClick={() => webSerial.sendCommand('G91\nG1 Y10 F2400\nG90')}
                      className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200 font-mono text-[10px]"
                      title="+Y 10mm"
                    >
                      <ArrowUp className="w-4 h-4 text-emerald-600" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={!status.isConnected}
                        onClick={() => webSerial.sendCommand('G91\nG1 X-10 F2400\nG90')}
                        className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200 font-mono text-[10px]"
                        title="-X 10mm"
                      >
                        <ArrowLeft className="w-4 h-4 text-rose-600" />
                      </button>
                      <button
                        disabled={!status.isConnected}
                        onClick={() => webSerial.sendCommand('G28')}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200 font-mono text-[10px] text-blue-600 flex items-center gap-1 font-semibold"
                        title="Home Axes (G28)"
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>HOME</span>
                      </button>
                      <button
                        disabled={!status.isConnected}
                        onClick={() => webSerial.sendCommand('G91\nG1 X10 F2400\nG90')}
                        className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200 font-mono text-[10px]"
                        title="+X 10mm"
                      >
                        <ArrowRight className="w-4 h-4 text-rose-600" />
                      </button>
                    </div>
                    <button
                      disabled={!status.isConnected}
                      onClick={() => webSerial.sendCommand('G91\nG1 Y-10 F2400\nG90')}
                      className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200 font-mono text-[10px]"
                      title="-Y 10mm"
                    >
                      <ArrowDown className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      disabled={!status.isConnected}
                      onClick={() => webSerial.sendCommand(`G1 Z${preset.penUpZ} F600`)}
                      className="py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200 text-[10px] font-mono text-amber-700 font-semibold"
                    >
                      PEN UP (Z{preset.penUpZ})
                    </button>
                    <button
                      disabled={!status.isConnected}
                      onClick={() => webSerial.sendCommand(`G1 Z${preset.penDownZ} F600`)}
                      className="py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200 text-[10px] font-mono text-emerald-700 font-semibold"
                    >
                      PEN DOWN (Z{preset.penDownZ})
                    </button>
                  </div>
                </div>

                {/* Plot Streaming Actions */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider block mb-2 font-mono">
                      Plot Toolpath Execution
                    </span>
                    {!validationResult.isValid ? (
                      <div className="text-[10px] text-rose-700 flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-red-200">
                        <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
                        <span>Collision safety error! Auto-fit elements to enable streaming.</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-700 flex items-center gap-1.5 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                        <span>Toolpath verified collision-safe for {preset.name}.</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!status.isStreaming ? (
                      <button
                        disabled={!status.isConnected || !validationResult.isValid}
                        onClick={handleStartStream}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Stream Toolpath Live</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {status.isPaused ? (
                          <button
                            onClick={() => webSerial.resumeStream()}
                            className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Resume</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => webSerial.pauseStream()}
                            className="py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        )}
                        <button
                          onClick={() => webSerial.stopStream()}
                          className="py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition flex items-center justify-center gap-1.5 border border-slate-300"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => webSerial.emergencyStop()}
                      className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-lg transition flex items-center justify-center gap-1.5 text-[11px]"
                    >
                      <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                      <span>EMERGENCY STOP (M112)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Monospace Serial Terminal Log */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-600" />
                    <span>Serial Terminal Monitor</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Auto-scrolling</span>
                </div>

                <div
                  ref={logContainerRef}
                  className="bg-slate-900 rounded-xl p-3 h-32 overflow-y-auto font-mono text-[10px] space-y-0.5 border border-slate-800 text-slate-200"
                >
                  {logs.length === 0 ? (
                    <div className="text-slate-500 italic">No serial communication yet. Connect device to begin.</div>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className={`leading-tight ${
                          log.direction === 'tx'
                            ? 'text-cyan-300'
                            : log.direction === 'rx'
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                        }`}
                      >
                        <span className="text-slate-500 mr-2">
                          {log.direction === 'tx' ? 'TX >' : log.direction === 'rx' ? 'RX <' : 'SYS :'}
                        </span>
                        {log.text}
                      </div>
                    ))
                  )}
                </div>

                {/* Direct Command Input */}
                <form onSubmit={handleSendCommand} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter manual G-code (e.g. G28, M106, G1 X100 Y100 F3000)..."
                    value={manualCmd}
                    onChange={(e) => setManualCmd(e.target.value)}
                    disabled={!status.isConnected}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 disabled:opacity-40"
                  />
                  <button
                    type="submit"
                    disabled={!status.isConnected || !manualCmd.trim()}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg transition flex items-center gap-1 font-semibold text-xs shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
