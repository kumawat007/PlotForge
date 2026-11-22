'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import {
  Crosshair,
  Copy,
  Lock,
  Unlock,
  Trash2,
  Undo2,
  Redo2,
  Play,
  Pause,
  Maximize2,
  Sliders,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export const StudioContextMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    selectedElementId,
    elements,
    centerElementOnPrintableArea,
    duplicateElement,
    toggleLockElement,
    removeElement,
    undo,
    redo,
    canUndo,
    canRedo,
    playback,
    togglePlay,
    autoFitAllElementsToPaper,
    setSettingsModalOpen,
    setLegalModalOpen,
  } = usePlotterStore();

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Global right-click interceptor
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Completely disable standard browser context menu
      e.preventDefault();

      const menuWidth = 230;
      const estimatedHeight = selectedElementId ? 380 : 260;

      // Smart boundary clamping so menu never overflows screen
      const x = e.clientX + menuWidth > window.innerWidth
        ? Math.max(12, e.clientX - menuWidth)
        : e.clientX;
      const y = e.clientY + estimatedHeight > window.innerHeight
        ? Math.max(12, e.clientY - estimatedHeight)
        : e.clientY;

      setPosition({ x, y });
      setIsOpen(true);
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [selectedElementId]);

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 w-56 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 p-1.5 text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-100"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Active Element Context Header */}
      {selectedElement && (
        <>
          <div className="px-2.5 py-1.5 text-[10px] font-mono text-slate-400 font-semibold tracking-wider uppercase flex items-center justify-between border-b border-slate-100 mb-1">
            <span className="truncate max-w-[130px]">{selectedElement.name || 'Selected Layer'}</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/60 font-bold">
              {selectedElement.type.toUpperCase()}
            </span>
          </div>

          {/* Element Actions */}
          <button
            type="button"
            onClick={() => handleAction(() => centerElementOnPrintableArea(selectedElement.id))}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span>Center to Bed</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleAction(() => duplicateElement(selectedElement.id))}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
              <span>Duplicate Layer</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Ctrl+D</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(() => toggleLockElement(selectedElement.id))}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {selectedElement.locked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Unlock Layer</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  <span>Lock Layer</span>
                </>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleAction(() => removeElement(selectedElement.id))}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-red-600 hover:bg-red-50/80 transition-colors font-medium group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-red-600 transition-colors" />
              <span>Delete Layer</span>
            </div>
            <span className="text-[10px] font-mono text-red-400">Del</span>
          </button>

          <div className="h-[1px] bg-slate-100 my-1" />
        </>
      )}

      {/* Global Canvas Actions */}
      <button
        type="button"
        disabled={!canUndo}
        onClick={() => handleAction(undo)}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
          canUndo
            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 group'
            : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center gap-2">
          <Undo2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
          <span>Undo</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Ctrl+Z</span>
      </button>

      <button
        type="button"
        disabled={!canRedo}
        onClick={() => handleAction(redo)}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
          canRedo
            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 group'
            : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center gap-2">
          <Redo2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
          <span>Redo</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Ctrl+Y</span>
      </button>

      <button
        type="button"
        onClick={() => handleAction(togglePlay)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {playback.isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
          )}
          <span>{playback.isPlaying ? 'Pause Simulation' : 'Simulate Toolpath'}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Space</span>
      </button>

      <button
        type="button"
        onClick={() => handleAction(autoFitAllElementsToPaper)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
          <span>Fit All to Bed</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => handleAction(() => setSettingsModalOpen(true))}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
          <span>Machine Settings</span>
        </div>
      </button>

      <div className="h-[1px] bg-slate-100 my-1" />

      {/* Legal & Governance */}
      <button
        type="button"
        onClick={() => handleAction(() => setLegalModalOpen('privacy'))}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
          <span>Privacy Policy</span>
        </div>
        <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/50">GDPR</span>
      </button>

      <button
        type="button"
        onClick={() => handleAction(() => setLegalModalOpen('terms'))}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
          <span>Terms of Service</span>
        </div>
        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 py-0.2 rounded border border-slate-200/50">MIT</span>
      </button>
    </div>
  );
};
