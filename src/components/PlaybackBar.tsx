'use client';

import React from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { plotterAudio } from '@/lib/audio/plotterSound';
import { generatePlotCardSnapshot } from '@/lib/export/plotCardSnapshot';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  X,
} from 'lucide-react';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const PlaybackBar: React.FC = () => {
  const {
    playback,
    showSimulationBar,
    setShowSimulationBar,
    togglePlay,
    setPlaybackProgress,
    setPlayback,
    optimizationStats,
    optimizedPolylines,
    isOptimized,
    polylines,
    preset,
    pens,
  } = usePlotterStore();

  const activePolys = isOptimized ? optimizedPolylines : polylines;
  const currentPt = playback.currentPenNib;
  const currentNozzle = playback.currentNozzle;

  const totalTime = optimizationStats.estimatedTimeSeconds || 60;
  const elapsedTime = totalTime * playback.progress;

  const speeds = [1, 10, 50];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    setPlaybackProgress(val);
  };

  const handleReset = () => {
    setPlaybackProgress(0);
    setPlayback({ isPlaying: false });
    plotterAudio.stopAll();
  };

  const handleSnapshotBlueprintCard = () => {
    const dataUrl = generatePlotCardSnapshot({
      preset,
      pens,
      polylines: activePolys,
      stats: optimizationStats,
      theme: 'light-studio',
    });
    if (dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `plotforge_blueprint_${preset.id}_1080p.png`;
      a.click();
    }
  };

  if (!showSimulationBar || activePolys.length === 0) {
    return null;
  }

  const percent = Math.round(playback.progress * 100);

  return (
    <div className="h-12 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 flex items-center justify-between gap-3 select-none text-xs font-mono z-20 shadow-[0_-1px_4px_rgba(15,23,42,0.03)]">
      {/* Play/Pause, Reset & Speed Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={togglePlay}
          className="p-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold shadow-[0_2px_6px_rgba(234,88,12,0.3)] transition active:scale-95"
          title={playback.isPlaying ? 'Pause Simulation (Space)' : 'Play Toolpath Simulation (Space)'}
        >
          {playback.isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 translate-x-0.5" />
          )}
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 rounded-lg transition active:scale-90"
          title="Reset to Origin (0%)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Speed Toggles: 1x, 10x, 50x */}
        <div className="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-lg p-0.5 shadow-xs">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setPlayback({ speed: s })}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight transition ${
                playback.speed === s
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Progress Timeline Scrubber */}
      <div className="flex-1 flex items-center gap-2.5 max-w-xl">
        <span className="text-[10px] text-slate-500 shrink-0 w-10 text-right tabular-nums font-semibold">
          {formatTime(elapsedTime)}
        </span>

        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={Math.round(playback.progress * 1000) / 10}
            onChange={handleSliderChange}
            className="w-full cursor-pointer accent-[#EA580C]"
          />
        </div>

        <span className="text-[10px] text-slate-500 shrink-0 w-10 tabular-nums font-semibold">
          {formatTime(totalTime)}
        </span>

        <span className="text-[10px] text-blue-600 font-bold px-2 py-0.5 rounded-md bg-blue-50/90 border border-blue-200/80 shrink-0 tabular-nums shadow-xs">
          {percent}%
        </span>
      </div>

      {/* Live Readouts & Snapshot Blueprint Card Button */}
      <div className="flex items-center gap-2 shrink-0 text-[10px]">
        {currentPt && (
          <div className="hidden sm:flex items-center gap-1.5 text-slate-800 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/80 tabular-nums shadow-xs">
            <span className="text-slate-400 font-bold">PEN:</span>
            <span className="font-semibold">X{currentPt.x.toFixed(1)} Y{currentPt.y.toFixed(1)}</span>
          </div>
        )}

        {currentNozzle && (
          <div className="hidden md:flex items-center gap-1.5 text-[#EA580C] bg-orange-50/90 px-2.5 py-1 rounded-lg border border-orange-200/80 tabular-nums shadow-xs">
            <span className="text-orange-400 font-bold">NZL:</span>
            <span className="font-semibold">X{currentNozzle.x.toFixed(1)} Y{currentNozzle.y.toFixed(1)}</span>
          </div>
        )}

        {/* Snapshot Blueprint Card Button */}
        <button
          onClick={handleSnapshotBlueprintCard}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 hover:bg-slate-200/80 text-slate-800 border border-slate-200/80 hover:border-slate-300 rounded-lg text-[10px] font-bold transition shadow-xs active:scale-95"
          title="Export 1920x1080 High-Resolution Blueprint Poster PNG"
        >
          <Camera className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden lg:inline">SNAPSHOT POSTER</span>
        </button>

        {/* Close Simulation Bar Button */}
        <button
          onClick={() => {
            setPlayback({ isPlaying: false });
            plotterAudio.stopAll();
            setShowSimulationBar(false);
          }}
          className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition"
          title="Close Simulation Timeline (Space to replay)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
