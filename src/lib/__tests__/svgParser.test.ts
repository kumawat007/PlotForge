import { describe, it, expect } from 'vitest';
import {
  identityMatrix,
  multiplyMatrices,
  applyMatrix,
  parseTransform,
  parseSVG,
} from '../svg/svgParser';

describe('SVG CAD Parser & 2D Affine Kinematics', () => {
  it('applies identity matrix without distorting coordinates', () => {
    const pt = { x: 42, y: 88 };
    const res = applyMatrix(pt, identityMatrix());
    expect(res.x).toBe(42);
    expect(res.y).toBe(88);
  });

  it('correctly translates coordinates via affine matrix', () => {
    const pt = { x: 10, y: 20 };
    const mat = parseTransform('translate(15, -5)');
    const res = applyMatrix(pt, mat);
    expect(res.x).toBe(25);
    expect(res.y).toBe(15);
  });

  it('correctly scales coordinates via affine matrix', () => {
    const pt = { x: 10, y: 20 };
    const mat = parseTransform('scale(2, 3)');
    const res = applyMatrix(pt, mat);
    expect(res.x).toBe(20);
    expect(res.y).toBe(60);
  });

  it('parses SVG rect elements into closed polylines', () => {
    const svg = `
      <svg viewBox="0 0 100 100">
        <rect x="10" y="10" width="40" height="30" stroke="#000000" />
      </svg>
    `;
    const result = parseSVG(svg);
    expect(result.polylines.length).toBe(1);
    const pts = result.polylines[0].points;
    expect(pts.length).toBe(5); // 4 corners + closed loop
    // In Machine coordinates (Y-up, origin at bottom-left of viewBox H=100):
    // SVG y=10 maps to Machine y = 100 - 10 = 90
    // SVG y=40 maps to Machine y = 100 - 40 = 60
    expect(pts[0].x).toBe(10);
    expect(pts[0].y).toBe(90);
    expect(pts[1].x).toBe(50);
    expect(pts[1].y).toBe(90);
    expect(pts[2].x).toBe(50);
    expect(pts[2].y).toBe(60);
    expect(pts[4].x).toBe(10);
    expect(pts[4].y).toBe(90);
  });

  it('parses SVG circle into multi-segment approximation', () => {
    const svg = `
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="20" stroke="#10b981" />
      </svg>
    `;
    const result = parseSVG(svg);
    expect(result.polylines.length).toBe(1);
    expect(result.polylines[0].points.length).toBeGreaterThan(30);
  });

  it('parses SVG path with lines and cubic beziers', () => {
    const svg = `
      <svg viewBox="0 0 100 100">
        <path d="M 10 10 L 50 10 C 60 10 70 20 70 30 Z" stroke="#38bdf8" />
      </svg>
    `;
    const result = parseSVG(svg);
    expect(result.polylines.length).toBe(1);
    expect(result.polylines[0].points.length).toBeGreaterThan(4);
  });

  it('extracts multi-pen stroke colors from SVG elements', () => {
    const svg = `
      <svg viewBox="0 0 100 100">
        <line x1="0" y1="0" x2="50" y2="50" stroke="#ff5500" />
        <line x1="50" y1="50" x2="100" y2="100" stroke="#00f0ff" />
      </svg>
    `;
    const result = parseSVG(svg);
    expect(result.polylines.length).toBe(2);
    expect(result.strokeColors).toContain('#ff5500');
    expect(result.strokeColors).toContain('#00f0ff');
  });
});
