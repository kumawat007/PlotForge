import { describe, it, expect } from 'vitest';
import { traceBinaryGridToSvg } from '../image/potraceEngine';
import { parseSVG } from '../svg/svgParser';

describe('potraceEngine Unit Test', () => {
  it('traces binary grid into clean PicSVG-style vector path', () => {
    const width = 60;
    const height = 60;
    const binary = new Uint8Array(width * height);

    // Draw a square with hole
    for (let y = 10; y < 50; y++) {
      for (let x = 10; x < 50; x++) {
        if (!(x >= 25 && x < 35 && y >= 25 && y < 35)) {
          binary[y * width + x] = 1;
        }
      }
    }

    const svg = traceBinaryGridToSvg(binary, width, height, {
      turdsize: 1,
      fillColorHex: '#111827',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('fill="#111827"');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain('<path d="');

    const parsed = parseSVG(svg, 'test_potrace', 'pen-1', 0.05, { enableInfill: true, hatchSpacingMm: 2 });
    expect(parsed.polylines.length).toBeGreaterThan(5);
    expect(parsed.isSolidFilled).toBe(true);
    expect(parsed.closedLoops.length).toBe(2);
  });
});
