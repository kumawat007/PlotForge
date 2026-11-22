import { describe, it, expect } from 'vitest';
import {
  vectorizeImageData,
  VectorizeOptions,
  PICSVG_FILTERS,
  PICSVG_DETAILS,
} from '../image/imageVectorizer';

describe('Image to Realistic Plotter Vectorizer & PicSVG Studio', () => {
  // Helper to create synthetic ImageData in Node/Vitest
  function createSyntheticImageData(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Dark circle in center (luminance ~ 20), white outside (luminance ~ 255)
        const dist = Math.hypot(x - width / 2, y - height / 2);
        const val = dist < width * 0.35 ? 20 : 240;
        data[idx] = val; // R
        data[idx + 1] = val; // G
        data[idx + 2] = val; // B
        data[idx + 3] = 255; // A
      }
    }
    return {
      width,
      height,
      data,
      colorSpace: 'srgb',
    } as unknown as ImageData;
  }

  it('supports all 19 PicSVG & Inkscape filter definitions and 4 detail options', () => {
    expect(PICSVG_FILTERS).toHaveLength(19);
    expect(PICSVG_FILTERS).toContain('Inkscape (High Quality)');
    expect(PICSVG_FILTERS).toContain('Smooth 1');
    expect(PICSVG_FILTERS).toContain('Edge 1');
    expect(PICSVG_FILTERS).toContain('Edge 6');
    expect(PICSVG_FILTERS).toContain('Internal 1');
    expect(PICSVG_FILTERS).toContain('Internal 5');
    expect(PICSVG_FILTERS).toContain('Clean 1');
    expect(PICSVG_FILTERS).toContain('Sharp 1');
    expect(PICSVG_FILTERS).toContain('Detail 1');
    expect(PICSVG_FILTERS).toContain('Artistic 1');
    expect(PICSVG_FILTERS).toContain('Artistic 2');

    const detailIds = PICSVG_DETAILS.map((d) => d.id);
    expect(detailIds).toEqual(['great', 'strong', 'medium', 'soft']);
  });

  it('generates realistic Smooth 1 vectors with Details: Strong and valid SVG string', () => {
    const imgData = createSyntheticImageData(60, 60);
    const options: VectorizeOptions = {
      filter: 'Smooth 1',
      details: 'strong',
      targetWidthMm: 80,
      penId: 'pen-1',
      sourceElementId: 'test_picsvg_sm1',
    };

    const result = vectorizeImageData(imgData, options);

    expect(result.polylines.length).toBeGreaterThan(0);
    expect(result.widthMm).toBe(80);
    expect(result.heightMm).toBe(80);
    expect(result.totalLengthMm).toBeGreaterThan(10);

    // Verify SVG markup string
    expect(result.svgString).toContain('<svg');
    expect(result.svgString).toContain('viewBox="0 0 80 80"');
    expect(result.svgString).toContain('<path d="M');
    expect(result.svgString).toContain('</svg>');
  });

  it('generates Edge 1 through Edge 6 filters successfully', () => {
    const imgData = createSyntheticImageData(50, 50);
    const edgeFilters = ['Edge 1', 'Edge 2', 'Edge 3', 'Edge 4', 'Edge 5', 'Edge 6'] as const;

    for (const ef of edgeFilters) {
      const res = vectorizeImageData(imgData, {
        filter: ef,
        details: 'strong',
        targetWidthMm: 70,
        penId: 'pen-1',
      });
      expect(res.polylines.length).toBeGreaterThan(0);
      expect(res.svgString).toContain('<svg');
    }
  });

  it('generates Internal 1 through Internal 5 adaptive feature filters successfully', () => {
    const imgData = createSyntheticImageData(50, 50);
    const internalFilters = ['Internal 1', 'Internal 2', 'Internal 3', 'Internal 4', 'Internal 5'] as const;

    for (const inf of internalFilters) {
      const res = vectorizeImageData(imgData, {
        filter: inf,
        details: 'strong',
        targetWidthMm: 70,
        penId: 'pen-1',
      });
      expect(res.polylines.length).toBeGreaterThan(0);
      expect(res.svgString).toContain('<svg');
    }
  });

  it('generates Clean 1, Sharp 1, Detail 1, and Artistic filters successfully', () => {
    const imgData = createSyntheticImageData(50, 50);
    const filters = ['Clean 1', 'Sharp 1', 'Detail 1', 'Artistic 1', 'Artistic 2'] as const;

    for (const flt of filters) {
      const res = vectorizeImageData(imgData, {
        filter: flt,
        details: 'strong',
        targetWidthMm: 70,
        penId: 'pen-1',
      });
      expect(res.polylines.length).toBeGreaterThan(0);
      expect(res.svgString).toContain('<svg');
    }
  });

  it('handles detail levels: great, strong, medium, soft', () => {
    const imgData = createSyntheticImageData(50, 50);
    const resGreat = vectorizeImageData(imgData, { filter: 'Smooth 1', details: 'great', targetWidthMm: 60 });
    const resSoft = vectorizeImageData(imgData, { filter: 'Smooth 1', details: 'soft', targetWidthMm: 60 });

    expect(resGreat.polylines.length).toBeGreaterThanOrEqual(resSoft.polylines.length);
  });

  it('maintains backward compatibility with style: sketch, crosshatch, squiggle', () => {
    const imgData = createSyntheticImageData(50, 50);

    const sketch = vectorizeImageData(imgData, { style: 'sketch', targetWidthMm: 80 });
    expect(sketch.polylines.length).toBeGreaterThan(0);

    const hatch = vectorizeImageData(imgData, { style: 'crosshatch', targetWidthMm: 80 });
    expect(hatch.polylines.length).toBeGreaterThan(0);

    const squiggle = vectorizeImageData(imgData, { style: 'squiggle', targetWidthMm: 80 });
    expect(squiggle.polylines.length).toBeGreaterThan(0);
  });

  it('generates 100% solid filled compound SVG with fill-rule="evenodd" matching PicSVG 1:1', () => {
    const imgData = createSyntheticImageData(60, 60);
    const result = vectorizeImageData(imgData, {
      filter: 'Smooth 1',
      details: 'strong',
      targetWidthMm: 100,
      penColorHex: '#000000',
    });

    expect(result.isSolidFill).toBe(true);
    expect(result.svgString).toContain('fill-rule="evenodd"');
    expect(result.svgString).toContain('fill="#000000"');
    expect(result.svgString).toContain('stroke="none"');

    // Verify contour polylines are strictly closed loops
    const contourPolys = result.polylines.filter((p) => !p.id.includes('_hatch_'));
    expect(contourPolys.length).toBeGreaterThan(0);
    for (const poly of contourPolys) {
      expect(poly.points.length).toBeGreaterThanOrEqual(3);
      const first = poly.points[0];
      const last = poly.points[poly.points.length - 1];
      expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeLessThan(0.01);
    }
  });

  it('generates physical pen infill hatching when enableInfill is true', () => {
    const imgData = createSyntheticImageData(60, 60);
    const outlineOnly = vectorizeImageData(imgData, {
      filter: 'Clean 1',
      targetWidthMm: 80,
      enableInfill: false,
    });
    const withInfill = vectorizeImageData(imgData, {
      filter: 'Clean 1',
      targetWidthMm: 80,
      enableInfill: true,
      infillSpacingMm: 0.8,
    });

    expect(withInfill.polylines.length).toBeGreaterThan(outlineOnly.polylines.length);
    expect(withInfill.totalLengthMm).toBeGreaterThan(outlineOnly.totalLengthMm);
  });
});
