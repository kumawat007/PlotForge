import { Point2D, Polyline } from '@/types/plotter';

export interface InfillHatchOptions {
  spacingMm: number; // pen tip diameter spacing (e.g. 0.4mm - 0.5mm)
  angleDeg?: number; // 0 = horizontal, 45 = diagonal, 90 = vertical
  crossHatch?: boolean; // second perpendicular pass for 100% solid ink coverage
  connectSnake?: boolean; // connect adjacent scanlines for smooth continuous plotting (default true)
  penId?: string;
  sourceElementId?: string;
  minSpanLengthMm?: number;
}

/**
 * High-precision Even-Odd scanline hatch filler for vector polygons with holes.
 * Fills arbitrary compound shapes (letters like A, B, O, complex icons) with
 * continuous boustrophedon pen plotting strokes.
 */
export function generatePolygonHatch(
  closedLoops: Point2D[][],
  options: InfillHatchOptions
): Polyline[] {
  const {
    spacingMm = 0.4,
    angleDeg = 0,
    crossHatch = false,
    connectSnake = true,
    penId = 'pen-1',
    sourceElementId = 'infill',
    minSpanLengthMm = 0.25,
  } = options;

  if (closedLoops.length === 0 || spacingMm <= 0.05) return [];

  const passes: number[] = [angleDeg];
  if (crossHatch) {
    passes.push((angleDeg + 90) % 180);
  }

  const resultPolylines: Polyline[] = [];
  let polyCounter = 0;
  const maxLinkDist = spacingMm * 2.8;

  for (const passAngle of passes) {
    const rad = (passAngle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // Rotate loops into scanline-aligned coordinate space
    let minRotY = Infinity;
    let maxRotY = -Infinity;

    const rotatedLoops: { origIdx: number; points: Point2D[] }[] = [];

    for (let l = 0; l < closedLoops.length; l++) {
      const loop = closedLoops[l];
      if (loop.length < 3) continue;

      const rotPts: Point2D[] = [];
      for (const pt of loop) {
        const rx = pt.x * cosA + pt.y * sinA;
        const ry = -pt.x * sinA + pt.y * cosA;
        rotPts.push({ x: rx, y: ry });
        if (ry < minRotY) minRotY = ry;
        if (ry > maxRotY) maxRotY = ry;
      }
      rotatedLoops.push({ origIdx: l, points: rotPts });
    }

    if (maxRotY <= minRotY) continue;

    // Scanline stepping
    const startY = minRotY + spacingMm * 0.5;
    let lineIdx = 0;
    let currentSnake: Point2D[] = [];

    const flushCurrentSnake = () => {
      if (currentSnake.length >= 2) {
        resultPolylines.push({
          id: `${sourceElementId}_hatch_${polyCounter++}`,
          points: currentSnake,
          penId,
          sourceElementId,
        });
      }
      currentSnake = [];
    };

    for (let y = startY; y <= maxRotY; y += spacingMm) {
      const intersections: number[] = [];

      for (const loop of rotatedLoops) {
        const pts = loop.points;
        const n = pts.length;
        for (let i = 0; i < n; i++) {
          const p1 = pts[i];
          const p2 = pts[(i + 1) % n];

          const y1 = p1.y;
          const y2 = p2.y;

          // Half-open interval [minY, maxY) ensures vertices are never double-counted
          if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
            const t = (y - y1) / (y2 - y1);
            const ix = p1.x + t * (p2.x - p1.x);
            intersections.push(ix);
          }
        }
      }

      if (intersections.length < 2) {
        lineIdx++;
        continue;
      }

      intersections.sort((a, b) => a - b);

      // Even-Odd Rule: pair intersections (0-1, 2-3, 4-5...)
      const forward = lineIdx % 2 === 0;
      const spans: { x0: number; x1: number }[] = [];

      for (let i = 0; i < intersections.length - 1; i += 2) {
        const x0 = intersections[i];
        const x1 = intersections[i + 1];
        if (x1 - x0 >= minSpanLengthMm) {
          spans.push({ x0, x1 });
        }
      }

      // Order spans for boustrophedon pen movement
      const orderedSpans = forward ? spans : spans.reverse();

      for (const span of orderedSpans) {
        const startX = forward ? span.x0 : span.x1;
        const endX = forward ? span.x1 : span.x0;

        // Un-rotate back to original coordinate system
        const origP0: Point2D = {
          x: Math.round((startX * cosA - y * sinA) * 100) / 100,
          y: Math.round((startX * sinA + y * cosA) * 100) / 100,
        };
        const origP1: Point2D = {
          x: Math.round((endX * cosA - y * sinA) * 100) / 100,
          y: Math.round((endX * sinA + y * cosA) * 100) / 100,
        };

        if (connectSnake) {
          if (currentSnake.length === 0) {
            currentSnake = [origP0, origP1];
          } else {
            const lastPt = currentSnake[currentSnake.length - 1];
            const dist = Math.hypot(origP0.x - lastPt.x, origP0.y - lastPt.y);
            if (dist <= maxLinkDist) {
              currentSnake.push(origP0, origP1);
            } else {
              flushCurrentSnake();
              currentSnake = [origP0, origP1];
            }
          }
        } else {
          resultPolylines.push({
            id: `${sourceElementId}_hatch_${polyCounter++}`,
            points: [origP0, origP1],
            penId,
            sourceElementId,
          });
        }
      }

      lineIdx++;
    }

    if (connectSnake) {
      flushCurrentSnake();
    }
  }

  return resultPolylines;
}
