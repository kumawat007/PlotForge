'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import {
  generateSpiralPortrait,
  createDefaultPortraitSampler,
  createSamplerFromImageData,
  LuminanceSampler,
} from '@/lib/generators/spiralPortrait';
import { generateRidgeWaves } from '@/lib/generators/ridgeWaves';
import { generateGuillocheRosette } from '@/lib/generators/guilloche';
import { Polyline, DesignElement } from '@/types/plotter';
import { ScrubInput } from '@/components/common/ScrubInput';
import {
  Sparkles,
  Upload,
  ArrowRight,
  Dices,
} from 'lucide-react';

export const GenerativeArtLab: React.FC = () => {
  const { preset, pens, addElement, setActiveStudioMode } = usePlotterStore();

  const [activeEngine, setActiveEngine] = useState<'spiral' | 'ridge' | 'guilloche'>('spiral');

  // Generator 1: Spiral Portrait State
  const [spiralLoops, setSpiralLoops] = useState(55);
  const [spiralModFreq, setSpiralModFreq] = useState(36);
  const [spiralModMm, setSpiralModMm] = useState(1.8);
  const [spiralInvert, setSpiralInvert] = useState(false);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [uploadedSampler, setUploadedSampler] = useState<LuminanceSampler | null>(null);

  // Generator 2: Ridge Waves State
  const [ridgeLines, setRidgeLines] = useState(48);
  const [ridgePeakMm, setRidgePeakMm] = useState(16);
  const [ridgeFreq, setRidgeFreq] = useState(0.045);
  const [ridgeOctaves, setRidgeOctaves] = useState(3);
  const [ridgeSeed, setRidgeSeed] = useState(2026);

  // Generator 3: Guilloche Rosette State
  const [guillocheOuter, setGuillocheOuter] = useState(0.85);
  const [guillocheInner, setGuillocheInner] = useState(0.34);
  const [guillocheDist, setGuillocheDist] = useState(0.62);
  const [guillocheRev, setGuillocheRev] = useState(24);
  const [guillocheRibbons, setGuillocheRibbons] = useState(3);
  const [guillocheWaveFreq, setGuillocheWaveFreq] = useState(18);
  const [guillocheWaveMm, setGuillocheWaveMm] = useState(0.8);

  const [generatedPolylines, setGeneratedPolylines] = useState<Polyline[]>([]);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bounds = useMemo(() => {
    const dim = Math.min(preset.bedWidth, preset.bedDepth) * 0.85;
    return { width: dim, height: dim };
  }, [preset.bedWidth, preset.bedDepth]);

  // Re-run generator whenever parameters change
  useEffect(() => {
    const penId = pens[0]?.id || 'pen-1';

    if (activeEngine === 'spiral') {
      const sampler = uploadedSampler || createDefaultPortraitSampler();
      const poly = generateSpiralPortrait(sampler, {
        bounds,
        spiralLoops,
        pointsPerLoop: 160,
        modulationFrequency: spiralModFreq,
        maxModulationMm: spiralModMm,
        invertBrightness: spiralInvert,
        penId,
      });
      setGeneratedPolylines([poly]);
    } else if (activeEngine === 'ridge') {
      const polys = generateRidgeWaves({
        bounds,
        numLines: ridgeLines,
        pointsPerLine: 180,
        maxPeakHeightMm: ridgePeakMm,
        noiseFrequency: ridgeFreq,
        noiseOctaves: ridgeOctaves,
        seed: ridgeSeed,
        penId,
        customLuminanceSampler: uploadedSampler || undefined,
      });
      setGeneratedPolylines(polys);
    } else if (activeEngine === 'guilloche') {
      const polys = generateGuillocheRosette({
        bounds,
        outerRadiusRatio: guillocheOuter,
        innerRadiusRatio: guillocheInner,
        penDistanceRatio: guillocheDist,
        revolutions: guillocheRev,
        stepsPerRevolution: 140,
        numRibbons: guillocheRibbons,
        waveFrequency: guillocheWaveFreq,
        waveAmplitudeMm: guillocheWaveMm,
        penId,
      });
      setGeneratedPolylines(polys);
    }
  }, [
    activeEngine,
    spiralLoops,
    spiralModFreq,
    spiralModMm,
    spiralInvert,
    uploadedSampler,
    ridgeLines,
    ridgePeakMm,
    ridgeFreq,
    ridgeOctaves,
    ridgeSeed,
    guillocheOuter,
    guillocheInner,
    guillocheDist,
    guillocheRev,
    guillocheRibbons,
    guillocheWaveFreq,
    guillocheWaveMm,
    bounds,
    pens,
  ]);

  // Render on offscreen/preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Canvas background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Frame
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Center coordinates
    const scale = Math.min((width - 40) / bounds.width, (height - 40) / bounds.height);
    const offsetX = (width - bounds.width * scale) / 2;
    const offsetY = (height - bounds.height * scale) / 2;

    for (const poly of generatedPolylines) {
      if (poly.points.length < 2) continue;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(offsetX + poly.points[0].x * scale, offsetY + poly.points[0].y * scale);
      for (let i = 1; i < poly.points.length; i++) {
        ctx.lineTo(offsetX + poly.points[i].x * scale, offsetY + poly.points[i].y * scale);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [generatedPolylines, bounds]);

  // Handle uploaded image
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImageSrc(dataUrl);

      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        const dim = 256;
        offscreen.width = dim;
        offscreen.height = dim;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        // Draw cropped and centered image
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, dim, dim);

        const imgData = ctx.getImageData(0, 0, dim, dim);
        const sampler = createSamplerFromImageData(imgData);
        setUploadedSampler(() => sampler);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Load into main workspace
  const handleLoadIntoWorkspace = () => {
    if (generatedPolylines.length === 0) return;

    const centerX = (preset.minSafeX + preset.maxSafeX) / 2 + preset.penOffsetX;
    const centerY = (preset.minSafeY + preset.maxSafeY) / 2 + preset.penOffsetY;

    const names = {
      spiral: 'Single-Stroke Spiral Portrait',
      ridge: 'Topographic Ridge Waveforms',
      guilloche: 'Parametric Guilloche Rosette',
    };

    const newElement: DesignElement = {
      id: `gen_lab_${Date.now()}`,
      name: names[activeEngine],
      type: 'svg',
      x: Math.round((centerX - bounds.width / 2) * 10) / 10,
      y: Math.round((centerY - bounds.height / 2) * 10) / 10,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      penId: pens[0]?.id || 'pen-1',
      visible: true,
      rawPolylines: generatedPolylines,
    };

    addElement(newElement);
    setActiveStudioMode('canvas');
  };

  // Compute stats
  let totalPts = 0;
  let totalDistMm = 0;
  for (const p of generatedPolylines) {
    totalPts += p.points.length;
    for (let i = 1; i < p.points.length; i++) {
      totalDistMm += Math.hypot(p.points[i].x - p.points[i - 1].x, p.points[i].y - p.points[i - 1].y);
    }
  }

  return (
    <div className="flex-1 h-[calc(100vh-3.5rem)] bg-[#F8FAFC] flex overflow-hidden select-none font-sans">
      {/* LEFT: Controls Panel */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto p-4 space-y-4 shadow-sm">
        {/* Module Title */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#EA580C]" />
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono">
              Generative Art Lab
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold font-mono">100% SINGLE-STROKE</span>
        </div>

        {/* Engine Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveEngine('spiral')}
            className={`py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono transition ${
              activeEngine === 'spiral'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            SPIRAL
          </button>
          <button
            onClick={() => setActiveEngine('ridge')}
            className={`py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono transition ${
              activeEngine === 'ridge'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            RIDGE WAVES
          </button>
          <button
            onClick={() => setActiveEngine('guilloche')}
            className={`py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono transition ${
              activeEngine === 'guilloche'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            GUILLOCHÉ
          </button>
        </div>

        {/* Image Upload Zone (for Spiral and Ridge) */}
        {(activeEngine === 'spiral' || activeEngine === 'ridge') && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="uppercase tracking-wider font-semibold">SOURCE PHOTO / LUMINANCE MAP</span>
              {uploadedImageSrc && (
                <button
                  onClick={() => {
                    setUploadedImageSrc(null);
                    setUploadedSampler(null);
                  }}
                  className="text-red-600 hover:underline"
                >
                  CLEAR PHOTO
                </button>
              )}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-3 text-center cursor-pointer transition flex items-center justify-center gap-2.5 bg-white"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <Upload className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <span className="text-[11px] font-semibold text-slate-800 block">
                  {uploadedImageSrc ? 'CHANGE PHOTO' : 'UPLOAD PHOTO / SELFIE'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {uploadedImageSrc ? 'Custom image active' : 'Click or drop PNG/JPG (runs 100% locally)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Parameters Grid */}
        <div className="space-y-2.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono font-semibold">
            PROCEDURAL PARAMETERS
          </span>

          {activeEngine === 'spiral' && (
            <div className="space-y-2">
              <ScrubInput
                label="SPIRAL LOOPS"
                unit="rev"
                value={spiralLoops}
                onChange={setSpiralLoops}
                step={1}
                min={20}
                max={95}
                precision={0}
              />
              <ScrubInput
                label="WAVE FREQUENCY"
                unit="hz"
                value={spiralModFreq}
                onChange={setSpiralModFreq}
                step={1}
                min={10}
                max={72}
                precision={0}
              />
              <ScrubInput
                label="MAX MODULATION"
                unit="mm"
                value={spiralModMm}
                onChange={setSpiralModMm}
                step={0.1}
                min={0.5}
                max={4.0}
                precision={1}
              />
              <button
                onClick={() => setSpiralInvert(!spiralInvert)}
                className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 text-[10px] rounded-lg font-semibold uppercase font-mono flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>INVERT BRIGHTNESS: {spiralInvert ? 'ON (WHITE PEAKS)' : 'OFF (BLACK PEAKS)'}</span>
              </button>
            </div>
          )}

          {activeEngine === 'ridge' && (
            <div className="space-y-2">
              <ScrubInput
                label="HORIZONTAL SCANLINES"
                unit="lines"
                value={ridgeLines}
                onChange={setRidgeLines}
                step={1}
                min={20}
                max={80}
                precision={0}
              />
              <ScrubInput
                label="MAX PEAK ELEVATION"
                unit="mm"
                value={ridgePeakMm}
                onChange={setRidgePeakMm}
                step={0.5}
                min={5}
                max={40}
                precision={1}
              />
              <ScrubInput
                label="NOISE FREQUENCY"
                unit="scale"
                value={ridgeFreq}
                onChange={setRidgeFreq}
                step={0.005}
                min={0.01}
                max={0.12}
                precision={3}
              />
              <div className="flex gap-2">
                <ScrubInput
                  label="OCTAVES"
                  unit="layer"
                  value={ridgeOctaves}
                  onChange={setRidgeOctaves}
                  step={1}
                  min={1}
                  max={5}
                  precision={0}
                  className="flex-1"
                />
                <button
                  onClick={() => setRidgeSeed(Math.floor(Math.random() * 99999))}
                  className="px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-blue-600 rounded-lg text-[10px] font-bold flex items-center gap-1 font-mono transition-colors"
                  title="Randomize terrain seed"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>SEED</span>
                </button>
              </div>
            </div>
          )}

          {activeEngine === 'guilloche' && (
            <div className="space-y-2">
              <ScrubInput
                label="OUTER RADIUS (R)"
                unit="ratio"
                value={guillocheOuter}
                onChange={setGuillocheOuter}
                step={0.02}
                min={0.2}
                max={1.0}
                precision={2}
              />
              <ScrubInput
                label="INNER RADIUS (r)"
                unit="ratio"
                value={guillocheInner}
                onChange={setGuillocheInner}
                step={0.01}
                min={0.05}
                max={0.8}
                precision={2}
              />
              <ScrubInput
                label="PEN DISTANCE (d)"
                unit="ratio"
                value={guillocheDist}
                onChange={setGuillocheDist}
                step={0.02}
                min={0.1}
                max={1.5}
                precision={2}
              />
              <ScrubInput
                label="REVOLUTIONS"
                unit="rev"
                value={guillocheRev}
                onChange={setGuillocheRev}
                step={1}
                min={4}
                max={48}
                precision={0}
              />
              <ScrubInput
                label="NESTED RIBBONS"
                unit="layers"
                value={guillocheRibbons}
                onChange={setGuillocheRibbons}
                step={1}
                min={1}
                max={6}
                precision={0}
              />
              <ScrubInput
                label="SECURITY MODULATION"
                unit="mm"
                value={guillocheWaveMm}
                onChange={setGuillocheWaveMm}
                step={0.1}
                min={0}
                max={3.0}
                precision={1}
              />
            </div>
          )}
        </div>

        {/* Telemetry Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[10px] font-mono">
          <div className="flex justify-between text-slate-500">
            <span>TOOLPATH STROKES:</span>
            <span className="text-slate-900 font-bold">{generatedPolylines.length}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>TOTAL VERTICES:</span>
            <span className="text-slate-900 font-bold tabular-nums">{totalPts.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>DRAW DISTANCE:</span>
            <span className="text-emerald-600 font-bold tabular-nums">{(totalDistMm / 1000).toFixed(2)} m</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>PEN LIFTS:</span>
            <span className="text-blue-600 font-bold">{activeEngine === 'spiral' ? '0 (100% UNBROKEN)' : `${generatedPolylines.length}`}</span>
          </div>
        </div>

        {/* Action Button: Load into Workspace */}
        <button
          onClick={handleLoadIntoWorkspace}
          className="w-full py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-mono cursor-pointer"
        >
          <span>LOAD INTO CAM WORKSPACE</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* RIGHT: High-Precision Live Preview */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative dot-matrix-bg">
        {/* Floating Telemetry Stamp */}
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] text-slate-500 space-y-0.5 shadow-sm font-mono">
          <div className="text-slate-900 font-bold">
            PREVIEW // {activeEngine.toUpperCase()}
          </div>
          <div>CANONICAL BOUNDS: {bounds.width.toFixed(1)} × {bounds.height.toFixed(1)} mm</div>
        </div>

        <div className="w-[520px] h-[520px] max-w-full max-h-full aspect-square relative shadow-xl rounded-2xl overflow-hidden border border-slate-300 bg-white">
          <canvas ref={previewCanvasRef} className="w-full h-full block" />
        </div>
      </div>
    </div>
  );
};
