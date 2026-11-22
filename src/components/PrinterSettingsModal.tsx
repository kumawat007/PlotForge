'use client';

import React from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { BUILTIN_PRESETS, DEFAULT_PEN_MOUNTS } from '@/lib/gcode/presets';
import {
  X,
  Sliders,
  Compass,
  Zap,
  RotateCcw,
  Usb,
  ExternalLink,
  Box,
  Cpu,
  Heart,
  Coffee,
} from 'lucide-react';

export const PrinterSettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setSettingsModalOpen,
    preset,
    setPreset,
    updatePresetKinematics,
    selectedMountPresetId,
    setMountPresetId,
    setWebSerialOpen,
  } = usePlotterStore();

  if (!isSettingsModalOpen) return null;

  const handleResetDefaults = () => {
    const defaultForThis = BUILTIN_PRESETS.find((p) => p.id === preset.id) || BUILTIN_PRESETS[0];
    setPreset(defaultForThis);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.16)] max-w-2xl w-full overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#EA580C]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase font-mono">
                Hardware & Kinematic Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure nozzle-to-pen offsets, Z heights, feedrates, and machine limits
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Section 1: Machine Preset & Firmware */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              Machine Architecture
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Printer Model</label>
                <select
                  value={preset.id}
                  onChange={(e) => {
                    const found = BUILTIN_PRESETS.find((p) => p.id === e.target.value);
                    if (found) setPreset(found);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                >
                  {BUILTIN_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Firmware Flavor</label>
                <select
                  value={preset.firmware}
                  onChange={(e) =>
                    updatePresetKinematics({ firmware: e.target.value as 'bambu' | 'marlin' | 'grbl' })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                >
                  <option value="bambu">Bambu Lab (3-line header, M400 U1 pause)</option>
                  <option value="marlin">Marlin 2.0 / Prusa (M0 pause, classic G-code)</option>
                  <option value="grbl">GRBL / AxiDraw (G0/G1 real-time stream)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Pen Mount & Nozzle Kinematic Offset */}
          <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                Pen Mount Kinematics (Nozzle-to-Pen Offset)
              </h3>
              <a
                href="https://makerworld.com/en/@kumawat007"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Get 3D Printable Mounts</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              If the pen nib is positioned away from the nozzle, the nozzle must move by{' '}
              <code className="text-blue-700 font-mono font-semibold bg-blue-50 px-1 py-0.5 rounded border border-blue-200">X_nozzle = X_pen - ΔX</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Mount Bracket Preset</label>
                <select
                  value={selectedMountPresetId}
                  onChange={(e) => setMountPresetId(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                >
                  {DEFAULT_PEN_MOUNTS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Offset ΔX (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={preset.penOffsetX}
                  onChange={(e) => updatePresetKinematics({ penOffsetX: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Offset ΔY (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={preset.penOffsetY}
                  onChange={(e) => updatePresetKinematics({ penOffsetY: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Hardware Pause</label>
                <input
                  type="text"
                  value={preset.pauseCommand}
                  onChange={(e) => updatePresetKinematics({ pauseCommand: e.target.value })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Z-Axis Heights & Feedrates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Z Heights */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase text-slate-700 tracking-wider">
                Z-Axis Heights
              </h3>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Pen-Down Drawing Z (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={preset.penDownZ}
                  onChange={(e) => updatePresetKinematics({ penDownZ: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Pen-Up Clearance Z-Hop (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={preset.penUpZ}
                  onChange={(e) => updatePresetKinematics({ penUpZ: parseFloat(e.target.value) || 3 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Safe Parking Height (mm)
                </label>
                <input
                  type="number"
                  step="1"
                  value={preset.safeParkZ}
                  onChange={(e) => updatePresetKinematics({ safeParkZ: parseFloat(e.target.value) || 15 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Kinematics & Speeds */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-semibold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Kinematics & Speeds
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-700 font-semibold border border-emerald-200">
                  A1 Mini Optimized
                </span>
              </div>

              {/* Quick Speed Profile Buttons */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Quick Speed Profiles
                </label>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      updatePresetKinematics({
                        drawFeedrate: 1200,
                        travelFeedrate: 3600,
                        zFeedrate: 600,
                        drawAcceleration: 800,
                        travelAcceleration: 1200,
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg border text-center transition ${
                      preset.drawFeedrate <= 1200
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    Fine (20 mm/s)
                    <span className="block text-[9px] opacity-75 font-sans">Gel / Micron</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updatePresetKinematics({
                        drawFeedrate: 1800,
                        travelFeedrate: 4200,
                        zFeedrate: 600,
                        drawAcceleration: 1000,
                        travelAcceleration: 1500,
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg border text-center transition ${
                      preset.drawFeedrate > 1200 && preset.drawFeedrate <= 2000
                        ? 'bg-[#EA580C] text-white border-[#EA580C] font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-[#EA580C]/40'
                    }`}
                  >
                    Balanced (30 mm/s)
                    <span className="block text-[9px] opacity-75 font-sans">Recommended</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updatePresetKinematics({
                        drawFeedrate: 2400,
                        travelFeedrate: 5400,
                        zFeedrate: 720,
                        drawAcceleration: 1500,
                        travelAcceleration: 2000,
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg border text-center transition ${
                      preset.drawFeedrate > 2000
                        ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-purple-400'
                    }`}
                  >
                    Fast (40 mm/s)
                    <span className="block text-[9px] opacity-75 font-sans">Ballpoint Draft</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Drawing Speed
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    {(preset.drawFeedrate / 60).toFixed(0)} mm/s ({preset.drawFeedrate} mm/min)
                  </span>
                </div>
                <input
                  type="number"
                  step="100"
                  value={preset.drawFeedrate}
                  onChange={(e) => updatePresetKinematics({ drawFeedrate: parseInt(e.target.value) || 1800 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Rapid Air Travel
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    {(preset.travelFeedrate / 60).toFixed(0)} mm/s ({preset.travelFeedrate} mm/min)
                  </span>
                </div>
                <input
                  type="number"
                  step="500"
                  value={preset.travelFeedrate}
                  onChange={(e) => updatePresetKinematics({ travelFeedrate: parseInt(e.target.value) || 4200 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Z Plunge / Retract Speed
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    {(preset.zFeedrate / 60).toFixed(0)} mm/s ({preset.zFeedrate} mm/min)
                  </span>
                </div>
                <input
                  type="number"
                  step="50"
                  value={preset.zFeedrate}
                  onChange={(e) => updatePresetKinematics({ zFeedrate: parseInt(e.target.value) || 600 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Plotting Acceleration (M204)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    {preset.drawAcceleration ?? 1000} mm/s²
                  </span>
                </div>
                <input
                  type="number"
                  step="100"
                  value={preset.drawAcceleration ?? 1000}
                  onChange={(e) => updatePresetKinematics({ drawAcceleration: parseInt(e.target.value) || 1000 })}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Stock is 10,000 mm/s². Clamping to 800–1200 mm/s² prevents cantilever arm vibration and bed-slinger jerk.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => {
                setSettingsModalOpen(false);
                setWebSerialOpen(true);
              }}
              className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium cursor-pointer"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>USB Serial Link</span>
            </button>
            <span className="text-slate-300">•</span>
            <a
              href="https://makerworld.com/en/@kumawat007"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors font-medium"
              title="Download 3D printable pen mounts on MakerWorld"
            >
              <Box className="w-3.5 h-3.5 text-blue-600" />
              <span>3D Mounts</span>
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://buymeacoffee.com/kumawat007"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-600 hover:text-amber-700 transition-colors font-medium"
              title="Support developer on Buy Me a Coffee"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>Support</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsModalOpen(false)}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-sm"
            >
              Done & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
