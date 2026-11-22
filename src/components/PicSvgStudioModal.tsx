'use client';

import React from 'react';
import {
  X,
  Download,
  Plus,
  Sliders,
  Sparkles,
  Layers,
  Palette,
  Check,
  RefreshCw,
  FileImage,
} from 'lucide-react';
import {
  PicSvgFilter,
  PicSvgDetails,
  PICSVG_FILTERS,
  PICSVG_DETAILS,
  VectorizeResult,
} from '@/lib/image/imageVectorizer';
import { PenSlot } from '@/types/plotter';

interface PicSvgStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  importedImage: {
    file: File;
    imageData: ImageData;
    previewUrl: string;
    name: string;
  } | null;
  picFilter: PicSvgFilter;
  setPicFilter: (filter: PicSvgFilter) => void;
  picDetails: PicSvgDetails;
  setPicDetails: (details: PicSvgDetails) => void;
  vectorContrast: number;
  setVectorContrast: (contrast: number) => void;
  vectorInvert: boolean;
  setVectorInvert: (invert: boolean) => void;
  vectorTargetWidthMm: number;
  setVectorTargetWidthMm: (w: number) => void;
  enableInfill: boolean;
  setEnableInfill: (enable: boolean) => void;
  infillSpacingMm: number;
  setInfillSpacingMm: (spacing: number) => void;
  selectedPenId: string;
  setSelectedPenId: (id: string) => void;
  vectorResult: VectorizeResult | null;
  isVectorizing: boolean;
  onAddToCanvas: () => void;
  onDownloadSvg: () => void;
  pens: PenSlot[];
}

export const PicSvgStudioModal: React.FC<PicSvgStudioModalProps> = ({
  isOpen,
  onClose,
  importedImage,
  picFilter,
  setPicFilter,
  picDetails,
  setPicDetails,
  vectorContrast,
  setVectorContrast,
  vectorInvert,
  setVectorInvert,
  vectorTargetWidthMm,
  setVectorTargetWidthMm,
  enableInfill,
  setEnableInfill,
  infillSpacingMm,
  setInfillSpacingMm,
  selectedPenId,
  setSelectedPenId,
  vectorResult,
  isVectorizing,
  onAddToCanvas,
  onDownloadSvg,
  pens,
}) => {
  if (!isOpen || !importedImage) return null;

  const activePen = pens.find((p) => p.id === selectedPenId) || pens[0] || {
    id: 'pen-1',
    name: '0.4mm Fineliner Black',
    colorHex: '#000000',
    tipWidthMm: 0.4,
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[92vh] max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/90 font-sans">
        
        {/* TOP TOOLBAR: PicSVG Controls matching https://picsvg.com */}
        <div className="bg-slate-50/95 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          
          {/* Brand & File Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileImage className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                  PicSVG Studio
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shrink-0">
                  1:1 Solid Vector
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[160px] sm:max-w-[240px]">
                {importedImage.name}
              </p>
            </div>
          </div>

          {/* Controls Bar: Details [ Strong v ] | Filters [ Smooth 1 v ] | [ ■ ] Color Swatch */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 bg-white px-2.5 py-1 rounded-2xl border border-slate-200/90 shadow-2xs">
            
            {/* Details Dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-600 font-mono">
                Details
              </label>
              <select
                value={picDetails}
                onChange={(e) => setPicDetails(e.target.value as PicSvgDetails)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {PICSVG_DETAILS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Filters Dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-600 font-mono">
                Filters
              </label>
              <select
                value={picFilter}
                onChange={(e) => setPicFilter(e.target.value as PicSvgFilter)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <optgroup label="Inkscape & Potrace Vectorizer">
                  <option value="Inkscape (High Quality)">✨ Inkscape (High Quality Smooth Bezier)</option>
                </optgroup>
                <optgroup label="Solid Curves & Logos (Recommended)">
                  <option value="Smooth 1">Smooth 1 (Organic Plotter Curves)</option>
                  <option value="Smooth 2">Smooth 2 (Minimalist Flowing)</option>
                  <option value="Clean 1">Clean 1 (Otsu Logo & Icons)</option>
                  <option value="Sharp 1">Sharp 1 (Crisp Corners)</option>
                  <option value="Detail 1">Detail 1 (Micro-details)</option>
                  <option value="Artistic 1">Artistic 1 (Multi-Band Posterized)</option>
                </optgroup>
                <optgroup label="Internal Adaptive Features">
                  <option value="Internal 1">Internal 1 (Fine Radius 6)</option>
                  <option value="Internal 2">Internal 2 (Medium Radius 12)</option>
                  <option value="Internal 3">Internal 3 (Broad Radius 20)</option>
                  <option value="Internal 4">Internal 4 (High Emphasis)</option>
                  <option value="Internal 5">Internal 5 (Dual-Scale)</option>
                </optgroup>
                <optgroup label="Contour Outlines">
                  <option value="Edge 1">Edge 1 (Fine Contours)</option>
                  <option value="Edge 2">Edge 2 (Standard Contours)</option>
                  <option value="Edge 3">Edge 3 (Difference of Gaussians)</option>
                  <option value="Edge 4">Edge 4 (Bold Outlines)</option>
                  <option value="Edge 5">Edge 5 (Hysteresis Connected)</option>
                  <option value="Edge 6">Edge 6 (Laplacian Contours)</option>
                  <option value="Artistic 2">Artistic 2 (Etched Cross-Hatch)</option>
                </optgroup>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Color Swatch Square matching PicSVG */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                title={`Pen Color: ${activePen.name}. Click to cycle pen slot.`}
                onClick={() => {
                  const idx = pens.findIndex((p) => p.id === selectedPenId);
                  const nextIdx = (idx + 1) % pens.length;
                  setSelectedPenId(pens[nextIdx]?.id || 'pen-1');
                }}
                className="w-6 h-6 rounded-md border-2 border-slate-700 shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: activePen.colorHex }}
              />
            </div>

            <div className="h-4 w-px bg-slate-200 hidden md:block" />

            {/* Target Width Input */}
            <div className="hidden md:flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-600 font-mono">
                Width
              </label>
              <input
                type="number"
                min="20"
                max="256"
                step="5"
                value={vectorTargetWidthMm}
                onChange={(e) => setVectorTargetWidthMm(Math.max(20, Math.min(256, Number(e.target.value) || 120)))}
                className="w-14 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-1.5 py-0.5 font-mono font-bold text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 font-mono font-bold">mm</span>
            </div>

            {/* Invert Tone Checkbox */}
            <label className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={vectorInvert}
                onChange={(e) => setVectorInvert(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Invert</span>
            </label>

            {/* Pen Infill Hatch Toggle */}
            <label className="hidden xl:flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer select-none" title="Color in solid shapes with pen hatching lines">
              <input
                type="checkbox"
                checked={enableInfill}
                onChange={(e) => setEnableInfill(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Pen Infill</span>
            </label>
          </div>

          {/* Action Buttons: Download SVG & Add to Plotter Canvas */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownloadSvg}
              disabled={!vectorResult || isVectorizing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#48a54d] hover:bg-[#3d9142] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SVG</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onAddToCanvas();
                onClose();
              }}
              disabled={!vectorResult || isVectorizing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add to Canvas</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors ml-1"
              title="Close PicSVG Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: SIDE-BY-SIDE DUAL VIEW MATCHING https://picsvg.com */}
        <div className="flex-1 min-h-0 p-3 sm:p-5 bg-slate-100/70 overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 max-w-5xl mx-auto w-full h-full items-stretch">
            
            {/* LEFT CONTAINER: ORIGINAL RESIZED */}
            <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-300/80 shadow-xs overflow-hidden">
              <div
                className="flex-1 min-h-0 w-full h-full flex items-center justify-center p-3 relative overflow-hidden"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #ffffff 10px, #ffffff 20px)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={importedImage.previewUrl}
                  alt="Original Resized"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm bg-white"
                />
              </div>

              {/* Bottom Green Footer Bar matching PicSVG */}
              <div className="shrink-0 bg-[#48a54d] text-white py-2 px-4 text-center font-sans font-bold text-xs uppercase tracking-wider select-none shadow-inner flex items-center justify-center gap-2">
                <span>ORIGINAL RESIZED</span>
                <span className="text-[10px] font-mono opacity-80">
                  ({importedImage.imageData.width} × {importedImage.imageData.height} px)
                </span>
              </div>
            </div>

            {/* RIGHT CONTAINER: DOWNLOAD SVG (LIVE CONVERTED SOLID VECTOR) */}
            <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-300/80 shadow-xs overflow-hidden">
              <div
                className="flex-1 min-h-0 w-full h-full flex items-center justify-center p-3 relative overflow-hidden"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 10px, #ffffff 10px, #ffffff 20px)',
                }}
              >
                {isVectorizing ? (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-xs font-mono font-semibold">
                      Vectorizing with Potrace algorithm...
                    </span>
                  </div>
                ) : vectorResult ? (
                  <div
                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain"
                    dangerouslySetInnerHTML={{ __html: vectorResult.svgString }}
                  />
                ) : (
                  <div className="text-xs font-mono text-slate-400">
                    No vector generated yet
                  </div>
                )}
              </div>

              {/* Bottom Green Footer Bar matching PicSVG */}
              <button
                type="button"
                onClick={onDownloadSvg}
                disabled={!vectorResult || isVectorizing}
                className="shrink-0 bg-[#48a54d] hover:bg-[#3d9142] text-white py-2 px-4 text-center font-sans font-bold text-xs uppercase tracking-wider select-none transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-inner active:brightness-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD SVG</span>
                {vectorResult && (
                  <span className="text-[10px] font-mono opacity-80 normal-case">
                    ({vectorResult.polylines.length} loops • {vectorResult.widthMm} × {vectorResult.heightMm} mm)
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM METADATA BAR */}
        <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-4">
            <span>
              Status:{' '}
              <strong className="text-slate-900 font-sans">
                {vectorResult ? (vectorResult.isSolidFill ? 'Solid Vector (fill-rule=evenodd)' : 'Contour Vector') : 'Idle'}
              </strong>
            </span>
            {vectorResult && (
              <>
                <span>
                  Loops:{' '}
                  <strong className="text-blue-600 font-bold">
                    {vectorResult.polylines.length}
                  </strong>
                </span>
                <span>
                  Travel:{' '}
                  <strong className="text-slate-900 font-bold">
                    {vectorResult.totalLengthMm} mm
                  </strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ready for Bambu Lab A1 & A1 Mini Plotter</span>
          </div>
        </div>

      </div>
    </div>
  );
};
