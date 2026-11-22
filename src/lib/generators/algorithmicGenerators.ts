import { Point2D, Polyline } from '@/types/plotter';

/**
 * Algorithmic Generative Art Engine for Pen Plotters
 * Generates single-stroke continuous vector paths optimized for zero/minimal pen lifts.
 */

export interface GeneratorBounds {
  width: number;
  height: number;
}

// Simple deterministic pseudo-random number generator (LCG)
class PRNG {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

// Simple 2D Perlin-like gradient noise
function noise2D(x: number, y: number, seed: number = 1337): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);

  // Smoothstep
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const hash = (n: number) => {
    const s = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453123;
    return s - Math.floor(s);
  };

  const a = hash(X + Y * 57);
  const b = hash(X + 1 + Y * 57);
  const c = hash(X + (Y + 1) * 57);
  const d = hash(X + 1 + (Y + 1) * 57);

  const lerp = (v0: number, v1: number, t: number) => v0 + t * (v1 - v0);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}

/**
 * 1. Flow Field Streamlines
 * Traces streamline particles through a curl/noise vector field.
 */
export function generateFlowField(
  bounds: GeneratorBounds,
  options: {
    numLines?: number;
    stepsPerLine?: number;
    stepLengthMm?: number;
    noiseScale?: number;
    seed?: number;
    penId?: string;
  } = {}
): Polyline[] {
  const {
    numLines = 70,
    stepsPerLine = 60,
    stepLengthMm = 1.8,
    noiseScale = 0.025,
    seed = Math.floor(Math.random() * 10000),
    penId = 'pen-1',
  } = options;

  const prng = new PRNG(seed);
  const polylines: Polyline[] = [];
  const margin = Math.min(bounds.width, bounds.height) * 0.08;
  const usableW = bounds.width - margin * 2;
  const usableH = bounds.height - margin * 2;

  for (let i = 0; i < numLines; i++) {
    const startX = margin + prng.next() * usableW;
    const startY = margin + prng.next() * usableH;

    const points: Point2D[] = [{ x: startX, y: startY }];
    let curX = startX;
    let curY = startY;

    for (let s = 0; s < stepsPerLine; s++) {
      const angle = noise2D(curX * noiseScale, curY * noiseScale, seed) * Math.PI * 2.5;
      curX += Math.cos(angle) * stepLengthMm;
      curY += Math.sin(angle) * stepLengthMm;

      // Keep within bounds
      if (curX < margin || curX > bounds.width - margin || curY < margin || curY > bounds.height - margin) {
        break;
      }

      points.push({
        x: Math.round(curX * 100) / 100,
        y: Math.round(curY * 100) / 100,
      });
    }

    if (points.length >= 3) {
      polylines.push({
        id: `flow_${i}`,
        points,
        penId,
        sourceElementId: 'gen_flow',
      });
    }
  }

  return polylines;
}

/**
 * 2. Hypotrochoid / Spirograph Harmonograph
 * Parametric mathematical gear curve:
 * x(t) = (R - r) * cos(t) + d * cos((R - r) * t / r)
 * y(t) = (R - r) * sin(t) - d * sin((R - r) * t / r)
 */
export function generateSpirograph(
  bounds: GeneratorBounds,
  options: {
    outerRadiusRatio?: number; // R
    innerRadiusRatio?: number; // r
    penDistanceRatio?: number; // d
    revolutions?: number;
    steps?: number;
    penId?: string;
  } = {}
): Polyline[] {
  const {
    outerRadiusRatio = 1.0,
    innerRadiusRatio = 0.382, // Golden ratio conjugate
    penDistanceRatio = 0.65,
    revolutions = 16,
    steps = 1400,
    penId = 'pen-1',
  } = options;

  const maxR = (Math.min(bounds.width, bounds.height) / 2) * 0.88;
  const R = maxR * outerRadiusRatio;
  const r = maxR * innerRadiusRatio;
  const d = maxR * penDistanceRatio;

  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;

  const points: Point2D[] = [];
  const maxTheta = revolutions * Math.PI * 2;
  const stepTheta = maxTheta / steps;

  for (let theta = 0; theta <= maxTheta; theta += stepTheta) {
    const x = (R - r) * Math.cos(theta) + d * Math.cos(((R - r) * theta) / r);
    const y = (R - r) * Math.sin(theta) - d * Math.sin(((R - r) * theta) / r);

    points.push({
      x: Math.round((centerX + x) * 100) / 100,
      y: Math.round((centerY + y) * 100) / 100,
    });
  }

  return [
    {
      id: 'spirograph_1',
      points,
      penId,
      sourceElementId: 'gen_spiro',
    },
  ];
}

/**
 * 3. Hilbert Space-Filling Curve
 * 100% continuous single-stroke fractal curve covering a 2^N grid.
 * Zero pen lifts guaranteed!
 */
export function generateHilbertCurve(
  bounds: GeneratorBounds,
  options: {
    order?: number; // 1 to 5 (order 4 = 256 points, order 5 = 1024 points)
    penId?: string;
  } = {}
): Polyline[] {
  const order = Math.max(1, Math.min(5, options.order || 4));
  const penId = options.penId || 'pen-1';

  const n = Math.pow(2, order);
  const totalPoints = n * n;
  const size = Math.min(bounds.width, bounds.height) * 0.82;
  const cellSize = size / (n - 1);
  const offsetX = (bounds.width - size) / 2;
  const offsetY = (bounds.height - size) / 2;

  // Convert distance d along Hilbert curve to (x, y) coordinates
  function d2xy(m: number, d: number): { x: number; y: number } {
    let rx = 0;
    let ry = 0;
    let t = d;
    let x = 0;
    let y = 0;

    for (let s = 1; s < m; s *= 2) {
      rx = 1 & (t / 2);
      ry = 1 & (t ^ rx);
      if (ry === 0) {
        if (rx === 1) {
          x = s - 1 - x;
          y = s - 1 - y;
        }
        // Swap x and y
        const tmp = x;
        x = y;
        y = tmp;
      }
      x += s * rx;
      y += s * ry;
      t = Math.floor(t / 4);
    }
    return { x, y };
  }

  const points: Point2D[] = [];
  for (let i = 0; i < totalPoints; i++) {
    const pt = d2xy(n, i);
    points.push({
      x: Math.round((offsetX + pt.x * cellSize) * 100) / 100,
      y: Math.round((offsetY + pt.y * cellSize) * 100) / 100,
    });
  }

  return [
    {
      id: `hilbert_order_${order}`,
      points,
      penId,
      sourceElementId: 'gen_hilbert',
    },
  ];
}

/**
 * 4. Guilloche Security Wave Engraving
 * Intertwined harmonic mathematical wave ribbons (as seen on currency banknotes).
 */
export function generateGuilloche(
  bounds: GeneratorBounds,
  options: {
    ribbons?: number;
    steps?: number;
    freq1?: number;
    freq2?: number;
    penId?: string;
  } = {}
): Polyline[] {
  const {
    ribbons = 12,
    steps = 450,
    freq1 = 5,
    freq2 = 17,
    penId = 'pen-1',
  } = options;

  const polylines: Polyline[] = [];
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  const radius = Math.min(bounds.width, bounds.height) * 0.42;

  for (let r = 0; r < ribbons; r++) {
    const phaseOffset = (r / ribbons) * Math.PI * 2;
    const radialOffset = radius * (0.45 + (r / ribbons) * 0.55);
    const points: Point2D[] = [];

    for (let s = 0; s <= steps; s++) {
      const theta = (s / steps) * Math.PI * 2;
      const mod =
        Math.sin(theta * freq1 + phaseOffset) * (radius * 0.18) +
        Math.cos(theta * freq2) * (radius * 0.08);
      const currentRadius = radialOffset + mod;

      const x = centerX + Math.cos(theta) * currentRadius;
      const y = centerY + Math.sin(theta) * currentRadius;

      points.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
      });
    }

    polylines.push({
      id: `guilloche_${r}`,
      points,
      penId,
      sourceElementId: 'gen_guilloche',
    });
  }

  return polylines;
}

/**
 * 5. Topographic Contour Elevation
 * Concentric organic spline rings simulating elevation contour lines of an island/peak.
 */
export function generateTopographicContour(
  bounds: GeneratorBounds,
  options: {
    levels?: number;
    pointsPerRing?: number;
    seed?: number;
    penId?: string;
  } = {}
): Polyline[] {
  const {
    levels = 9,
    pointsPerRing = 120,
    seed = 888,
    penId = 'pen-1',
  } = options;

  const polylines: Polyline[] = [];
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  const maxR = Math.min(bounds.width, bounds.height) * 0.42;

  for (let lvl = 1; lvl <= levels; lvl++) {
    const baseRadius = (lvl / levels) * maxR;
    const points: Point2D[] = [];

    for (let i = 0; i <= pointsPerRing; i++) {
      const theta = (i / pointsPerRing) * Math.PI * 2;
      // Perturb radius with multi-octave harmonic noise
      const n1 = Math.sin(theta * 3 + seed + lvl) * 0.18;
      const n2 = Math.cos(theta * 5 - lvl * 0.5) * 0.09;
      const n3 = Math.sin(theta * 7 + seed * 2) * 0.04;
      const r = baseRadius * (1 + n1 + n2 + n3);

      const x = centerX + Math.cos(theta) * r;
      const y = centerY + Math.sin(theta) * r;

      points.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
      });
    }

    polylines.push({
      id: `topo_ring_${lvl}`,
      points,
      penId,
      sourceElementId: 'gen_topo',
    });
  }

  return polylines;
}
