'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FontFamilyId } from '@/types/plotter';
import {
  LocalFontItem,
  SystemFontData,
  querySystemFonts,
  loadSystemFont,
  loadFontFromFile,
  isLocalFontAccessSupported,
} from '@/lib/fonts/localFontManager';
import { renderSingleStrokeText } from '@/lib/fonts/textEngine';
import { Check, ChevronDown, FolderOpen, Laptop, Search, Loader2 } from 'lucide-react';

export interface BuiltinFont {
  id: FontFamilyId;
  name: string;
}

const BUILTIN_FONTS: BuiltinFont[] = [
  { id: 'hershey-soft-round', name: 'Modern Soft Rounded' },
  { id: 'hershey-simplex', name: 'Technical Sans' },
  { id: 'hershey-drafting', name: 'Architect CAD' },
  { id: 'hershey-serif', name: 'Roman Serif' },
  { id: 'hershey-italic', name: 'Executive Italic' },
  { id: 'hershey-script', name: 'Hershey Script' },
];

/**
 * Renders font name itself as single-stroke plotter vector curves
 */
const HersheyNameSvg: React.FC<{ fontId: FontFamilyId; name: string }> = ({ fontId, name }) => {
  const { pathData, viewBox, w } = useMemo(() => {
    try {
      const polylines = renderSingleStrokeText(name, {
        fontSizeMm: 7,
        fontFamily: fontId,
        origin: { x: 0, y: 0 },
      });
      if (polylines.length === 0) return { pathData: '', viewBox: '0 0 100 20', w: 100 };

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const p of polylines) {
        for (const pt of p.points) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
      }
      const width = Math.max(10, maxX - minX);
      const height = Math.max(8, maxY - minY);
      const d = polylines
        .map(
          (p) =>
            `M ${p.points.map((pt) => `${pt.x - minX},${-(pt.y - maxY)}`).join(' L ')}`
        )
        .join(' ');

      return {
        pathData: d,
        viewBox: `0 0 ${Math.ceil(width + 2)} ${Math.ceil(height + 2)}`,
        w: width,
      };
    } catch {
      return { pathData: '', viewBox: '0 0 100 20', w: 100 };
    }
  }, [fontId, name]);

  if (!pathData) {
    return <span className="text-xs font-semibold">{name}</span>;
  }

  return (
    <svg
      viewBox={viewBox}
      className="h-4 overflow-visible shrink-0 text-slate-800"
      style={{ width: `${Math.min(160, Math.max(50, w * 2.8))}px` }}
      preserveAspectRatio="xMinYMid meet"
    >
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface FontPickerProps {
  value: FontFamilyId;
  onChange: (fontId: FontFamilyId) => void;
  loadedLocalFonts?: LocalFontItem[];
  onFontLoaded?: (font: LocalFontItem) => void;
}

export const FontPicker: React.FC<FontPickerProps> = ({
  value,
  onChange,
  loadedLocalFonts = [],
  onFontLoaded,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLocalFonts, setShowLocalFonts] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [systemFontsList, setSystemFontsList] = useState<SystemFontData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preference from localStorage
  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('plotforge_show_local_fonts') === 'true';
    if (saved) {
      setShowLocalFonts(true);
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggleLocalFonts = async (checked: boolean) => {
    setShowLocalFonts(checked);
    setScanError(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('plotforge_show_local_fonts', checked ? 'true' : 'false');
    }
    if (checked) {
      if (!isLocalFontAccessSupported()) {
        setScanError('Direct browser font scanning requires Chrome or Edge. Use "+ Load Font File" below to pick any font from C:\\Windows\\Fonts!');
        return;
      }
      if (systemFontsList.length === 0) {
        setIsScanning(true);
        try {
          const fonts = await querySystemFonts();
          setSystemFontsList(fonts);
          if (fonts.length === 0) {
            setScanError('No fonts returned. Please ensure you choose "Allow" in the browser font access prompt.');
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (msg.includes('NotAllowedError') || msg.includes('Permission') || msg.includes('denied')) {
            setScanError('Font access was blocked by browser. Allow font access in your address bar icon, or click "+ Load Font File" below.');
          } else {
            setScanError('Direct scan unavailable: ' + (err?.message || 'Use "+ Load Font File" below to load any font!'));
          }
        } finally {
          setIsScanning(false);
        }
      }
    }
  };

  const handleSelectSystemFont = async (fontData: SystemFontData) => {
    setIsScanning(true);
    try {
      const loaded = await loadSystemFont(fontData);
      if (onFontLoaded) onFontLoaded(loaded);
      onChange(loaded.id);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await loadFontFromFile(file);
      if (onFontLoaded) onFontLoaded(loaded);
      onChange(loaded.id);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to load font file.');
    }
    e.target.value = '';
  };

  // Unique system font families
  const uniqueSystemFamilies = useMemo(() => {
    const map = new Map<string, SystemFontData>();
    for (const f of systemFontsList) {
      if (!map.has(f.family)) {
        map.set(f.family, f);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.family.localeCompare(b.family));
  }, [systemFontsList]);

  // Find currently active font name
  const currentFontDisplayName = useMemo(() => {
    const b = BUILTIN_FONTS.find((f) => f.id === value);
    if (b) return b.name;
    const l = loadedLocalFonts.find((f) => f.id === value);
    if (l) return l.name;
    return value;
  }, [value, loadedLocalFonts]);

  const isBuiltin = BUILTIN_FONTS.some((f) => f.id === value);

  return (
    <div className="relative w-full select-none" ref={containerRef}>
      {/* Sleek Single-Row Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 bg-slate-50/90 hover:bg-white border border-slate-200/90 hover:border-blue-400 rounded-xl px-3 transition-all shadow-xs flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-blue-500/15"
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          {isBuiltin ? (
            <HersheyNameSvg fontId={value} name={currentFontDisplayName} />
          ) : (
            <span
              className="text-xs font-semibold text-slate-800 truncate"
              style={{ fontFamily: currentFontDisplayName }}
            >
              {currentFontDisplayName}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Clean Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200/90 rounded-2xl shadow-[0_12px_32px_rgba(15,23,42,0.12)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Top Bar: Search + Single Local Fonts Checkbox + File Browse */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search font..."
                className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded-lg pl-6 pr-2 py-1 focus:border-blue-500 focus:outline-none font-sans"
                autoFocus
              />
            </div>

            {/* Single Local Fonts Checkbox */}
            <label
              className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-slate-100/80 border border-slate-200/80 rounded-lg cursor-pointer text-[10px] font-bold text-slate-700 transition shrink-0 select-none"
              title="Toggle PC system fonts"
            >
              <input
                type="checkbox"
                checked={showLocalFonts}
                onChange={(e) => handleToggleLocalFonts(e.target.checked)}
                className="w-3 h-3 rounded text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span>PC Fonts</span>
            </label>

            {/* Optional File Browse Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 rounded-lg transition shrink-0"
              title="Load custom .ttf/.otf file from computer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* All Fonts in Same Menu */}
          <div className="max-h-[260px] overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-100/60 font-sans">
            {/* Built-in Single Stroke Fonts */}
            <div className="space-y-0.5 pb-1">
              {BUILTIN_FONTS.filter((f) =>
                searchQuery ? f.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
              ).map((f) => {
                const isSelected = f.id === value;
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      onChange(f.id);
                      setIsOpen(false);
                    }}
                    className={`h-9 px-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <HersheyNameSvg fontId={f.id} name={f.name} />
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Loaded Files / System Fonts (In the Same Menu) */}
            {showLocalFonts && (
              <div className="pt-1 space-y-0.5">
                <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>PC System Fonts</span>
                  {isScanning && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                </div>

                {/* Previously Loaded Fonts */}
                {loadedLocalFonts.map((f) => {
                  const isSelected = f.id === value;
                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        onChange(f.id);
                        setIsOpen(false);
                      }}
                      className={`h-8 px-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span
                        className="text-xs truncate font-medium"
                        style={{ fontFamily: f.family }}
                      >
                        {f.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </div>
                  );
                })}

                {/* Discovered System Fonts */}
                {uniqueSystemFamilies
                  .filter((f) =>
                    searchQuery ? f.family.toLowerCase().includes(searchQuery.toLowerCase()) : true
                  )
                  .map((f) => {
                    return (
                      <div
                        key={f.family}
                        onClick={() => handleSelectSystemFont(f)}
                        className="h-8 px-2.5 rounded-xl cursor-pointer flex items-center justify-between hover:bg-slate-50 text-slate-800 transition-colors"
                      >
                        <span
                          className="text-xs truncate font-medium"
                          style={{ fontFamily: f.family }}
                        >
                          {f.family}
                        </span>
                      </div>
                    );
                  })}

                {scanError && (
                  <div className="p-2.5 mx-1 my-1.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-[11px] text-amber-800 leading-snug">
                    <p className="font-semibold mb-0.5">⚠️ PC Font Status:</p>
                    <p>{scanError}</p>
                  </div>
                )}

                {uniqueSystemFamilies.length === 0 && !isScanning && !scanError && (
                  <div className="px-2 py-2 text-[10px] text-slate-400 text-center italic">
                    Click PC Fonts checkbox to scan or load a .ttf file below
                  </div>
                )}

                {/* Prominent Direct File Loader */}
                <div className="p-2 pt-1.5 border-t border-slate-100 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/90 text-blue-700 rounded-xl text-xs font-semibold transition active:scale-98 cursor-pointer shadow-2xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>+ Load Font File (.ttf, .otf, .woff)</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Windows PC fonts are in <code className="bg-white px-1 py-0.5 rounded text-slate-600 font-mono border border-slate-200">C:\Windows\Fonts</code>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
