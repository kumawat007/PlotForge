import { describe, it, expect } from 'vitest';
import fs from 'fs';
import opentype from 'opentype.js';
import {
  registerParsedFont,
  getParsedFont,
  getRegisteredLocalFonts,
  renderOpenTypeText,
  LocalFontItem,
} from '../fonts/localFontManager';
import { renderSingleStrokeText } from '../fonts/textEngine';

describe('LocalFontManager & OpenType Vector Plotting', () => {
  it('manages font cache and registry correctly', () => {
    expect(getRegisteredLocalFonts()).toBeInstanceOf(Array);
    expect(getParsedFont('non-existent-font')).toBeUndefined();
  });

  it('renders OpenType font outlines into plotter polylines with accurate metrics', () => {
    // If Arial is available on Windows, test with real font file
    const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
    if (fs.existsSync(fontPath)) {
      const buf = fs.readFileSync(fontPath);
      const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

      const item: LocalFontItem = {
        id: 'test:arial',
        name: 'Arial Regular',
        family: 'Arial',
        source: 'system',
      };
      registerParsedFont(item.id, font, item);

      expect(getParsedFont('test:arial')).toBeDefined();

      const polylines = renderOpenTypeText(font, 'A', {
        fontSizeMm: 10,
        penId: 'pen-1',
        sourceElementId: 'elem_test',
        origin: { x: 50, y: 50 },
        textAlign: 'center',
      });

      // 'A' has outer contour and inner counter contour
      expect(polylines.length).toBeGreaterThanOrEqual(2);
      expect(polylines[0].points.length).toBeGreaterThan(3);
      expect(polylines[0].penId).toBe('pen-1');
      expect(polylines[0].sourceElementId).toBe('elem_test');

      // Points should be translated around origin (50, 50)
      for (const p of polylines[0].points) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThan(30);
        expect(p.x).toBeLessThan(70);
      }
    }
  });

  it('integrates seamlessly with renderSingleStrokeText for transparent fallback and local font dispatch', () => {
    const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
    if (fs.existsSync(fontPath)) {
      const buf = fs.readFileSync(fontPath);
      const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      registerParsedFont('local:arial_test', font, {
        id: 'local:arial_test',
        name: 'Arial',
        family: 'Arial',
        source: 'system',
      });

      // Render via textEngine with local font ID
      const polylines = renderSingleStrokeText('PLOT', {
        fontSizeMm: 15,
        fontFamily: 'local:arial_test',
        penId: 'pen-custom',
        origin: { x: 20, y: 30 },
      });

      expect(polylines.length).toBeGreaterThan(0);
      expect(polylines[0].penId).toBe('pen-custom');
    }
  });
});
