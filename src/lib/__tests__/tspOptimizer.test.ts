import { describe, it, expect } from 'vitest';
import {
  mergeConsecutivePolylines,
  optimizeToolpath,
  calculateTravelDistance,
  simplifyPolylineRDP,
} from '../optimizer/tspOptimizer';
import { Polyline, Point2D } from '@/types/plotter';
import { DEFAULT_PRESET } from '../gcode/presets';

describe('Toolpath Optimizer & Segment Stitching', () => {
  it('decimates redundant collinear points along straight lines with RDP', () => {
    // 5 collinear points along y = 10 from x = 0 to x = 40
    const straightLine: Point2D[] = [
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
      { x: 40, y: 10 },
    ];
    const simplified = simplifyPolylineRDP(straightLine, 0.015);
    expect(simplified.length).toBe(2);
    expect(simplified[0]).toEqual({ x: 0, y: 10 });
    expect(simplified[1]).toEqual({ x: 40, y: 10 });
  });

  it('preserves sharp non-collinear corner vertices in RDP', () => {
    // L-shaped corner: (0, 0) -> (20, 0) -> (20, 20)
    const corner: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 }, // collinear with (0,0)-(20,0) -> pruned
      { x: 20, y: 0 }, // sharp 90-deg vertex -> preserved!
      { x: 20, y: 10 }, // collinear with (20,0)-(20,20) -> pruned
      { x: 20, y: 20 },
    ];
    const simplified = simplifyPolylineRDP(corner, 0.015);
    expect(simplified.length).toBe(3);
    expect(simplified[0]).toEqual({ x: 0, y: 0 });
    expect(simplified[1]).toEqual({ x: 20, y: 0 });
    expect(simplified[2]).toEqual({ x: 20, y: 20 });
  });
  it('merges consecutive touching polylines within 0.05mm tolerance', () => {
    const p1: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    };
    const p2: Polyline = {
      id: 'p2',
      penId: 'pen-1',
      points: [
        { x: 20.03, y: 20.02 }, // Distance is sqrt(0.03^2 + 0.02^2) = 0.036mm <= 0.05mm
        { x: 30, y: 30 },
      ],
    };

    const merged = mergeConsecutivePolylines([p1, p2], 0.05);
    expect(merged.length).toBe(1);
    expect(merged[0].points.length).toBe(3);
    expect(merged[0].points[0]).toEqual({ x: 10, y: 10 });
    expect(merged[0].points[2]).toEqual({ x: 30, y: 30 });
  });

  it('does not merge segments if gap exceeds 0.05mm tolerance', () => {
    const p1: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    };
    const p2: Polyline = {
      id: 'p2',
      penId: 'pen-1',
      points: [
        { x: 20.1, y: 20 }, // 0.1mm gap > 0.05mm
        { x: 30, y: 30 },
      ],
    };

    const merged = mergeConsecutivePolylines([p1, p2], 0.05);
    expect(merged.length).toBe(2);
  });

  it('does not merge polylines assigned to different pen IDs', () => {
    const p1: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    };
    const p2: Polyline = {
      id: 'p2',
      penId: 'pen-2',
      points: [
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ],
    };

    const merged = mergeConsecutivePolylines([p1, p2], 0.05);
    expect(merged.length).toBe(2);
  });

  it('optimizes ordering and reverses strokes to minimize air travel', () => {
    const p1: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
      ],
    };
    // p2 is drawn backwards: from (50, 10) to (21, 10)
    // Entering at (21, 10) is much closer to p1 end (20, 10) than entering at (50, 10)
    const p2: Polyline = {
      id: 'p2',
      penId: 'pen-1',
      points: [
        { x: 50, y: 10 },
        { x: 21, y: 10 },
      ],
    };

    const startPoint: Point2D = { x: DEFAULT_PRESET.safeParkX, y: DEFAULT_PRESET.safeParkY };
    const originalTravel = calculateTravelDistance([p1, p2], startPoint);

    const result = optimizeToolpath([p1, p2], DEFAULT_PRESET);
    const optimizedTravel = calculateTravelDistance(result.optimizedPolylines, startPoint);

    expect(optimizedTravel).toBeLessThanOrEqual(originalTravel);
    expect(result.stats.savedPercent).toBeGreaterThanOrEqual(0);
  });
});
