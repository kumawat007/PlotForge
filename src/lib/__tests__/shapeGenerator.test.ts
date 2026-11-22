import { describe, it, expect } from 'vitest';
import {
  generateRectangleGeometry,
  generateCircleGeometry,
  generateStarGeometry,
  generatePolygonGeometry,
  generateLineGeometry,
  smoothFreehandPoints,
  createRectangleElement,
  createCircleElement,
  createStarElement,
  createPolygonElement,
  createFreehandStrokeElement,
} from '../generators/shapeGenerator';

describe('Shape & Geometry Generator Engine', () => {
  it('generates sharp and rounded rectangle geometries with closed loops', () => {
    // Sharp rectangle
    const sharp = generateRectangleGeometry(60, 40, 0);
    expect(sharp.points.length).toBe(5); // 4 corners + closed loop start
    expect(sharp.closedLoop.length).toBe(4);
    expect(sharp.points[0]).toEqual(sharp.points[sharp.points.length - 1]);

    // Rounded rectangle
    const rounded = generateRectangleGeometry(60, 40, 5);
    expect(rounded.points.length).toBeGreaterThan(20);
    expect(rounded.closedLoop.length).toBe(rounded.points.length - 1);
  });

  it('generates circle and ellipse geometries with smooth curvature', () => {
    const circle = generateCircleGeometry(25, 25, 64);
    expect(circle.points.length).toBe(65);
    expect(circle.closedLoop.length).toBe(64);
    // Point at 0 radians should be (25, 0)
    expect(circle.points[0].x).toBeCloseTo(25, 1);
    expect(circle.points[0].y).toBeCloseTo(0, 1);

    // Ellipse
    const ellipse = generateCircleGeometry(30, 15, 32);
    expect(ellipse.points.length).toBe(33);
  });

  it('generates 5-point star and polygons with closed loops', () => {
    const star = generateStarGeometry(5, 30, 15);
    expect(star.points.length).toBe(11); // 10 vertices + closed return
    expect(star.closedLoop.length).toBe(10);

    const hex = generatePolygonGeometry(6, 20);
    expect(hex.points.length).toBe(7); // 6 vertices + closed return
    expect(hex.closedLoop.length).toBe(6);
  });

  it('generates straight line and arrow geometries', () => {
    const line = generateLineGeometry(50, 0, false);
    expect(line.polylines.length).toBe(1);
    expect(line.polylines[0].points.length).toBe(2);

    const arrow = generateLineGeometry(50, 0, true);
    expect(arrow.polylines.length).toBe(2); // main line + arrow head
  });

  it('smooths and simplifies raw freehand points without losing fidelity', () => {
    const raw = [
      { x: 10, y: 10 },
      { x: 10.05, y: 10.02 }, // jitter
      { x: 20, y: 15 },
      { x: 20.02, y: 14.98 }, // jitter
      { x: 30, y: 25 },
    ];
    const smoothed = smoothFreehandPoints(raw, 0.2);
    expect(smoothed.length).toBeGreaterThanOrEqual(3);
    expect(smoothed[0]).toEqual({ x: 10, y: 10 });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: 30, y: 25 });
  });

  it('creates ready-to-plot DesignElements with bounding boxes and infill loops', () => {
    const rectElem = createRectangleElement('test_rect', {
      widthMm: 80,
      heightMm: 50,
      cornerRadiusMm: 4,
      penId: 'pen-1',
      isSolidFill: true,
      center: { x: 90, y: 75 },
    });
    expect(rectElem.id).toBe('test_rect');
    expect(rectElem.x).toBe(90);
    expect(rectElem.y).toBe(75);
    expect(rectElem.isSolidFill).toBe(true);
    expect(rectElem.closedLoops?.length).toBe(1);

    const circleElem = createCircleElement('test_circle', {
      radiusMm: 20,
      penId: 'pen-1',
      center: { x: 50, y: 50 },
    });
    expect(circleElem.x).toBe(50);
    expect(circleElem.contentBounds?.width).toBe(40);

    const strokeElem = createFreehandStrokeElement(
      'stroke_1',
      [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
      ],
      'pen-1'
    );
    expect(strokeElem).not.toBeNull();
    expect(strokeElem?.type).toBe('svg');
  });
});
