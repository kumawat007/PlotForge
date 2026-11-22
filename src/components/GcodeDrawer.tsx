'use client';

import React, { useState } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { X, Copy, Check, Download, Search } from 'lucide-react';

export const GcodeDrawer: React.FC = () => {
  const {
    isGcodeDrawerOpen,
    setGcodeDrawerOpen,
    generatedGcode,
    validationResult,
    preset,
    pens,
    optimizationStats,
  } = usePlotterStore();

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isGcodeDrawerOpen) return null;

  const lines = generatedGcode.split('\n');

  const filteredLines = searchQuery.trim()
    ? lines
        .map((line, idx) => ({ line, idx: idx + 1 }))
        .filter((item) =>
          item.line.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : lines.map((line, idx) => ({ line, idx: idx + 1 }));

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedGcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!validationResult.isValid) return;
    const blob = new Blob([generatedGcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTime = Math.round(optimizationStats.estimatedTimeSeconds);
    a.href = url;
    a.download = `plot_${preset.id}_${pens.length}pen_${safeTime}s.gcode`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[540px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col select-none font-sans">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">G-Code Inspector</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
              {lines.length} lines
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {preset.name} • {pens.length} pen{pens.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs transition border border-slate-200 shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={!validationResult.isValid}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs ${
              validationResult.isValid
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={() => setGcodeDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search G-code (e.g. G0, G1, M400, Z4)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 font-mono focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-y-auto p-2 bg-slate-50 font-mono text-xs select-text">
        {filteredLines.map(({ line, idx }) => {
          let color = 'text-slate-700';
          if (line.startsWith(';')) color = 'text-slate-400 italic';
          else if (line.startsWith('G0')) color = 'text-amber-700 font-medium';
          else if (line.startsWith('G1')) color = 'text-emerald-700 font-medium';
          else if (line.startsWith('M')) color = 'text-blue-700 font-bold';
          else if (line.startsWith('G28')) color = 'text-red-700 font-bold';

          return (
            <div key={idx} className="flex hover:bg-slate-200/50 px-2 py-0.5 rounded">
              <span className="w-12 text-slate-400 select-none text-right pr-3 shrink-0 text-[11px]">
                {idx}
              </span>
              <span className={`break-all ${color}`}>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
