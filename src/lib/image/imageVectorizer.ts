import { Point2D, Polyline } from '@/types/plotter';
import { traceBinaryGridToSvg } from './potraceEngine';
import { parseSVG } from '../svg/svgParser';
import { generatePolygonHatch } from '../svg/polygonInfill';

export type PicSvgFilter =
  | 'Inkscape (High Quality)'
  | 'Edge 1'
  | 'Edge 2'
  | 'Edge 3'
  | 'Edge 4'
  | 'Edge 5'
  | 'Edge 6'
  | 'Internal 1'
  | 'Internal 2'
  | 'Internal 3'
  | 'Internal 4'
  | 'Internal 5'
  | 'Smooth 1'
  | 'Smooth 2'
  | 'Clean 1'
  | 'Sharp 1'
  | 'Detail 1'
  | 'Artistic 1'
  | 'Artistic 2';

export const PICSVG_FILTERS: PicSvgFilter[] = [
  'Inkscape (High Quality)',
  'Edge 1',
  'Edge 2',
  'Edge 3',
  'Edge 4',
  'Edge 5',
  'Edge 6',
  'Internal 1',
  'Internal 2',
  'Internal 3',
  'Internal 4',
  'Internal 5',
  'Smooth 1',
  'Smooth 2',
  'Clean 1',
  'Sharp 1',
  'Detail 1',
  'Artistic 1',
  'Artistic 2',
];

export type PicSvgDetails = 'great' | 'strong' | 'medium' | 'soft';

export const PICSVG_DETAILS: { id: PicSvgDetails; label: string; desc: string }[] = [
  { id: 'great', label: 'Great', desc: 'Highest fidelity & fine micro-details' },
  { id: 'strong', label: 'Strong', desc: 'Crisp, prominent outlines (Recommended)' },
  { id: 'medium', label: 'Medium', desc: 'Balanced detail for fast pen drawing' },
  { id: 'soft', label: 'Soft', desc: 'Minimalist flowing outlines' },
];

export type VectorizeStyle = 'sketch' | 'crosshatch' | 'squiggle' | PicSvgFilter;

export interface VectorizeOptions {
  filter?: PicSvgFilter;
  details?: PicSvgDetails;
  style?: VectorizeStyle; // backward compatibility
  fillMode?: 'solid' | 'outline'; // solid compound path vs stroked boundary
  enableInfill?: boolean; // hatch fill interior for physical pen plotting
  infillSpacingMm?: number; // spacing between pen hatch lines (default 0.6mm)
  targetWidthMm: number; // e.g. 120mm
  targetHeightMm?: number; // auto-scaled from aspect ratio if omitted
  detailLevel?: number; // 1 (coarse) to 5 (fine detail), default 3 (backward compatibility)
  contrast?: number; // -50 to +50, default 0
  brightness?: number; // -50 to +50, default 0
  invert?: boolean; // invert darkness, default false
  penId?: string;
  penColorHex?: string; // e.g. '#000000' for SVG preview
  sourceElementId?: string;
}

export interface VectorizeResult {
  polylines: Polyline[];
  widthMm: number;
  heightMm: number;
  totalLengthMm: number;
  svgString: string;
  isSolidFill: boolean;
  loopCount: number;
}

/**
 * Evaluates perpendicular distance from point P to line segment A-B
 */
function perpendicularDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Standard Ramer-Douglas-Peucker (RDP) polyline simplification
 */
export function simplifyRDP(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyRDP(points.slice(maxIdx), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  }

  return [points[0], points[end]];
}

/**
 * Chaikin's corner-cutting subdivision algorithm for smooth, organic plotter curves
 */
function chaikinSmooth(points: Point2D[], iterations: number = 1): Point2D[] {
  if (points.length < 3 || iterations <= 0) return points;

  let current = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Point2D[] = [];
    next.push(current[0]);

    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      // Q = 0.75 p0 + 0.25 p1
      next.push({
        x: Math.round((0.75 * p0.x + 0.25 * p1.x) * 100) / 100,
        y: Math.round((0.75 * p0.y + 0.25 * p1.y) * 100) / 100,
      });

      // R = 0.25 p0 + 0.75 p1
      next.push({
        x: Math.round((0.25 * p0.x + 0.75 * p1.x) * 100) / 100,
        y: Math.round((0.25 * p0.y + 0.75 * p1.y) * 100) / 100,
      });
    }

    next.push(current[current.length - 1]);
    current = next;
  }

  return current;
}

/**
 * Extracts normalized grayscale luminance grid from ImageData with contrast & brightness adjustment
 */
function extractLuminanceGrid(
  imageData: ImageData,
  contrast: number = 0,
  brightness: number = 0,
  invert: boolean = false
): { grid: Float32Array; width: number; height: number } {
  const { width, height, data } = imageData;
  const grid = new Float32Array(width * height);

  // Contrast factor: contrast in [-50, 50]
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3] / 255;

    // Relative luminance
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Apply contrast
    lum = factor * (lum - 128) + 128;

    // Apply brightness
    lum += brightness * 2.55;

    // Clamp
    lum = Math.max(0, Math.min(255, lum));

    // Transparent areas treat as white
    if (a < 0.2) {
      lum = 255;
    }

    // Normalized luminance in [0, 1] where 0 = black, 1 = white
    let normalized = lum / 255;
    if (invert) {
      normalized = 1 - normalized;
    }

    grid[i] = normalized;
  }

  return { grid, width, height };
}

/**
 * Separable Gaussian Blur convolution
 */
function applyGaussianBlur(
  src: Float32Array,
  w: number,
  h: number,
  sigma: number
): Float32Array {
  if (sigma <= 0.1) return new Float32Array(src);

  const radius = Math.ceil(sigma * 2.5);
  const kernelSize = 2 * radius + 1;
  const kernel = new Float32Array(kernelSize);
  let kernelSum = 0;

  for (let i = -radius; i <= radius; i++) {
    const val = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = val;
    kernelSum += val;
  }
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= kernelSum;
  }

  const temp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const nx = Math.min(w - 1, Math.max(0, x + k));
        sum += src[rowOffset + nx] * kernel[k + radius];
      }
      temp[rowOffset + x] = sum;
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const ny = Math.min(h - 1, Math.max(0, y + k));
        sum += temp[ny * w + x] * kernel[k + radius];
      }
      out[y * w + x] = sum;
    }
  }

  return out;
}

/**
 * 3x3 Unsharp Mask kernel for edge enhancement
 */
function applyUnsharpMask(src: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0,
  ];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += src[(y + dy) * w + (x + dx)] * kernel[k++];
        }
      }
      out[y * w + x] = Math.max(0, Math.min(1, sum));
    }
  }
  return out;
}

/**
 * Computes 2D Integral Image (Summed Area Table) for O(1) box queries
 */
function computeIntegralImage(src: Float32Array, w: number, h: number): Float64Array {
  const sat = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += src[y * w + x];
      const prev = y > 0 ? sat[(y - 1) * w + x] : 0;
      sat[y * w + x] = rowSum + prev;
    }
  }
  return sat;
}

/**
 * Fast box sum from integral image
 */
function getBoxSum(
  sat: Float64Array,
  w: number,
  h: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const minX = Math.max(0, x1);
  const minY = Math.max(0, y1);
  const maxX = Math.min(w - 1, x2);
  const maxY = Math.min(h - 1, y2);

  const a = sat[maxY * w + maxX];
  const b = minX > 0 ? sat[maxY * w + (minX - 1)] : 0;
  const c = minY > 0 ? sat[(minY - 1) * w + maxX] : 0;
  const d = minX > 0 && minY > 0 ? sat[(minY - 1) * w + (minX - 1)] : 0;

  return a - b - c + d;
}

/**
 * Adaptive local threshold (Sauvola / Bradley) using integral image
 */
function adaptiveThreshold(
  src: Float32Array,
  sat: Float64Array,
  w: number,
  h: number,
  radius: number,
  k: number
): Uint8Array {
  const binary = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = x - radius;
      const y1 = y - radius;
      const x2 = x + radius;
      const y2 = y + radius;

      const count = (Math.min(w - 1, x2) - Math.max(0, x1) + 1) *
                    (Math.min(h - 1, y2) - Math.max(0, y1) + 1);

      const sum = getBoxSum(sat, w, h, x1, y1, x2, y2);
      const mean = sum / count;

      const threshold = mean * (1 - k);
      if (src[y * w + x] < threshold) {
        binary[y * w + x] = 1; // dark pixel
      }
    }
  }

  return binary;
}

/**
 * Global Otsu binarization
 */
function otsuThreshold(src: Float32Array, w: number, h: number): Uint8Array {
  const hist = new Int32Array(256);
  const total = w * h;

  for (let i = 0; i < total; i++) {
    const val = Math.min(255, Math.max(0, Math.floor(src[i] * 255)));
    hist[val]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let varMax = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);

    if (between >= varMax) {
      varMax = between;
      threshold = t;
    }
  }

  const binary = new Uint8Array(w * h);
  const threshNorm = (threshold + 0.5) / 255;
  for (let i = 0; i < total; i++) {
    if (src[i] <= threshNorm) {
      binary[i] = 1;
    }
  }
  return binary;
}

/**
 * Removes isolated speckle noise islands
 */
function removeSpeckles(binary: Uint8Array, w: number, h: number, minSize: number): void {
  const visited = new Uint8Array(w * h);
  const queueX = new Int32Array(w * h);
  const queueY = new Int32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (binary[idx] && !visited[idx]) {
        let head = 0;
        let tail = 0;
        queueX[tail] = x;
        queueY[tail] = y;
        tail++;
        visited[idx] = 1;

        while (head < tail) {
          const cx = queueX[head];
          const cy = queueY[head];
          head++;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nidx = ny * w + nx;
                if (binary[nidx] && !visited[nidx]) {
                  visited[nidx] = 1;
                  queueX[tail] = nx;
                  queueY[tail] = ny;
                  tail++;
                }
              }
            }
          }
        }

        // If component is smaller than minSize, clear it
        if (tail < minSize) {
          for (let i = 0; i < tail; i++) {
            binary[queueY[i] * w + queueX[i]] = 0;
          }
        }
      }
    }
  }
}

/**
 * Traces perimeter boundaries of binary foreground regions (produces closed vector contour loops)
 */
function traceRegionBoundaries(
  binary: Uint8Array,
  w: number,
  h: number
): Uint8Array {
  const edges = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (binary[idx]) {
        // Boundary pixel if any 4-neighbor is background
        if (
          !binary[idx - 1] ||
          !binary[idx + 1] ||
          !binary[idx - w] ||
          !binary[idx + w]
        ) {
          edges[idx] = 1;
        }
      }
    }
  }

  return edges;
}

/**
 * Standard Sobel gradient edge detector
 */
function sobelEdges(
  src: Float32Array,
  w: number,
  h: number,
  threshold: number
): Uint8Array {
  const edges = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -src[(y - 1) * w + x - 1] +
        src[(y - 1) * w + x + 1] +
        -2 * src[y * w + x - 1] +
        2 * src[y * w + x + 1] +
        -src[(y + 1) * w + x - 1] +
        src[(y + 1) * w + x + 1];

      const gy =
        -src[(y - 1) * w + x - 1] +
        -2 * src[(y - 1) * w + x] +
        -src[(y - 1) * w + x + 1] +
        src[(y + 1) * w + x - 1] +
        2 * src[(y + 1) * w + x] +
        src[(y + 1) * w + x + 1];

      const mag = Math.hypot(gx, gy);
      if (mag > threshold) {
        edges[y * w + x] = 1;
      }
    }
  }

  return edges;
}

/**
 * Chains edge pixels into continuous, smooth polylines with machine coordinates
 */
function chainEdgePixelsToPolylines(
  edgeMap: Uint8Array,
  w: number,
  h: number,
  targetWMm: number,
  targetHMm: number,
  minChainLength: number,
  rdpEpsilonMm: number,
  smoothIterations: number,
  penId: string,
  sourceId: string,
  prefix: string = 'pk'
): Polyline[] {
  const visited = new Uint8Array(w * h);
  const polylines: Polyline[] = [];

  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1],
  ];

  const scaleX = targetWMm / w;
  const scaleY = targetHMm / h;

  let counter = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (edgeMap[idx] && !visited[idx]) {
        const chain: Point2D[] = [];
        let cx = x;
        let cy = y;

        while (cx >= 0 && cy >= 0) {
          const cidx = cy * w + cx;
          visited[cidx] = 1;

          // Convert image pixel coordinates to machine space (+Y upward)
          chain.push({
            x: Math.round(cx * scaleX * 100) / 100,
            y: Math.round((h - cy) * scaleY * 100) / 100,
          });

          // Search unvisited neighbor
          let foundNext = false;
          for (const [dx, dy] of neighbors) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nidx = ny * w + nx;
              if (edgeMap[nidx] && !visited[nidx]) {
                cx = nx;
                cy = ny;
                foundNext = true;
                break;
              }
            }
          }
          if (!foundNext) break;
        }

        if (chain.length >= minChainLength) {
          let pts = chain;
          if (smoothIterations > 0) {
            pts = chaikinSmooth(pts, smoothIterations);
          }
          const simplified = simplifyRDP(pts, rdpEpsilonMm);
          if (simplified.length >= 2) {
            polylines.push({
              id: `${sourceId}_${prefix}_${counter++}`,
              points: simplified,
              penId,
              sourceElementId: sourceId,
            });
          }
        }
      }
    }
  }

  return polylines;
}

/**
 * Simplifies strictly colinear points along straight segments to minimize vertices
 */
function simplifyColinear(points: Point2D[]): Point2D[] {
  if (points.length <= 3) return points;
  const out: Point2D[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = out[out.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    if (Math.abs(cross) > 1e-4) {
      out.push(curr);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Chaikin subdivision specifically for closed boundary loops (wraps around cleanly)
 */
function chaikinSmoothClosed(points: Point2D[], iterations: number = 1): Point2D[] {
  if (points.length < 4 || iterations <= 0) return points;
  let current = points.slice(0, points.length - 1); // remove duplicate closing point
  for (let iter = 0; iter < iterations; iter++) {
    const next: Point2D[] = [];
    const n = current.length;
    for (let i = 0; i < n; i++) {
      const p0 = current[i];
      const p1 = current[(i + 1) % n];
      next.push({
        x: Math.round((0.75 * p0.x + 0.25 * p1.x) * 100) / 100,
        y: Math.round((0.75 * p0.y + 0.25 * p1.y) * 100) / 100,
      });
      next.push({
        x: Math.round((0.25 * p0.x + 0.75 * p1.x) * 100) / 100,
        y: Math.round((0.25 * p0.y + 0.75 * p1.y) * 100) / 100,
      });
    }
    current = next;
  }
  current.push({ ...current[0] });
  return current;
}

/**
 * Potrace-style directed unit-edge contour loop tracer.
 * Decomposes a binary raster grid into exact closed outer loops (clockwise)
 * and inner cutout hole loops (counter-clockwise).
 * This produces 100% solid filled compound paths with SVG fill-rule="evenodd".
 */
function traceClosedBoundaryLoops(
  binary: Uint8Array,
  w: number,
  h: number,
  targetWMm: number,
  targetHMm: number,
  minLoopAreaPx: number,
  rdpEpsilonMm: number,
  smoothIterations: number,
  penId: string,
  sourceId: string,
  prefix: string = 'loop'
): Polyline[] {
  function getPixel(x: number, y: number): number {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    return binary[y * w + x] ? 1 : 0;
  }

  // Horizontal edges between vertices (x, y) and (x+1, y)
  // +1: moving right (dn=1, up=0)
  // -1: moving left (dn=0, up=1)
  const hEdges = new Int8Array((h + 1) * w);
  for (let y = 0; y <= h; y++) {
    for (let x = 0; x < w; x++) {
      const up = getPixel(x, y - 1);
      const dn = getPixel(x, y);
      if (up !== dn) {
        hEdges[y * w + x] = up === 0 && dn === 1 ? 1 : -1;
      }
    }
  }

  // Vertical edges between vertices (x, y) and (x, y+1)
  // +1: moving down (lf=1, rt=0)
  // -1: moving up (lf=0, rt=1)
  const vEdges = new Int8Array(h * (w + 1));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x <= w; x++) {
      const lf = getPixel(x - 1, y);
      const rt = getPixel(x, y);
      if (lf !== rt) {
        vEdges[y * (w + 1) + x] = lf === 1 && rt === 0 ? 1 : -1;
      }
    }
  }

  const visitedH = new Uint8Array((h + 1) * w);
  const visitedV = new Uint8Array(h * (w + 1));
  const polylines: Polyline[] = [];

  function getNext(x: number, y: number, fromDir: number) {
    // Prefer right turn, straight, left turn
    const turnOrder =
      fromDir >= 0
        ? [(fromDir + 1) % 4, fromDir, (fromDir + 3) % 4]
        : [0, 1, 2, 3];

    for (const d of turnOrder) {
      if (d === 0) {
        if (x < w && hEdges[y * w + x] === 1 && !visitedH[y * w + x]) {
          return { nx: x + 1, ny: y, dir: 0, edgeType: 'H', edgeIdx: y * w + x };
        }
      } else if (d === 1) {
        if (y < h && vEdges[y * (w + 1) + x] === 1 && !visitedV[y * (w + 1) + x]) {
          return { nx: x, ny: y + 1, dir: 1, edgeType: 'V', edgeIdx: y * (w + 1) + x };
        }
      } else if (d === 2) {
        if (x > 0 && hEdges[y * w + (x - 1)] === -1 && !visitedH[y * w + (x - 1)]) {
          return { nx: x - 1, ny: y, dir: 2, edgeType: 'H', edgeIdx: y * w + (x - 1) };
        }
      } else if (d === 3) {
        if (y > 0 && vEdges[(y - 1) * (w + 1) + x] === -1 && !visitedV[(y - 1) * (w + 1) + x]) {
          return { nx: x, ny: y - 1, dir: 3, edgeType: 'V', edgeIdx: (y - 1) * (w + 1) + x };
        }
      }
    }
    return null;
  }

  const scaleX = targetWMm / w;
  const scaleY = targetHMm / h;
  let counter = 0;

  for (let y = 0; y <= h; y++) {
    for (let x = 0; x <= w; x++) {
      let step = getNext(x, y, -1);
      while (step) {
        const loopPts: Point2D[] = [{ x, y }];
        let curX = step.nx;
        let curY = step.ny;
        let curDir = step.dir;
        if (step.edgeType === 'H') visitedH[step.edgeIdx] = 1;
        else visitedV[step.edgeIdx] = 1;

        let safety = w * h * 4;
        while ((curX !== x || curY !== y) && safety-- > 0) {
          loopPts.push({ x: curX, y: curY });
          const nxt = getNext(curX, curY, curDir);
          if (!nxt) break;
          if (nxt.edgeType === 'H') visitedH[nxt.edgeIdx] = 1;
          else visitedV[nxt.edgeIdx] = 1;
          curX = nxt.nx;
          curY = nxt.ny;
          curDir = nxt.dir;
        }

        loopPts.push({ x, y });

        // Calculate signed area in pixel space
        let area = 0;
        for (let i = 0; i < loopPts.length - 1; i++) {
          area += loopPts[i].x * loopPts[i + 1].y - loopPts[i + 1].x * loopPts[i].y;
        }
        area = area / 2;

        if (Math.abs(area) >= minLoopAreaPx) {
          const colinearReduced = simplifyColinear(loopPts);

          let machinePoints: Point2D[] = colinearReduced.map((pt) => ({
            x: Math.round(pt.x * scaleX * 100) / 100,
            y: Math.round((h - pt.y) * scaleY * 100) / 100,
          }));

          if (rdpEpsilonMm > 0) {
            machinePoints = simplifyRDP(machinePoints, rdpEpsilonMm);
          }

          if (smoothIterations > 0 && machinePoints.length >= 4) {
            machinePoints = chaikinSmoothClosed(machinePoints, smoothIterations);
          }

          if (machinePoints.length >= 3) {
            machinePoints[machinePoints.length - 1] = { ...machinePoints[0] };
            polylines.push({
              id: `${sourceId}_${prefix}_${counter++}`,
              points: machinePoints,
              penId,
              sourceElementId: sourceId,
            });
          }
        }

        step = getNext(x, y, -1);
      }
    }
  }

  return polylines;
}

/**
 * High-speed parallel infill hatching for physical pen plotting.
 * Fills solid silhouettes with continuous boustrophedon pen lines.
 */
function generateInfillHatch(
  binary: Uint8Array,
  w: number,
  h: number,
  targetWMm: number,
  targetHMm: number,
  spacingMm: number,
  penId: string,
  sourceId: string
): Polyline[] {
  const polylines: Polyline[] = [];
  const scaleX = targetWMm / w;
  const scaleY = targetHMm / h;
  const numLines = Math.floor(targetHMm / spacingMm);
  let counter = 0;

  for (let l = 0; l <= numLines; l++) {
    const yMm = l * spacingMm;
    const imgY = Math.min(h - 1, Math.max(0, Math.floor((targetHMm - yMm) / scaleY)));
    const rowOffset = imgY * w;
    const forward = l % 2 === 0;

    let inRun = false;
    let startX = 0;

    for (let x = 0; x < w; x++) {
      const isFore = binary[rowOffset + x] === 1;
      if (isFore && !inRun) {
        inRun = true;
        startX = x;
      } else if (!isFore && inRun) {
        inRun = false;
        const x0Mm = Math.round(startX * scaleX * 100) / 100;
        const x1Mm = Math.round((x - 1) * scaleX * 100) / 100;
        if (x1Mm - x0Mm >= 0.25) {
          polylines.push({
            id: `${sourceId}_inf_${counter++}`,
            points: forward
              ? [{ x: x0Mm, y: yMm }, { x: x1Mm, y: yMm }]
              : [{ x: x1Mm, y: yMm }, { x: x0Mm, y: yMm }],
            penId,
            sourceElementId: sourceId,
          });
        }
      }
    }
    if (inRun) {
      const x0Mm = Math.round(startX * scaleX * 100) / 100;
      const x1Mm = Math.round((w - 1) * scaleX * 100) / 100;
      if (x1Mm - x0Mm >= 0.25) {
        polylines.push({
          id: `${sourceId}_inf_${counter++}`,
          points: forward
            ? [{ x: x0Mm, y: yMm }, { x: x1Mm, y: yMm }]
            : [{ x: x1Mm, y: yMm }, { x: x0Mm, y: yMm }],
          penId,
          sourceElementId: sourceId,
        });
      }
    }
  }

  return polylines;
}

/**
 * Generates valid SVG markup string from polylines for live preview & download.
 * When isSolidFill is true, combines closed loops into a compound path with fill-rule="evenodd"
 * matching PicSVG 1:1.
 */
export function polylinesToSvgString(
  polylines: Polyline[],
  widthMm: number,
  heightMm: number,
  strokeColor: string = '#111827',
  strokeWidthMm: number = 0.35,
  isSolidFill: boolean = false
): string {
  if (polylines.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm} ${heightMm}" width="${widthMm}mm" height="${heightMm}mm">
</svg>`;
  }

  if (isSolidFill) {
    // Compound path with fill-rule="evenodd": outer boundaries are filled solid,
    // and inner counter-clockwise loops are cleanly punched out as transparent holes.
    const subpaths: string[] = [];
    const openStrokes: string[] = [];

    for (const poly of polylines) {
      if (poly.points.length < 2) continue;
      const isClosed =
        poly.points.length >= 3 &&
        Math.hypot(
          poly.points[0].x - poly.points[poly.points.length - 1].x,
          poly.points[0].y - poly.points[poly.points.length - 1].y
        ) < 0.1;

      const d = poly.points
        .map((pt, idx) => {
          const svgX = Math.round(pt.x * 100) / 100;
          const svgY = Math.round((heightMm - pt.y) * 100) / 100;
          return `${idx === 0 ? 'M' : 'L'} ${svgX} ${svgY}`;
        })
        .join(' ');

      if (isClosed) {
        subpaths.push(`${d} Z`);
      } else {
        openStrokes.push(`<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidthMm}" />`);
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm} ${heightMm}" width="${widthMm}mm" height="${heightMm}mm">
  ${subpaths.length > 0 ? `<path d="${subpaths.join(' ')}" fill="${strokeColor}" fill-rule="evenodd" stroke="none" />` : ''}
  ${openStrokes.join('\n  ')}
</svg>`;
  }

  // Outline / Stroked mode
  const pathStrings: string[] = [];
  for (const poly of polylines) {
    if (poly.points.length < 2) continue;
    const isClosed =
      poly.points.length >= 3 &&
      Math.hypot(
        poly.points[0].x - poly.points[poly.points.length - 1].x,
        poly.points[0].y - poly.points[poly.points.length - 1].y
      ) < 0.1;

    const d = poly.points
      .map((pt, idx) => {
        const svgX = Math.round(pt.x * 100) / 100;
        const svgY = Math.round((heightMm - pt.y) * 100) / 100;
        return `${idx === 0 ? 'M' : 'L'} ${svgX} ${svgY}`;
      })
      .join(' ');

    pathStrings.push(`<path d="${d}${isClosed ? ' Z' : ''}" />`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm} ${heightMm}" width="${widthMm}mm" height="${heightMm}mm">
  <g fill="none" stroke="${strokeColor}" stroke-width="${strokeWidthMm}" stroke-linecap="round" stroke-linejoin="round">
    ${pathStrings.join('\n    ')}
  </g>
</svg>`;
}

/**
 * PicSVG Filter Binarization Engine
 * Pre-processes normalized luminance grid according to exact PicSVG filter presets
 */
function getFilterBinarizedGrid(
  filter: PicSvgFilter,
  details: PicSvgDetails,
  grid: Float32Array,
  w: number,
  h: number
): Uint8Array {
  let detailMult = 1.0;
  let noiseSpeckle = 2;

  switch (details) {
    case 'great':
      detailMult = 1.35;
      noiseSpeckle = 1;
      break;
    case 'strong':
    default:
      detailMult = 1.0;
      noiseSpeckle = 2;
      break;
    case 'medium':
      detailMult = 0.75;
      noiseSpeckle = 4;
      break;
    case 'soft':
      detailMult = 0.55;
      noiseSpeckle = 6;
      break;
  }

  const sat = computeIntegralImage(grid, w, h);

  // Inkscape High Quality (Potrace Luminance Smooth Bezier)
  if (filter === 'Inkscape (High Quality)') {
    const smoothed = applyGaussianBlur(grid, w, h, 0.7);
    const bin = otsuThreshold(smoothed, w, h);
    removeSpeckles(bin, w, h, Math.max(1, noiseSpeckle));
    return bin;
  }

  // 1. Smooth 1 & Smooth 2 (Gaussian pre-blur + Otsu)
  if (filter === 'Smooth 1') {
    const blurred = applyGaussianBlur(grid, w, h, 0.9);
    const bin = otsuThreshold(blurred, w, h);
    removeSpeckles(bin, w, h, noiseSpeckle);
    return bin;
  }

  if (filter === 'Smooth 2') {
    const blurred = applyGaussianBlur(grid, w, h, 1.8);
    const bin = otsuThreshold(blurred, w, h);
    removeSpeckles(bin, w, h, noiseSpeckle + 2);
    return bin;
  }

  // 2. Clean 1 (Direct Otsu for sharp corporate logos & typography)
  if (filter === 'Clean 1') {
    const bin = otsuThreshold(grid, w, h);
    removeSpeckles(bin, w, h, 2);
    return bin;
  }

  // 3. Sharp 1 (Unsharp mask kernel)
  if (filter === 'Sharp 1') {
    const sharpened = applyUnsharpMask(grid, w, h);
    const bin = otsuThreshold(sharpened, w, h);
    removeSpeckles(bin, w, h, noiseSpeckle);
    return bin;
  }

  // 4. Detail 1 (High-frequency adaptive threshold)
  if (filter === 'Detail 1') {
    const bin = adaptiveThreshold(grid, sat, w, h, 10, 0.10 * detailMult);
    removeSpeckles(bin, w, h, noiseSpeckle);
    return bin;
  }

  // 5. Internal 1 - 5 (Sauvola local window adaptive binarization)
  if (filter === 'Internal 1') {
    const bin = adaptiveThreshold(grid, sat, w, h, 6, 0.08 * detailMult);
    removeSpeckles(bin, w, h, noiseSpeckle);
    return bin;
  }

  if (filter === 'Internal 2') {
    const bin = adaptiveThreshold(grid, sat, w, h, 12, 0.11 * detailMult);
    removeSpeckles(bin, w, h, noiseSpeckle);
    return bin;
  }

  if (filter === 'Internal 3') {
    const bin = adaptiveThreshold(grid, sat, w, h, 20, 0.14 * detailMult);
    removeSpeckles(bin, w, h, noiseSpeckle);
    return bin;
  }

  if (filter === 'Internal 4') {
    const bin = adaptiveThreshold(grid, sat, w, h, 28, 0.17 * detailMult);
    removeSpeckles(bin, w, h, noiseSpeckle);
    return bin;
  }

  if (filter === 'Internal 5') {
    const binFine = adaptiveThreshold(grid, sat, w, h, 8, 0.09 * detailMult);
    const binBroad = adaptiveThreshold(grid, sat, w, h, 26, 0.15 * detailMult);
    const merged = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (binFine[i] || binBroad[i]) merged[i] = 1;
    }
    removeSpeckles(merged, w, h, noiseSpeckle);
    return merged;
  }

  // 6. Edge 1 - 6
  if (filter === 'Edge 1') {
    const edges = sobelEdges(grid, w, h, 0.14 / detailMult);
    removeSpeckles(edges, w, h, noiseSpeckle);
    return edges;
  }

  if (filter === 'Edge 2') {
    const edges = sobelEdges(grid, w, h, 0.22 / detailMult);
    removeSpeckles(edges, w, h, noiseSpeckle);
    return edges;
  }

  if (filter === 'Edge 3') {
    const g1 = applyGaussianBlur(grid, w, h, 0.8);
    const g2 = applyGaussianBlur(grid, w, h, 2.0);
    const dog = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) dog[i] = Math.abs(g1[i] - g2[i]);
    const edges = new Uint8Array(w * h);
    const thresh = 0.04 / detailMult;
    for (let i = 0; i < w * h; i++) if (dog[i] > thresh) edges[i] = 1;
    removeSpeckles(edges, w, h, noiseSpeckle);
    return edges;
  }

  if (filter === 'Edge 4') {
    const g = applyGaussianBlur(grid, w, h, 0.7);
    const edges = sobelEdges(g, w, h, 0.16 / detailMult);
    removeSpeckles(edges, w, h, noiseSpeckle);
    return edges;
  }

  if (filter === 'Edge 5') {
    const low = sobelEdges(grid, w, h, 0.10 / detailMult);
    const high = sobelEdges(grid, w, h, 0.24 / detailMult);
    const merged = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (high[idx]) merged[idx] = 1;
        else if (low[idx]) {
          let hasHigh = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (high[(y + dy) * w + (x + dx)]) {
                hasHigh = true;
                break;
              }
            }
            if (hasHigh) break;
          }
          if (hasHigh) merged[idx] = 1;
        }
      }
    }
    removeSpeckles(merged, w, h, noiseSpeckle);
    return merged;
  }

  if (filter === 'Edge 6') {
    const lap = new Float32Array(w * h);
    const kLap = [0, 1, 0, 1, -4, 1, 0, 1, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let sum = 0, ki = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += grid[(y + dy) * w + (x + dx)] * kLap[ki++];
          }
        }
        lap[y * w + x] = Math.abs(sum);
      }
    }
    const edges = new Uint8Array(w * h);
    const thresh = 0.18 / detailMult;
    for (let i = 0; i < w * h; i++) if (lap[i] > thresh) edges[i] = 1;
    removeSpeckles(edges, w, h, noiseSpeckle);
    return edges;
  }

  // 7. Artistic 1 & Artistic 2
  if (filter === 'Artistic 1' || filter === 'Artistic 2') {
    const levels = [0.30, 0.55, 0.78];
    const combined = new Uint8Array(w * h);
    for (const lvl of levels) {
      for (let i = 0; i < w * h; i++) if (grid[i] < lvl) combined[i] = 1;
    }
    removeSpeckles(combined, w, h, noiseSpeckle + 2);
    return combined;
  }

  // Default fallback to Smooth 1
  const blurred = applyGaussianBlur(grid, w, h, 0.9);
  return otsuThreshold(blurred, w, h);
}

function runPicSvgFilter(
  filter: PicSvgFilter,
  details: PicSvgDetails,
  grid: Float32Array,
  w: number,
  h: number,
  targetWMm: number,
  targetHMm: number,
  penId: string,
  sourceId: string,
  penColorHex: string = '#000000',
  enableInfill: boolean = true,
  infillSpacingMm: number = 0.4
): { polylines: Polyline[]; svgString: string; isSolidFill: boolean } {
  const bin = getFilterBinarizedGrid(filter, details, grid, w, h);

  const turdsize = details === 'great' ? 1 : details === 'strong' ? 2 : details === 'medium' ? 4 : 8;
  const alphamax = filter === 'Sharp 1' ? 0.6 : filter === 'Clean 1' ? 0.8 : 1.0;
  const optcurve = filter !== 'Sharp 1';
  const opttolerance = details === 'great' ? 0.1 : 0.2;

  // Genuine Peter Selinger Potrace C engine vectorization
  const rawSvg = traceBinaryGridToSvg(bin, w, h, {
    turdsize,
    alphamax,
    optcurve,
    opttolerance,
    fillColorHex: penColorHex,
  });

  const parsed = parseSVG(rawSvg, sourceId, penId, 0.05);

  const scaleX = targetWMm / w;
  const scaleY = targetHMm / h;

  const polylines: Polyline[] = parsed.polylines.map((poly) => ({
    ...poly,
    points: poly.points.map((pt) => ({
      x: Math.round(pt.x * scaleX * 100) / 100,
      y: Math.round(pt.y * scaleY * 100) / 100,
    })),
  }));

  const isSolidFill = !filter.startsWith('Edge ');

  if (enableInfill && isSolidFill && parsed.closedLoops.length > 0) {
    const scaledClosedLoops = parsed.closedLoops.map((loop) =>
      loop.map((pt) => ({
        x: Math.round(pt.x * scaleX * 100) / 100,
        y: Math.round(pt.y * scaleY * 100) / 100,
      }))
    );

    const hatchPolys = generatePolygonHatch(scaledClosedLoops, {
      spacingMm: infillSpacingMm,
      angleDeg: 0,
      penId,
      sourceElementId: sourceId,
    });
    polylines.push(...hatchPolys);
  }

  // Scaled standard SVG markup for download and preview
  const svgString = polylinesToSvgString(
    polylines.filter((p) => !p.id.includes('_hatch_')),
    Math.round(targetWMm * 10) / 10,
    Math.round(targetHMm * 10) / 10,
    penColorHex,
    0.35,
    isSolidFill
  );

  return { polylines, svgString, isSolidFill };
}

/**
 * Classical Cross-Hatch / Engraving (Leonardo da Vinci Etching Shading)
 */
function vectorizeCrossHatch(
  grid: Float32Array,
  w: number,
  h: number,
  targetWMm: number,
  targetHMm: number,
  detailLevel: number,
  penId: string,
  sourceId: string
): Polyline[] {
  const polylines: Polyline[] = [];
  const spacingMm = Math.max(0.6, 2.2 - detailLevel * 0.35);
  const scaleX = targetWMm / w;
  const scaleY = targetHMm / h;

  let counter = 0;

  // Pass 1: 45-degree primary diagonal hatch for dark and midtone areas
  const maxDim = Math.hypot(targetWMm, targetHMm);
  const numDiagonals = Math.ceil(maxDim / spacingMm);

  for (let d = -numDiagonals; d <= numDiagonals; d++) {
    const offset = d * spacingMm;
    const currentSegment: Point2D[] = [];
    const stepMm = 0.8;

    for (let t = -maxDim; t <= maxDim; t += stepMm) {
      const pxMm = t * Math.SQRT1_2 + offset;
      const pyMm = t * Math.SQRT1_2;

      if (pxMm >= 0 && pxMm <= targetWMm && pyMm >= 0 && pyMm <= targetHMm) {
        const imgX = Math.min(w - 1, Math.max(0, Math.floor(pxMm / scaleX)));
        const imgY = Math.min(h - 1, Math.max(0, Math.floor((targetHMm - pyMm) / scaleY)));
        const lum = grid[imgY * w + imgX];

        if (lum < 0.65) {
          currentSegment.push({
            x: Math.round(pxMm * 100) / 100,
            y: Math.round(pyMm * 100) / 100,
          });
        } else {
          if (currentSegment.length >= 2) {
            polylines.push({
              id: `${sourceId}_h1_${counter++}`,
              points: [...currentSegment],
              penId,
              sourceElementId: sourceId,
            });
          }
          currentSegment.length = 0;
        }
      } else {
        if (currentSegment.length >= 2) {
          polylines.push({
            id: `${sourceId}_h1_${counter++}`,
            points: [...currentSegment],
            penId,
            sourceElementId: sourceId,
          });
        }
        currentSegment.length = 0;
      }
    }

    if (currentSegment.length >= 2) {
      polylines.push({
        id: `${sourceId}_h1_${counter++}`,
        points: [...currentSegment],
        penId,
        sourceElementId: sourceId,
      });
    }
  }

  // Pass 2: -45-degree cross-hatch for deep shadows (lum < 0.35)
  for (let d = -numDiagonals; d <= numDiagonals; d++) {
    const offset = d * spacingMm;
    const currentSegment: Point2D[] = [];
    const stepMm = 0.8;

    for (let t = -maxDim; t <= maxDim; t += stepMm) {
      const pxMm = t * Math.SQRT1_2 + offset;
      const pyMm = -t * Math.SQRT1_2 + targetHMm / 2;

      if (pxMm >= 0 && pxMm <= targetWMm && pyMm >= 0 && pyMm <= targetHMm) {
        const imgX = Math.min(w - 1, Math.max(0, Math.floor(pxMm / scaleX)));
        const imgY = Math.min(h - 1, Math.max(0, Math.floor((targetHMm - pyMm) / scaleY)));
        const lum = grid[imgY * w + imgX];

        if (lum < 0.35) {
          currentSegment.push({
            x: Math.round(pxMm * 100) / 100,
            y: Math.round(pyMm * 100) / 100,
          });
        } else {
          if (currentSegment.length >= 2) {
            polylines.push({
              id: `${sourceId}_h2_${counter++}`,
              points: [...currentSegment],
              penId,
              sourceElementId: sourceId,
            });
          }
          currentSegment.length = 0;
        }
      } else {
        if (currentSegment.length >= 2) {
          polylines.push({
            id: `${sourceId}_h2_${counter++}`,
            points: [...currentSegment],
            penId,
            sourceElementId: sourceId,
          });
        }
        currentSegment.length = 0;
      }
    }

    if (currentSegment.length >= 2) {
      polylines.push({
        id: `${sourceId}_h2_${counter++}`,
        points: [...currentSegment],
        penId,
        sourceElementId: sourceId,
      });
    }
  }

  return polylines;
}

/**
 * Continuous Waveform / Squiggle Halftone (High-Speed Sweeping Plotter Lines)
 */
function vectorizeSquiggle(
  grid: Float32Array,
  w: number,
  h: number,
  targetWMm: number,
  targetHMm: number,
  detailLevel: number,
  penId: string,
  sourceId: string
): Polyline[] {
  const polylines: Polyline[] = [];
  const lineSpacingMm = Math.max(0.8, 2.5 - detailLevel * 0.35);
  const numLines = Math.floor(targetHMm / lineSpacingMm);
  const scaleX = targetWMm / w;
  const scaleY = targetHMm / h;

  let counter = 0;

  for (let l = 0; l <= numLines; l++) {
    const yBaseMm = l * lineSpacingMm;
    const points: Point2D[] = [];
    const samples = Math.max(80, Math.floor(targetWMm * 1.5));
    const forward = l % 2 === 0;

    for (let s = 0; s <= samples; s++) {
      const frac = forward ? s / samples : (samples - s) / samples;
      const xMm = frac * targetWMm;

      const imgX = Math.min(w - 1, Math.max(0, Math.floor(xMm / scaleX)));
      const imgY = Math.min(h - 1, Math.max(0, Math.floor((targetHMm - yBaseMm) / scaleY)));
      const lum = grid[imgY * w + imgX];
      const darkness = Math.max(0, 1 - lum);

      const maxAmplitudeMm = lineSpacingMm * 0.75;
      const waveFreq = 0.7 + darkness * 0.8;
      const wave = Math.sin(s * waveFreq) * (darkness * maxAmplitudeMm);

      points.push({
        x: Math.round(xMm * 100) / 100,
        y: Math.round(Math.max(0, Math.min(targetHMm, yBaseMm + wave)) * 100) / 100,
      });
    }

    if (points.length >= 2) {
      polylines.push({
        id: `${sourceId}_sq_${counter++}`,
        points,
        penId,
        sourceElementId: sourceId,
      });
    }
  }

  return polylines;
}

/**
 * Main Vectorizer Entrypoint
 */
export function vectorizeImageData(
  imageData: ImageData,
  options: VectorizeOptions
): VectorizeResult {
  const {
    filter,
    details = 'strong',
    style,
    targetWidthMm,
    targetHeightMm,
    detailLevel = 3,
    contrast = 0,
    brightness = 0,
    invert = false,
    penId = 'pen-1',
    penColorHex = '#111827',
    sourceElementId = 'image_elem',
    enableInfill = true,
    infillSpacingMm = 0.4,
  } = options;

  const aspectRatio = imageData.height / imageData.width;
  const finalWMm = targetWidthMm;
  const finalHMm = targetHeightMm || targetWidthMm * aspectRatio;

  const { grid, width, height } = extractLuminanceGrid(
    imageData,
    contrast,
    brightness,
    invert
  );

  let polylines: Polyline[] = [];
  let svgString = '';
  let isSolidFill = true;

  const effectiveFilter = filter || (PICSVG_FILTERS.includes(style as PicSvgFilter) ? (style as PicSvgFilter) : undefined);

  if (style === 'crosshatch') {
    polylines = vectorizeCrossHatch(
      grid,
      width,
      height,
      finalWMm,
      finalHMm,
      detailLevel,
      penId,
      sourceElementId
    );
    isSolidFill = false;
    svgString = polylinesToSvgString(polylines, Math.round(finalWMm * 10) / 10, Math.round(finalHMm * 10) / 10, penColorHex, 0.35, false);
  } else if (style === 'squiggle') {
    polylines = vectorizeSquiggle(
      grid,
      width,
      height,
      finalWMm,
      finalHMm,
      detailLevel,
      penId,
      sourceElementId
    );
    isSolidFill = false;
    svgString = polylinesToSvgString(polylines, Math.round(finalWMm * 10) / 10, Math.round(finalHMm * 10) / 10, penColorHex, 0.35, false);
  } else {
    // Standard PicSVG Filter with true Potrace engine
    const filterToRun = effectiveFilter || 'Smooth 1';
    const res = runPicSvgFilter(
      filterToRun,
      details,
      grid,
      width,
      height,
      finalWMm,
      finalHMm,
      penId,
      sourceElementId,
      penColorHex,
      enableInfill,
      infillSpacingMm
    );
    polylines = res.polylines;
    svgString = res.svgString;
    isSolidFill = res.isSolidFill;
  }

  // Calculate total path travel length
  let totalLengthMm = 0;
  for (const poly of polylines) {
    for (let i = 0; i < poly.points.length - 1; i++) {
      totalLengthMm += Math.hypot(
        poly.points[i + 1].x - poly.points[i].x,
        poly.points[i + 1].y - poly.points[i].y
      );
    }
  }

  const roundedWMm = Math.round(finalWMm * 10) / 10;
  const roundedHMm = Math.round(finalHMm * 10) / 10;
  const roundedLengthMm = Math.round(totalLengthMm * 10) / 10;

  return {
    polylines,
    widthMm: roundedWMm,
    heightMm: roundedHMm,
    totalLengthMm: roundedLengthMm,
    svgString,
    isSolidFill,
    loopCount: polylines.length,
  };
}

/**
 * Loads and rasterizes an image File (PNG, JPG, WEBP, BMP) using HTML Canvas
 * Uses high-resolution canvas (up to 1200px) so fine lines and text stay ultra sharp
 */
export function processImageFileToImageData(
  file: File,
  maxDimension: number = 1200
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas 2D context.'));
          return;
        }

        // Fill white background for transparency handling
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        resolve(imgData);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = src;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}
