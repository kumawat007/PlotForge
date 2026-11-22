import { describe, it, expect } from 'vitest';
import {
  generateFlowField,
  generateSpirograph,
  generateHilbertCurve,
  generateGuilloche,
  generateTopographicContour,
} from '../generators/algorithmicGenerators';
import { generateRidgeWaves } from '../generators/ridgeWaves';
import { generateSpiralPortrait, createDefaultPortraitSampler } from '../generators/spiralPortrait';

describe('CAD Generative Vector Art Engines', () => {
  const bounds = { width: 140, height: 140 };

  it('generates streamline flow fields strictly bounded within margin', () => {
    const lines = generateFlowField(bounds, { numLines: 20, stepsPerLine: 30, seed: 42 });
    expect(lines.length).toBeGreaterThan(0);
    for (const poly of lines) {
      expect(poly.points.length).toBeGreaterThanOrEqual(2);
      for (const pt of poly.points) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(bounds.width);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(bounds.height);
      }
    }
  });

  it('generates a continuous mathematical spirograph harmonograph as 1 single stroke', () => {
    const lines = generateSpirograph(bounds, { steps: 500, revolutions: 10 });
    expect(lines.length).toBe(1);
    expect(lines[0].points.length).toBeGreaterThan(400);
  });

  it('generates a fractal Hilbert space-filling curve with exactly 1 stroke and 2^2N points', () => {
    const order = 3; // 2^3 = 8 -> 8x8 = 64 points
    const lines = generateHilbertCurve(bounds, { order });
    expect(lines.length).toBe(1);
    expect(lines[0].points.length).toBe(64);

    // Verify all points are inside bounds
    for (const pt of lines[0].points) {
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.x).toBeLessThanOrEqual(bounds.width);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeLessThanOrEqual(bounds.height);
    }
  });

  it('generates harmonic guilloche security rosette ribbons', () => {
    const ribbons = 6;
    const lines = generateGuilloche(bounds, { ribbons, steps: 100 });
    expect(lines.length).toBe(ribbons);
    for (const poly of lines) {
      expect(poly.points.length).toBeGreaterThan(50);
    }
  });

  it('generates topographic contour rings with organic elevation harmonics', () => {
    const levels = 5;
    const lines = generateTopographicContour(bounds, { levels, pointsPerRing: 40 });
    expect(lines.length).toBe(levels);
  });

  it('generates ridge waves with horizon buffer occlusion', () => {
    const lines = generateRidgeWaves({
      bounds,
      numLines: 15,
      pointsPerLine: 50,
      maxPeakHeightMm: 10,
    });
    expect(lines.length).toBeGreaterThan(0);
    for (const poly of lines) {
      expect(poly.points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('generates an unbroken single-stroke Archimedean spiral portrait with luminance modulation', () => {
    const sampler = createDefaultPortraitSampler();
    const poly = generateSpiralPortrait(sampler, {
      bounds,
      spiralLoops: 20,
      pointsPerLoop: 60,
    });
    expect(poly.points.length).toBeGreaterThan(500);
  });
});

