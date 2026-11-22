'use client';

import React, { useState } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import {
  createRectangleElement,
  createCircleElement,
  createStarElement,
  createPolygonElement,
  createLineElement,
} from '@/lib/generators/shapeGenerator';
import {
  Pencil,
  Square,
  Circle,
  Star,
  Shapes,
  Minus,
  Eraser,
  MousePointer,
  Plus,
  Sliders,
  Check,
} from 'lucide-react';

export const DrawTabPanel: React.FC<{ onNavigateToPens?: () => void }> = ({ onNavigateToPens }) => {
  const {
    preset,
    pens,
    activePenId,
    setActivePenId,
    addElement,
    activeDrawTool,
    setActiveDrawTool,
  } = usePlotterStore();

  const [selectedShapeType, setSelectedShapeType] = useState<
    'rectangle' | 'circle' | 'star' | 'polygon' | 'line'
  >('rectangle');

  // Shape Configuration State
  const selectedPenId = activePenId || pens[0]?.id || 'pen-1';
  const [isSolidFill, setIsSolidFill] = useState<boolean>(false);
  const [infillSpacingMm, setInfillSpacingMm] = useState<number>(0.4);

  // Rectangle properties
  const [rectWidth, setRectWidth] = useState<number>(50);
  const [rectHeight, setRectHeight] = useState<number>(30);
  const [rectCornerRadius, setRectCornerRadius] = useState<number>(0);

  // Circle properties
  const [circleDiameter, setCircleDiameter] = useState<number>(40);

  // Star properties
  const [starPoints, setStarPoints] = useState<number>(5);
  const [starDiameter, setStarDiameter] = useState<number>(40);

  // Polygon properties
  const [polygonSides, setPolygonSides] = useState<number>(6);
  const [polygonDiameter, setPolygonDiameter] = useState<number>(40);

  // Line properties
  const [lineLength, setLineLength] = useState<number>(40);
  const [lineAngle, setLineAngle] = useState<number>(0);
  const [hasArrowhead, setHasArrowhead] = useState<boolean>(false);

  // Safe reachable center
  const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
  const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
  const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
  const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);
  const safeCenterX = (safeBedMinX + safeBedMaxX) / 2;
  const safeCenterY = (safeBedMinY + safeBedMaxY) / 2;

  const activePen = pens.find((p) => p.id === selectedPenId) || pens[0];

  const handleAddShape = () => {
    const penId = selectedPenId;
    const center = { x: safeCenterX, y: safeCenterY };

    if (selectedShapeType === 'rectangle') {
      const el = createRectangleElement(`elem_rect_${Date.now()}`, {
        widthMm: rectWidth,
        heightMm: rectHeight,
        cornerRadiusMm: rectCornerRadius,
        penId,
        isSolidFill,
        infillSpacingMm,
        center,
      });
      addElement(el);
    } else if (selectedShapeType === 'circle') {
      const el = createCircleElement(`elem_circle_${Date.now()}`, {
        radiusMm: circleDiameter / 2,
        penId,
        isSolidFill,
        infillSpacingMm,
        center,
      });
      addElement(el);
    } else if (selectedShapeType === 'star') {
      const el = createStarElement(`elem_star_${Date.now()}`, {
        points: starPoints,
        outerRadiusMm: starDiameter / 2,
        penId,
        isSolidFill,
        infillSpacingMm,
        center,
      });
      addElement(el);
    } else if (selectedShapeType === 'polygon') {
      const el = createPolygonElement(`elem_poly_${Date.now()}`, {
        sides: polygonSides,
        radiusMm: polygonDiameter / 2,
        penId,
        isSolidFill,
        infillSpacingMm,
        center,
      });
      addElement(el);
    } else if (selectedShapeType === 'line') {
      const el = createLineElement(`elem_line_${Date.now()}`, {
        lengthMm: lineLength,
        angleDeg: lineAngle,
        hasArrow: hasArrowhead,
        penId,
        center,
      });
      addElement(el);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Interactive Drawing Modes */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center justify-between">
          <span>Canvas Tool Mode</span>
          <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {activeDrawTool.toUpperCase()}
          </span>
        </label>

        <div className="grid grid-cols-3 gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveDrawTool('select')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
              activeDrawTool === 'select'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MousePointer className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Select</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawTool('pen')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
              activeDrawTool === 'pen'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Pencil className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Free Pen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawTool('eraser')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
              activeDrawTool === 'eraser'
                ? 'bg-white text-red-600 shadow-xs border border-red-200/80 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Eraser className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Eraser</span>
          </button>
        </div>
      </div>

      {/* 2. Active Pen Layer */}
      <div className="flex items-center justify-between bg-slate-50/90 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-mono shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
            style={{ backgroundColor: activePen.colorHex }}
          />
          <span className="text-slate-500 font-medium text-[11px]">Pen:</span>
          <select
            value={activePen.id}
            onChange={(e) => setActivePenId(e.target.value)}
            className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer truncate text-xs"
          >
            {pens.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {onNavigateToPens && (
          <button
            type="button"
            onClick={onNavigateToPens}
            className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline shrink-0"
            title="Configure Pen Colors & Nib Sizes in Pens tab"
          >
            Pens ↗
          </button>
        )}
      </div>

      {/* 3. Shape Inserter Studio */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-3 shadow-xs">
        <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center justify-between">
          <span>Geometric Shapes</span>
          <Shapes className="w-3.5 h-3.5 text-blue-600" />
        </label>

        {/* Shape Type Selector Buttons */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedShapeType('rectangle')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-lg transition ${
              selectedShapeType === 'rectangle'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Rectangle / Box"
          >
            <Square className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Box</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedShapeType('circle')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-lg transition ${
              selectedShapeType === 'circle'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Circle / Ellipse"
          >
            <Circle className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Circle</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedShapeType('star')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-lg transition ${
              selectedShapeType === 'star'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Star"
          >
            <Star className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Star</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedShapeType('polygon')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-lg transition ${
              selectedShapeType === 'polygon'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Polygon (Triangle, Hexagon, etc.)"
          >
            <Shapes className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Polygon</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedShapeType('line')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-lg transition ${
              selectedShapeType === 'line'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Line / Arrow"
          >
            <Minus className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Line</span>
          </button>
        </div>

        {/* Shape Specific Parameters */}
        {selectedShapeType === 'rectangle' && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Width (mm)</label>
                <input
                  type="number"
                  min="5"
                  max={preset.bedWidth}
                  value={rectWidth}
                  onChange={(e) => setRectWidth(Math.max(5, parseInt(e.target.value) || 10))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Height (mm)</label>
                <input
                  type="number"
                  min="5"
                  max={preset.bedDepth}
                  value={rectHeight}
                  onChange={(e) => setRectHeight(Math.max(5, parseInt(e.target.value) || 10))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">Corner Radius (mm)</label>
              <input
                type="number"
                min="0"
                max={Math.min(rectWidth / 2, rectHeight / 2)}
                value={rectCornerRadius}
                onChange={(e) => setRectCornerRadius(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {selectedShapeType === 'circle' && (
          <div className="space-y-2 pt-1">
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">Diameter (mm)</label>
              <input
                type="number"
                min="5"
                max={Math.min(preset.bedWidth, preset.bedDepth)}
                value={circleDiameter}
                onChange={(e) => setCircleDiameter(Math.max(5, parseInt(e.target.value) || 10))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {selectedShapeType === 'star' && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Star Points</label>
                <select
                  value={starPoints}
                  onChange={(e) => setStarPoints(parseInt(e.target.value) || 5)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                >
                  <option value={4}>4 Points</option>
                  <option value={5}>5 Points</option>
                  <option value={6}>6 Points</option>
                  <option value={8}>8 Points</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Diameter (mm)</label>
                <input
                  type="number"
                  min="10"
                  max={Math.min(preset.bedWidth, preset.bedDepth)}
                  value={starDiameter}
                  onChange={(e) => setStarDiameter(Math.max(10, parseInt(e.target.value) || 20))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {selectedShapeType === 'polygon' && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Polygon Sides</label>
                <select
                  value={polygonSides}
                  onChange={(e) => setPolygonSides(parseInt(e.target.value) || 6)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                >
                  <option value={3}>Triangle (3)</option>
                  <option value={5}>Pentagon (5)</option>
                  <option value={6}>Hexagon (6)</option>
                  <option value={8}>Octagon (8)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Diameter (mm)</label>
                <input
                  type="number"
                  min="10"
                  max={Math.min(preset.bedWidth, preset.bedDepth)}
                  value={polygonDiameter}
                  onChange={(e) => setPolygonDiameter(Math.max(10, parseInt(e.target.value) || 20))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {selectedShapeType === 'line' && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Length (mm)</label>
                <input
                  type="number"
                  min="5"
                  max={preset.bedWidth}
                  value={lineLength}
                  onChange={(e) => setLineLength(Math.max(5, parseInt(e.target.value) || 20))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Angle (deg)</label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={lineAngle}
                  onChange={(e) => setLineAngle(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasArrowhead}
                onChange={(e) => setHasArrowhead(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 accent-blue-600"
              />
              <span className="text-[11px] font-semibold text-slate-700">Add Arrow Head</span>
            </label>
          </div>
        )}

        {/* Infill Toggle for closed shapes */}
        {selectedShapeType !== 'line' && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSolidFill}
                  onChange={(e) => setIsSolidFill(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 accent-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">Hatch Infill (Solid)</span>
              </label>
              {isSolidFill && (
                <span className="text-[10px] font-mono text-blue-600 font-bold">
                  {infillSpacingMm}mm density
                </span>
              )}
            </div>

            {isSolidFill && (
              <div className="pt-1">
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={infillSpacingMm}
                  onChange={(e) => setInfillSpacingMm(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Fine (0.2mm)</span>
                  <span>Coarse (1.5mm)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button: Add Shape */}
        <button
          type="button"
          onClick={handleAddShape}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Shape to Bed</span>
        </button>
      </div>
    </div>
  );
};
