import { Point2D, Polyline } from '@/types/plotter';

/**
 * Generator 2: Topographic Ridge Waveforms with Hidden-Line Occlusion
 * Generates horizontal scanline ridges modulated by multi-octave 2D noise or image luminance.
 * Uses a horizon buffer across X buckets to perform true Hidden-Line Removal (horizon occlusion)
 * so foreground peaks mask background valleys, creating authentic 3D terrain plots.
 */

export interface RidgeWaveOptions {
  bounds: { width: number; height: number };
  numLines?: number; // Configurable 25 to 80 scanlines
  pointsPerLine?: number; // Horizontal resolution (e.g., 100 to 250)
  maxPeakHeightMm?: number; // Max vertical height of mountain peaks
  noiseFrequency?: number;
  noiseOctaves?: number;
  seed?: number;
  penId?: string;
  sourceElementId?: string;
  customLuminanceSampler?: (u: number, v: number) => number;
}

// 2D Perlin-style gradient noise with octaves
function octaveNoise2D(x: number, y: number, octaves: number = 3, seed: number = 42): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let o = 0; o < octaves; o++) {
    const sX = x * frequency;
    const sY = y * frequency;

    const X = Math.floor(sX) & 255;
    const Y = Math.floor(sY) & 255;
    const fx = sX - Math.floor(sX);
    const fy = sY - Math.floor(sY);

    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);

    const hash = (n: number) => {
      const s = Math.sin(n * 12.9898 + (seed + o * 100) * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    const a = hash(X + Y * 57);
    const b = hash(X + 1 + Y * 57);
    const c = hash(X + (Y + 1) * 57);
    const d = hash(X + 1 + (Y + 1) * 57);

    const lerp = (v0: number, v1: number, t: number) => v0 + t * (v1 - v0);
    const n = lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;

    total += n * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return total / maxValue;
}

export function generateRidgeWaves(options: RidgeWaveOptions): Polyline[] {
  const {
    bounds,
    numLines = 45,
    pointsPerLine = 160,
    maxPeakHeightMm = 18,
    noiseFrequency = 0.045,
    noiseOctaves = 3,
    seed = 2026,
    penId = 'pen-1',
    sourceElementId = 'gen_ridge_waves',
    customLuminanceSampler,
  } = options;

  const marginX = bounds.width * 0.08;
  const marginY = bounds.height * 0.12;
  const usableW = bounds.width - marginX * 2;
  const usableH = bounds.height - marginY * 2;

  const polylines: Polyline[] = [];

  // Horizon occlusion buffer across X buckets
  // In machine space: y=0 is front (closest to viewer), y=bounds.height is back (furthest)
  // When looking from front to back, a point at (x, y) on a ridge behind earlier ridges
  // is visible ONLY if its projected Y is strictly HIGHER than all foreground ridges at that X!
  const horizonBuckets = Math.max(pointsPerLine * 2, 400);
  const horizonY = new Float32Array(horizonBuckets).fill(-Infinity);

  const getBucketIndex = (x: number): number => {
    const norm = Math.max(0, Math.min(1, (x - marginX) / usableW));
    return Math.min(horizonBuckets - 1, Math.floor(norm * horizonBuckets));
  };

  const lineSpacingY = usableH / (numLines - 1);

  // Iterate from front (i = 0, lowest Y) to back (i = numLines - 1, highest Y)
  for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
    const baseY = marginY + lineIdx * lineSpacingY;
    const rawPoints: Point2D[] = [];

    for (let ptIdx = 0; ptIdx <= pointsPerLine; ptIdx++) {
      const u = ptIdx / pointsPerLine;
      const x = marginX + u * usableW;

      // Bell curve envelope to taper edges toward zero at margins
      const envelope = Math.sin(u * Math.PI);
      const envelopeP = Math.pow(envelope, 1.8);

      let elevationFactor = 0;
      if (customLuminanceSampler) {
        // Luminance map modulation (inverted: darker pixels = taller peaks)
        const v = lineIdx / (numLines - 1);
        const lum = customLuminanceSampler(u, v);
        elevationFactor = (1 - lum) * envelopeP;
      } else {
        // Procedural multi-octave terrain ridge
        const n = octaveNoise2D(x * noiseFrequency, baseY * noiseFrequency, noiseOctaves, seed);
        // Normalize noise to [0..1] and shape peaks
        const shaped = Math.pow(Math.max(0, n * 0.5 + 0.5), 1.7);
        elevationFactor = shaped * envelopeP;
      }

      const peakY = baseY + elevationFactor * maxPeakHeightMm;
      rawPoints.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(peakY * 100) / 100,
      });
    }

    // Apply Hidden-Line Removal (Horizon Occlusion)
    // Cut the line into visible contiguous segments where y > horizonY[bucket]
    let currentSegment: Point2D[] = [];

    for (const pt of rawPoints) {
      const bIdx = getBucketIndex(pt.x);
      const prevHorizon = horizonY[bIdx];

      if (pt.y > prevHorizon) {
        // Visible point!
        currentSegment.push(pt);
      } else {
        // Point is hidden behind a foreground mountain peak!
        if (currentSegment.length >= 2) {
          polylines.push({
            id: `ridge_${lineIdx}_seg_${polylines.length}`,
            points: currentSegment,
            penId,
            sourceElementId,
          });
        }
        currentSegment = [];
      }
    }

    if (currentSegment.length >= 2) {
      polylines.push({
        id: `ridge_${lineIdx}_seg_${polylines.length}`,
        points: currentSegment,
        penId,
        sourceElementId,
      });
    }

    // Update horizon buffer with this ridge's elevations
    for (const pt of rawPoints) {
      const bIdx = getBucketIndex(pt.x);
      if (pt.y > horizonY[bIdx]) {
        horizonY[bIdx] = pt.y;
      }
    }
  }

  return polylines;
}
