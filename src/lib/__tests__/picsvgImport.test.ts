import { describe, it, expect } from 'vitest';
import { parseSVG } from '../svg/svgParser';
import { generatePolygonHatch } from '../svg/polygonInfill';
import * as fs from 'fs';
import * as path from 'path';

describe('PicSVG kw0kD3H01.svg bounding box and hatching test', () => {
  it('computes bounding box and generates solid infill hatch', () => {
    const svgPath = path.resolve(__dirname, 'fixtures', 'kw0kD3H01.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    const result = parseSVG(svgContent);

    expect(result.isSolidFilled).toBe(true);
    expect(result.closedLoops.length).toBe(49);
    console.log('isSolidFilled:', result.isSolidFilled, 'closedLoops:', result.closedLoops.length);

    let closedLoops = result.closedLoops;
    console.log('Total polylines:', result.polylines.length, 'Closed:', closedLoops.length);

    // Test hatch generation
    const hatch = generatePolygonHatch(closedLoops, {
      spacingMm: 10, // scaled coordinate spacing
      angleDeg: 0,
      penId: 'pen-1',
    });

    console.log('Generated Hatch Lines for kw0kD3H01.svg:', hatch.length);
    expect(hatch.length).toBeGreaterThan(100);
  });
});
