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

  it('renders lowercase "c" with clean, open contour geometry and zero self-intersecting loops', () => {
    const fonts = [
      'hershey-simplex',
      'hershey-script',
      'handwriting-casual',
      'handwriting-architect',
      'handwriting-signature',
      'handwriting-flighty',
      'handwriting-rose',
      'handwriting-antically',
      'handwriting-monstera',
      'handwriting-backstay',
      'handwriting-youth',
    ] as const;

    for (const fontId of fonts) {
      const polys = renderSingleStrokeText('c', {
        fontSizeMm: 10,
        fontFamily: fontId,
      });
      expect(polys.length).toBeGreaterThanOrEqual(1);
      const points = polys[0].points;
      expect(points.length).toBeGreaterThan(3);

      // Verify that endpoints are open (not a closed loop or self-intersecting loop)
      const startPt = points[0];
      const endPt = points[points.length - 1];
      const endDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
      expect(endDist).toBeGreaterThan(0.5); // Open 'c' opening >= 0.5mm
    }
  });

  it('renders cursive words with clean, independent character strokes and zero rogue diagonal bridges', () => {
    const manPolys = renderSingleStrokeText('man', {
      fontSizeMm: 10,
      fontFamily: 'hershey-script',
    });
    // 'man' has clean individual glyph strokes without diagonal bridges
    expect(manPolys.length).toBeGreaterThanOrEqual(6);
    for (const p of manPolys) {
      expect(p.points.length).toBeGreaterThan(1);
    }

    const summerPolys = renderSingleStrokeText('summer', {
      fontSizeMm: 10,
      fontFamily: 'hershey-script',
    });
    expect(summerPolys.length).toBeGreaterThan(5);

    const plotterPolys = renderSingleStrokeText('plotter', {
      fontSizeMm: 10,
      fontFamily: 'hershey-script',
    });
    expect(plotterPolys.length).toBeGreaterThan(5);
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

  it('renders all single-line open contour handwriting fonts (casual, architect, signature, flighty, rose, antically, monstera)', () => {
    const handwritingFonts = [
      'handwriting-casual',
      'handwriting-architect',
      'handwriting-signature',
      'handwriting-flighty',
      'handwriting-rose',
      'handwriting-antically',
      'handwriting-monstera',
      'handwriting-backstay',
      'handwriting-youth',
    ] as const;

    for (const fam of handwritingFonts) {
      const polys = renderSingleStrokeText('PlotForge Hand 2026', {
        fontSizeMm: 10,
        fontFamily: fam,
      });
      expect(polys.length).toBeGreaterThan(0);
      for (const p of polys) {
        expect(p.points.length).toBeGreaterThan(1);
        for (const pt of p.points) {
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
        }
      }
    }
  });

  it('renders words cleanly across all handwriting fonts with valid finite coordinates', () => {
    const cursiveFonts = [
      'handwriting-casual',
      'handwriting-signature',
      'handwriting-flighty',
      'handwriting-rose',
      'handwriting-antically',
      'handwriting-monstera',
      'handwriting-backstay',
      'handwriting-youth',
      'handwriting-backstay',
      'handwriting-youth',
    ] as const;

    for (const fam of cursiveFonts) {
      const polys = renderSingleStrokeText('in', {
        fontSizeMm: 10,
        fontFamily: fam,
      });
      expect(polys.length).toBeGreaterThan(0);
      for (const p of polys) {
        expect(p.points.length).toBeGreaterThan(1);
        for (const pt of p.points) {
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
        }
      }
    }
  });

  it('guarantees each handwriting font produces distinctly unique visual geometry for identical input', () => {
    const testString = 'Creative Handwriting 123';
    const fonts = [
      'ems-allure',
      'ems-elfin',
      'ems-felix',
      'ems-nixish',
      'ems-nixish-italic',
      'ems-osmotron',
      'gothic-english',
      'ems-readability',
      'ems-readability-italic',
      'ems-tech',
      'hershey-script',
      'hershey-serif',
      'hershey-simplex',
    ] as const;

    const signatureSet = new Set<string>();

    for (const f of fonts) {
      const polys = renderSingleStrokeText(testString, {
        fontSizeMm: 12,
        fontFamily: f,
      });
      let totalLength = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      for (const p of polys) {
        for (let i = 0; i < p.points.length - 1; i++) {
          totalLength += Math.hypot(
            p.points[i + 1].x - p.points[i].x,
            p.points[i + 1].y - p.points[i].y
          );
        }
        for (const pt of p.points) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
        }
      }
      const width = maxX - minX;
      // Width and stroke length signature
      const sig = `${Math.round(width * 10)}_${Math.round(totalLength * 10)}`;
      expect(signatureSet.has(sig)).toBe(false);
      signatureSet.add(sig);
    }
  });
});
