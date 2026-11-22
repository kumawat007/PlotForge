'use client';

import React, { useState } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { cleanAndNormalizeIp } from '@/lib/gcode/ipNormalizer';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  Coffee,
  Box,
  ExternalLink,
  ShieldCheck,
  Wifi,
  Copy,
  Check,
} from 'lucide-react';

export const PreflightModal: React.FC = () => {
  const {
    isPreflightModalOpen,
    setPreflightModalOpen,
    preset,
    paperPreset,
    optimizationStats,
    validationResult,
    generatedGcode,
  } = usePlotterStore();

  const [step1Checked, setStep1Checked] = useState(false);
  const [step2Checked, setStep2Checked] = useState(false);
  const [step3Checked, setStep3Checked] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [transferMode, setTransferMode] = useState<'sd' | 'wifi'>('sd');
  const [bambuIp, setBambuIp] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('plotforge_bambu_ip') || '';
    }
    return '';
  });
  const [bambuCode, setBambuCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('plotforge_bambu_code') || '';
    }
    return '';
  });
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Normalize IP (e.g. cleans 10.222.00.000 -> 10.222.0.0)
  const ipCheck = cleanAndNormalizeIp(bambuIp);
  const activeIp = ipCheck.isValid ? ipCheck.normalizedIp : (bambuIp.trim() || '192.168.1.100');

  const safeTime = Math.round(optimizationStats.estimatedTimeSeconds);
  const fileName = `plotforge_${preset.id}_${paperPreset.id}_${safeTime}s.gcode`;
  const curlCommand = `curl -k --ssl-reqd "ftps://bblp:${bambuCode || 'ACCESS_CODE'}@${activeIp}:990/${fileName}" -T "${fileName}"`;

  const handleCopyCurl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(curlCommand);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const handleIpChange = (val: string) => {
    setBambuIp(val);
    const checked = cleanAndNormalizeIp(val);
    const storeVal = checked.isValid ? checked.normalizedIp : val.trim();
    if (typeof window !== 'undefined') localStorage.setItem('plotforge_bambu_ip', storeVal);
  };

  const handleIpBlur = () => {
    const checked = cleanAndNormalizeIp(bambuIp);
    if (checked.isValid && checked.wasModified) {
      setBambuIp(checked.normalizedIp);
      if (typeof window !== 'undefined') localStorage.setItem('plotforge_bambu_ip', checked.normalizedIp);
    }
  };

  const handleCodeChange = (val: string) => {
    setBambuCode(val);
    if (typeof window !== 'undefined') localStorage.setItem('plotforge_bambu_code', val);
  };

  if (!isPreflightModalOpen) return null;

  const allChecked = step1Checked && step2Checked && step3Checked;

  const handleDownload = () => {
    const blob = new Blob([generatedGcode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);

    if (transferMode === 'wifi') {
      handleCopyCurl();
    }
  };

  const estMinutes = Math.max(1, Math.ceil(optimizationStats.estimatedTimeSeconds / 60));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.16)] max-w-xl w-full overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#EA580C] shadow-[0_0_10px_rgba(234,88,12,0.5)]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase font-mono">
                Pre-Flight Safety Checklist
              </h2>
              <p className="text-xs text-slate-500">
                3D Printer Pen Plotter Hardware Safety Verification
              </p>
            </div>
          </div>
          <button
            onClick={() => setPreflightModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Telemetry Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5 font-mono">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Target Printer</span>
              <span className="text-xs font-bold text-slate-900 truncate block mt-0.5" title={preset.name}>
                {preset.name}
              </span>
              <span className="text-[10px] text-emerald-600 font-mono font-medium">
                Offset: [{preset.penOffsetX}, {preset.penOffsetY}]mm
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Paper Target</span>
              <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">
                {paperPreset.name}
              </span>
              <span className="text-[10px] text-slate-500">
                {paperPreset.widthMm} × {paperPreset.heightMm} mm
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Est. Plot Time</span>
              <span className="text-xs font-bold text-[#EA580C] truncate block mt-0.5">
                ~{estMinutes} min
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">
                TSP Saved: {Math.round(optimizationStats.savedPercent)}%
              </span>
            </div>
          </div>

          {/* Validation Status */}
          {validationResult.isValid ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-slate-800">
                <span className="font-bold text-emerald-700">KINEMATICS VERIFIED: </span>
                All vector paths are inside reachable bed bounds and clear of keep-out zones.
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800 space-y-1">
                <span className="font-bold text-red-700">COLLISION HAZARD DETECTED: </span>
                <span>Some strokes exceed printer limits. Auto-Fit to paper before plotting.</span>
                <ul className="list-disc pl-4 text-[11px] text-red-700">
                  {validationResult.errors.slice(0, 2).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 3 Step Confirmation List */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase text-slate-600 tracking-wider">
              Mandatory Physical Setup Steps
            </h3>

            {/* Step 1 */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={step1Checked}
                onChange={(e) => setStep1Checked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C] focus:ring-offset-0 bg-white cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 block">
                  1. Unload Filament & Keep Pen Stowed during Homing
                </span>
                <span className="text-slate-600 text-[11px] leading-relaxed block mt-0.5">
                  Your printer will home axes (G28) first. Ensure filament is unloaded and nozzle temperature is room temperature (cold bed & nozzle). Do not have the pen lower than the nozzle during homing!
                </span>
              </div>
            </label>

            {/* Step 2 */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={step2Checked}
                onChange={(e) => setStep2Checked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C] focus:ring-offset-0 bg-white cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 block">
                  2. Tape Paper Firmly to the Build Plate
                </span>
                <span className="text-slate-600 text-[11px] leading-relaxed block mt-0.5">
                  Secure your {paperPreset.name} sheet onto the PEI bed using blue painter&apos;s tape at all 4 corners so rapid nozzle travel does not shift the paper.
                </span>
              </div>
            </label>

            {/* Step 3 */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={step3Checked}
                onChange={(e) => setStep3Checked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C] focus:ring-offset-0 bg-white cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 block">
                  3. Insert Pen on Hardware Pause ({preset.pauseCommand.split(' ')[0]})
                </span>
                <span className="text-slate-600 text-[11px] leading-relaxed block mt-0.5">
                  {preset.firmware === 'bambu'
                    ? 'Bambu Lab firmware automatically parks the toolhead over the poop chute (waste bin) during pause. Slide your pen into the PIP mount (nib extending ~10-12mm below nozzle with spring compliance), then press Resume on your printer screen to begin plotting.'
                    : 'The generated G-code pauses automatically at safe parking height. Slide your gel pen into the mount, adjust the nib height, and press Resume on your printer screen.'}
                </span>
              </div>
            </label>
          </div>

          {/* Transfer Method Switcher for Bambu Lab */}
          {preset.firmware === 'bambu' && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase text-slate-600 tracking-wider">
                  Transfer Mode
                </span>
                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setTransferMode('sd')}
                    className={`px-3 py-1 rounded-md transition ${transferMode === 'sd'
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    SD / Bambu Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMode('wifi')}
                    className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${transferMode === 'wifi'
                        ? 'bg-white text-blue-600 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    <Wifi className="w-3.5 h-3.5 text-blue-600" />
                    <span>Wi-Fi Direct (FTP)</span>
                  </button>
                </div>
              </div>

              {transferMode === 'wifi' && (
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-blue-700 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Wifi className="w-4 h-4" />
                      <span>Bambu Lab Wi-Fi FTP Direct Transfer</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Implicit FTPS · Port 990</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase block mb-1 font-semibold">
                        Printer IP Address
                      </label>
                      <input
                        type="text"
                        value={bambuIp}
                        onChange={(e) => handleIpChange(e.target.value)}
                        onBlur={handleIpBlur}
                        placeholder="e.g. 192.168.1.100"
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                      {ipCheck.isValid && ipCheck.wasModified && (
                        <p className="text-[9px] text-emerald-600 mt-0.5 font-medium">
                          ✓ Normalized to: {ipCheck.normalizedIp}
                        </p>
                      )}
                      {!ipCheck.isValid && bambuIp.trim().length > 0 && (
                        <p className="text-[9px] text-amber-600 mt-0.5">
                          {ipCheck.message || 'Check IP format'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase block mb-1 font-semibold">
                        Access Code
                      </label>
                      <input
                        type="password"
                        value={bambuCode}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        placeholder="8-digit screen code"
                        className="w-full bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>1-Click Terminal Send Command (PowerShell / CMD / Mac / Linux):</span>
                      <button
                        type="button"
                        onClick={handleCopyCurl}
                        className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        {copiedCurl ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Command</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code className="block text-[11px] text-blue-700 break-all select-all font-mono bg-slate-50 p-1.5 rounded border border-slate-200">
                      {curlCommand}
                    </code>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    💡 <b>Tip:</b> Bambu Lab uses secure <b>FTPS on Port 990</b> (not unencrypted port 21). In PowerShell, use <code>curl.exe</code> if <code>curl</code> is aliased. Tap <b>Settings ➔ Network ➔ Wi-Fi</b> on your A1 Mini screen to see your Access Code!
                  </p>
                </div>
              )}
            </div>
          )}

          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">G-code file downloaded! Copy to SD card or send to printer. Happy plotting!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Creator & 3D Mount Links */}
          <div className="flex items-center gap-3 text-xs">
            <a
              href="https://makerworld.com/en/@kumawat007"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors font-medium"
            >
              <Box className="w-3.5 h-3.5 text-blue-600" />
              <span>3D Pen Mounts</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://buymeacoffee.com/kumawat007"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 text-slate-700 hover:text-amber-800 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 rounded-lg transition-all font-medium shadow-2xs"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-700" />
              <span>Buy Me a Coffee</span>
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setPreflightModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={!allChecked}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-sm ${allChecked
                  ? 'bg-[#EA580C] hover:bg-[#C2410C] text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                }`}
            >
              <Download className="w-4 h-4" />
              <span>
                {transferMode === 'wifi' ? 'Download & Copy Wi-Fi Cmd' : 'Download .GCODE'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
