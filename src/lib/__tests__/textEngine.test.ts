import { describe, it, expect } from 'vitest';
import {
  getTurnAngleDegrees,
  detectCusps,
  smoothHersheyStroke,
  renderSingleStrokeText,
} from '../fonts/textEngine';
import { HERSHEY_SIMPLEX, HERSHEY_SCRIPT } from '../fonts/hersheyData';

describe('Hershey Text Engine & Corner-Cusp Detection', () => {
  it('correctly calculates deflection angle between consecutive vectors', () => {
    // Collinear straight line
    const angleCollinear = getTurnAngleDegrees(
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 }
    );
    expect(angleCollinear).toBeCloseTo(0, 2);

    // Right-angle turn
    const angle90 = getTurnAngleDegrees(
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 }
    );
    expect(angle90).toBeCloseTo(90, 2);

    // Hairpin reverse turn (180 deg)
    const angle180 = getTurnAngleDegrees(
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 0, y: 0 }
    );
    expect(angle180).toBeCloseTo(180, 2);
  });

  it('detects sharp vertices (> 65 degrees) on glyphs like V, A, M, Z', () => {
    // 'V' glyph stroke: [2, 20] -> [9, 0] -> [16, 20]
    const vStroke = [
      { x: 2, y: 20 },
      { x: 9, y: 0 },
      { x: 16, y: 20 },
    ];
    const cusps = detectCusps(vStroke, 65);
    // Index 1 (the apex/vertex at [9, 0]) must be flagged as a cusp
    expect(cusps).toContain(1);
    expect(cusps).toEqual([0, 1, 2]);
  });

  it('preserves sharp corners in smoothHersheyStroke without rounding them away', () => {
    const vStroke = [
      { x: 2, y: 20 },
      { x: 9, y: 0 },
      { x: 16, y: 20 },
    ];
    const smoothed = smoothHersheyStroke(vStroke, 0.08);

    // The sharp vertex point (9, 0) must exist exactly in the output
    const hasSharpVertex = smoothed.some(
      (p) => Math.abs(p.x - 9) < 1e-4 && Math.abs(p.y - 0) < 1e-4
    );
    expect(hasSharpVertex).toBe(true);
  });

  it('smooths curved strokes into continuous arc polylines', () => {
    // Arc of 'C' glyph: gentle deflection <= 65 deg per step
    const cStroke = [
      { x: 15, y: 16 },
      { x: 12, y: 19 },
      { x: 8, y: 20 },
      { x: 5, y: 17 },
      { x: 3, y: 10 },
      { x: 5, y: 3 },
      { x: 8, y: 0 },
      { x: 12, y: 1 },
      { x: 15, y: 4 },
    ];
    const smoothed = smoothHersheyStroke(cStroke, 0.08);
    // Should be subdivided into a denser, silky smooth arc
    expect(smoothed.length).toBeGreaterThan(cStroke.length);
  });

  it('has clean digit 0 in HERSHEY_SIMPLEX without rogue trailing chord [4, 3]', () => {
    const zeroGlyph = HERSHEY_SIMPLEX['0'];
    expect(zeroGlyph).toBeDefined();
    const stroke = zeroGlyph.strokes[0];
    const lastPoint = stroke[stroke.length - 1];
    // Must close at [8, 20] and NOT end with rogue diagonal [4, 3]
    expect(lastPoint).toEqual([8, 20]);
  });

  it('has corrected letter side-bearings for f (width 14) and m (width 20)', () => {
    expect(HERSHEY_SIMPLEX['f'].width).toBe(14);
    expect(HERSHEY_SIMPLEX['m'].width).toBe(20);
  });

  it('renders single-stroke text and connects consecutive lowercase letters in hershey-script', () => {
    const text = 'in';
    const polylines = renderSingleStrokeText(text, {
      fontSizeMm: 10,
      fontFamily: 'hershey-script',
    });

    // In 'in', 'i' and 'n' cursive bodies must connect into exactly 1 body polyline + 1 i-dot
    expect(polylines.length).toBe(2);

    const mainBody = polylines[0];
    expect(mainBody.points.length).toBeGreaterThan(15);
  });

  it('renders multi-stroke cursive words like "man" and "summer" as a single continuous polyline with zero pen lifts', () => {
    const manPolys = renderSingleStrokeText('man', {
      fontSizeMm: 10,
      fontFamily: 'hershey-script',
    });
    // Entire word 'man' executes in 1 unbroken continuous stroke
    expect(manPolys.length).toBe(1);
    expect(manPolys[0].points.length).toBeGreaterThan(30);

    const summerPolys = renderSingleStrokeText('summer', {
      fontSizeMm: 10,
      fontFamily: 'hershey-script',
    });
    // Entire word 'summer' executes in 1 unbroken continuous stroke
    expect(summerPolys.length).toBe(1);
    expect(summerPolys[0].points.length).toBeGreaterThan(50);
  });

  it('renders words with accents like "plotter" with 1 connected body plus crossbars', () => {
    const plotterPolys = renderSingleStrokeText('plotter', {
      fontSizeMm: 10,
      fontFamily: 'hershey-script',
    });
    // 1 connected word body + 2 crossbars for 't'
    expect(plotterPolys.length).toBe(3);
  });

  it('does not connect letters across spaces or in hershey-simplex', () => {
    const text = 'in';
    const simplexPolys = renderSingleStrokeText(text, {
      fontSizeMm: 10,
      fontFamily: 'hershey-simplex',
    });
    // In simplex, strokes are never merged into cursive ligatures
    expect(simplexPolys.length).toBeGreaterThanOrEqual(3);
  });

  it('renders all modern font families cleanly (drafting, serif, soft-round, italic)', () => {
    const families = [
      'hershey-drafting',
      'hershey-serif',
      'hershey-soft-round',
      'hershey-italic',
    ] as const;

    for (const fam of families) {
      const polys = renderSingleStrokeText('BAMBU A1', {
        fontSizeMm: 12,
        fontFamily: fam,
      });
      expect(polys.length).toBeGreaterThan(0);
      for (const p of polys) {
        expect(p.points.length).toBeGreaterThan(1);
      }
    }
  });
});
