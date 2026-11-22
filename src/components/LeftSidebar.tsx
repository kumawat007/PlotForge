'use client';

import React, { useState, useRef } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { parseSVG } from '@/lib/svg/svgParser';
import { CURATED_VECTORS } from '@/lib/svg/vectorLibrary';
import { DesignElement, PenSlot, FontFamilyId } from '@/types/plotter';
import { LocalFontItem, getRegisteredLocalFonts } from '@/lib/fonts/localFontManager';
import { FontPicker } from '@/components/common/FontPicker';
import {
  PicSvgFilter,
  PicSvgDetails,
  PICSVG_FILTERS,
  PICSVG_DETAILS,
  vectorizeImageData,
  processImageFileToImageData,
  VectorizeResult,
} from '@/lib/image/imageVectorizer';
import { PicSvgStudioModal } from '@/components/PicSvgStudioModal';
import {
  Type,
  Upload,
  Sparkles,
  Palette,
  Plus,
  Trash2,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Coffee,
  Box,
  ExternalLink,
  Image as ImageIcon,
  X,
  Download,
  Maximize2,
  Pencil,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Sliders,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Check,
  Settings2,
  Layers,
  Star,
  Lock,
  Unlock,
} from 'lucide-react';
import { DrawTabPanel } from '@/components/DrawTabPanel';

const CURATED_PLOTTER_COLORS = [
  { name: 'Pitch Black', hex: '#0f172a' },
  { name: 'Dark Slate', hex: '#334155' },
  { name: 'Cobalt Navy', hex: '#1d4ed8' },
  { name: 'Sky Cyan', hex: '#0284c7' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Coral Orange', hex: '#ea580c' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Forest Green', hex: '#15803d' },
  { name: 'Royal Purple', hex: '#7c3aed' },
  { name: 'Fuchsia Pink', hex: '#db2777' },
  { name: 'Silver Gray', hex: '#94a3b8' },
];

const STROKE_WIDTH_OPTIONS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 1.0, 1.5];

const PEN_PRESETS = [
  { label: '⚙️ Custom Profile', type: 'custom' as const, stroke: 0.4, speed: 45, dwell: 0 },
  { label: '🖊️ 0.2mm Fineliner (Technical)', type: 'fineliner' as const, stroke: 0.2, speed: 60, dwell: 0 },
  { label: '🖋️ 0.4mm Gel Pen (Sakura Gelly)', type: 'gel' as const, stroke: 0.4, speed: 45, dwell: 40 },
  { label: '🖊️ 0.5mm Standard Ballpoint (Bic)', type: 'ballpoint' as const, stroke: 0.5, speed: 50, dwell: 0 },
  { label: '✒️ 0.5mm Liquid Rollerball', type: 'rollerball' as const, stroke: 0.5, speed: 40, dwell: 60 },
  { label: '🖍️ 0.7mm Sharpie / Felt Marker', type: 'marker' as const, stroke: 0.7, speed: 35, dwell: 25 },
  { label: '🖌️ 1.0mm Calligraphy / Chisel', type: 'calligraphy' as const, stroke: 1.0, speed: 25, dwell: 80 },
  { label: '✏️ 0.3mm Drafting Pencil', type: 'pencil' as const, stroke: 0.3, speed: 45, dwell: 0 },
];

export const LeftSidebar: React.FC = () => {
  const {
    elements,
    addElement,
    addAlgorithmicArt,
    updateElement,
    removeElement,
    selectElement,
    centerElementOnPrintableArea,
    nudgeElement,
    toggleLockElement,
    selectedElementId,
    pens,
    activePenId,
    setActivePenId,
    addPen,
    updatePen,
    removePen,
    reorderPens,
    assignElementPen,
    preset,
    paperPreset,
  } = usePlotterStore();

  const [activeTab, setActiveTab] = useState<'text' | 'svg' | 'draw' | 'art' | 'pens'>('text');
  const [nudgeStep, setNudgeStep] = useState<number>(1);
  const [expandedPenId, setExpandedPenId] = useState<string | null>(null);

  // Text state
  const [textContent, setTextContent] = useState('PLOTFORGE\nPEN PLOTTER');
  const [fontFamily, setFontFamily] = useState<FontFamilyId>('hershey-simplex');
  const [fontSizeMm, setFontSizeMm] = useState(12);
  const [charSpacingMm] = useState(0.5);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textPenId, setTextPenId] = useState(pens[0]?.id || 'pen-1');

  // Loaded local & system fonts
  const [loadedLocalFonts, setLoadedLocalFonts] = useState<LocalFontItem[]>([]);

  React.useEffect(() => {
    setLoadedLocalFonts(getRegisteredLocalFonts());
  }, []);

  // SVG drag/drop state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // PicSVG Image Vectorizer state (PNG, JPG, WEBP, BMP)
  const [importedImage, setImportedImage] = useState<{
    file: File;
    imageData: ImageData;
    previewUrl: string;
    name: string;
  } | null>(null);
  const [picFilter, setPicFilter] = useState<PicSvgFilter>('Smooth 1');
  const [picDetails, setPicDetails] = useState<PicSvgDetails>('strong');
  const [vectorContrast, setVectorContrast] = useState<number>(0);
  const [vectorInvert, setVectorInvert] = useState<boolean>(false);
  const [vectorTargetWidthMm, setVectorTargetWidthMm] = useState<number>(120);
  const [enableInfill, setEnableInfill] = useState<boolean>(false);
  const [infillSpacingMm, setInfillSpacingMm] = useState<number>(0.6);
  const [selectedPenId, setSelectedPenId] = useState<string>(pens[0]?.id || 'pen-1');
  const [isVectorizing, setIsVectorizing] = useState<boolean>(false);
  const [vectorResult, setVectorResult] = useState<VectorizeResult | null>(null);
  const [isPicSvgStudioOpen, setIsPicSvgStudioOpen] = useState<boolean>(false);

  // Auto-vectorize when image or options change
  React.useEffect(() => {
    if (!importedImage) return;
    setIsVectorizing(true);
    try {
      const activePen = pens.find((p) => p.id === selectedPenId) || pens[0];
      const res = vectorizeImageData(importedImage.imageData, {
        filter: picFilter,
        details: picDetails,
        targetWidthMm: vectorTargetWidthMm,
        contrast: vectorContrast,
        invert: vectorInvert,
        enableInfill,
        infillSpacingMm,
        penId: activePen?.id || 'pen-1',
        penColorHex: activePen?.colorHex || '#111827',
        sourceElementId: `img_${Date.now()}`,
      });
      setVectorResult(res);
    } catch (err) {
      console.error('Vectorization error:', err);
    } finally {
      setIsVectorizing(false);
    }
  }, [
    importedImage,
    picFilter,
    picDetails,
    vectorContrast,
    vectorInvert,
    vectorTargetWidthMm,
    enableInfill,
    infillSpacingMm,
    selectedPenId,
    pens,
  ]);

  const handleRasterImageLoad = async (file: File) => {
    try {
      const imgData = await processImageFileToImageData(file, 360);
      const url = URL.createObjectURL(file);
      const name = file.name.replace(/\.[^/.]+$/, '');
      setImportedImage({
        file,
        imageData: imgData,
        previewUrl: url,
        name,
      });
      const defaultW = Math.min(preset.bedWidth - 20, 130);
      setVectorTargetWidthMm(defaultW);
      setActiveTab('svg');
      setIsPicSvgStudioOpen(true);
    } catch (err) {
      console.error(err);
      alert('Failed to process image file.');
    }
  };

  const handleInsertVectorizedImage = () => {
    if (!vectorResult || vectorResult.polylines.length === 0) return;
    const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
    const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
    const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
    const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);
    const safeCenterX = (safeBedMinX + safeBedMaxX) / 2;
    const safeCenterY = (safeBedMinY + safeBedMaxY) / 2;
    const activePen = pens.find((p) => p.id === selectedPenId) || pens[0];

    const newElement: DesignElement = {
      id: `elem_img_${Date.now()}`,
      name: importedImage ? importedImage.name : 'Image Drawing',
      type: 'svg',
      x: Math.round((safeCenterX - vectorResult.widthMm / 2) * 10) / 10,
      y: Math.round((safeCenterY - vectorResult.heightMm / 2) * 10) / 10,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      penId: activePen?.id || 'pen-1',
      visible: true,
      rawPolylines: vectorResult.polylines,
      svgContent: vectorResult.svgString,
      isSolidFill: vectorResult.isSolidFill,
      enableInfill: true,
      infillSpacingMm: 0.4,
    };

    addElement(newElement);
    setImportedImage(null);
    setVectorResult(null);
  };

  const handleDownloadSvg = () => {
    if (!vectorResult || !vectorResult.svgString) return;
    const blob = new Blob([vectorResult.svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${importedImage?.name || 'plotforge_vector'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Art Generator state
  const [artType, setArtType] = useState<'spiro' | 'topo' | 'flow' | 'hilbert'>('spiro');
  const [artParamA, setArtParamA] = useState(60); // scale / radius
  const [artParamB, setArtParamB] = useState(15); // waves / density
  const [artParamC, setArtParamC] = useState(5); // steps / detail

  const selectedElement = elements.find((el) => el.id === selectedElementId);
  const isSelectedText = Boolean(selectedElement && selectedElement.type === 'text');
  const isSelectedSvg = Boolean(selectedElement && selectedElement.type === 'svg');
  const activeTextPen = pens.find((p) => p.id === textPenId) || pens[0];

  // Auto-switch tabs to show inspector when user selects an element
  React.useEffect(() => {
    if (selectedElement && selectedElement.type === 'svg') {
      setActiveTab('svg');
    } else if (selectedElement && selectedElement.type === 'text') {
      setActiveTab('text');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId]);

  // Live two-way synchronization with selected text element
  React.useEffect(() => {
    if (selectedElement && selectedElement.type === 'text') {
      if (selectedElement.textContent !== undefined) setTextContent(selectedElement.textContent);
      if (selectedElement.fontFamily !== undefined) setFontFamily(selectedElement.fontFamily);
      if (selectedElement.fontSizeMm !== undefined) setFontSizeMm(selectedElement.fontSizeMm);
      if (selectedElement.penId !== undefined) setTextPenId(selectedElement.penId);
      if (selectedElement.textAlign !== undefined) setTextAlign(selectedElement.textAlign);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId]);

  const handleTextChange = (val: string) => {
    setTextContent(val);
    if (isSelectedText && selectedElement) {
      updateElement(selectedElement.id, {
        textContent: val,
        name: val.split('\n')[0].slice(0, 16) || 'Text Element',
      });
    }
  };

  const handleFontChange = (val: FontFamilyId) => {
    setFontFamily(val);
    if (isSelectedText && selectedElement) {
      updateElement(selectedElement.id, { fontFamily: val });
    }
  };

  const handleSizeChange = (val: number) => {
    setFontSizeMm(val);
    if (isSelectedText && selectedElement) {
      updateElement(selectedElement.id, { fontSizeMm: val });
    }
  };

  const handlePenSlotChange = (val: string) => {
    setTextPenId(val);
    if (isSelectedText && selectedElement) {
      updateElement(selectedElement.id, { penId: val });
    }
  };

  const handleAlignmentChange = (val: 'left' | 'center' | 'right') => {
    setTextAlign(val);
    if (isSelectedText && selectedElement) {
      updateElement(selectedElement.id, { textAlign: val });
    }
  };

  const handleSvgTextLoad = (svgString: string, fileName: string = 'Vector') => {
    try {
      const parsed = parseSVG(svgString, `svg_${Date.now()}`, pens[0]?.id || 'pen-1', 0.05, {
        enableInfill: true,
        hatchSpacingMm: 0.4,
      });
      if (parsed.polylines.length === 0) {
        alert('No printable vector strokes found in this SVG.');
        return;
      }

      const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
      const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
      const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
      const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);
      const safeCenterX = (safeBedMinX + safeBedMaxX) / 2;
      const safeCenterY = (safeBedMinY + safeBedMaxY) / 2;

      // Fit contentBounds to reachable draw bed width/height
      const contentW = parsed.bounds.width > 0 ? parsed.bounds.width : parsed.viewBox.width;
      const contentH = parsed.bounds.height > 0 ? parsed.bounds.height : parsed.viewBox.height;

      const availableW = safeBedMaxX - safeBedMinX;
      const availableH = safeBedMaxY - safeBedMinY;
      const targetW = Math.min(paperPreset.widthMm - 24, availableW - 24, 140);
      const targetH = Math.min(paperPreset.heightMm - 24, availableH - 24, 140);
      const scale = Math.min(targetW / contentW, targetH / contentH, 1.0);

      // Center the actual artwork content directly in the center of the bed
      const contentCenterX = (parsed.bounds.minX + parsed.bounds.maxX) / 2;
      const contentCenterY = (parsed.bounds.minY + parsed.bounds.maxY) / 2;

      const newElement: DesignElement = {
        id: `elem_${Date.now()}`,
        name: fileName,
        type: 'svg',
        x: Math.round((safeCenterX - contentCenterX * scale) * 100) / 100,
        y: Math.round((safeCenterY - contentCenterY * scale) * 100) / 100,
        scaleX: scale,
        scaleY: scale,
        rotation: 0,
        penId: pens[0]?.id || 'pen-1',
        visible: true,
        svgContent: svgString,
        rawPolylines: parsed.polylines,
        isSolidFill: parsed.isSolidFilled,
        enableInfill: true,
        infillSpacingMm: 0.4,
        closedLoops: parsed.closedLoops,
        contentBounds: parsed.bounds,
      };

      addElement(newElement);
    } catch (err) {
      console.error(err);
      alert('Error parsing SVG file.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.svg') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          handleSvgTextLoad(content, file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsText(file);
    } else {
      handleRasterImageLoad(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.svg') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          handleSvgTextLoad(content, file.name.replace(/\.[^/.]+$/, ''));
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
      handleRasterImageLoad(file);
    }
  };

  const handleAddText = () => {
    if (!textContent.trim()) return;
    const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
    const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
    const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
    const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);
    const safeCenterX = (safeBedMinX + safeBedMaxX) / 2;
    const safeCenterY = (safeBedMinY + safeBedMaxY) / 2;

    addElement({
      id: `text_${Date.now()}`,
      name: textContent.split('\n')[0].slice(0, 16) || 'Text Element',
      type: 'text',
      x: safeCenterX,
      y: safeCenterY,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      penId: textPenId,
      visible: true,
      textContent,
      fontSizeMm,
      charSpacingMm,
      lineHeightMultiplier: 1.4,
      textAlign,
      fontFamily,
    });
  };

  const handleGenerateArt = () => {
    if (artType === 'spiro') {
      addAlgorithmicArt('spiro', { R: artParamA, r: artParamB, p: 35, revolutions: artParamC });
    } else if (artType === 'topo') {
      addAlgorithmicArt('topo', { width: artParamA * 1.5, height: artParamA, numLines: artParamB * 2, frequency: artParamC * 0.05 });
    } else if (artType === 'flow') {
      addAlgorithmicArt('flow', { width: artParamA * 1.5, height: artParamA, numParticles: artParamB * 15, steps: artParamC * 10 });
    } else if (artType === 'hilbert') {
      addAlgorithmicArt('hilbert', { order: Math.min(5, Math.max(2, Math.floor(artParamC))), size: artParamA });
    }
  };

  const handleAddPenSlot = () => {
    const palette = ['#0f172a', '#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed'];
    const nextColor = palette[pens.length % palette.length];
    const newPen: PenSlot = {
      id: `pen-${Date.now()}`,
      name: `Pen ${pens.length + 1}`,
      colorHex: nextColor,
      strokeWidthMm: 0.4,
    };
    addPen(newPen);
  };

  const renderMoveAndPosition = (el: DesignElement) => {
    return (
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-2.5 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">
            Position & Nudge
          </span>
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 text-[9px] font-mono">
            {([0.5, 1, 5, 10] as const).map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setNudgeStep(step)}
                className={`px-1.5 py-0.5 rounded font-semibold transition ${
                  nudgeStep === step ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {step}mm
              </button>
            ))}
          </div>
        </div>

        {/* 5-Button Nudge Row */}
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={() => nudgeElement(el.id, -nudgeStep, 0)}
            disabled={el.locked}
            className="py-1.5 flex items-center justify-center bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-slate-700 hover:text-blue-600 shadow-2xs active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={`Nudge Left (${nudgeStep}mm)`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => nudgeElement(el.id, 0, nudgeStep)}
            disabled={el.locked}
            className="py-1.5 flex items-center justify-center bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-slate-700 hover:text-blue-600 shadow-2xs active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={`Nudge Up (${nudgeStep}mm)`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => nudgeElement(el.id, 0, -nudgeStep)}
            disabled={el.locked}
            className="py-1.5 flex items-center justify-center bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-slate-700 hover:text-blue-600 shadow-2xs active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={`Nudge Down (${nudgeStep}mm)`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => nudgeElement(el.id, nudgeStep, 0)}
            disabled={el.locked}
            className="py-1.5 flex items-center justify-center bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-slate-700 hover:text-blue-600 shadow-2xs active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={`Nudge Right (${nudgeStep}mm)`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => centerElementOnPrintableArea(el.id)}
            disabled={el.locked}
            className="py-1.5 flex items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-700 font-bold text-[10px] shadow-2xs active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Center on Bed"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Coordinates */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200/60">
          <span>X: <b className="text-slate-800">{el.x.toFixed(1)}</b> mm</span>
          <span>Y: <b className="text-slate-800">{el.y.toFixed(1)}</b> mm</span>
          <button
            type="button"
            onClick={() => selectElement(null)}
            className="text-[9px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
          >
            Deselect
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-[300px] bg-white border-r border-slate-200/80 flex flex-col h-full select-none z-20 shrink-0 font-sans shadow-[1px_0_4px_rgba(15,23,42,0.02)]">
      {/* 5 Clean Professional Tabs */}
      <div className="grid grid-cols-5 bg-slate-100/70 border-b border-slate-200/80 p-1 gap-1">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
            activeTab === 'text'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 font-medium'
          }`}
          title="Single-Stroke Hershey Text"
        >
          <Type className={`w-3.5 h-3.5 mb-0.5 ${activeTab === 'text' ? 'text-[#EA580C]' : ''}`} />
          <span className="text-[10px]">Text</span>
        </button>

        <button
          onClick={() => setActiveTab('svg')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
            activeTab === 'svg'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 font-medium'
          }`}
          title="Import Vector SVG & Realistic Photos (PNG, JPG)"
        >
          <Upload className={`w-3.5 h-3.5 mb-0.5 ${activeTab === 'svg' ? 'text-blue-600' : ''}`} />
          <span className="text-[10px]">SVG/Img</span>
        </button>

        <button
          onClick={() => setActiveTab('draw')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
            activeTab === 'draw'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 font-medium'
          }`}
          title="Freehand Draw, Shapes & Eraser"
        >
          <Pencil className={`w-3.5 h-3.5 mb-0.5 ${activeTab === 'draw' ? 'text-indigo-600' : ''}`} />
          <span className="text-[10px]">Draw</span>
        </button>

        <button
          onClick={() => setActiveTab('art')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
            activeTab === 'art'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 font-medium'
          }`}
          title="Procedural Art Generator"
        >
          <Sparkles className={`w-3.5 h-3.5 mb-0.5 ${activeTab === 'art' ? 'text-amber-600' : ''}`} />
          <span className="text-[10px]">Art Gen</span>
        </button>

        <button
          onClick={() => setActiveTab('pens')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
            activeTab === 'pens'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 font-medium'
          }`}
          title="Multi-Pen Color Layers"
        >
          <Palette className={`w-3.5 h-3.5 mb-0.5 ${activeTab === 'pens' ? 'text-emerald-600' : ''}`} />
          <span className="text-[10px]">Pens ({pens.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* TAB 1: TEXT */}
        {activeTab === 'text' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {selectedElement && isSelectedText && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-slate-500 font-mono">Layer:</span>
                  <span className="text-xs font-semibold text-slate-800 truncate">{selectedElement.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleLockElement(selectedElement.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    selectedElement.locked
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                  title={selectedElement.locked ? 'Unlock Layer' : 'Lock Layer (Prevent Move & Delete)'}
                >
                  {selectedElement.locked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Locked</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lock Layer</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 font-mono">
                Text Content
              </label>
              <textarea
                value={textContent}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Enter text to plot..."
                rows={3}
                className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs rounded-xl p-2.5 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 focus:outline-none resize-none font-mono transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 font-mono">
                Font Family
              </label>
              <FontPicker
                value={fontFamily}
                onChange={handleFontChange}
                loadedLocalFonts={loadedLocalFonts}
                onFontLoaded={() => setLoadedLocalFonts(getRegisteredLocalFonts())}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 font-mono">Size (mm)</label>
                <input
                  type="number"
                  min="4"
                  max="60"
                  step="1"
                  value={fontSizeMm}
                  onChange={(e) => handleSizeChange(Math.max(4, parseInt(e.target.value) || 12))}
                  className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs rounded-xl px-2.5 py-1.5 font-mono focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 focus:outline-none transition-all shadow-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 font-mono">Pen Slot</label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pens')}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                    title="Configure Pen Colors & Nib Sizes in Pens tab"
                  >
                    Pens ↗
                  </button>
                </div>
                <select
                  value={textPenId}
                  onChange={(e) => handlePenSlotChange(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs rounded-xl px-2.5 py-1.5 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 focus:outline-none cursor-pointer transition-all shadow-xs font-medium"
                >
                  {pens.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 font-mono">Text Alignment</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleAlignmentChange('left')}
                  className={`flex items-center justify-center py-1.5 rounded-lg text-xs transition-all ${
                    textAlign === 'left' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAlignmentChange('center')}
                  className={`flex items-center justify-center py-1.5 rounded-lg text-xs transition-all ${
                    textAlign === 'center' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAlignmentChange('right')}
                  className={`flex items-center justify-center py-1.5 rounded-lg text-xs transition-all ${
                    textAlign === 'right' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Position & Directional Movement */}
            {selectedElement && isSelectedText && renderMoveAndPosition(selectedElement)}

            <button
              onClick={handleAddText}
              className="w-full py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold font-sans tracking-normal rounded-xl transition-all shadow-[0_2px_8px_rgba(234,88,12,0.25)] hover:shadow-[0_4px_12px_rgba(234,88,12,0.35)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Type className="w-4 h-4" />
              <span>{isSelectedText ? '+ New Text Layer' : 'Add Text to Paper'}</span>
            </button>
          </div>
        )}

        {/* TAB 2: UPLOAD SVG / REALISTIC IMAGE VECTORIZER */}
        {activeTab === 'svg' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {importedImage ? (
              /* PICSVG VECTORIZER STUDIO */
              <div className="bg-gradient-to-b from-slate-50/90 to-white rounded-2xl border border-slate-200/90 p-3 space-y-2.5 shadow-xs">
                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shrink-0">
                      <ImageIcon className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate font-sans">
                        {importedImage.name}
                      </h4>
                      <span className="text-[9px] text-blue-600 font-mono font-semibold">
                        PicSVG Studio • Live Vectorizer
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setImportedImage(null);
                      setVectorResult(null);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition shrink-0"
                    title="Cancel and choose another file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* SVG LIVE PREVIEW CONTAINER */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>SVG Live Preview</span>
                    </div>
                    {vectorResult && (
                      <span className="text-slate-500 font-semibold">
                        {vectorResult.polylines.length} {vectorResult.isSolidFill ? 'loops' : 'strokes'}
                      </span>
                    )}
                  </div>

                  {/* Side-by-Side Studio Trigger Pill */}
                  <button
                    type="button"
                    onClick={() => setIsPicSvgStudioOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/80 rounded-xl text-blue-700 font-sans font-bold text-[11px] shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Open Side-by-Side PicSVG Studio</span>
                  </button>

                  <div
                    onClick={() => setIsPicSvgStudioOpen(true)}
                    className="relative w-full h-36 bg-white rounded-xl border border-slate-200/90 shadow-inner flex items-center justify-center overflow-hidden p-2 cursor-pointer hover:border-blue-400 transition-colors group"
                    style={{
                      background:
                        'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 10px, #ffffff 10px, #ffffff 20px)',
                    }}
                    title="Click to expand Side-by-Side PicSVG Studio"
                  >
                    {isVectorizing && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <span className="text-[11px] font-mono font-bold text-blue-600 animate-pulse">
                          Vectorizing SVG...
                        </span>
                      </div>
                    )}

                    {vectorResult && vectorResult.svgString ? (
                      <div
                        className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto transition-all"
                        dangerouslySetInnerHTML={{ __html: vectorResult.svgString }}
                      />
                    ) : (
                      <div className="text-center text-slate-400 text-xs font-mono">
                        Generating vector paths...
                      </div>
                    )}

                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow">
                      Expand ↗
                    </div>
                  </div>

                  {/* Real-Time Stats Pill */}
                  {vectorResult && (
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/60">
                      <span>Size: <strong className="text-slate-900">{vectorResult.widthMm} × {vectorResult.heightMm} mm</strong></span>
                      <span>Travel: <strong className="text-slate-900">{vectorResult.totalLengthMm} mm</strong></span>
                    </div>
                  )}
                </div>

                {/* FILTER & COLOR SWATCH (Exact PicSVG Layout) */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 font-mono">
                      Filter
                    </label>
                    <div className="flex gap-2 items-center">
                      <select
                        value={picFilter}
                        onChange={(e) => setPicFilter(e.target.value as PicSvgFilter)}
                        className="flex-1 bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-sans font-semibold focus:border-blue-500 focus:outline-none shadow-xs cursor-pointer"
                      >
                        <optgroup label="Inkscape Vectorizer">
                          <option value="Inkscape (High Quality)">✨ Inkscape (High Quality Smooth Bezier)</option>
                        </optgroup>
                        <optgroup label="Smooth & Clean Curves">
                          <option value="Smooth 1">Smooth 1 (Organic Plotter Curves)</option>
                          <option value="Smooth 2">Smooth 2 (Minimalist Flowing)</option>
                          <option value="Clean 1">Clean 1 (Otsu Logo & Icon)</option>
                        </optgroup>
                        <optgroup label="Contour Outlines">
                          <option value="Edge 1">Edge 1 (Fine Contours)</option>
                          <option value="Edge 2">Edge 2 (Medium Contours)</option>
                          <option value="Edge 3">Edge 3 (DoG Bandpass)</option>
                          <option value="Edge 4">Edge 4 (Heavy Outlines)</option>
                          <option value="Edge 5">Edge 5 (Canny Hysteresis)</option>
                          <option value="Edge 6">Edge 6 (Laplacian Zero-Crossing)</option>
                        </optgroup>
                        <optgroup label="Internal Features & Shading">
                          <option value="Internal 1">Internal 1 (High Detail Facial)</option>
                          <option value="Internal 2">Internal 2 (Medium Feature Trace)</option>
                          <option value="Internal 3">Internal 3 (Deep Interior Shading)</option>
                          <option value="Internal 4">Internal 4 (Internal Dense Hatch)</option>
                          <option value="Internal 5">Internal 5 (Multi-Scale Blend)</option>
                        </optgroup>
                        <optgroup label="Special & Artistic">
                          <option value="Sharp 1">Sharp 1 (Unsharp High-Pass)</option>
                          <option value="Detail 1">Detail 1 (Dual-Pass Edge + Fill)</option>
                          <option value="Artistic 1">Artistic 1 (Woodcut Posterized)</option>
                          <option value="Artistic 2">Artistic 2 (Etched Ink Shading)</option>
                        </optgroup>
                      </select>

                      {/* Color Swatch Square matching PicSVG */}
                      {(() => {
                        const activePen = pens.find((p) => p.id === selectedPenId) || pens[0];
                        return (
                          <button
                            type="button"
                            title={`Pen Color: ${activePen?.name || 'Black'}. Click to switch pen`}
                            onClick={() => {
                              const idx = pens.findIndex((p) => p.id === selectedPenId);
                              const nextIdx = (idx + 1) % pens.length;
                              setSelectedPenId(pens[nextIdx]?.id || 'pen-1');
                            }}
                            style={{ backgroundColor: activePen?.colorHex || '#000000' }}
                            className="w-8 h-8 rounded-lg border-2 border-slate-300 hover:border-slate-800 shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* DETAILS SELECTOR (Default: Strong) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                        Details
                      </label>
                      <span className="text-[9px] font-mono text-blue-600 font-bold">
                        {picDetails === 'strong' ? 'Strong (Recommended)' : picDetails.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                      {PICSVG_DETAILS.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setPicDetails(d.id)}
                          className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                            picDetails === d.id
                              ? 'bg-white text-blue-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title={d.desc}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Width & Invert */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1 font-mono">Width (mm)</label>
                      <input
                        type="number"
                        min="20"
                        max={preset.bedWidth}
                        value={vectorTargetWidthMm}
                        onChange={(e) => setVectorTargetWidthMm(Math.max(20, parseInt(e.target.value) || 60))}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2 py-1 font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center pt-4">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={vectorInvert}
                          onChange={(e) => setVectorInvert(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 accent-blue-600"
                        />
                        <span className="text-[10px] font-semibold text-slate-700">Invert Tone</span>
                      </label>
                    </div>
                  </div>

                  {/* Contrast Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-slate-500">Contrast Boost</span>
                      <span className="font-bold text-slate-800">
                        {vectorContrast > 0 ? `+${vectorContrast}` : vectorContrast}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="5"
                      value={vectorContrast}
                      onChange={(e) => setVectorContrast(parseInt(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Actions: Add to Canvas & Download SVG */}
                {vectorResult && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={handleInsertVectorizedImage}
                      disabled={isVectorizing || vectorResult.polylines.length === 0}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Plotter Canvas</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadSvg}
                      disabled={isVectorizing || !vectorResult.svgString}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all border border-slate-200/80 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      title="Download converted SVG file"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Download SVG File</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Drag & Drop Zone for SVG & Realistic Images */
              <>
                {/* Selected SVG Element Live Inspector */}
                {isSelectedSvg && selectedElement && (
                  <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-2xl border border-blue-200/90 p-3 space-y-3 shadow-xs mb-3">
                    {/* Header with Title, Dimensions & Delete */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {selectedElement.name}
                          </h4>
                          <span className="text-[9px] font-mono text-blue-600 font-semibold">
                            {Math.round((selectedElement.contentBounds?.width || 100) * (selectedElement.scaleX || 1))} × {Math.round((selectedElement.contentBounds?.height || 100) * (selectedElement.scaleY || 1))} mm
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleLockElement(selectedElement.id)}
                          className={`p-1 rounded-lg border transition cursor-pointer ${
                            selectedElement.locked
                              ? 'bg-amber-100 text-amber-700 border-amber-300 font-bold'
                              : 'bg-white text-slate-500 hover:text-amber-600 border-slate-200 hover:bg-slate-50'
                          }`}
                          title={selectedElement.locked ? 'Unlock Layer' : 'Lock Layer (Prevent Move & Delete)'}
                        >
                          {selectedElement.locked ? (
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {!selectedElement.locked && (
                          <button
                            onClick={() => removeElement(selectedElement.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                            title="Delete this SVG"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pen Slot Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 font-mono">
                        Pen Slot
                      </label>
                      <select
                        value={selectedElement.penId}
                        onChange={(e) => updateElement(selectedElement.id, { penId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-sans font-semibold focus:border-blue-500 focus:outline-none cursor-pointer"
                      >
                        {pens.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Width / Dimension Control */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-slate-500">Width (mm)</span>
                        <span className="font-bold text-slate-800">
                          {Math.round((selectedElement.contentBounds?.width || 100) * (selectedElement.scaleX || 1))} mm
                        </span>
                      </div>
                      <input
                        type="number"
                        min="10"
                        max={preset.bedWidth}
                        value={Math.round((selectedElement.contentBounds?.width || 100) * (selectedElement.scaleX || 1))}
                        onChange={(e) => {
                          const newW = Math.max(10, Math.min(preset.bedWidth, parseInt(e.target.value) || 20));
                          const baseW = selectedElement.contentBounds?.width || 100;
                          const newScale = newW / baseW;
                          updateElement(selectedElement.id, { scaleX: newScale, scaleY: newScale });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2 py-1 font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Solid Infill Hatching Controls */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedElement.enableInfill !== false}
                            onChange={(e) => updateElement(selectedElement.id, { enableInfill: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 accent-blue-600"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            Solid Pen Infill (Hatching)
                          </span>
                        </label>
                        <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-bold">
                          Smooth Snake
                        </span>
                      </div>

                      {selectedElement.enableInfill !== false && (
                        <div className="space-y-2.5 pl-5 pt-1">
                          {/* Hatch Pitch Slider */}
                          <div>
                            <div className="flex justify-between text-[10px] font-mono mb-1">
                              <span className="text-slate-500">Hatch Pitch</span>
                              <span className="font-bold text-blue-600">
                                {selectedElement.infillSpacingMm || 0.4} mm
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.2"
                              max="1.5"
                              step="0.05"
                              value={selectedElement.infillSpacingMm || 0.4}
                              onChange={(e) => updateElement(selectedElement.id, { infillSpacingMm: parseFloat(e.target.value) })}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                              <span>0.2mm (Dense)</span>
                              <span>0.4mm (Standard)</span>
                              <span>1.5mm (Shaded)</span>
                            </div>
                          </div>

                          {/* Hatch Direction */}
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1 font-mono">
                              Hatch Angle
                            </label>
                            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                              {[
                                { label: '0° Horiz', val: 0 },
                                { label: '45° Diag', val: 45 },
                                { label: '90° Vert', val: 90 },
                              ].map((opt) => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => updateElement(selectedElement.id, { hatchAngleDeg: opt.val })}
                                  className={`py-1 rounded-lg text-[9px] font-bold transition-all ${
                                    (selectedElement.hatchAngleDeg || 0) === opt.val
                                      ? 'bg-white text-blue-600 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Position & Directional Movement */}
                    {renderMoveAndPosition(selectedElement)}
                  </div>
                )}

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/60 scale-[1.02]'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp,.bmp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    Click or Drop File Here
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    SVG vectors or realistic photos (PNG, JPG, WebP)
                  </p>
                  <div className="flex justify-center gap-1 mt-2.5">
                    <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200/60">
                      SVG
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200/60">
                      PNG
                    </span>
                    <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200/60">
                      JPG
                    </span>
                    <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200/60">
                      WEBP
                    </span>
                  </div>
                </div>

                {/* Quick Starter Designs */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2 font-mono">
                    Curated Quick Designs
                  </label>
                  <div className="space-y-1.5">
                    {Object.entries(CURATED_VECTORS).map(([name, item]) => (
                      <button
                        key={name}
                        onClick={() => handleSvgTextLoad(item.svg, name)}
                        className="w-full flex items-center justify-between p-2.5 bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 hover:border-slate-300 rounded-xl text-left transition-all cursor-pointer group shadow-xs hover:translate-x-0.5"
                      >
                        <div>
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors block">
                            {name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.desc}
                          </span>
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: DRAW & SHAPES STUDIO */}
        {activeTab === 'draw' && <DrawTabPanel onNavigateToPens={() => setActiveTab('pens')} />}

        {/* TAB 4: ART GENERATOR */}
        {activeTab === 'art' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 font-mono">
                Algorithm Engine
              </label>
              <select
                value={artType}
                onChange={(e) => setArtType(e.target.value as any)}
                className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 text-xs rounded-xl px-2.5 py-2 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/15 focus:outline-none cursor-pointer transition-all shadow-xs font-medium"
              >
                <option value="spiro">Spirograph / Hypotrochoid</option>
                <option value="topo">Topographic Ridge Waves</option>
                <option value="flow">Perlin Flow Field Waves</option>
                <option value="hilbert">Hilbert Space-Filling Curve</option>
              </select>
            </div>

            {/* Dynamic Sliders based on engine */}
            <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1.5">
                  <span className="font-medium">{artType === 'spiro' ? 'Outer Radius' : 'Size / Scale'}</span>
                  <span className="font-mono text-slate-900 font-bold">{artParamA} mm</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={artParamA}
                  onChange={(e) => setArtParamA(parseInt(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1.5">
                  <span className="font-medium">{artType === 'spiro' ? 'Inner Ratio' : 'Lines / Density'}</span>
                  <span className="font-mono text-slate-900 font-bold">{artParamB}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={artParamB}
                  onChange={(e) => setArtParamB(parseInt(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1.5">
                  <span className="font-medium">{artType === 'spiro' ? 'Revolutions' : 'Complexity'}</span>
                  <span className="font-mono text-slate-900 font-bold">{artParamC}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={artParamC}
                  onChange={(e) => setArtParamC(parseInt(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateArt}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all shadow-[0_2px_8px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_12px_rgba(245,158,11,0.35)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Art on Paper</span>
            </button>
          </div>
        )}

        {/* TAB 4: PEN STUDIO & MULTI-PEN LAYERS */}
        {activeTab === 'pens' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Header & Global Actions */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
              <div>
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider font-mono block">
                  Pen Studio & Layers
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {pens.length} {pens.length === 1 ? 'pen slot' : 'pen slots'} • Multi-color plotting
                </span>
              </div>
              <button
                onClick={handleAddPenSlot}
                className="flex items-center gap-1 text-[11px] text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg font-bold font-mono shadow-xs active:scale-95 transition"
                title="Add a new pen layer slot"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pen</span>
              </button>
            </div>

            {/* Active Drawing Pen Banner */}
            {(() => {
              const currentActive = pens.find((p) => p.id === (activePenId || pens[0]?.id)) || pens[0];
              return (
                <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                      style={{ backgroundColor: currentActive.colorHex }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-blue-700 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                          Active Drawing Pen
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                        {currentActive.name} ({currentActive.strokeWidthMm}mm)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Pen Layers List */}
            <div className="space-y-3">
              {pens.map((pen, index) => {
                const elementCount = elements.filter((el) => el.penId === pen.id).length;
                const isActive = (activePenId || pens[0]?.id) === pen.id;
                const isEnabled = pen.enabled !== false;
                const isExpanded = expandedPenId === pen.id;

                return (
                  <div
                    key={pen.id}
                    className={`p-3 rounded-2xl border transition-all shadow-xs space-y-2.5 ${
                      isActive
                        ? 'bg-white border-blue-400 ring-2 ring-blue-500/15 shadow-sm'
                        : isEnabled
                        ? 'bg-slate-50/80 border-slate-200/90 hover:bg-white'
                        : 'bg-slate-100/60 border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Layer Header: Active Marker, Visibility, Reordering, Delete */}
                    <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-200/60">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Active Selection Star/Button */}
                        <button
                          type="button"
                          onClick={() => setActivePenId(pen.id)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition ${
                            isActive
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-white text-slate-500 hover:text-amber-600 border border-slate-200'
                          }`}
                          title={isActive ? 'Currently active drawing pen' : 'Click to make this the active drawing pen'}
                        >
                          <Star className={`w-3 h-3 ${isActive ? 'fill-amber-500 text-amber-500' : ''}`} />
                          <span>{isActive ? 'ACTIVE' : 'Set Active'}</span>
                        </button>

                        {/* Visibility (Mute) Toggle */}
                        <button
                          type="button"
                          onClick={() => updatePen(pen.id, { enabled: !isEnabled })}
                          className={`p-1 rounded-md transition ${
                            isEnabled
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:text-slate-600 bg-slate-200/60'
                          }`}
                          title={isEnabled ? 'Layer Enabled: Plotted in G-code (Click to Mute)' : 'Layer Muted: Excluded from G-code (Click to Enable)'}
                        >
                          {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Reorder and Delete Controls */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => reorderPens(index, index - 1)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded disabled:opacity-20 transition"
                          title="Move layer up (plots earlier)"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === pens.length - 1}
                          onClick={() => reorderPens(index, index + 1)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded disabled:opacity-20 transition"
                          title="Move layer down (plots later)"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {pens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePen(pen.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition ml-0.5"
                            title="Delete this pen slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pen Name & Color Swatch */}
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={pen.colorHex}
                        onChange={(e) => updatePen(pen.id, { colorHex: e.target.value })}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 bg-white shrink-0 shadow-2xs"
                        title="Custom Color Picker"
                      />
                      <input
                        type="text"
                        value={pen.name}
                        onChange={(e) => updatePen(pen.id, { name: e.target.value })}
                        placeholder="Pen Name..."
                        className="flex-1 bg-white border border-slate-200 text-slate-900 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:border-blue-500 focus:outline-none shadow-2xs"
                      />
                    </div>

                    {/* 1-Click Profile Preset Selector */}
                    <div>
                      <label className="text-[10px] font-mono font-semibold text-slate-500 block mb-1">
                        Pen Profile Preset:
                      </label>
                      <select
                        value={pen.penType || 'custom'}
                        onChange={(e) => {
                          const matched = PEN_PRESETS.find((p) => p.type === e.target.value);
                          if (matched) {
                            updatePen(pen.id, {
                              penType: matched.type,
                              strokeWidthMm: matched.stroke,
                              drawSpeedMmS: matched.speed,
                              dwellDownMs: matched.dwell,
                              name: matched.type === 'custom' ? pen.name : matched.label.replace(/^[^\w]+/, '').trim(),
                            });
                          }
                        }}
                        className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded-xl px-2 py-1.5 font-sans focus:outline-none shadow-2xs cursor-pointer"
                      >
                        {PEN_PRESETS.map((p) => (
                          <option key={p.type} value={p.type}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Curated 12-Color Swatch Palette */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>Palette:</span>
                        <span className="font-bold text-slate-700 uppercase">{pen.colorHex}</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5 pt-0.5">
                        {CURATED_PLOTTER_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => updatePen(pen.id, { colorHex: c.hex })}
                            style={{ backgroundColor: c.hex }}
                            className={`h-5 rounded-md border transition-all ${
                              pen.colorHex.toLowerCase() === c.hex.toLowerCase()
                                ? 'border-white ring-2 ring-blue-500 scale-105 shadow-2xs'
                                : 'border-slate-300/80 hover:scale-105'
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Stroke Width Selector */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>Stroke Width:</span>
                        <span className="font-bold text-slate-800">{pen.strokeWidthMm} mm</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {STROKE_WIDTH_OPTIONS.map((sw) => (
                          <button
                            key={sw}
                            type="button"
                            onClick={() => updatePen(pen.id, { strokeWidthMm: sw })}
                            className={`py-1 text-[9px] font-mono rounded-lg border transition ${
                              pen.strokeWidthMm === sw
                                ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {sw}mm
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Element Assignment & Layer Count */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-mono font-semibold text-slate-600">
                        {elementCount} {elementCount === 1 ? 'element' : 'elements'}
                      </span>

                      {selectedElementId && (
                        <button
                          type="button"
                          onClick={() => assignElementPen(selectedElementId, pen.id)}
                          className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg font-mono font-bold transition active:scale-95"
                          title="Assign currently selected element on canvas to this pen"
                        >
                          + Assign Selected
                        </button>
                      )}
                    </div>

                    {/* Collapsible Hardware & CAM Kinematics Settings */}
                    <div className="pt-1 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setExpandedPenId(isExpanded ? null : pen.id)}
                        className="w-full flex items-center justify-between text-[10px] font-mono text-slate-600 hover:text-slate-900 py-1 hover:bg-slate-100/60 px-1.5 rounded-lg transition"
                      >
                        <span className="flex items-center gap-1 font-bold">
                          <Settings2 className="w-3 h-3 text-slate-500" />
                          <span>Hardware & CAM Settings</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 text-[10px] font-mono animate-in fade-in duration-100">
                          {/* Draw Speed */}
                          <div>
                            <div className="flex justify-between text-slate-600 mb-1">
                              <span>Draw Speed:</span>
                              <span className="font-bold text-slate-900">
                                {pen.drawSpeedMmS || Math.round(preset.drawFeedrate / 60)} mm/s
                              </span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              step="5"
                              value={pen.drawSpeedMmS || Math.round(preset.drawFeedrate / 60)}
                              onChange={(e) => updatePen(pen.id, { drawSpeedMmS: parseInt(e.target.value) })}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>

                          {/* Pen Down Z contact */}
                          <div>
                            <div className="flex justify-between text-slate-600 mb-1">
                              <span>Pen Down Z Contact:</span>
                              <span className="font-bold text-slate-900">
                                {(pen.penDownZ !== undefined ? pen.penDownZ : preset.penDownZ).toFixed(1)} mm
                              </span>
                            </div>
                            <input
                              type="number"
                              step="0.1"
                              value={pen.penDownZ !== undefined ? pen.penDownZ : preset.penDownZ}
                              onChange={(e) => updatePen(pen.id, { penDownZ: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2 py-1 font-mono text-[10px] focus:outline-none"
                            />
                          </div>

                          {/* Ink Settle Dwell */}
                          <div>
                            <div className="flex justify-between text-slate-600 mb-1">
                              <span>Ink Flow Settle Dwell:</span>
                              <span className="font-bold text-slate-900">{pen.dwellDownMs || 0} ms</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="200"
                              step="10"
                              value={pen.dwellDownMs || 0}
                              onChange={(e) => updatePen(pen.id, { dwellDownMs: parseInt(e.target.value) })}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>

                          {/* Custom Tool Change LCD Message */}
                          <div>
                            <span className="text-slate-600 block mb-1">Pause LCD Note (M117):</span>
                            <input
                              type="text"
                              value={pen.toolChangeMessage || ''}
                              onChange={(e) => updatePen(pen.id, { toolChangeMessage: e.target.value })}
                              placeholder={`Insert ${pen.name}...`}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2 py-1 font-mono text-[10px] focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CANVAS LAYERS DOCK (Always visible summary of all elements on canvas) */}
      <div className="border-t border-slate-200/80 bg-slate-50/70 p-3 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-700 font-sans">
              Canvas Layers ({elements.length})
            </span>
          </div>
          {selectedElementId && (
            <button
              type="button"
              onClick={() => selectElement(null)}
              className="text-[10px] text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Deselect active layer"
            >
              Clear selection
            </button>
          )}
        </div>

        {elements.length === 0 ? (
          <div className="text-center py-2 text-[10px] text-slate-400 font-sans">
            No layers on paper • Add text or artwork above
          </div>
        ) : (
          <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
            {elements.map((el) => {
              const isSelected = selectedElementId === el.id;
              const assignedPen = pens.find((p) => p.id === el.penId) || pens[0];
              return (
                <div
                  key={el.id}
                  onClick={() => selectElement(el.id)}
                  className={`flex items-center justify-between p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-white border-blue-400 ring-2 ring-blue-500/15 shadow-2xs font-semibold text-slate-900'
                      : 'bg-white/80 border-slate-200/80 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300"
                      style={{ backgroundColor: assignedPen?.colorHex || '#0f172a' }}
                      title={`Pen: ${assignedPen?.name || 'Default'}`}
                    />
                    <span className="truncate text-[11px] max-w-[130px] font-sans">
                      {el.name || (el.type === 'text' ? el.textContent || 'Text Layer' : el.type)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => updateElement(el.id, { visible: !el.visible })}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                      title={el.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {el.visible ? <Eye className="w-3 h-3 text-slate-600" /> : <EyeOff className="w-3 h-3 text-slate-300" />}
                    </button>

                    {/* Toggle Lock */}
                    <button
                      type="button"
                      onClick={() => toggleLockElement(el.id)}
                      className={`p-1 rounded transition cursor-pointer ${
                        el.locked ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-600'
                      }`}
                      title={el.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {el.locked ? <Lock className="w-3 h-3 text-amber-600" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    {/* Delete */}
                    {!el.locked && (
                      <button
                        type="button"
                        onClick={() => removeElement(el.id)}
                        className="p-1 text-slate-300 hover:text-red-600 rounded transition cursor-pointer"
                        title="Delete Layer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Minimal Footer */}
      <div className="px-3.5 py-2 border-t border-slate-200/60 bg-slate-50/50 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
        <span>PlotForge Studio</span>
        <span className="text-slate-400">100% Client-Side</span>
      </div>

      {/* Side-by-Side PicSVG Studio Modal */}
      <PicSvgStudioModal
        isOpen={isPicSvgStudioOpen}
        onClose={() => setIsPicSvgStudioOpen(false)}
        importedImage={importedImage}
        picFilter={picFilter}
        setPicFilter={setPicFilter}
        picDetails={picDetails}
        setPicDetails={setPicDetails}
        vectorContrast={vectorContrast}
        setVectorContrast={setVectorContrast}
        vectorInvert={vectorInvert}
        setVectorInvert={setVectorInvert}
        vectorTargetWidthMm={vectorTargetWidthMm}
        setVectorTargetWidthMm={setVectorTargetWidthMm}
        enableInfill={enableInfill}
        setEnableInfill={setEnableInfill}
        infillSpacingMm={infillSpacingMm}
        setInfillSpacingMm={setInfillSpacingMm}
        selectedPenId={selectedPenId}
        setSelectedPenId={setSelectedPenId}
        vectorResult={vectorResult}
        isVectorizing={isVectorizing}
        onAddToCanvas={handleInsertVectorizedImage}
        onDownloadSvg={handleDownloadSvg}
        pens={pens}
      />
    </aside>
  );
};
