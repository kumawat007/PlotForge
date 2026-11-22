'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { Point2D } from '@/types/plotter';
import { plotterAudio } from '@/lib/audio/plotterSound';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Route,
  Box,
  RotateCw,
  Trash2,
  MousePointer,
  Pencil,
  Square,
  Circle,
  Eraser,
  Play,
  Pause,
  Crosshair,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  createFreehandStrokeElement,
  createRectangleElement,
  createCircleElement,
} from '@/lib/generators/shapeGenerator';

export const PlotCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    preset,
    pens,
    activePenId,
    elements,
    selectedElementId,
    updateElement,
    removeElement,
    selectElement,
    centerElementOnPrintableArea,
    autoFitElementToPrintableArea,
    nudgeElement,
    toggleLockElement,
    commitHistoryState,
    undo,
    redo,
    addElement,
    activeDrawTool,
    setActiveDrawTool,
    updatePen,
    optimizedPolylines,
    polylines,
    isOptimized,
    playback,
    stepPlayback,
    showSimulationBar,
    setShowSimulationBar,
    togglePlay,
    canvasView,
    setCanvasView,
    paperPreset,
    paperTexture,
    plateTextureStyle,
    isPerspective3D,
    togglePerspective3D,
  } = usePlotterStore();

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(2.5); // screen pixels per mm
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [elementDragOffset, setElementDragOffset] = useState({ x: 0, y: 0 });
  const [hoverCoords, setHoverCoords] = useState<Point2D | null>(null);

  // Freehand & Shape Interactive Drawing States
  const [freehandPoints, setFreehandPoints] = useState<Point2D[]>([]);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [shapeStartMachine, setShapeStartMachine] = useState<Point2D | null>(null);
  const [shapePreviewEnd, setShapePreviewEnd] = useState<Point2D | null>(null);

  // Auto-center bed plate in viewport
  const handleFitToBed = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth < 50 || clientHeight < 50) return;

    const padding = 70;
    const availW = Math.max(100, clientWidth - padding * 2);
    const availH = Math.max(100, clientHeight - padding * 2);

    const fitScale = Math.min(availW / preset.bedWidth, availH / preset.bedDepth);
    const clampedScale = Math.max(0.4, Math.min(6.0, fitScale));

    const bedW = preset.bedWidth * clampedScale;
    const bedH = preset.bedDepth * clampedScale;

    const newPanX = (clientWidth - bedW) / 2;
    const newPanY = (bedH - clientHeight) / 2;

    setScale(clampedScale);
    setPan({ x: newPanX, y: newPanY });
  }, [preset.bedWidth, preset.bedDepth]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      handleFitToBed();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [handleFitToBed]);

  // Keyboard Nudge & Deletion Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        selectElement(null);
        setActiveDrawTool('select');
        return;
      }

      // Undo / Redo keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (selectedElementId) {
        const curElem = elements.find((el) => el.id === selectedElementId);
        if (curElem?.locked) {
          // Locked elements cannot be nudged or deleted from canvas
          return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          removeElement(selectedElementId);
          selectElement(null);
          return;
        }

        const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nudgeElement(selectedElementId, -step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nudgeElement(selectedElementId, step, 0);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          nudgeElement(selectedElementId, 0, step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          nudgeElement(selectedElementId, 0, -step);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, elements, nudgeElement, removeElement, selectElement, setActiveDrawTool, undo, redo]);

  // Proximity Eraser Handler
  const eraseNearPoint = useCallback(
    (pt: Point2D) => {
      const eraserRadius = 6.0; // 6mm eraser threshold
      const activePolys = isOptimized ? optimizedPolylines : polylines;
      for (const poly of activePolys) {
        for (const p of poly.points) {
          const d = Math.hypot(p.x - pt.x, p.y - pt.y);
          if (d <= eraserRadius) {
            if (poly.sourceElementId) {
              removeElement(poly.sourceElementId);
              if (selectedElementId === poly.sourceElementId) {
                selectElement(null);
              }
              return;
            }
          }
        }
      }
    },
    [isOptimized, optimizedPolylines, polylines, removeElement, selectedElementId, selectElement]
  );

  // Animation frame loop for simulation & audio synthesis
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      if (playback.isPlaying) {
        stepPlayback(dt);
        const speedRatio = Math.min(1.0, (preset.drawFeedrate / 6000) * (playback.speed / 5));
        plotterAudio.updateMotion(speedRatio, playback.isPenDown);
      } else {
        plotterAudio.stopAll();
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      plotterAudio.stopAll();
    };
  }, [playback.isPlaying, playback.speed, playback.isPenDown, preset.drawFeedrate, stepPlayback]);

  // Coordinate mapping
  const toScreen = useCallback(
    (pt: Point2D, canvasHeight: number): Point2D => {
      let sx = pt.x * scale + pan.x;
      let sy = canvasHeight - pt.y * scale + pan.y;

      if (isPerspective3D) {
        // Isometric 2.5D affine projection
        const relX = sx - pan.x;
        const relY = sy - pan.y;
        sx = pan.x + (relX - relY * 0.35) * 0.95;
        sy = pan.y + (relX * 0.2 + relY * 0.85);
      }

      return { x: sx, y: sy };
    },
    [scale, pan, isPerspective3D]
  );

  const toMachine = useCallback(
    (screenPt: Point2D, canvasHeight: number): Point2D => {
      return {
        x: (screenPt.x - pan.x) / scale,
        y: (canvasHeight + pan.y - screenPt.y) / scale,
      };
    },
    [scale, pan]
  );

  // Paper Position in Machine Space (clamped within physical bed & safe nozzle reach)
  const paperSafeCenter = useMemo(() => {
    const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
    const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
    const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
    const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);

    return {
      x: (safeBedMinX + safeBedMaxX) / 2,
      y: (safeBedMinY + safeBedMaxY) / 2,
    };
  }, [preset]);

  const paperBounds = useMemo(() => {
    const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
    const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
    const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
    const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);

    if (paperPreset.id === 'full-bed') {
      const w = safeBedMaxX - safeBedMinX;
      const h = safeBedMaxY - safeBedMinY;
      return {
        minX: safeBedMinX,
        maxX: safeBedMaxX,
        minY: safeBedMinY,
        maxY: safeBedMaxY,
        width: w,
        height: h,
      };
    }
    const minX = paperSafeCenter.x - paperPreset.widthMm / 2;
    const maxX = paperSafeCenter.x + paperPreset.widthMm / 2;
    const minY = paperSafeCenter.y - paperPreset.heightMm / 2;
    const maxY = paperSafeCenter.y + paperPreset.heightMm / 2;
    return { minX, maxX, minY, maxY, width: paperPreset.widthMm, height: paperPreset.heightMm };
  }, [paperSafeCenter, paperPreset, preset]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
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

    // 1. Bed Background & Textured PEI Plate
    const bedBL = toScreen({ x: 0, y: 0 }, height);
    const bedTR = toScreen({ x: preset.bedWidth, y: preset.bedDepth }, height);
    const bedW = preset.bedWidth * scale;
    const bedH = preset.bedDepth * scale;
    const bedLeft = bedBL.x;
    const bedTop = bedTR.y;

    // Plate Ambient Soft Studio Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;

    // Plate Base
    const radius = 8;
    ctx.fillStyle = plateTextureStyle === 'pei-gold' ? '#261C0D' : '#1E293B';
    ctx.beginPath();
    ctx.roundRect(bedLeft, bedTop, bedW, bedH, radius);
    ctx.fill();
    ctx.restore();

    // PEI Texture Finish Gradient
    const peiGrad = ctx.createLinearGradient(bedLeft, bedTop, bedLeft + bedW, bedTop + bedH);
    if (plateTextureStyle === 'pei-gold') {
      peiGrad.addColorStop(0, '#2F2312');
      peiGrad.addColorStop(0.3, '#3D2F17');
      peiGrad.addColorStop(0.7, '#2A1F10');
      peiGrad.addColorStop(1, '#1C140A');
    } else if (plateTextureStyle === 'pei-black') {
      peiGrad.addColorStop(0, '#1E293B');
      peiGrad.addColorStop(0.5, '#162032');
      peiGrad.addColorStop(1, '#0F172A');
    } else {
      peiGrad.addColorStop(0, '#334155');
      peiGrad.addColorStop(0.5, '#1E293B');
      peiGrad.addColorStop(1, '#0F172A');
    }

    ctx.fillStyle = peiGrad;
    ctx.beginPath();
    ctx.roundRect(bedLeft, bedTop, bedW, bedH, radius);
    ctx.fill();

    // Metallic Plate Border & Chamfer
    ctx.strokeStyle = plateTextureStyle === 'pei-gold' ? '#D97706' : '#475569';
    ctx.lineWidth = plateTextureStyle === 'pei-gold' ? 2 : 1.5;
    ctx.stroke();

    // Clean Technical Label on Top of Bed
    ctx.fillStyle = '#64748B';
    ctx.font = '600 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${preset.name} • ${preset.bedWidth} × ${preset.bedDepth} mm • Metric Grid (mm)`,
      bedLeft + bedW / 2,
      bedTop - 8
    );
    ctx.textAlign = 'left';

    // 2. Technical Bed Grid (10mm major, 1mm minor)
    if (canvasView.showGrid) {
      const showMinor = scale >= 2.0;

      if (showMinor) {
        ctx.strokeStyle = plateTextureStyle === 'pei-gold' ? '#B4530925' : '#33415530';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x <= preset.bedWidth; x += 1) {
          if (x % 10 === 0) continue;
          const p1 = toScreen({ x, y: 0 }, height);
          const p2 = toScreen({ x, y: preset.bedDepth }, height);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        for (let y = 0; y <= preset.bedDepth; y += 1) {
          if (y % 10 === 0) continue;
          const p1 = toScreen({ x: 0, y }, height);
          const p2 = toScreen({ x: preset.bedWidth, y }, height);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = plateTextureStyle === 'pei-gold' ? '#F59E0B40' : '#47556960';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      for (let x = 0; x <= preset.bedWidth; x += 10) {
        const p1 = toScreen({ x, y: 0 }, height);
        const p2 = toScreen({ x, y: preset.bedDepth }, height);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      for (let y = 0; y <= preset.bedDepth; y += 10) {
        const p1 = toScreen({ x: 0, y }, height);
        const p2 = toScreen({ x: preset.bedWidth, y }, height);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();
    }

    // 3. Keep-Out Zones with Subtle Shaded Warning Strip
    if (canvasView.showKeepOut) {
      for (const zone of preset.keepOutZones) {
        const zBL = toScreen({ x: zone.xMin, y: zone.yMin }, height);
        const zTR = toScreen({ x: zone.xMax, y: zone.yMax }, height);
        const zw = (zone.xMax - zone.xMin) * scale;
        const zh = (zone.yMax - zone.yMin) * scale;

        // Clean subtle translucent strip
        ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
        ctx.fillRect(zBL.x, zTR.y, zw, zh);

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.60)';
        ctx.lineWidth = 1;
        ctx.strokeRect(zBL.x, zTR.y, zw, zh);

        // Vertical label inside the strip
        ctx.save();
        ctx.translate(zBL.x + zw / 2, zTR.y + zh / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.90)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`CUTTER EXCLUSION ZONE`, 0, 3);
        ctx.restore();
      }
    }

    // 3.5. Unreachable Pen Reach Limit Zone (Back zone when pen has forward offset)
    const unreachableYMin = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);
    if (unreachableYMin < preset.bedDepth) {
      const unBL = toScreen({ x: 0, y: unreachableYMin }, height);
      const unTR = toScreen({ x: preset.bedWidth, y: preset.bedDepth }, height);
      const unW = preset.bedWidth * scale;
      const unH = (preset.bedDepth - unreachableYMin) * scale;
      const unX = unBL.x;
      const unY = unTR.y;

      ctx.save();
      // Subtle neutral clearance shading
      ctx.fillStyle = 'rgba(100, 116, 139, 0.06)';
      ctx.fillRect(unX, unY, unW, unH);

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)';
      ctx.lineWidth = 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(unX, unY, unW, unH);
      ctx.clip();
      const stripeSpacing = 12 * scale;
      for (let sx = -unH; sx < unW + unH; sx += stripeSpacing) {
        ctx.moveTo(unX + sx, unY + unH);
        ctx.lineTo(unX + sx + unH, unY);
      }
      ctx.stroke();
      ctx.restore();

      // Dividing dashed limit boundary line
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4 * scale, 3 * scale]);
      ctx.beginPath();
      ctx.moveTo(unX, unBL.y);
      ctx.lineTo(unX + unW, unBL.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Clear engineering note
      const offsetMm = Math.round(preset.bedDepth - unreachableYMin);
      ctx.fillStyle = '#64748B';
      ctx.font = '600 9px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${offsetMm}mm FRONT MOUNT CLEARANCE (Y > ${unreachableYMin}mm) • REACHABLE: ${preset.bedWidth} × ${unreachableYMin} mm`,
        unX + unW / 2,
        unY + unH / 2 + 3
      );
      ctx.restore();
    }

    // 4. CRISP WHITE PAPER SHEET ON BED (The "Paper on Bed" Mental Model)
    if (canvasView.showPaper) {
      const pBL = toScreen({ x: paperBounds.minX, y: paperBounds.minY }, height);
      const pTR = toScreen({ x: paperBounds.maxX, y: paperBounds.maxY }, height);
      const pw = paperBounds.width * scale;
      const ph = paperBounds.height * scale;
      const px = pBL.x;
      const py = pTR.y;

      // Realistic Soft Paper Shadow & Crisp White Sheet with 2px rounded corners
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      if (paperTexture === 'kraft') {
        ctx.fillStyle = '#F5EBE1';
      } else if (paperTexture === 'vellum') {
        ctx.fillStyle = '#F8FAFC';
      } else if (paperTexture === 'blueprint') {
        ctx.fillStyle = '#E0F2FE'; // Authentic light cyan drafting sheet
      } else {
        ctx.fillStyle = '#FFFFFF'; // Pristine clean art paper
      }

      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 2);
      ctx.fill();
      ctx.restore();

      // Clean subtle paper hairline boundary
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 2);
      ctx.stroke();

      // Dot grid texture on paper if selected
      if (paperTexture === 'dotgrid') {
        ctx.fillStyle = '#CBD5E1';
        const dotSpacing = 10 * scale;
        if (dotSpacing >= 8) {
          for (let dx = px + dotSpacing; dx < px + pw - 2; dx += dotSpacing) {
            for (let dy = py + dotSpacing; dy < py + ph - 2; dy += dotSpacing) {
              ctx.fillRect(dx, dy, 1, 1);
            }
          }
        }
      }

      // Clean subtle Paper watermark
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 9px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `${paperPreset.name} • ${paperBounds.width} × ${paperBounds.height} mm`,
        px + 10,
        py + 16
      );
    }

    // 4.5. PHYSICAL METRIC RULER (mm) ALONG BED AXES
    ctx.save();
    const rulerColor = '#1E293B'; // Sharp slate for ruler ticks
    const textColor = '#334155'; // Clean slate for ruler numbers
    const tickSubtle = 'rgba(15, 23, 42, 0.35)';

    // X Axis Metric Ruler along Bottom (Y = 0)
    for (let x = 0; x <= preset.bedWidth; x += 1) {
      const p = toScreen({ x, y: 0 }, height);
      const isMajor = x % 10 === 0;
      const isMedium = x % 5 === 0;

      if (isMajor) {
        ctx.strokeStyle = rulerColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 8);
        ctx.stroke();

        const shouldShowLabel = scale >= 1.5 || x % 20 === 0;
        if (shouldShowLabel) {
          ctx.font = '600 9px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          const label = x === preset.bedWidth ? `${x}mm` : `${x}`;
          // Crisp white halo backing for maximum legibility on any plate
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.strokeText(label, p.x, p.y - 10);
          ctx.fillStyle = textColor;
          ctx.fillText(label, p.x, p.y - 10);
        }
      } else if (isMedium) {
        ctx.strokeStyle = rulerColor;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 5);
        ctx.stroke();
      } else if (scale >= 1.8) {
        ctx.strokeStyle = tickSubtle;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 3);
        ctx.stroke();
      }
    }

    // Y Axis Metric Ruler along Left (X = 0)
    for (let y = 0; y <= preset.bedDepth; y += 1) {
      const p = toScreen({ x: 0, y }, height);
      const isMajor = y % 10 === 0;
      const isMedium = y % 5 === 0;

      if (isMajor) {
        ctx.strokeStyle = rulerColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 8, p.y);
        ctx.stroke();

        const shouldShowLabel = scale >= 1.5 || y % 20 === 0;
        if (shouldShowLabel && y > 0) {
          ctx.font = '600 9px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          const label = y === preset.bedDepth ? `${y}mm` : `${y}`;
          // Crisp white halo backing
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.strokeText(label, p.x + 10, p.y + 3);
          ctx.fillStyle = textColor;
          ctx.fillText(label, p.x + 10, p.y + 3);
        }
      } else if (isMedium) {
        ctx.strokeStyle = rulerColor;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 5, p.y);
        ctx.stroke();
      } else if (scale >= 1.8) {
        ctx.strokeStyle = tickSubtle;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 3, p.y);
        ctx.stroke();
      }
    }

    // (0, 0) Origin Crosshair
    const pOrigin = toScreen({ x: 0, y: 0 }, height);
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pOrigin.x, pOrigin.y, 4, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.arc(pOrigin.x, pOrigin.y, 1.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.font = '600 9px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#EA580C';
    ctx.textAlign = 'left';
    ctx.fillText(' (0,0) ORIGIN', pOrigin.x + 5, pOrigin.y - 5);

    ctx.restore();

    // 5. Toolpath & Realistic Solid Fill Rendering
    const activePolys = isOptimized ? optimizedPolylines : polylines;

    // A. Pen-up air travel moves with dashed trace
    if (canvasView.showTravel) {
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = '#D9770690';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let lastPoint: Point2D | null = { x: preset.safeParkX, y: preset.safeParkY };

      for (const poly of activePolys) {
        if (poly.points.length === 0) continue;
        const startPt = poly.points[0];
        if (lastPoint) {
          const s1 = toScreen(lastPoint, height);
          const s2 = toScreen(startPt, height);
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
        }
        lastPoint = poly.points[poly.points.length - 1];
      }
      ctx.stroke();
      ctx.restore();
    }

    // B. Pen-down drawing strokes (Crisp Pen Ink on Paper)
    const penColorMap = new Map<string, string>();
    const penWidthMap = new Map<string, number>();
    const penEnabledMap = new Map<string, boolean>();
    for (const p of pens) {
      penColorMap.set(p.id, p.colorHex);
      penWidthMap.set(p.id, p.strokeWidthMm || 0.4);
      penEnabledMap.set(p.id, p.enabled !== false);
    }

    // C. Realistic Solid Ink Fill for SVG elements with fill-rule="evenodd" (matching PicSVG & Real Drawing)
    for (const elem of elements) {
      if (!elem.visible || elem.type !== 'svg' || !elem.isSolidFill || elem.enableInfill === false || penEnabledMap.get(elem.penId) === false) continue;

      const loopsToDraw =
        elem.closedLoops ||
        (elem.rawPolylines
          ?.filter((poly) => {
            if (poly.points.length < 3) return false;
            const p0 = poly.points[0];
            const pe = poly.points[poly.points.length - 1];
            return Math.hypot(p0.x - pe.x, p0.y - pe.y) < 0.1;
          })
          .map((p) => p.points) || []);

      if (loopsToDraw.length === 0) continue;

      const rad = ((elem.rotation || 0) * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      const sx = elem.scaleX || 1;
      const sy = elem.scaleY || 1;
      const color = penColorMap.get(elem.penId) || '#0F172A';

      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();

      for (const loop of loopsToDraw) {
        if (loop.length < 3) continue;
        const p0 = loop[0];
        const scX0 = p0.x * sx;
        const scY0 = p0.y * sy;
        const mX0 = scX0 * cosR - scY0 * sinR + elem.x;
        const mY0 = scX0 * sinR + scY0 * cosR + elem.y;
        const s0 = toScreen({ x: mX0, y: mY0 }, height);
        ctx.moveTo(s0.x, s0.y);

        for (let i = 1; i < loop.length; i++) {
          const pt = loop[i];
          const scX = pt.x * sx;
          const scY = pt.y * sy;
          const machineX = scX * cosR - scY * sinR + elem.x;
          const machineY = scX * sinR + scY * cosR + elem.y;
          const sPt = toScreen({ x: machineX, y: machineY }, height);
          ctx.lineTo(sPt.x, sPt.y);
        }
        ctx.closePath();
      }

      ctx.fill('evenodd');
      ctx.restore();
    }

    // D. Pen strokes and infill hatch lines
    for (const poly of activePolys) {
      if (poly.points.length < 2 || penEnabledMap.get(poly.penId) === false) continue;
      const color = penColorMap.get(poly.penId) || '#0F172A';
      const strokeWidthMm = penWidthMap.get(poly.penId) || 0.4;
      const screenLineWidth = Math.max(1.2, strokeWidthMm * scale * 0.9);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = screenLineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const p0 = toScreen(poly.points[0], height);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < poly.points.length; i++) {
        const pt = toScreen(poly.points[i], height);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // C. Collision / Out-of-Paper Warning Highlights
    ctx.save();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#DC2626';
    ctx.shadowBlur = 8;

    for (const poly of activePolys) {
      for (let i = 0; i < poly.points.length - 1; i++) {
        const pt = poly.points[i];
        const nx = pt.x - preset.penOffsetX;
        const ny = pt.y - preset.penOffsetY;

        // Check if outside paper OR outside machine bed OR inside keep-out zones
        const isOutsidePaper =
          pt.x < paperBounds.minX ||
          pt.x > paperBounds.maxX ||
          pt.y < paperBounds.minY ||
          pt.y > paperBounds.maxY;

        const isHardwareHazard =
          nx < preset.minSafeX ||
          nx > preset.maxSafeX ||
          ny < preset.minSafeY ||
          ny > preset.maxSafeY;

        let isInKeepOut = false;
        for (const zone of preset.keepOutZones) {
          if (nx >= zone.xMin && nx <= zone.xMax && ny >= zone.yMin && ny <= zone.yMax) {
            isInKeepOut = true;
            break;
          }
        }

        if (isOutsidePaper || isHardwareHazard || isInKeepOut) {
          const s1 = toScreen(poly.points[i], height);
          const s2 = toScreen(poly.points[i + 1], height);
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // 5.5. Live Interactive Freehand & Shape Previews
    if (freehandPoints.length > 0) {
      const activePen = pens[0];
      const color = activePen ? activePen.colorHex : '#2563EB';
      const strokeW = Math.max(1.5, (activePen?.strokeWidthMm || 0.4) * scale);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const p0 = toScreen(freehandPoints[0], height);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < freehandPoints.length; i++) {
        const pt = toScreen(freehandPoints[i], height);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (shapeStartMachine && shapePreviewEnd) {
      const sStart = toScreen(shapeStartMachine, height);
      const sEnd = toScreen(shapePreviewEnd, height);
      ctx.save();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      if (activeDrawTool === 'rectangle') {
        const rx = Math.min(sStart.x, sEnd.x);
        const ry = Math.min(sStart.y, sEnd.y);
        const rw = Math.abs(sEnd.x - sStart.x);
        const rh = Math.abs(sEnd.y - sStart.y);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (activeDrawTool === 'circle') {
        const r = Math.hypot(sEnd.x - sStart.x, sEnd.y - sStart.y);
        ctx.beginPath();
        ctx.arc(sStart.x, sStart.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (activeDrawTool === 'eraser' && hoverCoords) {
      const sHover = toScreen(hoverCoords, height);
      const rScreen = 6.0 * scale;
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sHover.x, sHover.y, rScreen, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 6. Selected Element Visual Bounding Box
    if (selectedElementId) {
      const sel = elements.find((el) => el.id === selectedElementId);
      if (sel) {
        const selPolys = activePolys.filter((p) => p.sourceElementId === sel.id);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of selPolys) {
          for (const pt of p.points) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }
        }

        if (minX !== Infinity) {
          const bBL = toScreen({ x: minX, y: minY }, height);
          const bTR = toScreen({ x: maxX, y: maxY }, height);
          const bw = (maxX - minX) * scale;
          const bh = (maxY - minY) * scale;

          const isLocked = Boolean(sel.locked);

          ctx.save();
          ctx.strokeStyle = isLocked ? '#D97706' : '#2563EB';
          ctx.setLineDash(isLocked ? [3, 3] : [4, 4]);
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bBL.x, bTR.y, bw, bh);

          if (isLocked) {
            // Draw a stylish amber locked indicator badge at top-right
            ctx.fillStyle = '#FEF3C7';
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1;
            const badgeW = 46;
            const badgeH = 16;
            ctx.roundRect(bBL.x + bw - badgeW, bTR.y - badgeH - 3, badgeW, badgeH, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#B45309';
            ctx.font = '700 9px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔒 LOCKED', bBL.x + bw - badgeW / 2, bTR.y - badgeH / 2 - 2);
          } else {
            // 4 Corner Selection Grips (Figma Style: White square with crisp blue border)
            const gripSize = 7;
            const drawGrip = (gx: number, gy: number) => {
              ctx.fillStyle = '#FFFFFF';
              ctx.strokeStyle = '#2563EB';
              ctx.lineWidth = 1.5;
              ctx.fillRect(gx - gripSize / 2, gy - gripSize / 2, gripSize, gripSize);
              ctx.strokeRect(gx - gripSize / 2, gy - gripSize / 2, gripSize, gripSize);
            };
            drawGrip(bBL.x, bTR.y);
            drawGrip(bBL.x + bw, bTR.y);
            drawGrip(bBL.x, bBL.y);
            drawGrip(bBL.x + bw, bBL.y);
          }

          ctx.restore();
        }
      }
    }

    // 7. Dual-Cursor Simulation Playback (Carriage & Nib)
    if (canvasView.showNozzle && playback.currentPenNib && playback.currentNozzle) {
      const nibScreen = toScreen(playback.currentPenNib, height);
      const nozzleScreen = toScreen(playback.currentNozzle, height);

      ctx.save();

      // Kinematic Link Arm
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = '#2563EBaa';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(nibScreen.x, nibScreen.y);
      ctx.lineTo(nozzleScreen.x, nozzleScreen.y);
      ctx.stroke();

      // Toolhead Carriage
      const carW = 26;
      const carH = 20;
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(nozzleScreen.x - carW / 2, nozzleScreen.y - carH / 2, carW, carH, 4);
      ctx.fill();
      ctx.stroke();

      // Pen Nib Contact Point
      const penColor = playback.currentPenColor || '#059669';
      if (playback.isPenDown) {
        ctx.fillStyle = `${penColor}44`;
        ctx.beginPath();
        ctx.arc(nibScreen.x, nibScreen.y, 8, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.fillStyle = penColor;
      ctx.beginPath();
      ctx.arc(nibScreen.x, nibScreen.y, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }, [
    scale,
    pan,
    preset,
    pens,
    elements,
    selectedElementId,
    optimizedPolylines,
    polylines,
    isOptimized,
    playback,
    canvasView,
    paperPreset,
    paperBounds,
    paperTexture,
    plateTextureStyle,
    isPerspective3D,
    freehandPoints,
    shapeStartMachine,
    shapePreviewEnd,
    activeDrawTool,
    hoverCoords,
    toScreen,
  ]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.max(0.3, Math.min(10, scale * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  // Mouse drag & element selection
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseScreen: Point2D = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const mouseMachine = toMachine(mouseScreen, canvas.clientHeight);

    // 1. Freehand Pen Tool
    if (activeDrawTool === 'pen' && e.button === 0) {
      setIsDrawingFreehand(true);
      setFreehandPoints([mouseMachine]);
      return;
    }

    // 2. Shape Drag Tools (Box / Circle)
    if ((activeDrawTool === 'rectangle' || activeDrawTool === 'circle') && e.button === 0) {
      setShapeStartMachine(mouseMachine);
      setShapePreviewEnd(mouseMachine);
      return;
    }

    // 3. Eraser Tool
    if (activeDrawTool === 'eraser' && e.button === 0) {
      eraseNearPoint(mouseMachine);
      return;
    }

    // 4. Default Select & Move Tool
    if (e.button === 0) {
      if (selectedElementId) {
        const sel = elements.find((el) => el.id === selectedElementId);
        if (sel) {
          const dx = mouseMachine.x - sel.x;
          const dy = mouseMachine.y - sel.y;
          const distMm = Math.sqrt(dx * dx + dy * dy);
          if (distMm <= 30) {
            if (!sel.locked) {
              setIsDraggingElement(true);
              setElementDragOffset({ x: dx, y: dy });
            }
            return;
          }
        }
      }

      // Check click proximity to any element's polylines
      const activePolys = isOptimized ? optimizedPolylines : polylines;
      let clickedElementId: string | null = null;
      let minClickDist = 8; // 8mm threshold

      for (const poly of activePolys) {
        for (const pt of poly.points) {
          const dist = Math.hypot(pt.x - mouseMachine.x, pt.y - mouseMachine.y);
          if (dist < minClickDist) {
            minClickDist = dist;
            clickedElementId = poly.sourceElementId ?? null;
          }
        }
      }

      if (clickedElementId) {
        selectElement(clickedElementId);
        const sel = elements.find((el) => el.id === clickedElementId);
        if (sel) {
          if (!sel.locked) {
            setIsDraggingElement(true);
            setElementDragOffset({ x: mouseMachine.x - sel.x, y: mouseMachine.y - sel.y });
          }
          return;
        }
      } else {
        // If clicked blank canvas, deselect
        selectElement(null);
      }
    }

    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseScreen: Point2D = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const machinePt = toMachine(mouseScreen, canvas.clientHeight);
    setHoverCoords({
      x: Math.round(machinePt.x * 10) / 10,
      y: Math.round(machinePt.y * 10) / 10,
    });

    if (isDrawingFreehand) {
      const last = freehandPoints[freehandPoints.length - 1];
      if (last) {
        const d = Math.hypot(machinePt.x - last.x, machinePt.y - last.y);
        if (d >= 0.5) {
          setFreehandPoints((prev) => [...prev, machinePt]);
        }
      }
      return;
    }

    if (shapeStartMachine) {
      setShapePreviewEnd(machinePt);
      return;
    }

    if (activeDrawTool === 'eraser' && e.buttons === 1) {
      eraseNearPoint(machinePt);
      return;
    }

    if (isDraggingElement && selectedElementId) {
      const cur = elements.find((el) => el.id === selectedElementId);
      if (cur?.locked) {
        setIsDraggingElement(false);
        return;
      }
      updateElement(selectedElementId, {
        x: Math.round((machinePt.x - elementDragOffset.x) * 10) / 10,
        y: Math.round((machinePt.y - elementDragOffset.y) * 10) / 10,
      }, true);
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawingFreehand) {
      setIsDrawingFreehand(false);
      if (freehandPoints.length >= 2) {
        const activePen = activePenId || pens[0]?.id || 'pen-1';
        const strokeEl = createFreehandStrokeElement(
          `elem_stroke_${Date.now()}`,
          freehandPoints,
          activePen,
          0.2
        );
        if (strokeEl) {
          addElement(strokeEl);
          selectElement(strokeEl.id);
        }
      }
      setFreehandPoints([]);
      return;
    }

    if (shapeStartMachine && shapePreviewEnd) {
      const w = Math.abs(shapePreviewEnd.x - shapeStartMachine.x);
      const h = Math.abs(shapePreviewEnd.y - shapeStartMachine.y);
      const activePen = activePenId || pens[0]?.id || 'pen-1';

      if (activeDrawTool === 'rectangle' && w >= 3 && h >= 3) {
        const cx = (shapeStartMachine.x + shapePreviewEnd.x) / 2;
        const cy = (shapeStartMachine.y + shapePreviewEnd.y) / 2;
        const el = createRectangleElement(`elem_rect_${Date.now()}`, {
          widthMm: Math.round(w * 10) / 10,
          heightMm: Math.round(h * 10) / 10,
          penId: activePen,
          center: { x: cx, y: cy },
        });
        addElement(el);
        selectElement(el.id);
      } else if (activeDrawTool === 'circle') {
        const radius = Math.hypot(shapePreviewEnd.x - shapeStartMachine.x, shapePreviewEnd.y - shapeStartMachine.y);
        if (radius >= 2) {
          const el = createCircleElement(`elem_circle_${Date.now()}`, {
            radiusMm: Math.round(radius * 10) / 10,
            penId: activePen,
            center: shapeStartMachine,
          });
          addElement(el);
          selectElement(el.id);
        }
      }
      setShapeStartMachine(null);
      setShapePreviewEnd(null);
      return;
    }

    if (isDraggingElement) {
      commitHistoryState();
    }
    setIsPanning(false);
    setIsDraggingElement(false);
  };

  // Selected Element Floating Toolbar Calculation
  const selectedElement = elements.find((el) => el.id === selectedElementId);
  const selectedBoundsInfo = useMemo(() => {
    if (!selectedElement || !containerRef.current) return null;
    const activePolys = isOptimized ? optimizedPolylines : polylines;
    const selPolys = activePolys.filter((p) => p.sourceElementId === selectedElement.id);
    if (selPolys.length === 0) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of selPolys) {
      for (const pt of p.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    }

    if (minX === Infinity) return null;

    const canvasH = containerRef.current.clientHeight || 600;
    const bBL = toScreen({ x: minX, y: minY }, canvasH);
    const bTR = toScreen({ x: maxX, y: maxY }, canvasH);

    const screenCenterX = (bBL.x + bTR.x) / 2;
    const screenTopY = Math.min(bBL.y, bTR.y);

    return {
      widthMm: Math.round((maxX - minX) * 10) / 10,
      heightMm: Math.round((maxY - minY) * 10) / 10,
      screenX: Math.max(160, Math.min((containerRef.current.clientWidth || 800) - 160, screenCenterX)),
      screenY: Math.max(60, screenTopY - 48),
    };
  }, [selectedElement, isOptimized, optimizedPolylines, polylines, toScreen]);

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 h-full w-full bg-[#F1F5F9] overflow-hidden select-none dot-matrix-bg ${
        activeDrawTool === 'pen'
          ? 'cursor-crosshair'
          : activeDrawTool === 'eraser'
          ? 'cursor-cell'
          : activeDrawTool === 'rectangle' || activeDrawTool === 'circle'
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoverCoords(null);
        }}
        className="w-full h-full block"
      />

      {/* PERSISTENT CANVAS DRAWING TOOLBAR (Visible only when in active drawing tool mode) */}
      {activeDrawTool !== 'select' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.08)] rounded-full px-2 py-1 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => setActiveDrawTool('select')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Select & Move Tool (V / Esc)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="text-[11px]">Select</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawTool('pen')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              activeDrawTool === 'pen'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Freehand Pen Draw Tool"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="text-[11px]">Free Pen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawTool('rectangle')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              activeDrawTool === 'rectangle'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Drag to Draw Box Tool"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="text-[11px]">Box</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawTool('circle')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              activeDrawTool === 'circle'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Drag to Draw Circle Tool"
          >
            <Circle className="w-3.5 h-3.5" />
            <span className="text-[11px]">Circle</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={() => setActiveDrawTool('eraser')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              activeDrawTool === 'eraser'
                ? 'bg-red-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:text-red-600 hover:bg-red-50'
            }`}
            title="Eraser Tool - Click or drag near paths to delete"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="text-[11px]">Eraser</span>
          </button>
        </div>
      )}

      {/* CONTEXTUAL FLOATING TOOLBAR (Clean Minimalist Figma Style) */}
      {selectedElement && selectedBoundsInfo && (
        <div
          className="absolute z-30 flex items-center gap-1 bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.12)] rounded-full px-2.5 py-1 text-xs font-mono text-slate-800 transition-all -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${selectedBoundsInfo.screenX}px`,
            top: `${Math.max(16, selectedBoundsInfo.screenY)}px`,
          }}
        >
          {/* Dimensions Badge */}
          <span className="text-[10px] text-slate-400 font-mono px-1 border-r border-slate-200 tabular-nums">
            {selectedBoundsInfo.widthMm} × {selectedBoundsInfo.heightMm} mm
          </span>

          {/* Lock / Unlock Toggle Button */}
          <button
            onClick={() => toggleLockElement(selectedElement.id)}
            className={`p-1 rounded-full transition active:scale-90 ${
              selectedElement.locked
                ? 'bg-amber-100 text-amber-700 font-bold hover:bg-amber-200'
                : 'hover:bg-slate-100 text-slate-600 hover:text-amber-600'
            }`}
            title={selectedElement.locked ? 'Unlock Element' : 'Lock Element (Prevent Move & Delete)'}
          >
            {selectedElement.locked ? (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
          </button>

          {!selectedElement.locked && (
            <>
              {/* Rotate 90 deg */}
              <button
                onClick={() =>
                  updateElement(selectedElement.id, {
                    rotation: ((selectedElement.rotation || 0) + 90) % 360,
                  })
                }
                className="p-1 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-full transition active:scale-90"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Center on Paper */}
              <button
                onClick={() => centerElementOnPrintableArea(selectedElement.id)}
                className="p-1 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-full transition active:scale-90"
                title="Center on Bed"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              {/* Fit to Paper */}
              <button
                onClick={() => autoFitElementToPrintableArea(selectedElement.id)}
                className="px-2 py-0.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-full text-[10px] font-semibold transition active:scale-95"
                title="Scale to fit Paper Sheet"
              >
                Fit
              </button>

              <div className="w-px h-3 bg-slate-200 mx-0.5" />

              {/* Delete */}
              <button
                onClick={() => removeElement(selectedElement.id)}
                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full transition active:scale-90"
                title="Delete Element (Delete key)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {selectedElement.locked && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-mono">
              Locked
            </span>
          )}
        </div>
      )}

      {/* BOTTOM-LEFT: Minimal Viewport & View Controls */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-3 py-1.5 text-[10px] font-mono flex items-center gap-1.5 text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] z-10">
        <button
          onClick={() => setScale((s) => Math.min(10, s * 1.25))}
          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition active:scale-90"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.3, s * 0.8))}
          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition active:scale-90"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFitToBed}
          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition active:scale-90"
          title="Reset View / Fit Bed to Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

        <button
          onClick={() => setCanvasView({ showGrid: !canvasView.showGrid })}
          className={`p-1.5 rounded-lg transition ${
            canvasView.showGrid ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80' : 'text-slate-400 hover:text-slate-700'
          }`}
          title={canvasView.showGrid ? "Hide Grid" : "Show Grid"}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setCanvasView({ showTravel: !canvasView.showTravel })}
          className={`p-1.5 rounded-lg transition ${
            canvasView.showTravel ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200/80' : 'text-slate-400 hover:text-slate-700'
          }`}
          title={canvasView.showTravel ? "Hide Travel Moves" : "Show Travel Moves"}
        >
          <Route className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={togglePerspective3D}
          className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
            isPerspective3D ? 'bg-orange-50 text-[#EA580C] font-bold border border-orange-200/80' : 'text-slate-400 hover:text-slate-700'
          }`}
          title="Toggle 2.5D Isometric Tilt"
        >
          <Box className="w-3.5 h-3.5" />
          <span className="text-[9px]">{isPerspective3D ? '2.5D' : '2D'}</span>
        </button>

        <button
          onClick={() => {
            if (!showSimulationBar) {
              setShowSimulationBar(true);
              if (!playback.isPlaying) togglePlay();
            } else {
              setShowSimulationBar(false);
            }
          }}
          className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
            showSimulationBar ? 'bg-orange-50 text-[#EA580C] font-bold border border-orange-200/80' : 'text-slate-500 hover:text-slate-800'
          }`}
          title="Toggle Toolpath Simulation Timeline (Space to play)"
        >
          {playback.isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-[#EA580C]" />
          ) : (
            <Play className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="text-[9px]">Simulate</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

        <div className="tabular-nums flex items-center gap-1.5 text-slate-500 px-1">
          <span>X: <b className="text-slate-900 font-bold">{hoverCoords ? hoverCoords.x : 0}</b></span>
          <span>Y: <b className="text-slate-900 font-bold">{hoverCoords ? hoverCoords.y : 0}</b> mm</span>
        </div>
      </div>
    </div>
  );
};
