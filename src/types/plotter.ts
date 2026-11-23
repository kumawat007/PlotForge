export interface Point2D {
  x: number; // mm in Machine Space
  y: number; // mm in Machine Space
}

export interface Polyline {
  id: string;
  points: Point2D[];
  penId: string; // Maps to a PenSlot
  sourceElementId?: string;
}

export interface PenSlot {
  id: string;
  name: string; // e.g., "0.4mm Fineliner Black"
  colorHex: string; // e.g., "#111827"
  strokeWidthMm: number;
  penType?: 'fineliner' | 'gel' | 'ballpoint' | 'rollerball' | 'marker' | 'calligraphy' | 'pencil' | 'custom';
  drawSpeedMmS?: number; // custom draw speed in mm/s (e.g. 20 to 80 mm/s)
  penDownZ?: number; // custom pen down contact Z height (mm)
  penUpZ?: number; // custom pen up travel Z height (mm)
  dwellDownMs?: number; // dwell delay on pen down before move in ms
  toolChangeMessage?: string; // custom message displayed in M117 / pause comment
  enabled?: boolean; // toggle whether this pen layer is plotted (default true)
}

export interface KeepOutZone {
  id: string;
  name: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface MachinePreset {
  id: string;
  name: string;
  firmware: 'bambu' | 'marlin' | 'grbl';
  bedWidth: number; // X max (mm)
  bedDepth: number; // Y max (mm)
  minSafeX: number;
  maxSafeX: number;
  minSafeY: number;
  maxSafeY: number;
  penOffsetX: number; // Pen nib X relative to nozzle (mm)
  penOffsetY: number; // Pen nib Y relative to nozzle (mm)
  penUpZ: number; // Travel Z height (mm), e.g., 4.0
  penDownZ: number; // Draw Z height (mm), e.g., 0.0
  safeParkX: number;
  safeParkY: number;
  safeParkZ: number;
  drawFeedrate: number; // mm/min, e.g., 1800 (30 mm/s)
  travelFeedrate: number; // mm/min, e.g., 4200 (70 mm/s)
  zFeedrate: number; // mm/min, e.g., 600 (10 mm/s)
  drawAcceleration?: number; // mm/s², e.g., 1000 for smooth plotting
  travelAcceleration?: number; // mm/s², e.g., 1500 for travel
  pauseCommand: string; // e.g., "M400 U1" for Bambu, "M0" for Marlin
  keepOutZones: KeepOutZone[];
}

export interface OptimizationStats {
  originalTravelMm: number;
  optimizedTravelMm: number;
  savedMm: number;
  savedPercent: number;
  totalDrawMm: number;
  estimatedTimeSeconds: number;
}

export interface ValidationBounds {
  minPenX: number;
  maxPenX: number;
  minPenY: number;
  maxPenY: number;
  minNozzleX: number;
  maxNozzleX: number;
  minNozzleY: number;
  maxNozzleY: number;
}

export interface DrawableArea {
  minPenX: number;
  maxPenX: number;
  minPenY: number;
  maxPenY: number;
}

export interface ValidationResult {
  isValid: boolean;
  isOutOfPaper: boolean;
  errors: string[];
  paperErrors: string[];
  bounds: ValidationBounds;
  drawableArea: DrawableArea;
  paperBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

export type DesignElementType = 'svg' | 'text';

export type PaperSizeId =
  | 'full-bed'
  | 'full'
  | 'custom'
  | 'a5'
  | 'a5-square'
  | 'a6'
  | 'a4'
  | 'us-letter'
  | 'us-half-letter'
  | 'us-postcard'
  | 'index-card'
  | 'b6'
  | 'postcard';

export interface PaperPreset {
  id: PaperSizeId;
  name: string;
  widthMm: number;
  heightMm: number;
}

export interface PenMountPreset {
  id: string;
  name: string;
  offsetX: number;
  offsetY: number;
  description?: string;
}

export type BuiltinFontFamilyId =
  | 'hershey-simplex'
  | 'hershey-script'
  | 'hershey-drafting'
  | 'hershey-serif'
  | 'hershey-soft-round'
  | 'hershey-italic'
  | 'handwriting-casual'
  | 'handwriting-architect'
  | 'handwriting-signature'
  | 'handwriting-flighty'
  | 'handwriting-rose'
  | 'handwriting-antically'
  | 'handwriting-monstera';

export type FontFamilyId = BuiltinFontFamilyId | (string & {});

export interface DesignElement {
  id: string;
  name: string;
  type: DesignElementType;
  x: number; // mm in Machine Space
  y: number; // mm in Machine Space
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
  penId: string;
  visible: boolean;
  locked?: boolean;
  // Specific properties
  svgContent?: string;
  textContent?: string;
  fontSizeMm?: number;
  charSpacingMm?: number;
  lineHeightMultiplier?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: FontFamilyId;
  rawPolylines?: Polyline[];
  isSolidFill?: boolean;
  enableInfill?: boolean;
  infillSpacingMm?: number;
  hatchAngleDeg?: number;
  closedLoops?: Point2D[][];
  contentBounds?: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}
