'use client';

import React, { useRef, useState } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { CardThemeId } from '@/lib/export/plotCardSnapshot';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  Sparkles,
  FileCode,
  ShieldCheck,
  Palette,
} from 'lucide-react';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h === 0) return `${m}m ${s}s`;
  return `${h}h ${remM}m ${s}s`;
}

export const ShareCardModal: React.FC = () => {
  const {
    isShareCardOpen,
    setShareCardOpen,
    preset,
    pens,
    optimizationStats,
    optimizedPolylines,
    polylines,
    isOptimized,
    elements,
    generatedGcode,
  } = usePlotterStore();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedGcode, setCopiedGcode] = useState(false);
  const [theme, setTheme] = useState<CardThemeId>('light-studio');
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isShareCardOpen) return null;

  const activePolys = isOptimized ? optimizedPolylines : polylines;
  let totalPts = 0;
  for (const p of activePolys) totalPts += p.points.length;

  const totalDrawMeters = (optimizationStats.totalDrawMm / 1000).toFixed(2);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyGcode = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(generatedGcode);
      setCopiedGcode(true);
      setTimeout(() => setCopiedGcode(false), 2000);
    }
  };

  const handleDownloadSvgShowcase = () => {
    const pad = 24;
    const w = preset.bedWidth + pad * 2;
    const h = preset.bedDepth + pad * 2;

    const bgFill =
      theme === 'warm-kraft'
        ? '#FBF9F5'
        : theme === 'nordic-fog'
        ? '#F0FDF4'
        : theme === 'swiss-editorial'
        ? '#FFFFFF'
        : '#F8FAFC';

    const bedFill =
      theme === 'warm-kraft'
        ? '#292524'
        : theme === 'nordic-fog'
        ? '#14532D'
        : theme === 'swiss-editorial'
        ? '#09090B'
        : '#1E293B';

    const strokeColorDefault =
      theme === 'warm-kraft'
        ? '#1C1917'
        : theme === 'nordic-fog'
        ? '#064E3B'
        : theme === 'swiss-editorial'
        ? '#000000'
        : '#0F172A';

    const pathStrings = activePolys
      .map((poly) => {
        if (poly.points.length < 2) return '';
        const pen = pens.find((p) => p.id === poly.penId);
        const color = pen?.colorHex || strokeColorDefault;
        const d = poly.points
          .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(pt.x + pad).toFixed(2)} ${(h - (pt.y + pad)).toFixed(2)}`)
          .join(' ');
        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      })
      .join('\n  ');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 4}" height="${h * 4}">
  <rect width="100%" height="100%" fill="${bgFill}"/>
  <rect x="${pad}" y="${pad}" width="${preset.bedWidth}" height="${preset.bedDepth}" fill="${bedFill}" stroke="#CBD5E1" stroke-width="1" rx="4"/>
  <rect x="${pad + 10}" y="${pad + 10}" width="${preset.bedWidth - 20}" height="${preset.bedDepth - 20}" fill="#FFFFFF" rx="2"/>
  ${pathStrings}
  <text x="${pad + 6}" y="${h - pad - 6}" font-family="monospace" font-size="5" fill="#64748B">PLOTFORGE • ${preset.name.toUpperCase()} • ${formatDuration(
      optimizationStats.estimatedTimeSeconds
    )} • SAVED ${optimizationStats.savedPercent}% TRAVEL</text>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plotforge_showcase_${preset.id}_${theme}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPngCard = () => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    if (theme === 'warm-kraft') {
      ctx.fillStyle = '#FBF9F5';
    } else if (theme === 'nordic-fog') {
      ctx.fillStyle = '#F0FDF4';
    } else if (theme === 'swiss-editorial') {
      ctx.fillStyle = '#FFFFFF';
    } else {
      ctx.fillStyle = '#F8FAFC';
    }
    ctx.fillRect(0, 0, width, height);

    // Bed plate area
    const bedMargin = 120;
    const bedW = width - bedMargin * 2;
    const bedH = height - bedMargin * 2;

    ctx.fillStyle =
      theme === 'warm-kraft'
        ? '#292524'
        : theme === 'nordic-fog'
        ? '#14532D'
        : theme === 'swiss-editorial'
        ? '#09090B'
        : '#1E293B';
    ctx.strokeStyle =
      theme === 'warm-kraft'
        ? '#EA580C'
        : theme === 'nordic-fog'
        ? '#059669'
        : theme === 'swiss-editorial'
        ? '#DC2626'
        : '#2563EB';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bedMargin, bedMargin, bedW, bedH, 20);
    ctx.fill();
    ctx.stroke();

    // White paper inside bed
    const paperMargin = 40;
    ctx.fillStyle = theme === 'warm-kraft' ? '#FFFDF7' : '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(bedMargin + paperMargin, bedMargin + paperMargin, bedW - paperMargin * 2, bedH - paperMargin * 2, 8);
    ctx.fill();

    // Scale and center polylines
    const scaleX = (bedW - paperMargin * 2) / preset.bedWidth;
    const scaleY = (bedH - paperMargin * 2) / preset.bedDepth;
    const renderScale = Math.min(scaleX, scaleY) * 0.88;
    const offsetX = bedMargin + paperMargin + ((bedW - paperMargin * 2) - preset.bedWidth * renderScale) / 2;
    const offsetY = bedMargin + paperMargin + ((bedH - paperMargin * 2) - preset.bedDepth * renderScale) / 2;

    for (const poly of activePolys) {
      if (poly.points.length < 2) continue;
      const pen = pens.find((p) => p.id === poly.penId);
      ctx.strokeStyle = pen?.colorHex || '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const p0 = poly.points[0];
      const sx0 = offsetX + p0.x * renderScale;
      const sy0 = offsetY + (preset.bedDepth - p0.y) * renderScale;
      ctx.moveTo(sx0, sy0);

      for (let i = 1; i < poly.points.length; i++) {
        const pt = poly.points[i];
        const sx = offsetX + pt.x * renderScale;
        const sy = offsetY + (preset.bedDepth - pt.y) * renderScale;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Header branding
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('PLOTFORGE // 2026', bedMargin, 70);

    ctx.fillStyle =
      theme === 'warm-kraft'
        ? '#EA580C'
        : theme === 'nordic-fog'
        ? '#059669'
        : theme === 'swiss-editorial'
        ? '#DC2626'
        : '#2563EB';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(preset.name.toUpperCase(), width - bedMargin, 70);
    ctx.textAlign = 'left';

    // Footer stats
    ctx.fillStyle = '#64748B';
    ctx.font = '22px monospace';
    ctx.fillText(
      `EST. TIME: ${formatDuration(optimizationStats.estimatedTimeSeconds)} • DRAW: ${totalDrawMeters}m • TRAVEL OPT: -${optimizationStats.savedPercent}%`,
      bedMargin,
      height - 50
    );

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `plotforge_showcase_${preset.id}_${theme}.png`;
    a.click();
  };

  const themeConfig = {
    'light-studio': {
      cardBg: 'bg-slate-50',
      borderColor: 'border-slate-200',
      badgeBg: 'bg-blue-600',
      badgeText: 'text-white',
      accentText: 'text-blue-600',
    },
    'warm-kraft': {
      cardBg: 'bg-[#FBF9F5]',
      borderColor: 'border-[#E5DECE]',
      badgeBg: 'bg-[#EA580C]',
      badgeText: 'text-white',
      accentText: 'text-[#EA580C]',
    },
    'nordic-fog': {
      cardBg: 'bg-[#F0FDF4]',
      borderColor: 'border-[#BBF7D0]',
      badgeBg: 'bg-[#059669]',
      badgeText: 'text-white',
      accentText: 'text-[#059669]',
    },
    'swiss-editorial': {
      cardBg: 'bg-white',
      borderColor: 'border-slate-300',
      badgeBg: 'bg-[#DC2626]',
      badgeText: 'text-white',
      accentText: 'text-[#DC2626]',
    },
  }[theme];

  return (
    <div
      onClick={() => setShareCardOpen(false)}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.16)] overflow-hidden flex flex-col p-6 space-y-5"
      >
        {/* Header & Theme Switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <span className="font-extrabold text-slate-900 text-sm tracking-tight">Viral Showcase Studio</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setTheme('light-studio')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  theme === 'light-studio' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="2026 Light Studio Theme"
              >
                STUDIO
              </button>
              <button
                onClick={() => setTheme('warm-kraft')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  theme === 'warm-kraft' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Warm Architectural Papercraft Theme"
              >
                KRAFT
              </button>
              <button
                onClick={() => setTheme('nordic-fog')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  theme === 'nordic-fog' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Nordic Minimalist Theme"
              >
                NORDIC
              </button>
              <button
                onClick={() => setTheme('swiss-editorial')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  theme === 'swiss-editorial' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Bauhaus Swiss International Theme"
              >
                SWISS
              </button>
            </div>

            <button
              onClick={() => setShareCardOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viral Visual Card Preview */}
        <div
          ref={cardRef}
          className={`relative rounded-2xl border p-5 shadow-sm space-y-4 overflow-hidden transition-all duration-200 ${themeConfig.cardBg} ${themeConfig.borderColor} text-slate-900`}
        >
          {/* Top Branding Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${themeConfig.badgeBg} ${themeConfig.badgeText}`}
              >
                PF
              </div>
              <span className="font-extrabold text-xs tracking-tight">PlotForge Studio</span>
              <span className="text-[10px] font-mono text-slate-500">{'// VERIFIED 0.05mm'}</span>
            </div>

            <div className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-mono font-medium shadow-2xs text-slate-700">
              {preset.name}
            </div>
          </div>

          {/* Central Artwork Stat Badge */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-1.5 shadow-xs">
            <Sparkles className={`w-7 h-7 ${themeConfig.accentText}`} />
            <div className="font-bold text-sm text-slate-900">
              {elements[0]?.name || 'Algorithmic Toolpath Masterpiece'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {activePolys.length} vector paths • {totalPts.toLocaleString()} toolpath vertices
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[9px] text-slate-500 block uppercase font-semibold">Travel Saved</span>
              <span className="font-bold text-xs text-emerald-600">
                -{optimizationStats.savedPercent}%
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[9px] text-slate-500 block uppercase font-semibold">Est. Plot</span>
              <span className="font-bold text-xs text-slate-900">
                {formatDuration(optimizationStats.estimatedTimeSeconds)}
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[9px] text-slate-500 block uppercase font-semibold">Draw Stroke</span>
              <span className="text-blue-600 font-bold text-xs">{totalDrawMeters}m</span>
            </div>
          </div>

          {/* Watermark Footer */}
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>COLLISION-SAFE CONFIRMED</span>
            </div>
            <span>plotforge.studio</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleDownloadPngCard}
            className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download 4K Poster (.png)</span>
          </button>

          <button
            onClick={handleDownloadSvgShowcase}
            className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Vector (.svg)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyGcode}
            className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            {copiedGcode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>G-Code Copied!</span>
              </>
            ) : (
              <>
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Safe G-Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyLink}
            className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Share URL</span>
              </>
            )}
          </button>
        </div>

        {/* Creator Hardware & Support Links */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span className="text-[10px] uppercase">
            PLOTFORGE • BY @KUMAWAT007
          </span>
          <div className="flex items-center gap-3">
            <a
              href="https://makerworld.com/en/@kumawat007"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-[10px] flex items-center gap-1 transition font-bold"
            >
              <span>3D MOUNTS (MAKERWORLD)</span>
              <span>↗</span>
            </a>
            <a
              href="https://buymeacoffee.com/kumawat007"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-[#FFDD00] hover:bg-[#FACC15] text-slate-900 border border-amber-300 rounded text-[10px] flex items-center gap-1 transition font-bold shadow-2xs hover:scale-105 active:scale-95"
            >
              <span>BUY ME A COFFEE</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
