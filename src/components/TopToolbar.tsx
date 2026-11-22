'use client';

import React from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { BUILTIN_PRESETS, DEFAULT_PAPER_PRESETS } from '@/lib/gcode/presets';
import {
  Sliders,
  AlertTriangle,
  Download,
  FileCode,
  Undo2,
  Redo2,
  Printer,
  FileText,
  ChevronDown,
} from 'lucide-react';

export const TopToolbar: React.FC = () => {
  const {
    preset,
    setPreset,
    paperPreset,
    setPaperPreset,
    validationResult,
    optimizationStats,
    isOptimized,
    autoFitAllElementsToPaper,
    canUndo,
    canRedo,
    undo,
    redo,
    setSettingsModalOpen,
    setPreflightModalOpen,
    setGcodeDrawerOpen,
    setActiveStudioMode,
  } = usePlotterStore();

  const estMinutes = Math.max(1, Math.ceil(optimizationStats.estimatedTimeSeconds / 60));

  return (
    <header className="h-12 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 flex items-center justify-between select-none z-30 relative font-sans shadow-xs">
      {/* LEFT: Clean Logo & Quick Machine/Bed Selectors */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center gap-2 cursor-pointer group py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          onClick={() => setActiveStudioMode('canvas')}
          title="Return to Canvas Studio"
        >
          <div className="w-2.5 h-2.5 rounded-sm bg-[#EA580C] shadow-[0_0_8px_rgba(234,88,12,0.4)] group-hover:scale-110 transition-transform" />
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-slate-900 text-xs tracking-wider font-mono">
              PLOTFORGE
            </span>
            <span className="text-[9px] text-blue-600 font-mono font-bold tracking-widest px-1 py-0.2 rounded bg-blue-50 border border-blue-200/60 shadow-2xs">
              STUDIO
            </span>
          </div>
        </div>

        <div className="h-3.5 w-[1px] bg-slate-200 hidden sm:block" />

        {/* 1. Printer Selector */}
        <div className="relative flex items-center bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/80 rounded-xl px-2.5 py-1 text-xs transition shadow-2xs">
          <Printer className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
          <select
            value={preset.id}
            onChange={(e) => {
              const found = BUILTIN_PRESETS.find((p) => p.id === e.target.value);
              if (found) setPreset(found);
            }}
            className="appearance-none bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[140px] truncate text-xs pr-4"
            title="Active 3D Printer Target"
          >
            {BUILTIN_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-white text-slate-800">
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* 2. Canvas / Bed Size Selector */}
        <div className="hidden md:relative md:flex items-center bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/80 rounded-xl px-2.5 py-1 text-xs transition shadow-2xs">
          <FileText className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
          <select
            value={paperPreset.id}
            onChange={(e) => {
              const found = DEFAULT_PAPER_PRESETS.find((p) => p.id === e.target.value);
              if (found) setPaperPreset(found);
            }}
            className="appearance-none bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate text-xs pr-4"
            title="Drawing Bed / Paper Size"
          >
            {DEFAULT_PAPER_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-white text-slate-800">
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* 3. Undo / Redo History Controls */}
        <div className="flex items-center gap-0.5 bg-slate-100/80 border border-slate-200/80 rounded-xl p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-all ${
              canUndo
                ? 'text-slate-700 hover:text-slate-900 hover:bg-white active:scale-95 cursor-pointer shadow-2xs'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Undo Canvas Edit (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3 bg-slate-200" />
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-all ${
              canRedo
                ? 'text-slate-700 hover:text-slate-900 hover:bg-white active:scale-95 cursor-pointer shadow-2xs'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Redo Canvas Edit (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CENTER: Safety Collision Alert / Status Pill */}
      <div className="flex items-center gap-2">
        {!validationResult.isValid ? (
          <button
            type="button"
            onClick={autoFitAllElementsToPaper}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100/80 border border-red-200/90 rounded-full text-xs font-semibold text-red-600 transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
            title="Click to automatically rescale and center all paths into safe bed bounds"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="font-mono text-[11px]">⚠️ Outside Bed — Click to Auto-Fit</span>
          </button>
        ) : (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50/80 border border-emerald-200/70 rounded-full text-xs font-mono text-emerald-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Ready • ~{estMinutes}m plot</span>
            {isOptimized && (
              <span className="text-[10px] text-slate-500 pl-1.5 border-l border-emerald-200/80 font-normal">
                TSP Saved {Math.round(optimizationStats.savedPercent)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-2">
        {/* Settings Gear Modal Button */}
        <button
          type="button"
          onClick={() => setSettingsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200/60 border border-slate-200/80 rounded-xl transition font-medium shadow-2xs active:scale-95 cursor-pointer"
          title="Configure machine kinematics, Z heights, feedrates, and offsets"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden md:inline">Settings</span>
        </button>

        {/* View G-Code Button */}
        <button
          type="button"
          onClick={() => setGcodeDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200/60 border border-slate-200/80 rounded-xl transition font-medium shadow-2xs active:scale-95 cursor-pointer"
          title="Inspect generated G-code commands"
        >
          <FileCode className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden md:inline">Code</span>
        </button>

        {/* Primary Action Button: Export G-Code (Opens Preflight Checklist) */}
        <button
          type="button"
          onClick={() => setPreflightModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold font-sans tracking-wide rounded-xl transition-all shadow-[0_2px_8px_rgba(234,88,12,0.25)] hover:shadow-[0_4px_12px_rgba(234,88,12,0.35)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export G-Code</span>
        </button>
      </div>
    </header>
  );
};
