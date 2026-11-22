import { describe, it, expect } from 'vitest';
import {
  pointToSegmentDistance,
  flattenCubicBezier,
  flattenQuadraticBezier,
} from '../svg/bezier';
import { Point2D } from '@/types/plotter';

describe('pointToSegmentDistance (clamped finite segment)', () => {
  const p0: Point2D = { x: 0, y: 0 };
  const p1: Point2D = { x: 10, y: 0 };

  it('calculates exact perpendicular distance for point projecting within segment', () => {
    const p: Point2D = { x: 5, y: 3 };
    const dist = pointToSegmentDistance(p, p0, p1);
    expect(dist).toBeCloseTo(3.0, 5);
  });

  it('clamps to start point p0 when point projects before t = 0', () => {
    // If it were an infinite line, perpendicular distance from (-4, 3) to y=0 would be 3.
    // To the finite segment [0,0]-[10,0], distance is to (0,0): sqrt((-4)^2 + 3^2) = 5!
    const p: Point2D = { x: -4, y: 3 };
    const dist = pointToSegmentDistance(p, p0, p1);
    expect(dist).toBeCloseTo(5.0, 5);
  });

  it('clamps to end point p1 when point projects beyond t = 1', () => {
    // Point at (14, 3). Distance to (10, 0) is sqrt(4^2 + 3^2) = 5.
    const p: Point2D = { x: 14, y: 3 };
    const dist = pointToSegmentDistance(p, p0, p1);
    expect(dist).toBeCloseTo(5.0, 5);
  });

  it('handles degenerate zero-length segment p0 == p1', () => {
    const p: Point2D = { x: 3, y: 4 };
    const dist = pointToSegmentDistance(p, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(dist).toBeCloseTo(5.0, 5);
  });

  it('returns 0 when point lies exactly on the line segment', () => {
    const p: Point2D = { x: 7, y: 0 };
    const dist = pointToSegmentDistance(p, p0, p1);
    expect(dist).toBeCloseTo(0.0, 5);
  });
});

describe('flattenCubicBezier and flattenQuadraticBezier', () => {
  it('subdivides a curved cubic bezier into points within tolerance', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 0, y: 10 };
    const p2 = { x: 10, y: 10 };
    const p3 = { x: 10, y: 0 };

    const points = flattenCubicBezier(p0, p1, p2, p3, 0.05);
    expect(points.length).toBeGreaterThan(4);
    // Last point must be p3
    expect(points[points.length - 1].x).toBeCloseTo(10, 3);
    expect(points[points.length - 1].y).toBeCloseTo(0, 3);
  });

  it('subdivides a quadratic bezier curve within tolerance', () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 5, y: 10 };
    const p2 = { x: 10, y: 0 };

    const points = flattenQuadraticBezier(p0, p1, p2, 0.05);
    expect(points.length).toBeGreaterThan(2);
    expect(points[points.length - 1].x).toBeCloseTo(10, 3);
    expect(points[points.length - 1].y).toBeCloseTo(0, 3);
  });
});
