import { Point2D, Polyline, FontFamilyId } from '@/types/plotter';
import {
  HERSHEY_SIMPLEX,
  HERSHEY_SCRIPT,
  HERSHEY_DRAFTING,
  HERSHEY_SERIF,
  HERSHEY_SOFT_ROUND,
  HERSHEY_ITALIC,
  HersheyFont,
  HersheyGlyph,
} from './hersheyData';
import { pointToSegmentDistance } from '../svg/bezier';
import { getParsedFont, renderOpenTypeText } from './localFontManager';

export interface TextEngineOptions {
  fontSizeMm: number; // e.g. 10mm (cap height)
  charSpacingMm?: number; // extra space between characters in mm (default 0)
  lineHeightMultiplier?: number; // e.g. 1.4
  textAlign?: 'left' | 'center' | 'right';
  rotation?: number; // in degrees
  fontFamily?: FontFamilyId;
  penId?: string;
  sourceElementId?: string;
  origin?: Point2D; // Base anchor point (x, y) in Machine Space
}

/**
 * Calculates deflection angle in degrees between vectors (pPrev -> pCurr) and (pCurr -> pNext).
 * 0 degrees = straight collinear line. > 65 degrees = sharp corner cusp.
 */
export function getTurnAngleDegrees(pPrev: Point2D, pCurr: Point2D, pNext: Point2D): number {
  const v1x = pCurr.x - pPrev.x;
  const v1y = pCurr.y - pPrev.y;
  const v2x = pNext.x - pCurr.x;
  const v2y = pNext.y - pCurr.y;
  const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (len1 < 1e-6 || len2 < 1e-6) return 0;
  const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
  const clamped = Math.max(-1, Math.min(1, dot));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/**
 * Identifies corner cusp indices where turn angle exceeds cuspAngleDeg (default 65 deg).
 * Always includes start index (0) and end index (points.length - 1).
 */
export function detectCusps(points: Point2D[], cuspAngleDeg: number = 65): number[] {
  if (points.length <= 2) return [0, points.length - 1];

  const cusps: number[] = [0];
  for (let i = 1; i < points.length - 1; i++) {
    const angle = getTurnAngleDegrees(points[i - 1], points[i], points[i + 1]);
    if (angle > cuspAngleDeg) {
      cusps.push(i);
    }
  }
  cusps.push(points.length - 1);
  return cusps;
}

/**
 * Evaluates standard cubic Catmull-Rom spline at parameter t in [0, 1].
 */
export function evalCatmullRom(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number
): Point2D {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ),
  };
}

/**
 * Adaptively subdivides a Catmull-Rom segment between t0 and t1 so chord deviation <= maxChordDeviationMm.
 */
function subdivideCatmullRom(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t0: number,
  t1: number,
  pt0: Point2D,
  pt1: Point2D,
  maxChordDeviationMm: number,
  depth: number,
  output: Point2D[]
) {
  const tm = (t0 + t1) * 0.5;
  const ptm = evalCatmullRom(p0, p1, p2, p3, tm);
  const deviation = pointToSegmentDistance(ptm, pt0, pt1);

  if (deviation > maxChordDeviationMm && depth < 5) {
    subdivideCatmullRom(p0, p1, p2, p3, t0, tm, pt0, ptm, maxChordDeviationMm, depth + 1, output);
    subdivideCatmullRom(p0, p1, p2, p3, tm, t1, ptm, pt1, maxChordDeviationMm, depth + 1, output);
  } else {
    output.push(pt1);
  }
}

/**
 * Catmull-Rom spline interpolation/subdivision for Hershey glyph strokes with corner-cusp angle detection.
 * Cusps (> 65 degrees) are preserved as sharp vertices (A, M, N, V, W, Z), while gentle turns
 * are subdivided into ultra-smooth continuous arc polylines with chord deviation <= maxChordDeviationMm (<= 0.1mm).
 */
export function smoothHersheyStroke(
  points: Point2D[],
  maxChordDeviationMm: number = 0.08
): Point2D[] {
  if (points.length < 3) return points.map((p) => ({ ...p }));

  // Check if stroke forms a closed loop
  const isClosed =
    Math.abs(points[0].x - points[points.length - 1].x) < 1e-4 &&
    Math.abs(points[0].y - points[points.length - 1].y) < 1e-4;

  const cuspIndices = detectCusps(points, 65);

  // If entire stroke has no intermediate cusps and is a closed loop:
  if (isClosed && cuspIndices.length === 2) {
    const n = points.length - 1; // unique points: 0 to n-1
    const smoothed: Point2D[] = [points[0]];
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const p0 = points[(i - 1 + n) % n];
      const p3 = points[(i + 2) % n];
      subdivideCatmullRom(p0, p1, p2, p3, 0, 1, p1, p2, maxChordDeviationMm, 0, smoothed);
    }
    return smoothed;
  }

  // Otherwise, process each sub-section between cusps
  const smoothed: Point2D[] = [points[0]];

  for (let s = 0; s < cuspIndices.length - 1; s++) {
    const startIdx = cuspIndices[s];
    const endIdx = cuspIndices[s + 1];
    const sub = points.slice(startIdx, endIdx + 1);

    if (sub.length === 2) {
      // Straight segment between cusps - preserve exactly without rounding
      smoothed.push(sub[1]);
    } else {
      // Smooth curve sub-section
      const m = sub.length - 1;
      for (let j = 0; j < m; j++) {
        const p1 = sub[j];
        const p2 = sub[j + 1];
        const p0 = j > 0 ? sub[j - 1] : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y };
        const p3 = j + 2 <= m ? sub[j + 2] : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y };
        subdivideCatmullRom(p0, p1, p2, p3, 0, 1, p1, p2, maxChordDeviationMm, 0, smoothed);
      }
    }
  }

  return smoothed;
}

export function renderSingleStrokeText(
  text: string,
  options: TextEngineOptions
): Polyline[] {
  const {
    fontSizeMm,
    charSpacingMm = 0,
    lineHeightMultiplier = 1.4,
    textAlign = 'left',
    rotation = 0,
    fontFamily = 'hershey-simplex',
    penId = 'pen-1',
    sourceElementId = 'text_element',
    origin = { x: 0, y: 0 },
  } = options;

  // Check if fontFamily refers to a registered local / system OpenType font
  const parsedOpenType = getParsedFont(fontFamily);
  if (parsedOpenType) {
    return renderOpenTypeText(parsedOpenType, text, options);
  }

  let font: HersheyFont;
  switch (fontFamily) {
    case 'hershey-script':
      font = HERSHEY_SCRIPT;
      break;
    case 'hershey-drafting':
      font = HERSHEY_DRAFTING;
      break;
    case 'hershey-serif':
      font = HERSHEY_SERIF;
      break;
    case 'hershey-soft-round':
      font = HERSHEY_SOFT_ROUND;
      break;
    case 'hershey-italic':
      font = HERSHEY_ITALIC;
      break;
    case 'hershey-simplex':
    default:
      font = HERSHEY_SIMPLEX;
      break;
  }

  // Hershey font cap-height is 20 units
  const scale = fontSizeMm / 20;
  const lineSpacingMm = fontSizeMm * lineHeightMultiplier;

  const lines = text.split('\n');
  const polylines: Polyline[] = [];

  // Pre-calculate line widths for alignment
  const lineWidths = lines.map((line) => {
    let width = 0;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const glyph: HersheyGlyph = font[char] || font['?'] || { width: 14, strokes: [] };
      width += glyph.width * scale;
      if (i < line.length - 1) {
        width += charSpacingMm;
      }
    }
    return width;
  });

  const rad = (rotation * Math.PI) / 180;
  const cosRot = Math.cos(rad);
  const sinRot = Math.sin(rad);

  lines.forEach((line, lineIdx) => {
    const lineTotalWidth = lineWidths[lineIdx];
    let startX = 0;
    if (textAlign === 'center') {
      startX = -lineTotalWidth / 2;
    } else if (textAlign === 'right') {
      startX = -lineTotalWidth;
    }

    // Baseline Y for this line: line 0 at 0, subsequent lines go DOWN (-Y in machine space)
    const lineBaselineY = -lineIdx * lineSpacingMm;

    let cursorX = startX;

    interface CharRenderData {
      char: string;
      isLower: boolean;
      strokes: Point2D[][]; // smoothed strokes in machine coordinates
    }

    const renderedChars: CharRenderData[] = [];

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      const glyph: HersheyGlyph = font[char] || font['?'] || { width: 14, strokes: [] };

      const charStrokes: Point2D[][] = [];

      for (const stroke of glyph.strokes) {
        if (stroke.length < 2) continue;

        const transformed: Point2D[] = stroke.map(([gx, gy]) => {
          const localX = cursorX + gx * scale;
          const localY = lineBaselineY + gy * scale;
          const rotX = localX * cosRot - localY * sinRot + origin.x;
          const rotY = localX * sinRot + localY * cosRot + origin.y;
          return { x: rotX, y: rotY };
        });

        // Catmull-Rom spline smoothing with corner-cusp angle detection <= 0.1mm deviation
        const smoothed = smoothHersheyStroke(transformed, 0.08);
        charStrokes.push(smoothed);
      }

      const isLower = char >= 'a' && char <= 'z';
      renderedChars.push({ char, isLower, strokes: charStrokes });

      cursorX += glyph.width * scale + charSpacingMm;
    }

    // Hershey Script cursive connection: connect consecutive lowercase glyphs within words
    if (fontFamily === 'hershey-script') {
      let i = 0;
      while (i < renderedChars.length) {
        if (!renderedChars[i].isLower || renderedChars[i].strokes.length === 0) {
          // Non-lowercase or whitespace - emit strokes directly
          for (const s of renderedChars[i].strokes) {
            polylines.push({
              id: `text_poly_${polylines.length + 1}`,
              points: s,
              penId,
              sourceElementId,
            });
          }
          i++;
          continue;
        }

        // Find consecutive run of lowercase letters
        let runEnd = i;
        while (runEnd + 1 < renderedChars.length && renderedChars[runEnd + 1].isLower) {
          runEnd++;
        }

        if (runEnd === i) {
          // Isolated single lowercase letter
          for (const s of renderedChars[i].strokes) {
            polylines.push({
              id: `text_poly_${polylines.length + 1}`,
              points: s,
              penId,
              sourceElementId,
            });
          }
          i++;
          continue;
        }

        // Connect consecutive lowercase letters in this cursive word run
        let currentConnectedBody: Point2D[] = [];
        const secondaryStrokes: Point2D[][] = [];

        for (let k = i; k <= runEnd; k++) {
          const charData = renderedChars[k];
          if (charData.strokes.length === 0) continue;

          // strokes[0] is always the primary continuous letter body from entry tail to exit tail
          const bodyStroke = charData.strokes[0];

          // Secondary accents (e.g. i-dots, j-dots, t-crossbars, f-crossbars, x-crossbars)
          for (let sIdx = 1; sIdx < charData.strokes.length; sIdx++) {
            secondaryStrokes.push(charData.strokes[sIdx]);
          }

          if (currentConnectedBody.length === 0) {
            currentConnectedBody = [...bodyStroke];
          } else {
            // Bridge exit tail of previous letter to entry tail of current letter
            currentConnectedBody.push(...bodyStroke);
          }
        }

        if (currentConnectedBody.length >= 2) {
          polylines.push({
            id: `text_poly_${polylines.length + 1}`,
            points: currentConnectedBody,
            penId,
            sourceElementId,
          });
        }

        // Emit accent strokes (i-dots, t-crossbars)
        for (const sec of secondaryStrokes) {
          polylines.push({
            id: `text_poly_${polylines.length + 1}`,
            points: sec,
            penId,
            sourceElementId,
          });
        }

        i = runEnd + 1;
      }
    } else {
      // Simplex font - emit all smoothed strokes directly
      for (const charData of renderedChars) {
        for (const stroke of charData.strokes) {
          polylines.push({
            id: `text_poly_${polylines.length + 1}`,
            points: stroke,
            penId,
            sourceElementId,
          });
        }
      }
    }
  });

  return polylines;
}
