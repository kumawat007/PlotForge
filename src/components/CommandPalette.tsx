'use client';

import React, { useState, useEffect } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { BUILTIN_PRESETS } from '@/lib/gcode/presets';
import { CURATED_VECTORS } from '@/lib/svg/vectorLibrary';
import { parseSVG } from '@/lib/svg/svgParser';
import { plotterAudio } from '@/lib/audio/plotterSound';
import {
  Search,
  Zap,
  Download,
  Maximize,
  Box,
  FileCode,
  Volume2,
  Share2,
  Sparkles,
  Command,
  X,
  Usb,
  Coffee,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setPreset,
    triggerOptimization,
    autoFitElementToPrintableArea,
    elements,
    addElement,
    pens,
    preset,
    togglePerspective3D,
    setGcodeDrawerOpen,
    setShareCardOpen,
    setWebSerialOpen,
    addAlgorithmicArt,
    setPlateTextureStyle,
    validationResult,
    generatedGcode,
    optimizationStats,
  } = usePlotterStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Command list
  const commands: CommandItem[] = [
    {
      id: 'usb-serial',
      title: 'Open Web Serial USB Link (Stream to 3D Printer)',
      category: 'Hardware',
      icon: <Usb className="w-4 h-4 text-emerald-600" />,
      action: () => setWebSerialOpen(true),
    },
    {
      id: 'gen-spiro',
      title: 'Generate Algorithmic Spirograph Harmonograph',
      category: 'Generative Studio',
      icon: <Sparkles className="w-4 h-4 text-amber-600" />,
      action: () => addAlgorithmicArt('spiro'),
    },
    {
      id: 'gen-flow',
      title: 'Generate Flow Field Streamlines',
      category: 'Generative Studio',
      icon: <Sparkles className="w-4 h-4 text-amber-600" />,
      action: () => addAlgorithmicArt('flow'),
    },
    {
      id: 'gen-hilbert',
      title: 'Generate Continuous Hilbert Space-Filling Curve (0 Lifts)',
      category: 'Generative Studio',
      icon: <Sparkles className="w-4 h-4 text-amber-600" />,
      action: () => addAlgorithmicArt('hilbert'),
    },
    {
      id: 'gen-guilloche',
      title: 'Generate Guilloche Security Wave Engraving',
      category: 'Generative Studio',
      icon: <Sparkles className="w-4 h-4 text-amber-600" />,
      action: () => addAlgorithmicArt('guilloche'),
    },
    {
      id: 'gen-topo',
      title: 'Generate Topographic Elevation Contours',
      category: 'Generative Studio',
      icon: <Sparkles className="w-4 h-4 text-amber-600" />,
      action: () => addAlgorithmicArt('topo'),
    },
    {
      id: 'plate-gold',
      title: 'Switch Build Plate to Bambu High-Temp Textured Gold PEI',
      category: 'Viewport',
      icon: <Box className="w-4 h-4 text-amber-600" />,
      action: () => setPlateTextureStyle('pei-gold'),
    },
    {
      id: 'plate-black',
      title: 'Switch Build Plate to Bambu / Prusa Textured Black PEI',
      category: 'Viewport',
      icon: <Box className="w-4 h-4 text-slate-600" />,
      action: () => setPlateTextureStyle('pei-black'),
    },
    {
      id: 'plate-slate',
      title: 'Switch Build Plate to Industrial Slate CAM',
      category: 'Viewport',
      icon: <Box className="w-4 h-4 text-blue-600" />,
      action: () => setPlateTextureStyle('engineering-slate'),
    },
    {
      id: 'opt',
      title: 'Optimize Toolpath with 2-Opt TSP',
      category: 'CAM Engine',
      icon: <Zap className="w-4 h-4 text-blue-600" />,
      action: () => triggerOptimization(),
    },
    {
      id: 'autofit',
      title: 'Auto-Fit & Center Layers on Printable Bed',
      category: 'Layout',
      icon: <Maximize className="w-4 h-4 text-emerald-600" />,
      action: () => {
        for (const el of elements) autoFitElementToPrintableArea(el.id);
      },
    },
    {
      id: 'export-gcode',
      title: 'Export Collision-Safe .gcode File',
      category: 'Export',
      icon: <Download className="w-4 h-4 text-[#EA580C]" />,
      action: () => {
        if (!validationResult.isValid) return;
        const blob = new Blob([generatedGcode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeTime = Math.round(optimizationStats.estimatedTimeSeconds);
        a.href = url;
        a.download = `plot_${preset.id}_${pens.length}pen_${safeTime}s.gcode`;
        a.click();
        URL.revokeObjectURL(url);
      },
    },
    {
      id: 'share-card',
      title: 'Generate Viral Plot Showcase Card',
      category: 'Social',
      icon: <Share2 className="w-4 h-4 text-purple-600" />,
      action: () => setShareCardOpen(true),
    },
    {
      id: 'toggle-3d',
      title: 'Toggle 2.5D Isometric Perspective',
      category: 'Viewport',
      icon: <Box className="w-4 h-4 text-blue-600" />,
      action: () => togglePerspective3D(),
    },
    {
      id: 'gcode-drawer',
      title: 'Open G-Code Line Inspector',
      category: 'Tools',
      icon: <FileCode className="w-4 h-4 text-slate-600" />,
      action: () => setGcodeDrawerOpen(true),
    },
    {
      id: 'toggle-audio',
      title: 'Toggle ASMR Stepper Motor Sound Synthesis',
      category: 'Acoustics',
      icon: <Volume2 className="w-4 h-4 text-amber-600" />,
      action: () => plotterAudio.toggleMute(),
    },
    {
      id: 'makerworld-models',
      title: 'MakerWorld 3D Pen Mounts & CAD Models (@kumawat007)',
      category: 'Hardware & Community',
      icon: <Box className="w-4 h-4 text-blue-600" />,
      action: () => window.open('https://makerworld.com/en/@kumawat007', '_blank'),
    },
    {
      id: 'buy-me-a-coffee',
      title: 'Buy Me a Coffee (@kumawat007) - Support PlotForge',
      category: 'Hardware & Community',
      icon: <Coffee className="w-4 h-4 text-amber-600" />,
      action: () => window.open('https://buymeacoffee.com/kumawat007', '_blank'),
    },
    // Presets
    ...BUILTIN_PRESETS.map((p) => ({
      id: `preset-${p.id}`,
      title: `Switch Machine to ${p.name}`,
      category: 'Machine Presets',
      icon: <Command className="w-4 h-4 text-slate-500" />,
      action: () => setPreset(p),
    })),
    // Curated Vectors
    ...Object.entries(CURATED_VECTORS).map(([name, data]) => ({
      id: `vector-${name}`,
      title: `Load Curated Vector: ${name}`,
      category: 'Vector Library',
      icon: <Sparkles className="w-4 h-4 text-blue-600" />,
      action: () => {
        const parsed = parseSVG(data.svg, `svg_${Date.now()}`, pens[0]?.id || 'pen-1', 0.05);
        if (parsed.polylines.length > 0) {
          const centerX = (preset.minSafeX + preset.maxSafeX) / 2 + preset.penOffsetX;
          const centerY = (preset.minSafeY + preset.maxSafeY) / 2 + preset.penOffsetY;
          addElement({
            id: `elem_${Date.now()}`,
            name,
            type: 'svg',
            x: centerX - parsed.viewBox.width / 2,
            y: centerY - parsed.viewBox.height / 2,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            penId: pens[0]?.id || 'pen-1',
            visible: true,
            svgContent: data.svg,
            rawPolylines: parsed.polylines,
          });
        }
      },
    })),
  ];

  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const handleSelect = (cmd: CommandItem) => {
    cmd.action();
    setCommandPaletteOpen(false);
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 select-none animate-in fade-in duration-200 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.16)] overflow-hidden flex flex-col max-h-[500px]"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search action (e.g. Optimize, Auto-Fit, Bambu, Mandala)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleListKeyDown}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Results */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSel = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                    isSel
                      ? 'bg-blue-50 text-blue-900 border border-blue-200 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      {cmd.icon}
                    </div>
                    <span className="font-semibold text-xs">{cmd.title}</span>
                  </div>

                  <span className="text-[10px] uppercase font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Use ↑↓ to navigate</span>
            <span>•</span>
            <span>Enter to select</span>
          </div>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
