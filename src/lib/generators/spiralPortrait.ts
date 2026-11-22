import { Point2D, Polyline } from '@/types/plotter';

/**
 * Generator 1: Single-Line Spiral Portrait Halftoner
 * Converts photographic grayscale luminance into a single continuous Archimedean spiral.
 * Radius is modulated by a high-frequency wave whose amplitude is inversely proportional
 * to brightness (darker pixels = higher amplitude / darker ink density).
 * Guaranteed ONE continuous unbroken pen stroke!
 */

export interface SpiralPortraitOptions {
  bounds: { width: number; height: number };
  spiralLoops?: number; // Total revolutions (e.g., 40 to 90)
  pointsPerLoop?: number; // Sampling density along theta
  modulationFrequency?: number; // Wave cycles per revolution
  maxModulationMm?: number; // Max wave peak in millimeters
  invertBrightness?: boolean;
  penId?: string;
  sourceElementId?: string;
}

/**
 * Sample luminance value [0..1] (0 = pure black, 1 = pure white) at normalized position (u, v) in [0..1]
 */
export type LuminanceSampler = (u: number, v: number) => number;

/**
 * Procedural default portrait luminance sampler (Stylized cybernetic face)
 * Used when user has not yet uploaded an image.
 */
export function createDefaultPortraitSampler(): LuminanceSampler {
  return (u: number, v: number): number => {
    // Center at (0.5, 0.5)
    const x = (u - 0.5) * 2;
    const y = (v - 0.5) * 2;
    const r = Math.sqrt(x * x + y * y);

    // Oval face base
    const faceShape = Math.sqrt((x / 0.65) * (x / 0.65) + ((y - 0.05) / 0.85) * ((y - 0.05) / 0.85));
    if (faceShape > 1.0) {
      return 1.0; // White background
    }

    // Eyes
    const eyeL = Math.hypot((x + 0.22) / 0.12, (y + 0.1) / 0.06);
    const eyeR = Math.hypot((x - 0.22) / 0.12, (y + 0.1) / 0.06);
    if (eyeL < 0.6 || eyeR < 0.6) return 0.05; // Dark pupils

    // Brow ridges
    const browL = Math.hypot((x + 0.22) / 0.16, (y + 0.22) / 0.04);
    const browR = Math.hypot((x - 0.22) / 0.16, (y + 0.22) / 0.04);
    if (browL < 0.8 || browR < 0.8) return 0.2;

    // Nose
    const nose = Math.hypot(x / 0.08, (y + 0.02) / 0.24);
    if (nose < 0.8 && y > -0.1) return 0.35;

    // Mouth / Lips
    const mouth = Math.hypot(x / 0.25, (y - 0.38) / 0.08);
    if (mouth < 0.7) return 0.15;

    // Jawline shading
    const jaw = 1.0 - faceShape;
    return 0.3 + 0.7 * Math.min(1, Math.max(0, jaw * 2));
  };
}

/**
 * Creates a LuminanceSampler from raw HTML Canvas ImageData
 */
export function createSamplerFromImageData(imageData: ImageData): LuminanceSampler {
  const { width, height, data } = imageData;
  return (u: number, v: number): number => {
    const px = Math.floor(Math.max(0, Math.min(width - 1, u * width)));
    const py = Math.floor(Math.max(0, Math.min(height - 1, v * height)));
    const idx = (py * width + px) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Rec. 709 relative luminance
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
}

export function generateSpiralPortrait(
  sampler: LuminanceSampler,
  options: SpiralPortraitOptions
): Polyline {
  const {
    bounds,
    spiralLoops = 55,
    pointsPerLoop = 180,
    modulationFrequency = 32,
    maxModulationMm = 1.6,
    invertBrightness = false,
    penId = 'pen-1',
    sourceElementId = 'gen_spiral_portrait',
  } = options;

  const maxRadius = (Math.min(bounds.width, bounds.height) / 2) * 0.94;
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;

  const totalPoints = spiralLoops * pointsPerLoop;
  const maxTheta = spiralLoops * Math.PI * 2;
  const points: Point2D[] = [];

  for (let i = 0; i <= totalPoints; i++) {
    const progress = i / totalPoints;
    const theta = progress * maxTheta;
    const baseR = progress * maxRadius;

    // Compute sample coordinate in normalized [0..1] space
    // Standard machine space: (0,0) is bottom-left, image top is 1
    const unmodulatedX = centerX + Math.cos(theta) * baseR;
    const unmodulatedY = centerY + Math.sin(theta) * baseR;

    const u = Math.max(0, Math.min(1, unmodulatedX / bounds.width));
    const v = Math.max(0, Math.min(1, 1 - unmodulatedY / bounds.height)); // Flip image Y

    let lum = sampler(u, v);
    if (invertBrightness) lum = 1 - lum;

    // Darkness factor: 0 (white) to 1 (black)
    const darkness = 1 - Math.max(0, Math.min(1, lum));

    // High frequency modulation: taller sine wave amplitude on darker regions
    const wave = Math.sin(theta * modulationFrequency);
    const modR = baseR + wave * (darkness * maxModulationMm);

    const x = centerX + Math.cos(theta) * modR;
    const y = centerY + Math.sin(theta) * modR;

    points.push({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    });
  }

  return {
    id: `spiral_portrait_${Date.now()}`,
    points,
    penId,
    sourceElementId,
  };
}
