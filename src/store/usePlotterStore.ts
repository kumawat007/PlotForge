import { create } from 'zustand';
import {
  DesignElement,
  MachinePreset,
  OptimizationStats,
  PenSlot,
  Point2D,
  Polyline,
  ValidationResult,
  PaperPreset,
  PenMountPreset,
} from '@/types/plotter';
import { BUILTIN_PRESETS, DEFAULT_PRESET, DEFAULT_PAPER_PRESETS, DEFAULT_PEN_MOUNTS } from '@/lib/gcode/presets';
import { validateToolpath } from '@/lib/gcode/validator';
import { generateGcode } from '@/lib/gcode/generator';
import { optimizeToolpath } from '@/lib/optimizer/tspOptimizer';
import { runOptimizationAsync } from '@/lib/optimizer/workerClient';
import { renderSingleStrokeText } from '@/lib/fonts/textEngine';
import { generatePolygonHatch } from '@/lib/svg/polygonInfill';
import {
  generateFlowField,
  generateSpirograph,
  generateHilbertCurve,
  generateGuilloche,
  generateTopographicContour,
} from '@/lib/generators/algorithmicGenerators';

export interface PlaybackState {
  isPlaying: boolean;
  progress: number; // 0 to 1
  speed: number; // 1, 5, 20
  currentPointIndex: number;
  totalPoints: number;
  currentPenNib: Point2D | null;
  currentNozzle: Point2D | null;
  isPenDown: boolean;
  currentPenColor: string;
}

export interface PlotterStore {
  preset: MachinePreset;
  pens: PenSlot[];
  activePenId: string;
  elements: DesignElement[];
  selectedElementId: string | null;
  polylines: Polyline[];
  optimizedPolylines: Polyline[];
  isOptimized: boolean;
  optimizationStats: OptimizationStats;
  validationResult: ValidationResult;
  generatedGcode: string;
  isGcodeDrawerOpen: boolean;
  isCommandPaletteOpen: boolean;
  isShareCardOpen: boolean;
  isWebSerialOpen: boolean;
  isSettingsModalOpen: boolean;
  isPreflightModalOpen: boolean;
  isLegalModalOpen: 'privacy' | 'terms' | null;
  paperPreset: PaperPreset;
  selectedMountPresetId: string;
  activeStudioMode: 'canvas' | 'generator' | 'gcode';
  paperTexture: 'white' | 'blueprint' | 'kraft' | 'vellum' | 'dotgrid';
  plateTextureStyle: 'pei-gold' | 'pei-black' | 'engineering-slate';
  isPerspective3D: boolean;
  activeDrawTool: 'select' | 'pen' | 'rectangle' | 'circle' | 'line' | 'eraser';
  playback: PlaybackState;
  showSimulationBar: boolean;
  canvasView: {
    showGrid: boolean;
    showTravel: boolean;
    showPaper: boolean;
    showKeepOut: boolean;
    showNozzle: boolean;
  };

  // Actions
  setPreset: (preset: MachinePreset) => void;
  updatePresetKinematics: (kinematics: Partial<MachinePreset>) => void;
  importPresetJSON: (jsonStr: string) => boolean;
  exportPresetJSON: () => string;
  setActiveStudioMode: (mode: 'canvas' | 'generator' | 'gcode') => void;

  addElement: (element: DesignElement) => void;
  duplicateElement: (id: string) => void;
  restoreCanvasElements: (elements: DesignElement[]) => void;
  addAlgorithmicArt: (
    type: 'flow' | 'spiro' | 'hilbert' | 'guilloche' | 'topo',
    options?: Record<string, any>
  ) => void;
  updateElement: (id: string, updates: Partial<DesignElement>, skipHistory?: boolean) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  centerElementOnPrintableArea: (id: string) => void;
  autoFitElementToPrintableArea: (id: string) => void;
  nudgeElement: (id: string, deltaX: number, deltaY: number) => void;
  setActiveDrawTool: (tool: 'select' | 'pen' | 'rectangle' | 'circle' | 'line' | 'eraser') => void;
  setCanvasView: (partial: Partial<{ showGrid: boolean; showTravel: boolean; showPaper: boolean; showKeepOut: boolean; showNozzle: boolean }>) => void;
  setPaperTexture: (texture: 'white' | 'blueprint' | 'kraft' | 'vellum' | 'dotgrid') => void;
  setPlateTextureStyle: (style: 'pei-gold' | 'pei-black' | 'engineering-slate') => void;
  togglePerspective3D: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShareCardOpen: (open: boolean) => void;
  setWebSerialOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setPreflightModalOpen: (open: boolean) => void;
  setLegalModalOpen: (mode: 'privacy' | 'terms' | null) => void;
  setPaperPreset: (preset: PaperPreset) => void;
  setMountPresetId: (id: string) => void;
  autoFitAllElementsToPaper: () => void;

  addPen: (pen: PenSlot) => void;
  updatePen: (id: string, updates: Partial<PenSlot>) => void;
  removePen: (id: string) => void;
  reorderPens: (fromIndex: number, toIndex: number) => void;
  setActivePenId: (id: string) => void;
  assignElementPen: (elementId: string, penId: string) => void;

  // Undo / Redo & Layer Lock
  canUndo: boolean;
  canRedo: boolean;
  history: DesignElement[][];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  toggleLockElement: (id: string) => void;
  commitHistoryState: () => void;

  recomputeToolpath: () => void;
  triggerOptimization: () => void | Promise<void>;
  setGcodeDrawerOpen: (open: boolean) => void;

  // Playback
  setShowSimulationBar: (show: boolean) => void;
  setPlayback: (partial: Partial<PlaybackState>) => void;
  togglePlay: () => void;
  setPlaybackProgress: (progress: number) => void;
  stepPlayback: (deltaTimeSec: number) => void;
}

const DEFAULT_PENS: PenSlot[] = [
  { id: 'pen-1', name: '0.4mm Fineliner Black', colorHex: '#0f172a', strokeWidthMm: 0.4 },
  { id: 'pen-2', name: '0.4mm Fineliner Emerald', colorHex: '#059669', strokeWidthMm: 0.4 },
  { id: 'pen-3', name: '0.4mm Fineliner Amber', colorHex: '#d97706', strokeWidthMm: 0.4 },
];

function transformElementToPolylines(
  elem: DesignElement,
  preset: MachinePreset
): Polyline[] {
  if (!elem.visible) return [];

  if (elem.type === 'text') {
    return renderSingleStrokeText(elem.textContent || '', {
      fontSizeMm: elem.fontSizeMm || 10,
      charSpacingMm: elem.charSpacingMm || 0,
      lineHeightMultiplier: elem.lineHeightMultiplier || 1.4,
      textAlign: elem.textAlign || 'left',
      rotation: elem.rotation || 0,
      fontFamily: elem.fontFamily || 'hershey-simplex',
      penId: elem.penId,
      sourceElementId: elem.id,
      origin: { x: elem.x, y: elem.y },
    });
  }

  if (elem.type === 'svg' && elem.rawPolylines) {
    const rad = ((elem.rotation || 0) * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    const sx = elem.scaleX || 1;
    const sy = elem.scaleY || 1;

    // Filter out previously baked-in hatch lines so contour boundaries remain clean
    const contourPolys = elem.rawPolylines.filter((p) => !p.id.includes('_hatch_'));

    const transformedContours: Polyline[] = contourPolys.map((poly) => ({
      ...poly,
      id: `${elem.id}_${poly.id}`,
      penId: elem.penId,
      sourceElementId: elem.id,
      points: poly.points.map((pt) => {
        const scaledX = pt.x * sx;
        const scaledY = pt.y * sy;
        const rx = scaledX * cosR - scaledY * sinR;
        const ry = scaledX * sinR + scaledY * cosR;
        return {
          x: rx + elem.x,
          y: ry + elem.y,
        };
      }),
    }));

    const result: Polyline[] = [...transformedContours];

    // Reactive physical mm infill hatching with smooth boustrophedon snake connection
    if (elem.isSolidFill && elem.enableInfill !== false && elem.closedLoops && elem.closedLoops.length > 0) {
      const machineLoops = elem.closedLoops.map((loop) =>
        loop.map((pt) => {
          const scaledX = pt.x * sx;
          const scaledY = pt.y * sy;
          const rx = scaledX * cosR - scaledY * sinR;
          const ry = scaledX * sinR + scaledY * cosR;
          return {
            x: rx + elem.x,
            y: ry + elem.y,
          };
        })
      );

      const spacing = elem.infillSpacingMm && elem.infillSpacingMm > 0.05 ? elem.infillSpacingMm : 0.4;
      const angle = elem.hatchAngleDeg || 0;

      const hatch = generatePolygonHatch(machineLoops, {
        spacingMm: spacing,
        angleDeg: angle,
        connectSnake: true,
        penId: elem.penId,
        sourceElementId: elem.id,
      });

      result.push(...hatch);
    }

    return result;
  }

  return [];
}

export const usePlotterStore = create<PlotterStore>((set, get) => {
  const defaultMount = DEFAULT_PEN_MOUNTS[0]; // Kumawat007 A1 Mini PIP Mount (0, -30)
  const initialPreset: MachinePreset = {
    ...DEFAULT_PRESET,
    penOffsetX: defaultMount.offsetX,
    penOffsetY: defaultMount.offsetY,
  };
  const initialPaper = DEFAULT_PAPER_PRESETS[0]; // Full Bed Canvas (100% Build Plate)
  const initialPens = DEFAULT_PENS;

  const initSafeBedMinX = Math.max(0, initialPreset.minSafeX + initialPreset.penOffsetX);
  const initSafeBedMaxX = Math.min(initialPreset.bedWidth, initialPreset.maxSafeX + initialPreset.penOffsetX);
  const initSafeBedMinY = Math.max(0, initialPreset.minSafeY + initialPreset.penOffsetY);
  const initSafeBedMaxY = Math.min(initialPreset.bedDepth, initialPreset.maxSafeY + initialPreset.penOffsetY);
  const initCenterX = (initSafeBedMinX + initSafeBedMaxX) / 2;
  const initCenterY = (initSafeBedMinY + initSafeBedMaxY) / 2;

  const initialTextElement: DesignElement = {
    id: 'elem_typography_1',
    name: 'PlotForge Studio',
    type: 'text',
    x: initCenterX,
    y: initCenterY,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    penId: initialPens[0]?.id || 'pen-1',
    visible: true,
    textContent: 'PLOTFORGE\nPEN PLOTTER STUDIO',
    fontSizeMm: 7.5,
    charSpacingMm: 0.5,
    lineHeightMultiplier: 1.4,
    textAlign: 'center',
    fontFamily: 'hershey-simplex',
  };

  const initialElements: DesignElement[] = [initialTextElement];
  const initialRaw: Polyline[] = [];
  for (const el of initialElements) {
    initialRaw.push(...transformElementToPolylines(el, initialPreset));
  }
  const initialOpt = optimizeToolpath(initialRaw, initialPreset);
  const initialValidation = validateToolpath(initialOpt.optimizedPolylines, initialPreset, initialPaper);
  const initialGcode = generateGcode(initialOpt.optimizedPolylines, initialPreset, initialPens);

  function refreshAll(
    elements: DesignElement[],
    preset: MachinePreset,
    pens: PenSlot[],
    keepOptimized: boolean = true,
    paperPreset?: PaperPreset
  ) {
    const activePaper = paperPreset || get()?.paperPreset || initialPaper;
    // Generate polylines for all elements
    const raw: Polyline[] = [];
    for (const elem of elements) {
      const polys = transformElementToPolylines(elem, preset);
      raw.push(...polys);
    }

    let activePolylines = raw;
    let optStats: OptimizationStats = {
      originalTravelMm: 0,
      optimizedTravelMm: 0,
      savedMm: 0,
      savedPercent: 0,
      totalDrawMm: 0,
      estimatedTimeSeconds: 0,
    };
    let isOpt = false;

    if (raw.length > 0) {
      const optResult = optimizeToolpath(raw, preset);
      activePolylines = optResult.optimizedPolylines;
      optStats = optResult.stats;
      isOpt = true;
    }

    const validation = validateToolpath(activePolylines, preset, activePaper);
    const gcodeResult = generateGcode(activePolylines, preset, pens);

    // Count total points for playback
    let totalPoints = 0;
    for (const p of activePolylines) {
      totalPoints += p.points.length;
    }

    set({
      preset,
      pens,
      elements,
      polylines: raw,
      optimizedPolylines: activePolylines,
      isOptimized: isOpt,
      optimizationStats: optStats,
      validationResult: validation,
      generatedGcode: gcodeResult.gcode,
      playback: {
        ...get()?.playback,
        totalPoints,
      },
    });
  }

  function commitHistory(newElements: DesignElement[]) {
    const curHistory = get()?.history || [initialElements];
    const curIndex = get()?.historyIndex ?? 0;
    const nextHistory = curHistory.slice(0, curIndex + 1);
    const cloned = JSON.parse(JSON.stringify(newElements)) as DesignElement[];
    nextHistory.push(cloned);
    if (nextHistory.length > 30) {
      nextHistory.shift();
    }
    const newIndex = nextHistory.length - 1;
    set({
      history: nextHistory,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false,
    });
  }

  return {
    preset: initialPreset,
    pens: initialPens,
    activePenId: initialPens[0]?.id || 'pen-1',
    elements: initialElements,
    selectedElementId: initialTextElement.id,
    canUndo: false,
    canRedo: false,
    history: [JSON.parse(JSON.stringify(initialElements))],
    historyIndex: 0,
    polylines: initialRaw,
    optimizedPolylines: initialOpt.optimizedPolylines,
    isOptimized: true,
    optimizationStats: initialOpt.stats,
    validationResult: initialValidation,
    generatedGcode: initialGcode.gcode,
    isGcodeDrawerOpen: false,
    isCommandPaletteOpen: false,
    isShareCardOpen: false,
    isWebSerialOpen: false,
    isSettingsModalOpen: false,
    isPreflightModalOpen: false,
    isLegalModalOpen: null,
    paperPreset: initialPaper,
    selectedMountPresetId: defaultMount.id,
    activeStudioMode: 'canvas',
    paperTexture: 'white',
    plateTextureStyle: 'pei-gold',
    isPerspective3D: false,
    activeDrawTool: 'select',
    canvasView: {
      showGrid: true,
      showTravel: true,
      showPaper: true,
      showKeepOut: true,
      showNozzle: true,
    },
    playback: {
      isPlaying: false,
      progress: 0,
      speed: 5,
      currentPointIndex: 0,
      totalPoints: 0,
      currentPenNib: null,
      currentNozzle: null,
      isPenDown: false,
      currentPenColor: '#10b981',
    },
    showSimulationBar: false,

    setPreset: (preset) => {
      let activePaper = get().paperPreset;
      if (activePaper.id === 'full-bed') {
        const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
        const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
        const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
        const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);
        const reachableW = safeBedMaxX - safeBedMinX;
        const reachableH = safeBedMaxY - safeBedMinY;
        activePaper = {
          id: 'full-bed',
          name: `Full Draw Bed (${reachableW} × ${reachableH} mm)`,
          widthMm: reachableW,
          heightMm: reachableH,
        };
        set({ paperPreset: activePaper });
      }
      refreshAll(get().elements, preset, get().pens, true, activePaper);
    },

    updatePresetKinematics: (kinematics) => {
      const updatedPreset = { ...get().preset, ...kinematics };
      const match = DEFAULT_PEN_MOUNTS.find(
        (m) => m.offsetX === updatedPreset.penOffsetX && m.offsetY === updatedPreset.penOffsetY
      );
      set({ selectedMountPresetId: match ? match.id : 'custom' });
      refreshAll(get().elements, updatedPreset, get().pens, true);
    },

    importPresetJSON: (jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr) as MachinePreset;
        if (
          parsed.id &&
          typeof parsed.bedWidth === 'number' &&
          typeof parsed.bedDepth === 'number'
        ) {
          refreshAll(get().elements, parsed, get().pens, get().isOptimized);
          return true;
        }
      } catch (err) {
        console.error('Invalid preset JSON', err);
      }
      return false;
    },

    exportPresetJSON: () => {
      return JSON.stringify(get().preset, null, 2);
    },

    setActiveStudioMode: (mode) => {
      set({ activeStudioMode: mode });
      if (mode === 'gcode') {
        set({ isGcodeDrawerOpen: true });
      }
    },

    addElement: (element) => {
      const elements = [...get().elements, element];
      set({ selectedElementId: element.id });
      commitHistory(elements);
      refreshAll(elements, get().preset, get().pens, false);
    },

    duplicateElement: (id) => {
      const elem = get().elements.find((el) => el.id === id);
      if (!elem) return;
      const newElem: DesignElement = {
        ...elem,
        id: `elem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: elem.name ? `${elem.name} (Copy)` : 'Copy',
        x: elem.x + 5,
        y: elem.y + 5,
        locked: false,
      };
      const elements = [...get().elements, newElem];
      set({ selectedElementId: newElem.id });
      commitHistory(elements);
      refreshAll(elements, get().preset, get().pens, false);
    },

    restoreCanvasElements: (restoredElements) => {
      if (!restoredElements || restoredElements.length === 0) return;
      set({
        elements: restoredElements,
        selectedElementId: restoredElements[0]?.id || null,
      });
      commitHistory(restoredElements);
      refreshAll(restoredElements, get().preset, get().pens, false);
    },

    addAlgorithmicArt: (type, options = {}) => {
      const { preset, pens } = get();
      const defaultPenId = pens[0]?.id || 'pen-1';
      const w = Math.min(preset.bedWidth, preset.bedDepth) * 0.72;
      const h = w;
      const bounds = { width: w, height: h };

      let rawPolys: Polyline[] = [];
      let artName = 'Algorithmic Art';

      if (type === 'flow') {
        rawPolys = generateFlowField(bounds, { ...options, penId: defaultPenId });
        artName = 'Flow Field Streamlines';
      } else if (type === 'spiro') {
        rawPolys = generateSpirograph(bounds, { ...options, penId: defaultPenId });
        artName = 'Spirograph Harmonograph';
      } else if (type === 'hilbert') {
        rawPolys = generateHilbertCurve(bounds, { ...options, penId: defaultPenId });
        artName = 'Continuous Hilbert Curve';
      } else if (type === 'guilloche') {
        rawPolys = generateGuilloche(bounds, { ...options, penId: defaultPenId });
        artName = 'Guilloche Security Wave';
      } else if (type === 'topo') {
        rawPolys = generateTopographicContour(bounds, { ...options, penId: defaultPenId });
        artName = 'Topographic Elevation';
      }

      const centerX = (preset.minSafeX + preset.maxSafeX) / 2 + preset.penOffsetX;
      const centerY = (preset.minSafeY + preset.maxSafeY) / 2 + preset.penOffsetY;

      const newElem: DesignElement = {
        id: `gen_${Date.now()}`,
        name: artName,
        type: 'svg',
        x: Math.round((centerX - w / 2) * 10) / 10,
        y: Math.round((centerY - h / 2) * 10) / 10,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        penId: defaultPenId,
        visible: true,
        rawPolylines: rawPolys,
      };

      const elements = [...get().elements, newElem];
      set({ selectedElementId: newElem.id });
      commitHistory(elements);
      refreshAll(elements, get().preset, get().pens, false);
    },

    updateElement: (id, updates, skipHistory = false) => {
      const elem = get().elements.find((el) => el.id === id);
      if (!elem) return;
      if (elem.locked && !('locked' in updates)) {
        return; // Guard against modifying locked elements
      }
      const elements = get().elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      );
      if (!skipHistory) {
        commitHistory(elements);
      }
      refreshAll(elements, get().preset, get().pens, false);
    },

    removeElement: (id) => {
      const elem = get().elements.find((el) => el.id === id);
      if (elem?.locked) return; // Cannot delete locked element
      const elements = get().elements.filter((el) => el.id !== id);
      const selectedElementId =
        get().selectedElementId === id ? null : get().selectedElementId;
      set({ selectedElementId });
      commitHistory(elements);
      refreshAll(elements, get().preset, get().pens, false);
    },

    toggleLockElement: (id) => {
      const elem = get().elements.find((el) => el.id === id);
      if (!elem) return;
      const newLocked = !elem.locked;
      const elements = get().elements.map((el) =>
        el.id === id ? { ...el, locked: newLocked } : el
      );
      commitHistory(elements);
      refreshAll(elements, get().preset, get().pens, false);
    },

    commitHistoryState: () => {
      commitHistory(get().elements);
    },

    undo: () => {
      const { history, historyIndex, preset, pens } = get();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        const prevElements = JSON.parse(JSON.stringify(history[nextIndex])) as DesignElement[];
        set({
          historyIndex: nextIndex,
          canUndo: nextIndex > 0,
          canRedo: true,
          selectedElementId: prevElements.some((e) => e.id === get().selectedElementId)
            ? get().selectedElementId
            : prevElements[0]?.id || null,
        });
        refreshAll(prevElements, preset, pens, false);
      }
    },

    redo: () => {
      const { history, historyIndex, preset, pens } = get();
      if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        const nextElements = JSON.parse(JSON.stringify(history[nextIndex])) as DesignElement[];
        set({
          historyIndex: nextIndex,
          canUndo: true,
          canRedo: nextIndex < history.length - 1,
          selectedElementId: nextElements.some((e) => e.id === get().selectedElementId)
            ? get().selectedElementId
            : nextElements[0]?.id || null,
        });
        refreshAll(nextElements, preset, pens, false);
      }
    },

    selectElement: (id) => {
      set({ selectedElementId: id });
    },

    centerElementOnPrintableArea: (id) => {
      const elem = get().elements.find((el) => el.id === id);
      if (!elem || elem.locked) return;
      const { preset, paperPreset } = get();

      const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
      const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
      const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
      const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);

      const targetCenterX = (safeBedMinX + safeBedMaxX) / 2;
      const targetCenterY = (safeBedMinY + safeBedMaxY) / 2;

      const polys = transformElementToPolylines(elem, preset);
      if (polys.length === 0) {
        get().updateElement(id, { x: targetCenterX, y: targetCenterY });
        return;
      }
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of polys) {
        for (const pt of p.points) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
      }
      const curCenterX = (minX + maxX) / 2;
      const curCenterY = (minY + maxY) / 2;
      const deltaX = targetCenterX - curCenterX;
      const deltaY = targetCenterY - curCenterY;
      get().updateElement(id, {
        x: Math.round((elem.x + deltaX) * 10) / 10,
        y: Math.round((elem.y + deltaY) * 10) / 10,
      });
    },

    nudgeElement: (id, deltaX, deltaY) => {
      const elem = get().elements.find((el) => el.id === id);
      if (!elem || elem.locked) return;
      const newX = Math.round((elem.x + deltaX) * 10) / 10;
      const newY = Math.round((elem.y + deltaY) * 10) / 10;
      get().updateElement(id, { x: newX, y: newY });
    },

    setActiveDrawTool: (tool) => {
      set({ activeDrawTool: tool });
    },

    autoFitElementToPrintableArea: (id) => {
      const elem = get().elements.find((el) => el.id === id);
      if (!elem) return;
      const { preset, paperPreset } = get();
      const rawPolys = transformElementToPolylines(
        { ...elem, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        preset
      );
      if (rawPolys.length === 0) return;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of rawPolys) {
        for (const pt of p.points) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
      }

      const elemW = Math.max(1, maxX - minX);
      const elemH = Math.max(1, maxY - minY);

      const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
      const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
      const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
      const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);

      const isFullBed = !paperPreset || paperPreset.id === 'full-bed';
      const availableW = isFullBed ? (safeBedMaxX - safeBedMinX) : paperPreset.widthMm;
      const availableH = isFullBed ? (safeBedMaxY - safeBedMinY) : paperPreset.heightMm;
      const safeW = Math.max(20, availableW - 16);
      const safeH = Math.max(20, availableH - 16);

      const scale = Math.min(safeW / elemW, safeH / elemH);
      const targetCenterX = (safeBedMinX + safeBedMaxX) / 2;
      const targetCenterY = (safeBedMinY + safeBedMaxY) / 2;
      const rawCenterX = (minX + maxX) / 2;
      const rawCenterY = (minY + maxY) / 2;

      if (elem.type === 'text') {
        const newFontSize = Math.max(3, Math.round(((elem.fontSizeMm || 10) * scale) * 10) / 10);
        get().updateElement(id, {
          fontSizeMm: newFontSize,
          x: Math.round((targetCenterX - rawCenterX * scale) * 10) / 10,
          y: Math.round((targetCenterY - rawCenterY * scale) * 10) / 10,
          rotation: 0,
        });
      } else {
        get().updateElement(id, {
          scaleX: Math.round(scale * 100) / 100,
          scaleY: Math.round(scale * 100) / 100,
          x: Math.round((targetCenterX - rawCenterX * scale) * 10) / 10,
          y: Math.round((targetCenterY - rawCenterY * scale) * 10) / 10,
          rotation: 0,
        });
      }
    },

    setCanvasView: (partial) => {
      set({ canvasView: { ...get().canvasView, ...partial } });
    },

    setPaperTexture: (texture) => {
      set({ paperTexture: texture });
    },

    setPlateTextureStyle: (style) => {
      set({ plateTextureStyle: style });
    },

    togglePerspective3D: () => {
      set({ isPerspective3D: !get().isPerspective3D });
    },

    setCommandPaletteOpen: (open) => {
      set({ isCommandPaletteOpen: open });
    },

    setShareCardOpen: (open) => {
      set({ isShareCardOpen: open });
    },

    setWebSerialOpen: (open) => {
      set({ isWebSerialOpen: open });
    },

    setSettingsModalOpen: (open) => {
      set({ isSettingsModalOpen: open });
    },

    setPreflightModalOpen: (open) => {
      set({ isPreflightModalOpen: open });
    },

    setLegalModalOpen: (mode) => {
      set({ isLegalModalOpen: mode });
    },

    setPaperPreset: (paper) => {
      set({ paperPreset: paper });
      refreshAll(get().elements, get().preset, get().pens, true, paper);
    },

    setMountPresetId: (mountId) => {
      const found = DEFAULT_PEN_MOUNTS.find((m) => m.id === mountId);
      if (found) {
        set({ selectedMountPresetId: mountId });
        const updatedPreset = {
          ...get().preset,
          penOffsetX: found.offsetX,
          penOffsetY: found.offsetY,
        };
        refreshAll(get().elements, updatedPreset, get().pens, true);
      } else {
        set({ selectedMountPresetId: mountId });
      }
    },

    autoFitAllElementsToPaper: () => {
      const { elements, preset, paperPreset } = get();
      if (elements.length === 0) return;

      const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
      const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
      const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
      const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);

      const isFullBed = !paperPreset || paperPreset.id === 'full-bed';
      const availableW = isFullBed ? (safeBedMaxX - safeBedMinX) : paperPreset.widthMm;
      const availableH = isFullBed ? (safeBedMaxY - safeBedMinY) : paperPreset.heightMm;

      const safeCenterX = (safeBedMinX + safeBedMaxX) / 2;
      const safeCenterY = (safeBedMinY + safeBedMaxY) / 2;
      const targetW = Math.max(30, availableW - 16);
      const targetH = Math.max(30, availableH - 16);

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const elem of elements) {
        const raw = transformElementToPolylines(elem, preset);
        for (const p of raw) {
          for (const pt of p.points) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }
        }
      }

      if (minX === Infinity) return;
      const curW = Math.max(1, maxX - minX);
      const curH = Math.max(1, maxY - minY);
      const curCenterX = (minX + maxX) / 2;
      const curCenterY = (minY + maxY) / 2;

      const scaleMultiplier = Math.min(targetW / curW, targetH / curH, 1.25);

      const updated = elements.map((elem) => {
        const isText = elem.type === 'text';
        const newFontSizeMm = isText
          ? Math.max(3, Math.round(((elem.fontSizeMm || 10) * scaleMultiplier) * 10) / 10)
          : elem.fontSizeMm;
        const newScaleX = (elem.scaleX || 1) * scaleMultiplier;
        const newScaleY = (elem.scaleY || 1) * scaleMultiplier;
        const newX = safeCenterX + (elem.x - curCenterX) * scaleMultiplier;
        const newY = safeCenterY + (elem.y - curCenterY) * scaleMultiplier;
        return {
          ...elem,
          fontSizeMm: newFontSizeMm,
          scaleX: Math.round(newScaleX * 100) / 100,
          scaleY: Math.round(newScaleY * 100) / 100,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        };
      });

      refreshAll(updated, preset, get().pens, get().isOptimized);
    },

    addPen: (pen) => {
      const pens = [...get().pens, pen];
      refreshAll(get().elements, get().preset, pens, get().isOptimized);
    },

    updatePen: (id, updates) => {
      const pens = get().pens.map((p) => (p.id === id ? { ...p, ...updates } : p));
      refreshAll(get().elements, get().preset, pens, get().isOptimized);
    },

    removePen: (id) => {
      if (get().pens.length <= 1) return; // Keep at least one pen
      const pens = get().pens.filter((p) => p.id !== id);
      const fallbackPenId = pens[0].id;
      const elements = get().elements.map((el) =>
        el.penId === id ? { ...el, penId: fallbackPenId } : el
      );
      const activePenId = get().activePenId === id ? fallbackPenId : get().activePenId;
      set({ activePenId });
      refreshAll(elements, get().preset, pens, get().isOptimized);
    },

    reorderPens: (fromIndex, toIndex) => {
      const pens = [...get().pens];
      if (fromIndex < 0 || fromIndex >= pens.length || toIndex < 0 || toIndex >= pens.length) return;
      const [moved] = pens.splice(fromIndex, 1);
      pens.splice(toIndex, 0, moved);
      refreshAll(get().elements, get().preset, pens, get().isOptimized);
    },

    setActivePenId: (id) => {
      set({ activePenId: id });
    },

    assignElementPen: (elementId, penId) => {
      const elements = get().elements.map((el) => (el.id === elementId ? { ...el, penId } : el));
      refreshAll(elements, get().preset, get().pens, get().isOptimized);
    },

    recomputeToolpath: () => {
      refreshAll(get().elements, get().preset, get().pens, false);
    },

    triggerOptimization: async () => {
      const state = get();
      if (state.polylines.length === 0) {
        refreshAll(state.elements, state.preset, state.pens, true);
        return;
      }
      try {
        const optResult = await runOptimizationAsync({
          polylines: state.polylines,
          preset: state.preset,
        });
        const validation = validateToolpath(optResult.optimizedPolylines, state.preset);
        const gcodeResult = generateGcode(optResult.optimizedPolylines, state.preset, state.pens);

        let totalPoints = 0;
        for (const p of optResult.optimizedPolylines) {
          totalPoints += p.points.length;
        }

        set({
          optimizedPolylines: optResult.optimizedPolylines,
          isOptimized: true,
          optimizationStats: optResult.stats,
          validationResult: validation,
          generatedGcode: gcodeResult.gcode,
          playback: {
            ...get().playback,
            totalPoints,
          },
        });
      } catch (err) {
        console.warn('Worker optimization failed, falling back to synchronous:', err);
        refreshAll(get().elements, get().preset, get().pens, true);
      }
    },

    setGcodeDrawerOpen: (open) => {
      set({
        isGcodeDrawerOpen: open,
        activeStudioMode: open ? 'gcode' : get().activeStudioMode === 'gcode' ? 'canvas' : get().activeStudioMode,
      });
    },

    setPlayback: (partial) => {
      set({ playback: { ...get().playback, ...partial } });
    },

    setShowSimulationBar: (show: boolean) => {
      set({ showSimulationBar: show });
    },

    togglePlay: () => {
      const pb = get().playback;
      const nextPlaying = !pb.isPlaying;
      set({
        showSimulationBar: nextPlaying ? true : get().showSimulationBar,
        playback: { ...pb, isPlaying: nextPlaying },
      });
    },

    setPlaybackProgress: (progress) => {
      const clamped = Math.max(0, Math.min(1, progress));
      const activePolys = get().optimizedPolylines;
      const { preset, pens } = get();

      // Find point along activePolylines at progress
      let totalPts = 0;
      for (const p of activePolys) totalPts += p.points.length;
      if (totalPts === 0) {
        set({
          playback: {
            ...get().playback,
            progress: clamped,
            currentPointIndex: 0,
            currentPenNib: null,
            currentNozzle: null,
          },
        });
        return;
      }

      const targetPtIdx = Math.floor(clamped * (totalPts - 1));
      let count = 0;
      let foundNib: Point2D | null = null;
      let foundPenColor = '#10b981';

      for (const poly of activePolys) {
        if (count + poly.points.length > targetPtIdx) {
          const localIdx = targetPtIdx - count;
          foundNib = poly.points[localIdx];
          const pen = pens.find((p) => p.id === poly.penId);
          if (pen) foundPenColor = pen.colorHex;
          break;
        }
        count += poly.points.length;
      }

      const foundNozzle = foundNib
        ? {
            x: foundNib.x - preset.penOffsetX,
            y: foundNib.y - preset.penOffsetY,
          }
        : null;

      set({
        playback: {
          ...get().playback,
          progress: clamped,
          currentPointIndex: targetPtIdx,
          currentPenNib: foundNib,
          currentNozzle: foundNozzle,
          currentPenColor: foundPenColor,
          isPenDown: true,
        },
      });
    },

    stepPlayback: (deltaTimeSec) => {
      const pb = get().playback;
      if (!pb.isPlaying) return;

      const activePolys = get().optimizedPolylines;
      if (activePolys.length === 0) return;

      const stats = get().optimizationStats;
      const totalTime = stats.estimatedTimeSeconds || 60;
      const stepProgress = (deltaTimeSec * pb.speed) / totalTime;
      const newProgress = pb.progress + stepProgress;

      if (newProgress >= 1) {
        get().setPlaybackProgress(1);
        set({ playback: { ...get().playback, isPlaying: false, progress: 1 } });
      } else {
        get().setPlaybackProgress(newProgress);
      }
    },
  };
});
