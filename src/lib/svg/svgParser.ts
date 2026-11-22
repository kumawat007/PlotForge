import { Point2D, Polyline } from '@/types/plotter';
import {
  flattenCubicBezier,
  flattenQuadraticBezier,
  flattenEllipticalArc,
} from './bezier';
import { generatePolygonHatch } from './polygonInfill';

export interface SVGParseResult {
  polylines: Polyline[];
  viewBox: { x: number; y: number; width: number; height: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
  strokeColors: string[];
  isSolidFilled: boolean;
  closedLoops: Point2D[][];
}

export type Matrix2D = [number, number, number, number, number, number]; // [a, b, c, d, e, f]

export function identityMatrix(): Matrix2D {
  return [1, 0, 0, 1, 0, 0];
}

export function multiplyMatrices(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

export function applyMatrix(pt: Point2D, m: Matrix2D): Point2D {
  return {
    x: m[0] * pt.x + m[2] * pt.y + m[4],
    y: m[1] * pt.x + m[3] * pt.y + m[5],
  };
}

export function parseTransform(transformStr: string): Matrix2D {
  let current = identityMatrix();
  if (!transformStr) return current;

  // Match transform functions: matrix, translate, scale, rotate, skewX, skewY
  const regex = /([a-zA-Z]+)\s*\(([^)]+)\)/g;
  let match;

  while ((match = regex.exec(transformStr)) !== null) {
    const type = match[1].toLowerCase();
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    let op: Matrix2D = identityMatrix();

    if (type === 'matrix' && args.length >= 6) {
      op = [args[0], args[1], args[2], args[3], args[4], args[5]];
    } else if (type === 'translate') {
      const tx = args[0] || 0;
      const ty = args.length > 1 ? args[1] : 0;
      op = [1, 0, 0, 1, tx, ty];
    } else if (type === 'scale') {
      const sx = args[0] || 1;
      const sy = args.length > 1 ? args[1] : sx;
      op = [sx, 0, 0, sy, 0, 0];
    } else if (type === 'rotate') {
      const angle = (args[0] || 0) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      if (args.length >= 3) {
        const cx = args[1];
        const cy = args[2];
        // Translate to origin, rotate, translate back
        const t1: Matrix2D = [1, 0, 0, 1, cx, cy];
        const rot: Matrix2D = [cos, sin, -sin, cos, 0, 0];
        const t2: Matrix2D = [1, 0, 0, 1, -cx, -cy];
        op = multiplyMatrices(t1, multiplyMatrices(rot, t2));
      } else {
        op = [cos, sin, -sin, cos, 0, 0];
      }
    }

    current = multiplyMatrices(current, op);
  }

  return current;
}

/**
 * Tokenizes SVG path string d into command characters and numbers
 */
function tokenizePath(d: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  // Match path command or floating number (including negative and exponential notation)
  const regex = /([a-df-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)/gi;
  let match;
  while ((match = regex.exec(d)) !== null) {
    const val = match[1];
    if (/^[a-df-z]$/i.test(val)) {
      tokens.push(val);
    } else {
      tokens.push(parseFloat(val));
    }
  }
  return tokens;
}

/**
 * Parses SVG path d string into an array of Point2D polylines.
 */
export function parsePathData(d: string, toleranceMm: number = 0.05): Point2D[][] {
  const tokens = tokenizePath(d);
  let idx = 0;

  const polylines: Point2D[][] = [];
  let currentPolyline: Point2D[] = [];

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;

  let lastControlX = 0;
  let lastControlY = 0;
  let lastCmd = '';

  function nextNum(): number {
    if (idx < tokens.length && typeof tokens[idx] === 'number') {
      return tokens[idx++] as number;
    }
    return 0;
  }

  while (idx < tokens.length) {
    const token = tokens[idx];
    if (typeof token === 'string') {
      lastCmd = token;
      idx++;
    }

    const cmd = lastCmd;
    const isRelative = cmd === cmd.toLowerCase();
    const upperCmd = cmd.toUpperCase();

    switch (upperCmd) {
      case 'M': {
        const x = isRelative ? curX + nextNum() : nextNum();
        const y = isRelative ? curY + nextNum() : nextNum();

        if (currentPolyline.length > 0) {
          polylines.push(currentPolyline);
        }
        currentPolyline = [{ x, y }];
        curX = x;
        curY = y;
        startX = x;
        startY = y;
        lastControlX = x;
        lastControlY = y;

        // Subsequent pairs after M are treated as L/l
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          const lx = isRelative ? curX + nextNum() : nextNum();
          const ly = isRelative ? curY + nextNum() : nextNum();
          currentPolyline.push({ x: lx, y: ly });
          curX = lx;
          curY = ly;
          lastControlX = lx;
          lastControlY = ly;
        }
        break;
      }
      case 'L': {
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          const x = isRelative ? curX + nextNum() : nextNum();
          const y = isRelative ? curY + nextNum() : nextNum();
          currentPolyline.push({ x, y });
          curX = x;
          curY = y;
          lastControlX = x;
          lastControlY = y;
        }
        break;
      }
      case 'H': {
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          const x = isRelative ? curX + nextNum() : nextNum();
          const y = curY;
          currentPolyline.push({ x, y });
          curX = x;
          lastControlX = x;
          lastControlY = y;
        }
        break;
      }
      case 'V': {
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          const x = curX;
          const y = isRelative ? curY + nextNum() : nextNum();
          currentPolyline.push({ x, y });
          curY = y;
          lastControlX = x;
          lastControlY = y;
        }
        break;
      }
      case 'C': {
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          const x1 = isRelative ? curX + nextNum() : nextNum();
          const y1 = isRelative ? curY + nextNum() : nextNum();
          const x2 = isRelative ? curX + nextNum() : nextNum();
          const y2 = isRelative ? curY + nextNum() : nextNum();
          const x = isRelative ? curX + nextNum() : nextNum();
          const y = isRelative ? curY + nextNum() : nextNum();

          const pts = flattenCubicBezier(
            { x: curX, y: curY },
            { x: x1, y: y1 },
            { x: x2, y: y2 },
            { x, y },
            toleranceMm
          );
          for (const pt of pts) {
            currentPolyline.push(pt);
          }

          curX = x;
          curY = y;
          lastControlX = x2;
          lastControlY = y2;
        }
        break;
      }
      case 'S': {
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          // Reflection of last control point
          let x1 = curX;
          let y1 = curY;
          if (['C', 'c', 'S', 's'].includes(lastCmd)) {
            x1 = 2 * curX - lastControlX;
            y1 = 2 * curY - lastControlY;
          }
          const x2 = isRelative ? curX + nextNum() : nextNum();
          const y2 = isRelative ? curY + nextNum() : nextNum();
          const x = isRelative ? curX + nextNum() : nextNum();
          const y = isRelative ? curY + nextNum() : nextNum();

          const pts = flattenCubicBezier(
            { x: curX, y: curY },
            { x: x1, y: y1 },
            { x: x2, y: y2 },
            { x, y },
            toleranceMm
          );
          for (const pt of pts) {
            currentPolyline.push(pt);
          }

          curX = x;
          curY = y;
          lastControlX = x2;
          lastControlY = y2;
          lastCmd = isRelative ? 's' : 'S';
        }
        break;
      }
      case 'Q': {
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          const x1 = isRelative ? curX + nextNum() : nextNum();
          const y1 = isRelative ? curY + nextNum() : nextNum();
          const x = isRelative ? curX + nextNum() : nextNum();
          const y = isRelative ? curY + nextNum() : nextNum();

          const pts = flattenQuadraticBezier(
            { x: curX, y: curY },
            { x: x1, y: y1 },
            { x, y },
            toleranceMm
          );
          for (const pt of pts) {
            currentPolyline.push(pt);
          }

          curX = x;
          curY = y;
          lastControlX = x1;
          lastControlY = y1;
        }
        break;
      }
      case 'T': {
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          let x1 = curX;
          let y1 = curY;
          if (['Q', 'q', 'T', 't'].includes(lastCmd)) {
            x1 = 2 * curX - lastControlX;
            y1 = 2 * curY - lastControlY;
          }
          const x = isRelative ? curX + nextNum() : nextNum();
          const y = isRelative ? curY + nextNum() : nextNum();

          const pts = flattenQuadraticBezier(
            { x: curX, y: curY },
            { x: x1, y: y1 },
            { x, y },
            toleranceMm
          );
          for (const pt of pts) {
            currentPolyline.push(pt);
          }

          curX = x;
          curY = y;
          lastControlX = x1;
          lastControlY = y1;
          lastCmd = isRelative ? 't' : 'T';
        }
        break;
      }
      case 'A': {
        while (idx < tokens.length && typeof tokens[idx] === 'number') {
          const rx = nextNum();
          const ry = nextNum();
          const rot = nextNum();
          const largeArc = nextNum() !== 0;
          const sweep = nextNum() !== 0;
          const x = isRelative ? curX + nextNum() : nextNum();
          const y = isRelative ? curY + nextNum() : nextNum();

          const pts = flattenEllipticalArc(
            { x: curX, y: curY },
            rx,
            ry,
            rot,
            largeArc,
            sweep,
            { x, y },
            toleranceMm
          );
          for (const pt of pts) {
            currentPolyline.push(pt);
          }

          curX = x;
          curY = y;
          lastControlX = x;
          lastControlY = y;
        }
        break;
      }
      case 'Z': {
        if (currentPolyline.length > 0) {
          currentPolyline.push({ x: startX, y: startY });
          polylines.push(currentPolyline);
          currentPolyline = [];
        }
        curX = startX;
        curY = startY;
        lastControlX = curX;
        lastControlY = curY;
        break;
      }
      default:
        idx++;
        break;
    }
  }

  if (currentPolyline.length > 1) {
    polylines.push(currentPolyline);
  }

  return polylines;
}

export interface SVGParseOptions {
  enableInfill?: boolean;
  hatchSpacingMm?: number;
  hatchAngleDeg?: number;
}

/**
 * Parses an SVG XML string into Polylines in Machine Space:
 * Y is inverted relative to SVG view box height H:
 * Y_machine = H - Y_svg
 */
export function parseSVG(
  svgString: string,
  sourceElementId: string = 'svg_import',
  defaultPenId: string = 'pen-1',
  toleranceMm: number = 0.05,
  options?: SVGParseOptions
): SVGParseResult {
  let cleanSvg = svgString.replace(/<!--[\s\S]*?-->/g, '').trim();

  // Extract viewBox or width/height
  let viewBox = { x: 0, y: 0, width: 100, height: 100 };
  const vbMatch = cleanSvg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (vbMatch) {
    const nums = vbMatch[1].trim().split(/[\s,]+/).map(Number);
    if (nums.length === 4 && nums[2] > 0 && nums[3] > 0) {
      viewBox = { x: nums[0], y: nums[1], width: nums[2], height: nums[3] };
    }
  } else {
    const wMatch = cleanSvg.match(/width\s*=\s*["']([^"']+)["']/i);
    const hMatch = cleanSvg.match(/height\s*=\s*["']([^"']+)["']/i);
    const w = wMatch ? parseFloat(wMatch[1]) : 100;
    const h = hMatch ? parseFloat(hMatch[1]) : 100;
    viewBox = { x: 0, y: 0, width: isNaN(w) || w <= 0 ? 100 : w, height: isNaN(h) || h <= 0 ? 100 : h };
  }

  const polylines: Polyline[] = [];
  const strokeColorSet = new Set<string>();
  let isSolidFilled = false;

  // Helper to parse XML attributes
  function parseAttributes(attrStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /([a-zA-Z0-9:-]+)\s*=\s*["']([^"']*)["']/g;
    let m;
    while ((m = attrRegex.exec(attrStr)) !== null) {
      attrs[m[1].toLowerCase()] = m[2];
    }
    return attrs;
  }

  interface SvgStyleContext {
    fill?: string;
    stroke?: string;
  }

  function parseInlineStyle(styleStr: string): Record<string, string> {
    const res: Record<string, string> = {};
    if (!styleStr) return res;
    for (const part of styleStr.split(';')) {
      const colonIdx = part.indexOf(':');
      if (colonIdx > 0) {
        const k = part.slice(0, colonIdx).trim().toLowerCase();
        const v = part.slice(colonIdx + 1).trim();
        if (k && v) res[k] = v;
      }
    }
    return res;
  }

  function resolveStyles(attrs: Record<string, string>, parentStyle: SvgStyleContext): SvgStyleContext {
    const inline = parseInlineStyle(attrs['style'] || '');
    const fill = attrs['fill'] ?? inline['fill'] ?? parentStyle.fill;
    const stroke = attrs['stroke'] ?? inline['stroke'] ?? parentStyle.stroke;
    return { fill, stroke };
  }

  // Regex to extract elements
  const elemRegex = /<([a-zA-Z0-9:]+)([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi;

  function processElement(tag: string, attrStr: string, parentMatrix: Matrix2D, parentStyle: SvgStyleContext) {
    const attrs = parseAttributes(attrStr);
    const elemTransform = parseTransform(attrs['transform'] || '');
    const currentMatrix = multiplyMatrices(parentMatrix, elemTransform);
    const effectiveStyle = resolveStyles(attrs, parentStyle);

    const fillVal = effectiveStyle.fill;
    const strokeVal = effectiveStyle.stroke;

    // In SVG standard:
    // If fill is explicitly 'none', it is not solid filled.
    // If fill is specified (and not 'none'), or if fill is not specified and stroke is 'none' / not specified,
    // default SVG fill is black (#000000) and it IS solid filled.
    let isElementSolid = false;
    if (fillVal !== undefined) {
      if (fillVal.toLowerCase() !== 'none') {
        isElementSolid = true;
      }
    } else if (!strokeVal || strokeVal.toLowerCase() === 'none') {
      // Default SVG behavior: fills with black
      isElementSolid = true;
    }

    if (isElementSolid) {
      isSolidFilled = true;
    }

    let strokeColor = strokeVal && strokeVal.toLowerCase() !== 'none'
      ? strokeVal
      : (fillVal && fillVal.toLowerCase() !== 'none' ? fillVal : '#000000');

    if (strokeColor && strokeColor.toLowerCase() !== 'none') {
      strokeColorSet.add(strokeColor);
    }

    const tagName = tag.toLowerCase().split(':').pop() || '';

    let localPointArrays: Point2D[][] = [];

    switch (tagName) {
      case 'path': {
        const d = attrs['d'];
        if (d) {
          // Adjust tolerance according to effective scale of currentMatrix
          // so SVGs with transformed coordinates (e.g. Inkscape scale(0.1, -0.1))
          // are subdivided at the target physical tolerance without redundant points
          const det = Math.abs(currentMatrix[0] * currentMatrix[3] - currentMatrix[1] * currentMatrix[2]);
          const effectiveScale = det > 1e-6 ? Math.sqrt(det) : 1;
          const adjustedTolerance = toleranceMm / effectiveScale;
          localPointArrays = parsePathData(d, adjustedTolerance);
        }
        break;
      }
      case 'rect': {
        const x = parseFloat(attrs['x'] || '0');
        const y = parseFloat(attrs['y'] || '0');
        const w = parseFloat(attrs['width'] || '0');
        const h = parseFloat(attrs['height'] || '0');
        if (w > 0 && h > 0) {
          localPointArrays = [
            [
              { x, y },
              { x: x + w, y },
              { x: x + w, y: y + h },
              { x, y: y + h },
              { x, y },
            ],
          ];
        }
        break;
      }
      case 'circle': {
        const cx = parseFloat(attrs['cx'] || '0');
        const cy = parseFloat(attrs['cy'] || '0');
        const r = parseFloat(attrs['r'] || '0');
        if (r > 0) {
          const pts: Point2D[] = [];
          const numSteps = Math.max(16, Math.ceil(2 * Math.PI * r / (toleranceMm * 4)));
          for (let i = 0; i <= numSteps; i++) {
            const angle = (i / numSteps) * 2 * Math.PI;
            pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
          }
          localPointArrays = [pts];
        }
        break;
      }
      case 'ellipse': {
        const cx = parseFloat(attrs['cx'] || '0');
        const cy = parseFloat(attrs['cy'] || '0');
        const rx = parseFloat(attrs['rx'] || '0');
        const ry = parseFloat(attrs['ry'] || '0');
        if (rx > 0 && ry > 0) {
          const pts: Point2D[] = [];
          const maxR = Math.max(rx, ry);
          const numSteps = Math.max(16, Math.ceil(2 * Math.PI * maxR / (toleranceMm * 4)));
          for (let i = 0; i <= numSteps; i++) {
            const angle = (i / numSteps) * 2 * Math.PI;
            pts.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
          }
          localPointArrays = [pts];
        }
        break;
      }
      case 'line': {
        const x1 = parseFloat(attrs['x1'] || '0');
        const y1 = parseFloat(attrs['y1'] || '0');
        const x2 = parseFloat(attrs['x2'] || '0');
        const y2 = parseFloat(attrs['y2'] || '0');
        localPointArrays = [[{ x: x1, y: y1 }, { x: x2, y: y2 }]];
        break;
      }
      case 'polyline':
      case 'polygon': {
        const pointsStr = attrs['points'] || '';
        const coords = pointsStr.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
        const pts: Point2D[] = [];
        for (let i = 0; i < coords.length; i += 2) {
          pts.push({ x: coords[i], y: coords[i + 1] });
        }
        if (tagName === 'polygon' && pts.length > 2) {
          pts.push({ ...pts[0] });
        }
        if (pts.length > 1) {
          localPointArrays = [pts];
        }
        break;
      }
    }

    // Transform points by matrix and apply Machine Space Inversion:
    // Y_machine = H - Y_svg, and shift by viewBox.x / viewBox.y
    const H = viewBox.height;

    for (const arr of localPointArrays) {
      if (arr.length < 2) continue;
      const transformedPoints: Point2D[] = arr.map((pt) => {
        const transformed = applyMatrix(pt, currentMatrix);
        return {
          x: transformed.x - viewBox.x,
          y: H - (transformed.y - viewBox.y),
        };
      });

      polylines.push({
        id: `poly_${polylines.length + 1}`,
        points: transformedPoints,
        penId: defaultPenId,
        sourceElementId,
      });
    }
  }

  // Parse all nested/top-level elements recursively or sequentially
  function walkXml(xmlContent: string, currentMatrix: Matrix2D, parentStyle: SvgStyleContext) {
    let match;
    const re = new RegExp(elemRegex);
    while ((match = re.exec(xmlContent)) !== null) {
      const tag = match[1];
      const attrStr = match[2];
      const innerContent = match[3];

      const attrs = parseAttributes(attrStr);
      const elemTransform = parseTransform(attrs['transform'] || '');
      const groupMatrix = multiplyMatrices(currentMatrix, elemTransform);
      const groupStyle = resolveStyles(attrs, parentStyle);

      const lowerTag = tag.toLowerCase();
      if ((lowerTag === 'svg' || lowerTag === 'g') && innerContent) {
        walkXml(innerContent, groupMatrix, groupStyle);
      } else if (!['defs', 'style', 'title', 'desc', 'metadata'].includes(lowerTag)) {
        processElement(tag, attrStr, groupMatrix, groupStyle);
      }
    }
  }

  walkXml(cleanSvg, identityMatrix(), {});

  // Compute tight content bounding box and identify closed loops
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const closedLoops: Point2D[][] = [];

  for (const poly of polylines) {
    if (poly.points.length >= 3) {
      const p0 = poly.points[0];
      const pEnd = poly.points[poly.points.length - 1];
      if (Math.hypot(p0.x - pEnd.x, p0.y - pEnd.y) < 0.1) {
        closedLoops.push(poly.points);
      }
    }
    for (const pt of poly.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  const bounds = isFinite(minX)
    ? {
        minX: Math.round(minX * 100) / 100,
        minY: Math.round(minY * 100) / 100,
        maxX: Math.round(maxX * 100) / 100,
        maxY: Math.round(maxY * 100) / 100,
        width: Math.round(Math.max(0.1, maxX - minX) * 100) / 100,
        height: Math.round(Math.max(0.1, maxY - minY) * 100) / 100,
      }
    : {
        minX: viewBox.x,
        minY: viewBox.y,
        maxX: viewBox.x + viewBox.width,
        maxY: viewBox.y + viewBox.height,
        width: viewBox.width,
        height: viewBox.height,
      };

  // If infill hatching requested for physical pen plotting
  if (options?.enableInfill && isSolidFilled && closedLoops.length > 0) {
    const hatchPolys = generatePolygonHatch(closedLoops, {
      spacingMm: options.hatchSpacingMm || 0.4,
      angleDeg: options.hatchAngleDeg || 0,
      penId: defaultPenId,
      sourceElementId,
    });
    polylines.push(...hatchPolys);
  }

  return {
    polylines,
    viewBox,
    bounds,
    strokeColors: Array.from(strokeColorSet),
    isSolidFilled,
    closedLoops,
  };
}
