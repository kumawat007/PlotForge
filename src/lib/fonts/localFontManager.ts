import * as opentype from 'opentype.js';
import { Point2D, Polyline } from '@/types/plotter';
import { TextEngineOptions } from './textEngine';
import { flattenCubicBezier, flattenQuadraticBezier } from '../svg/bezier';

export interface LocalFontItem {
  id: string; // e.g. "local:Arial" or "file:myfont.ttf"
  name: string; // User-facing display label
  family: string;
  source: 'system' | 'file';
  style?: string;
  postscriptName?: string;
}

export interface SystemFontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob: () => Promise<Blob>;
}

// Global in-memory cache for loaded OpenType Font instances
const parsedFontCache = new Map<string, opentype.Font>();
const registeredFonts = new Map<string, LocalFontItem>();

export function registerParsedFont(
  id: string,
  font: opentype.Font,
  item: LocalFontItem
): void {
  parsedFontCache.set(id, font);
  registeredFonts.set(id, item);
}

export function getParsedFont(id: string): opentype.Font | undefined {
  return parsedFontCache.get(id);
}

export function getRegisteredLocalFonts(): LocalFontItem[] {
  return Array.from(registeredFonts.values());
}

export function isLocalFontAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'queryLocalFonts' in window &&
    typeof (window as unknown as { queryLocalFonts: unknown }).queryLocalFonts === 'function'
  );
}

/**
 * Queries locally installed system fonts via the Chromium Local Font Access API
 */
export async function querySystemFonts(): Promise<SystemFontData[]> {
  if (!isLocalFontAccessSupported()) {
    throw new Error(
      'Web Local Font Access API is not supported in this browser. You can load font files (.ttf, .otf, .woff) directly using the file loader below.'
    );
  }
  const queryFn = (window as unknown as { queryLocalFonts: () => Promise<SystemFontData[]> }).queryLocalFonts;
  const fonts = await queryFn();
  return fonts;
}

/**
 * Loads a system font from its FontData blob and parses it into an OpenType font
 */
export async function loadSystemFont(
  fontData: SystemFontData
): Promise<LocalFontItem> {
  const blob = await fontData.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const font = opentype.parse(arrayBuffer);

  const family = fontData.family || font.names?.fontFamily?.en || 'System Font';
  const style = fontData.style || font.names?.fontSubfamily?.en || 'Regular';
  const name = `${family} ${style}`.trim();
  const id = `local:${fontData.postscriptName || fontData.fullName || family}_${style}`.replace(/\s+/g, '_');

  const item: LocalFontItem = {
    id,
    name,
    family,
    source: 'system',
    style,
    postscriptName: fontData.postscriptName,
  };

  registerParsedFont(id, font, item);
  return item;
}

/**
 * Loads a font from an uploaded local file (.ttf, .otf, .woff)
 */
export async function loadFontFromFile(file: File): Promise<LocalFontItem> {
  const arrayBuffer = await file.arrayBuffer();
  const font = opentype.parse(arrayBuffer);

  const family =
    font.names?.fontFamily?.en ||
    font.names?.fullName?.en ||
    file.name.replace(/\.[^/.]+$/, '');
  const style = font.names?.fontSubfamily?.en || 'Regular';
  const name = `${family} (${style})`;
  const id = `file:${file.name.replace(/\s+/g, '_')}_${Date.now()}`;

  const item: LocalFontItem = {
    id,
    name,
    family,
    source: 'file',
    style,
  };

  registerParsedFont(id, font, item);
  return item;
}

/**
 * Converts OpenType glyph outlines to plotter-ready polylines with millimeter precision
 */
export function renderOpenTypeText(
  font: opentype.Font,
  text: string,
  options: TextEngineOptions
): Polyline[] {
  const {
    fontSizeMm,
    lineHeightMultiplier = 1.4,
    textAlign = 'left',
    rotation = 0,
    penId = 'pen-1',
    sourceElementId = 'text_element',
    origin = { x: 0, y: 0 },
  } = options;

  if (!text || text.trim().length === 0) return [];

  const lines = text.split('\n');
  const lineSpacingMm = fontSizeMm * lineHeightMultiplier;
  const rad = (rotation * Math.PI) / 180;
  const cosRot = Math.cos(rad);
  const sinRot = Math.sin(rad);

  const polylines: Polyline[] = [];
  let polylineCounter = 0;

  lines.forEach((line, lineIdx) => {
    if (!line) return;

    // Calculate advance width for proper horizontal alignment
    const lineWidth = font.getAdvanceWidth(line, fontSizeMm);
    let startX = 0;
    if (textAlign === 'center') {
      startX = -lineWidth / 2;
    } else if (textAlign === 'right') {
      startX = -lineWidth;
    }

    // Baseline Y: line 0 at 0, subsequent lines descend in machine space
    const lineBaselineY = -lineIdx * lineSpacingMm;

    // Generate OpenType path commands (at (startX, 0) with scale = fontSizeMm)
    const path = font.getPath(line, startX, 0, fontSizeMm);

    let currentContour: Point2D[] = [];
    let currentPoint: Point2D = { x: 0, y: 0 };
    let contourStart: Point2D = { x: 0, y: 0 };

    function flushContour() {
      if (currentContour.length >= 2) {
        // Transform point coordinates to machine space (+Y up, rotation, origin translation)
        const transformedPoints = currentContour.map((pt) => {
          const rx = pt.x * cosRot - pt.y * sinRot + origin.x;
          const ry = pt.x * sinRot + pt.y * cosRot + origin.y;
          return {
            x: Math.round(rx * 1000) / 1000,
            y: Math.round(ry * 1000) / 1000,
          };
        });

        polylines.push({
          id: `${sourceElementId}_ot_${polylineCounter++}`,
          points: transformedPoints,
          penId,
          sourceElementId,
        });
      }
      currentContour = [];
    }

    for (const cmd of path.commands) {
      if (cmd.type === 'M') {
        flushContour();
        const pt: Point2D = { x: cmd.x, y: -cmd.y + lineBaselineY };
        currentPoint = pt;
        contourStart = { ...pt };
        currentContour = [pt];
      } else if (cmd.type === 'L') {
        const pt: Point2D = { x: cmd.x, y: -cmd.y + lineBaselineY };
        currentContour.push(pt);
        currentPoint = pt;
      } else if (cmd.type === 'Q') {
        const cp: Point2D = { x: cmd.x1, y: -cmd.y1 + lineBaselineY };
        const end: Point2D = { x: cmd.x, y: -cmd.y + lineBaselineY };
        const curvePoints = flattenQuadraticBezier(currentPoint, cp, end, 0.05);
        currentContour.push(...curvePoints);
        currentPoint = end;
      } else if (cmd.type === 'C') {
        const cp1: Point2D = { x: cmd.x1, y: -cmd.y1 + lineBaselineY };
        const cp2: Point2D = { x: cmd.x2, y: -cmd.y2 + lineBaselineY };
        const end: Point2D = { x: cmd.x, y: -cmd.y + lineBaselineY };
        const curvePoints = flattenCubicBezier(currentPoint, cp1, cp2, end, 0.05);
        currentContour.push(...curvePoints);
        currentPoint = end;
      } else if (cmd.type === 'Z') {
        if (
          Math.hypot(currentPoint.x - contourStart.x, currentPoint.y - contourStart.y) > 0.01
        ) {
          currentContour.push({ ...contourStart });
        }
        flushContour();
      }
    }
    flushContour();
  });

  return polylines;
}
