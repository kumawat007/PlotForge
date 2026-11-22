import { describe, it, expect } from 'vitest';
import { penToNozzle, validateToolpath } from '../gcode/validator';
import { MachinePreset, Polyline } from '@/types/plotter';
import { DEFAULT_PRESET } from '../gcode/presets';

describe('Validator and Kinematic Coordinates', () => {
  const mockPreset: MachinePreset = {
    ...DEFAULT_PRESET,
    bedWidth: 200,
    bedDepth: 200,
    minSafeX: 10,
    maxSafeX: 190,
    minSafeY: 10,
    maxSafeY: 190,
    penOffsetX: -20,
    penOffsetY: -30,
    keepOutZones: [
      {
        id: 'zone-1',
        name: 'Front Clip Zone',
        xMin: 0,
        xMax: 30,
        yMin: 0,
        yMax: 20,
      },
    ],
  };

  it('correctly calculates nozzle coordinates from pen coordinates and offsets', () => {
    // X_nozzle = X_pen - penOffsetX = 50 - (-20) = 70
    // Y_nozzle = Y_pen - penOffsetY = 60 - (-30) = 90
    const nozzle = penToNozzle(50, 60, mockPreset.penOffsetX, mockPreset.penOffsetY);
    expect(nozzle.x).toBe(70);
    expect(nozzle.y).toBe(90);
  });

  it('validates safe toolpath within boundaries', () => {
    // Pen at (50, 50) -> nozzle at (70, 80), safe
    const poly: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 50, y: 50 },
        { x: 60, y: 60 },
      ],
    };
    const result = validateToolpath([poly], mockPreset);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags error when nozzle coordinates violate safe travel limits', () => {
    // Pen at (180, 180) -> nozzle at (200, 210) > maxSafeX (190) and maxSafeY (190)
    const poly: Polyline = {
      id: 'p-out',
      penId: 'pen-1',
      points: [
        { x: 180, y: 180 },
        { x: 185, y: 185 },
      ],
    };
    const result = validateToolpath([poly], mockPreset);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('violates safe limits'))).toBe(true);
  });

  it('explicitly validates pen coordinates against build plate dimensions (0 <= X <= bedWidth, 0 <= Y <= bedDepth)', () => {
    // Pen coordinate at (-5, 50) is physically off the bed plate
    const poly: Polyline = {
      id: 'p-pen-out',
      penId: 'pen-1',
      points: [
        { x: -5, y: 50 },
        { x: 20, y: 50 },
      ],
    };
    const result = validateToolpath([poly], mockPreset);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('outside the build plate area'))).toBe(true);
  });

  it('flags error when nozzle penetrates a keep-out zone', () => {
    // Nozzle at (20, 15) is inside zone-1 [0..30, 0..20]
    // Pen at (0, -15) -> nozzle at (0 - (-20), -15 - (-30)) = (20, 15)
    const poly: Polyline = {
      id: 'p-clip',
      penId: 'pen-1',
      points: [
        { x: 0, y: -15 },
        { x: 5, y: -15 },
      ],
    };
    const result = validateToolpath([poly], mockPreset);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Collision with keep-out zone'))).toBe(true);
  });

  it('reports both pen boundary errors and nozzle/keep-out errors without category shadowing', () => {
    const polyPenOut: Polyline = {
      id: 'p-pen',
      penId: 'pen-1',
      points: [
        { x: -10, y: 50 },
        { x: -10, y: 60 },
      ],
    };
    const polyNozzleOut: Polyline = {
      id: 'p-nozzle',
      penId: 'pen-1',
      points: [
        { x: 180, y: 180 },
        { x: 185, y: 185 },
      ],
    };
    const result = validateToolpath([polyPenOut, polyNozzleOut], mockPreset);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('outside the build plate area'))).toBe(true);
    expect(result.errors.some((e) => e.includes('violates safe limits'))).toBe(true);
  });

  it('detects when strokes exceed the active white paper sheet boundaries', () => {
    const paperPreset: import('@/types/plotter').PaperPreset = {
      id: 'custom',
      name: 'Test Paper',
      widthMm: 100,
      heightMm: 100,
    };

    // Safe reachable center for mockPreset:
    // safeCenterX = (10 + 190)/2 + (-20) = 100 - 20 = 80
    // safeCenterY = (10 + 190)/2 + (-30) = 100 - 30 = 70
    // Paper bounds: X: [30, 130], Y: [20, 120]

    // Point inside paper bounds (85, 80)
    const polyInside: Polyline = {
      id: 'p-in-paper',
      penId: 'pen-1',
      points: [
        { x: 80, y: 75 },
        { x: 90, y: 85 },
      ],
    };

    const validResult = validateToolpath([polyInside], mockPreset, paperPreset);
    expect(validResult.isValid).toBe(true);
    expect(validResult.isOutOfPaper).toBe(false);
    expect(validResult.paperErrors).toHaveLength(0);

    // Point outside paper bounds: X = 145 > maxX (135) but still inside bed plate (0..200)
    const polyOutsidePaper: Polyline = {
      id: 'p-out-paper',
      penId: 'pen-1',
      points: [
        { x: 125, y: 80 },
        { x: 145, y: 80 },
      ],
    };

    const invalidResult = validateToolpath([polyOutsidePaper], mockPreset, paperPreset);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.isOutOfPaper).toBe(true);
    expect(invalidResult.paperErrors.length).toBeGreaterThan(0);
    expect(invalidResult.paperErrors[0]).toContain('exceeds active paper bounds');
  });
});
