import { Point2D } from '@/types/plotter';

/**
 * Calculates distance from point P to finite line segment P0-P1 (clamped projection)
 */
export function pointToSegmentDistance(p: Point2D, p0: Point2D, p1: Point2D): number {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-12) {
    const ex = p.x - p0.x;
    const ey = p.y - p0.y;
    return Math.sqrt(ex * ex + ey * ey);
  }

  // Clamped projection t onto finite segment [p0, p1]
  const t = Math.max(0, Math.min(1, ((p.x - p0.x) * dx + (p.y - p0.y) * dy) / lenSq));
  const projX = p0.x + t * dx;
  const projY = p0.y + t * dy;
  const distDx = p.x - projX;
  const distDy = p.y - projY;
  return Math.sqrt(distDx * distDx + distDy * distDy);
}

/**
 * Adaptive De Casteljau subdivision for a Cubic Bezier curve.
 * Recursively subdivides until control points are within tolerance of the baseline.
 */
export function flattenCubicBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  toleranceMm: number = 0.05,
  maxDepth: number = 16
): Point2D[] {
  const points: Point2D[] = [];

  function subdivide(
    a: Point2D,
    b: Point2D,
    c: Point2D,
    d: Point2D,
    depth: number
  ) {
    const d1 = pointToSegmentDistance(b, a, d);
    const d2 = pointToSegmentDistance(c, a, d);

    if ((d1 <= toleranceMm && d2 <= toleranceMm) || depth >= maxDepth) {
      points.push(d);
      return;
    }

    // De Casteljau midpoint subdivision
    const ab: Point2D = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    const bc: Point2D = { x: (b.x + c.x) * 0.5, y: (b.y + c.y) * 0.5 };
    const cd: Point2D = { x: (c.x + d.x) * 0.5, y: (c.y + d.y) * 0.5 };

    const abc: Point2D = { x: (ab.x + bc.x) * 0.5, y: (ab.y + bc.y) * 0.5 };
    const bcd: Point2D = { x: (bc.x + cd.x) * 0.5, y: (bc.y + cd.y) * 0.5 };

    const abcd: Point2D = { x: (abc.x + bcd.x) * 0.5, y: (abc.y + bcd.y) * 0.5 };

    subdivide(a, ab, abc, abcd, depth + 1);
    subdivide(abcd, bcd, cd, d, depth + 1);
  }

  subdivide(p0, p1, p2, p3, 0);
  return points;
}

/**
 * Adaptive De Casteljau subdivision for a Quadratic Bezier curve.
 */
export function flattenQuadraticBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  toleranceMm: number = 0.05,
  maxDepth: number = 16
): Point2D[] {
  const points: Point2D[] = [];

  function subdivide(a: Point2D, b: Point2D, c: Point2D, depth: number) {
    const d = pointToSegmentDistance(b, a, c);

    if (d <= toleranceMm || depth >= maxDepth) {
      points.push(c);
      return;
    }

    const ab: Point2D = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    const bc: Point2D = { x: (b.x + c.x) * 0.5, y: (b.y + c.y) * 0.5 };
    const abc: Point2D = { x: (ab.x + bc.x) * 0.5, y: (ab.y + bc.y) * 0.5 };

    subdivide(a, ab, abc, depth + 1);
    subdivide(abc, bc, c, depth + 1);
  }

  subdivide(p0, p1, p2, 0);
  return points;
}

/**
 * Helper to compute angle between two 2D vectors
 */
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  const dot = ux * vx + uy * vy;
  const mag = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
  if (mag < 1e-12) return 0;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return sign * Math.acos(cos);
}

/**
 * Flattens an SVG Elliptical Arc (A/a command) into linear segments.
 * Follows W3C SVG Arc implementation specification.
 */
export function flattenEllipticalArc(
  p0: Point2D,
  rxIn: number,
  ryIn: number,
  xAxisRotationDeg: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
  p1: Point2D,
  toleranceMm: number = 0.05
): Point2D[] {
  // If endpoints are identical, no path to draw
  if (Math.abs(p0.x - p1.x) < 1e-6 && Math.abs(p0.y - p1.y) < 1e-6) {
    return [];
  }

  // If rx or ry is 0, straight line to p1
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx < 1e-6 || ry < 1e-6) {
    return [{ x: p1.x, y: p1.y }];
  }

  const phi = (xAxisRotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1')
  const dx2 = (p0.x - p1.x) / 2;
  const dy2 = (p0.y - p1.y) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  // Step 2: Ensure radii are large enough
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }

  // Step 3: Compute (cx', cy')
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  let num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  let den = rxSq * y1pSq + rySq * x1pSq;
  if (den < 1e-12) den = 1e-12;
  let radicand = num / den;
  if (radicand < 0) radicand = 0;

  let coef = Math.sqrt(radicand);
  if (largeArcFlag === sweepFlag) {
    coef = -coef;
  }

  const cxp = coef * ((rx * y1p) / ry);
  const cyp = -coef * ((ry * x1p) / rx);

  // Step 4: Compute center (cx, cy)
  const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2;

  // Step 5: Compute start angle and delta angle
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;

  let theta1 = vectorAngle(1, 0, ux, uy);
  let deltaTheta = vectorAngle(ux, uy, vx, vy);

  if (!sweepFlag && deltaTheta > 0) {
    deltaTheta -= 2 * Math.PI;
  } else if (sweepFlag && deltaTheta < 0) {
    deltaTheta += 2 * Math.PI;
  }

  // Step 6: Determine number of segments based on chord error (sagitta) <= toleranceMm
  const maxR = Math.max(rx, ry);
  const sagittaRatio = Math.max(0, 1 - toleranceMm / maxR);
  const maxSegmentAngle = 2 * Math.acos(Math.max(-1, Math.min(1, sagittaRatio)));
  const stepAngle = maxSegmentAngle > 0.01 ? maxSegmentAngle : 0.05;

  const numSegments = Math.max(4, Math.ceil(Math.abs(deltaTheta) / stepAngle));
  const points: Point2D[] = [];

  for (let i = 1; i <= numSegments; i++) {
    const fraction = i / numSegments;
    const theta = theta1 + fraction * deltaTheta;

    const ex = rx * Math.cos(theta);
    const ey = ry * Math.sin(theta);

    const x = cx + cosPhi * ex - sinPhi * ey;
    const y = cy + sinPhi * ex + cosPhi * ey;

    points.push({ x, y });
  }

  // Ensure last point hits target exactly
  if (points.length > 0) {
    points[points.length - 1] = { x: p1.x, y: p1.y };
  }

  return points;
}
