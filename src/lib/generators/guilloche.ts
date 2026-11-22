import { Point2D, Polyline } from '@/types/plotter';

/**
 * Generator 3: Parametric Guilloché Harmonograph & Spirograph Rosette Engine
 * Generates bank-note / passport security engraving geometric rosettes using
 * coupled hypotrochoid and epitrochoid harmonic equations with decay and phase shifts.
 */

export interface GuillocheOptions {
  bounds: { width: number; height: number };
  outerRadiusRatio?: number; // R relative to bed size (e.g. 0.2 to 1.0)
  innerRadiusRatio?: number; // r relative to bed size (e.g. 0.05 to 0.8)
  penDistanceRatio?: number; // d (offset from rolling circle center)
  revolutions?: number; // Total revolutions (e.g. 8 to 48)
  stepsPerRevolution?: number; // Resolution
  phaseDecay?: number; // Spiral decay factor
  waveFrequency?: number; // High frequency modulation
  waveAmplitudeMm?: number; // Wave modulation in mm
  numRibbons?: number; // Multiple nested ribbons
  ribbonSpacingRatio?: number;
  penId?: string;
  sourceElementId?: string;
}

export function generateGuillocheRosette(options: GuillocheOptions): Polyline[] {
  const {
    bounds,
    outerRadiusRatio = 0.85,
    innerRadiusRatio = 0.34,
    penDistanceRatio = 0.62,
    revolutions = 20,
    stepsPerRevolution = 120,
    phaseDecay = 0.0,
    waveFrequency = 0,
    waveAmplitudeMm = 0,
    numRibbons = 1,
    ribbonSpacingRatio = 0.06,
    penId = 'pen-1',
    sourceElementId = 'gen_guilloche_rosette',
  } = options;

  const maxR = (Math.min(bounds.width, bounds.height) / 2) * 0.92;
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;

  const polylines: Polyline[] = [];
  const totalSteps = Math.floor(revolutions * stepsPerRevolution);
  const maxTheta = revolutions * Math.PI * 2;
  const dTheta = maxTheta / totalSteps;

  for (let ribbon = 0; ribbon < numRibbons; ribbon++) {
    const ribbonScale = 1.0 - ribbon * ribbonSpacingRatio;
    if (ribbonScale <= 0.05) break;

    const R = maxR * outerRadiusRatio * ribbonScale;
    const r = maxR * innerRadiusRatio * ribbonScale;
    const d = maxR * penDistanceRatio * ribbonScale;
    const ribbonPhase = (ribbon * Math.PI * 2) / Math.max(1, numRibbons);

    const points: Point2D[] = [];

    for (let i = 0; i <= totalSteps; i++) {
      const theta = i * dTheta;
      // Exponential or linear decay factor
      const decay = 1.0 - (i / totalSteps) * phaseDecay;

      // Hypotrochoid core:
      // x = (R - r) * cos(theta) + d * cos((R - r) * theta / r)
      // y = (R - r) * sin(theta) - d * sin((R - r) * theta / r)
      const gearRatio = (R - r) / r;
      let x = ((R - r) * Math.cos(theta) + d * Math.cos(gearRatio * theta + ribbonPhase)) * decay;
      let y = ((R - r) * Math.sin(theta) - d * Math.sin(gearRatio * theta + ribbonPhase)) * decay;

      // High-frequency harmonic wave overlay (banknote engraving security modulation)
      if (waveFrequency > 0 && waveAmplitudeMm > 0) {
        const hWave = Math.sin(theta * waveFrequency) * waveAmplitudeMm;
        const norm = Math.hypot(x, y) || 1;
        x += (x / norm) * hWave;
        y += (y / norm) * hWave;
      }

      points.push({
        x: Math.round((centerX + x) * 100) / 100,
        y: Math.round((centerY + y) * 100) / 100,
      });
    }

    if (points.length >= 4) {
      polylines.push({
        id: `guilloche_ribbon_${ribbon}_${Date.now()}`,
        points,
        penId,
        sourceElementId,
      });
    }
  }

  return polylines;
}
