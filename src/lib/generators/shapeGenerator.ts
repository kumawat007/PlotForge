import { Point2D, Polyline, DesignElement } from '@/types/plotter';
import { simplifyPolylineRDP } from '../optimizer/tspOptimizer';

/**
 * Shape & Vector Geometry Engine for Pen Plotters
 * Generates mathematically precise, closed vector contours and clean hatching loops.
 */

export interface RectangleOptions {
  widthMm: number;
  heightMm: number;
  cornerRadiusMm?: number;
  penId: string;
  isSolidFill?: boolean;
  infillSpacingMm?: number;
  center?: Point2D;
}

export interface CircleOptions {
  radiusMm: number;
  radiusYMm?: number; // For ellipse
  segments?: number;
  penId: string;
  isSolidFill?: boolean;
  infillSpacingMm?: number;
  center?: Point2D;
}

export interface StarOptions {
  points?: number;
  outerRadiusMm: number;
  innerRadiusMm?: number;
  penId: string;
  isSolidFill?: boolean;
  infillSpacingMm?: number;
  center?: Point2D;
}

export interface PolygonOptions {
  sides: number;
  radiusMm: number;
  penId: string;
  isSolidFill?: boolean;
  infillSpacingMm?: number;
  center?: Point2D;
}

export interface LineOptions {
  lengthMm: number;
  angleDeg?: number;
  hasArrow?: boolean;
  penId: string;
  center?: Point2D;
}

/**
 * Generates a rectangle centered at (0, 0) with optional rounded corners.
 */
export function generateRectangleGeometry(
  widthMm: number,
  heightMm: number,
  cornerRadiusMm: number = 0
): { points: Point2D[]; closedLoop: Point2D[] } {
  const w = Math.max(1, widthMm);
  const h = Math.max(1, heightMm);
  const maxR = Math.min(w / 2, h / 2);
  const r = Math.max(0, Math.min(maxR, cornerRadiusMm));

  const halfW = w / 2;
  const halfH = h / 2;
  const pts: Point2D[] = [];

  if (r <= 0.1) {
    // Sharp rectangle
    pts.push({ x: -halfW, y: -halfH });
    pts.push({ x: halfW, y: -halfH });
    pts.push({ x: halfW, y: halfH });
    pts.push({ x: -halfW, y: halfH });
    pts.push({ x: -halfW, y: -halfH }); // Close contour
  } else {
    // Rounded rectangle using 8-segment arc corners
    const arcSegs = 8;
    // Bottom-right corner
    for (let i = 0; i <= arcSegs; i++) {
      const angle = -Math.PI / 2 + (i / arcSegs) * (Math.PI / 2);
      pts.push({
        x: halfW - r + Math.cos(angle) * r,
        y: -halfH + r + Math.sin(angle) * r,
      });
    }
    // Top-right corner
    for (let i = 0; i <= arcSegs; i++) {
      const angle = (i / arcSegs) * (Math.PI / 2);
      pts.push({
        x: halfW - r + Math.cos(angle) * r,
        y: halfH - r + Math.sin(angle) * r,
      });
    }
    // Top-left corner
    for (let i = 0; i <= arcSegs; i++) {
      const angle = Math.PI / 2 + (i / arcSegs) * (Math.PI / 2);
      pts.push({
        x: -halfW + r + Math.cos(angle) * r,
        y: halfH - r + Math.sin(angle) * r,
      });
    }
    // Bottom-left corner
    for (let i = 0; i <= arcSegs; i++) {
      const angle = Math.PI + (i / arcSegs) * (Math.PI / 2);
      pts.push({
        x: -halfW + r + Math.cos(angle) * r,
        y: -halfH + r + Math.sin(angle) * r,
      });
    }
    pts.push({ ...pts[0] }); // Close loop
  }

  // Closed loop excludes redundant closing point for Clipper infill
  const closedLoop = pts.slice(0, pts.length - 1);
  return { points: pts, closedLoop };
}

/**
 * Generates circle or ellipse centered at (0, 0).
 */
export function generateCircleGeometry(
  radiusXMm: number,
  radiusYMm: number = radiusXMm,
  segments: number = 64
): { points: Point2D[]; closedLoop: Point2D[] } {
  const rx = Math.max(0.5, radiusXMm);
  const ry = Math.max(0.5, radiusYMm);
  const segs = Math.max(16, segments);
  const pts: Point2D[] = [];

  for (let i = 0; i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    pts.push({
      x: Math.round(Math.cos(angle) * rx * 1000) / 1000,
      y: Math.round(Math.sin(angle) * ry * 1000) / 1000,
    });
  }

  const closedLoop = pts.slice(0, pts.length - 1);
  return { points: pts, closedLoop };
}

/**
 * Generates an N-point regular Star centered at (0, 0).
 */
export function generateStarGeometry(
  points: number = 5,
  outerRadiusMm: number = 20,
  innerRadiusMm?: number
): { points: Point2D[]; closedLoop: Point2D[] } {
  const n = Math.max(3, points);
  const rOuter = Math.max(1, outerRadiusMm);
  const rInner = innerRadiusMm ? Math.max(0.5, innerRadiusMm) : rOuter * 0.45;

  const pts: Point2D[] = [];
  const totalVertices = n * 2;

  for (let i = 0; i <= totalVertices; i++) {
    const angle = (i / totalVertices) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push({
      x: Math.round(Math.cos(angle) * r * 1000) / 1000,
      y: Math.round(Math.sin(angle) * r * 1000) / 1000,
    });
  }

  const closedLoop = pts.slice(0, pts.length - 1);
  return { points: pts, closedLoop };
}

/**
 * Generates a regular polygon (Triangle, Pentagon, Hexagon, Octagon, etc.).
 */
export function generatePolygonGeometry(
  sides: number = 6,
  radiusMm: number = 20
): { points: Point2D[]; closedLoop: Point2D[] } {
  const n = Math.max(3, sides);
  const r = Math.max(1, radiusMm);
  const pts: Point2D[] = [];

  for (let i = 0; i <= n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({
      x: Math.round(Math.cos(angle) * r * 1000) / 1000,
      y: Math.round(Math.sin(angle) * r * 1000) / 1000,
    });
  }

  const closedLoop = pts.slice(0, pts.length - 1);
  return { points: pts, closedLoop };
}

/**
 * Generates a straight line or arrow line.
 */
export function generateLineGeometry(
  lengthMm: number = 40,
  angleDeg: number = 0,
  hasArrow: boolean = false
): { polylines: Polyline[]; bounds: { width: number; height: number } } {
  const len = Math.max(1, lengthMm);
  const rad = (angleDeg * Math.PI) / 180;
  const halfLen = len / 2;

  const p1: Point2D = {
    x: Math.round(-halfLen * Math.cos(rad) * 1000) / 1000,
    y: Math.round(-halfLen * Math.sin(rad) * 1000) / 1000,
  };
  const p2: Point2D = {
    x: Math.round(halfLen * Math.cos(rad) * 1000) / 1000,
    y: Math.round(halfLen * Math.sin(rad) * 1000) / 1000,
  };

  const polylines: Polyline[] = [
    {
      id: 'main_line',
      penId: 'pen-1',
      points: [p1, p2],
    },
  ];

  if (hasArrow) {
    const arrowLen = Math.min(6, len * 0.25);
    const arrowAngle1 = rad + Math.PI * 0.85;
    const arrowAngle2 = rad - Math.PI * 0.85;

    const barb1: Point2D = {
      x: Math.round((p2.x + Math.cos(arrowAngle1) * arrowLen) * 1000) / 1000,
      y: Math.round((p2.y + Math.sin(arrowAngle1) * arrowLen) * 1000) / 1000,
    };
    const barb2: Point2D = {
      x: Math.round((p2.x + Math.cos(arrowAngle2) * arrowLen) * 1000) / 1000,
      y: Math.round((p2.y + Math.sin(arrowAngle2) * arrowLen) * 1000) / 1000,
    };

    polylines.push({
      id: 'arrow_head',
      penId: 'pen-1',
      points: [barb1, p2, barb2],
    });
  }

  const w = Math.max(1, Math.abs(p2.x - p1.x));
  const h = Math.max(1, Math.abs(p2.y - p1.y));
  return { polylines, bounds: { width: w, height: h } };
}

/**
 * Creates a DesignElement for a Straight Line or Arrow.
 */
export function createLineElement(
  id: string,
  options: LineOptions
): DesignElement {
  const geom = generateLineGeometry(
    options.lengthMm,
    options.angleDeg ?? 0,
    options.hasArrow ?? false
  );
  const cx = options.center?.x ?? 0;
  const cy = options.center?.y ?? 0;

  return {
    id,
    name: options.hasArrow
      ? `Arrow (${Math.round(options.lengthMm)}mm)`
      : `Line (${Math.round(options.lengthMm)}mm)`,
    type: 'svg',
    x: cx,
    y: cy,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    penId: options.penId,
    visible: true,
    rawPolylines: geom.polylines.map((p) => ({ ...p, penId: options.penId })),
    contentBounds: {
      minX: -geom.bounds.width / 2,
      maxX: geom.bounds.width / 2,
      minY: -geom.bounds.height / 2,
      maxY: geom.bounds.height / 2,
      width: geom.bounds.width,
      height: geom.bounds.height,
    },
  };
}

/**
 * Smooths and simplifies raw freehand mouse/stylus points.
 * Applies Douglas-Peucker decimation followed by 1 pass of Chaikin subdivision.
 */
export function smoothFreehandPoints(rawPoints: Point2D[], toleranceMm: number = 0.2): Point2D[] {
  if (rawPoints.length <= 2) return rawPoints;

  // 1. Decimate redundant micro-jitter using RDP
  const decimated = simplifyPolylineRDP(rawPoints, toleranceMm);
  if (decimated.length <= 2) return decimated;

  // 2. Chaikin corner-cutting smoothing pass
  const smoothed: Point2D[] = [decimated[0]];
  for (let i = 0; i < decimated.length - 1; i++) {
    const p0 = decimated[i];
    const p1 = decimated[i + 1];

    const q: Point2D = {
      x: Math.round((0.75 * p0.x + 0.25 * p1.x) * 100) / 100,
      y: Math.round((0.75 * p0.y + 0.25 * p1.y) * 100) / 100,
    };
    const r: Point2D = {
      x: Math.round((0.25 * p0.x + 0.75 * p1.x) * 100) / 100,
      y: Math.round((0.25 * p0.y + 0.75 * p1.y) * 100) / 100,
    };

    smoothed.push(q, r);
  }
  smoothed.push(decimated[decimated.length - 1]);

  return smoothed;
}

/**
 * Creates a DesignElement for a Rectangle.
 */
export function createRectangleElement(
  id: string,
  options: RectangleOptions
): DesignElement {
  const geom = generateRectangleGeometry(
    options.widthMm,
    options.heightMm,
    options.cornerRadiusMm
  );
  const cx = options.center?.x ?? 0;
  const cy = options.center?.y ?? 0;

  return {
    id,
    name: `Rectangle ${Math.round(options.widthMm)}×${Math.round(options.heightMm)}mm`,
    type: 'svg',
    x: cx,
    y: cy,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    penId: options.penId,
    visible: true,
    rawPolylines: [
      {
        id: `${id}_contour`,
        penId: options.penId,
        points: geom.points,
      },
    ],
    closedLoops: [geom.closedLoop],
    isSolidFill: options.isSolidFill ?? false,
    enableInfill: options.isSolidFill ?? false,
    infillSpacingMm: options.infillSpacingMm ?? 0.4,
    contentBounds: {
      minX: -options.widthMm / 2,
      maxX: options.widthMm / 2,
      minY: -options.heightMm / 2,
      maxY: options.heightMm / 2,
      width: options.widthMm,
      height: options.heightMm,
    },
  };
}

/**
 * Creates a DesignElement for a Circle / Ellipse.
 */
export function createCircleElement(
  id: string,
  options: CircleOptions
): DesignElement {
  const ry = options.radiusYMm ?? options.radiusMm;
  const geom = generateCircleGeometry(options.radiusMm, ry, options.segments ?? 64);
  const cx = options.center?.x ?? 0;
  const cy = options.center?.y ?? 0;
  const w = options.radiusMm * 2;
  const h = ry * 2;

  return {
    id,
    name: w === h ? `Circle ⌀${Math.round(w)}mm` : `Ellipse ${Math.round(w)}×${Math.round(h)}mm`,
    type: 'svg',
    x: cx,
    y: cy,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    penId: options.penId,
    visible: true,
    rawPolylines: [
      {
        id: `${id}_contour`,
        penId: options.penId,
        points: geom.points,
      },
    ],
    closedLoops: [geom.closedLoop],
    isSolidFill: options.isSolidFill ?? false,
    enableInfill: options.isSolidFill ?? false,
    infillSpacingMm: options.infillSpacingMm ?? 0.4,
    contentBounds: {
      minX: -options.radiusMm,
      maxX: options.radiusMm,
      minY: -ry,
      maxY: ry,
      width: w,
      height: h,
    },
  };
}

/**
 * Creates a DesignElement for a Star.
 */
export function createStarElement(
  id: string,
  options: StarOptions
): DesignElement {
  const geom = generateStarGeometry(
    options.points ?? 5,
    options.outerRadiusMm,
    options.innerRadiusMm
  );
  const cx = options.center?.x ?? 0;
  const cy = options.center?.y ?? 0;
  const diam = options.outerRadiusMm * 2;

  return {
    id,
    name: `Star (${options.points ?? 5}-pt)`,
    type: 'svg',
    x: cx,
    y: cy,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    penId: options.penId,
    visible: true,
    rawPolylines: [
      {
        id: `${id}_contour`,
        penId: options.penId,
        points: geom.points,
      },
    ],
    closedLoops: [geom.closedLoop],
    isSolidFill: options.isSolidFill ?? false,
    enableInfill: options.isSolidFill ?? false,
    infillSpacingMm: options.infillSpacingMm ?? 0.4,
    contentBounds: {
      minX: -options.outerRadiusMm,
      maxX: options.outerRadiusMm,
      minY: -options.outerRadiusMm,
      maxY: options.outerRadiusMm,
      width: diam,
      height: diam,
    },
  };
}

/**
 * Creates a DesignElement for a Polygon.
 */
export function createPolygonElement(
  id: string,
  options: PolygonOptions
): DesignElement {
  const geom = generatePolygonGeometry(options.sides, options.radiusMm);
  const cx = options.center?.x ?? 0;
  const cy = options.center?.y ?? 0;
  const diam = options.radiusMm * 2;
  const nameMap: Record<number, string> = {
    3: 'Triangle',
    4: 'Diamond',
    5: 'Pentagon',
    6: 'Hexagon',
    8: 'Octagon',
  };

  return {
    id,
    name: nameMap[options.sides] || `Polygon (${options.sides}-gon)`,
    type: 'svg',
    x: cx,
    y: cy,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    penId: options.penId,
    visible: true,
    rawPolylines: [
      {
        id: `${id}_contour`,
        penId: options.penId,
        points: geom.points,
      },
    ],
    closedLoops: [geom.closedLoop],
    isSolidFill: options.isSolidFill ?? false,
    enableInfill: options.isSolidFill ?? false,
    infillSpacingMm: options.infillSpacingMm ?? 0.4,
    contentBounds: {
      minX: -options.radiusMm,
      maxX: options.radiusMm,
      minY: -options.radiusMm,
      maxY: options.radiusMm,
      width: diam,
      height: diam,
    },
  };
}

/**
 * Creates a DesignElement for a Freehand Drawing Stroke.
 */
export function createFreehandStrokeElement(
  id: string,
  rawPoints: Point2D[],
  penId: string,
  toleranceMm: number = 0.2
): DesignElement | null {
  const smoothed = smoothFreehandPoints(rawPoints, toleranceMm);
  if (smoothed.length < 2) return null;

  // Compute centroid to position element at its center
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of smoothed) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const localPoints = smoothed.map((pt) => ({
    x: Math.round((pt.x - cx) * 100) / 100,
    y: Math.round((pt.y - cy) * 100) / 100,
  }));

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  return {
    id,
    name: 'Freehand Stroke',
    type: 'svg',
    x: Math.round(cx * 10) / 10,
    y: Math.round(cy * 10) / 10,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    penId,
    visible: true,
    rawPolylines: [
      {
        id: `${id}_stroke`,
        penId,
        points: localPoints,
      },
    ],
    contentBounds: {
      minX: -w / 2,
      maxX: w / 2,
      minY: -h / 2,
      maxY: h / 2,
      width: w,
      height: h,
    },
  };
}
