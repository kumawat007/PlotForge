import { Point2D, Polyline, OptimizationStats, MachinePreset } from '@/types/plotter';

function distSq(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
}

function dist(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(distSq(p1, p2));
}

function calculatePathDrawDistance(polyline: Polyline): number {
  let length = 0;
  for (let i = 0; i < polyline.points.length - 1; i++) {
    length += dist(polyline.points[i], polyline.points[i + 1]);
  }
  return length;
}

export function calculateTotalDrawDistance(polylines: Polyline[]): number {
  let total = 0;
  for (const poly of polylines) {
    total += calculatePathDrawDistance(poly);
  }
  return total;
}

export function calculateTravelDistance(
  polylines: Polyline[],
  startPoint: Point2D
): number {
  if (polylines.length === 0) return 0;
  let travel = 0;
  let currentPos = { ...startPoint };

  for (const poly of polylines) {
    if (poly.points.length === 0) continue;
    travel += dist(currentPos, poly.points[0]);
    currentPos = poly.points[poly.points.length - 1];
  }

  // Return to start
  travel += dist(currentPos, startPoint);
  return travel;
}

/**
 * Merges consecutive touching polylines within thresholdMm to avoid unnecessary Z-hops.
 */
export function mergeConsecutivePolylines(
  polylines: Polyline[],
  thresholdMm: number = 0.05
): Polyline[] {
  if (polylines.length <= 1) return polylines;

  const merged: Polyline[] = [];
  let current = {
    ...polylines[0],
    points: [...polylines[0].points],
  };

  for (let i = 1; i < polylines.length; i++) {
    const next = polylines[i];
    const curEnd = current.points[current.points.length - 1];
    const nextStart = next.points[0];

    if (
      current.penId === next.penId &&
      curEnd &&
      nextStart &&
      dist(curEnd, nextStart) <= thresholdMm
    ) {
      // Connect next points (skip near-duplicate start point within threshold)
      const pointsToAdd = next.points.slice(1);
      current.points.push(...pointsToAdd);
    } else {
      merged.push(current);
      current = {
        ...next,
        points: [...next.points],
      };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Ramer-Douglas-Peucker (RDP) polyline decimation.
 * Prunes collinear and redundant micro-segments within toleranceMm (default 0.015mm),
 * preventing stepper motor stuttering and controller buffer saturation while
 * preserving 100% of physical drawing fidelity.
 */
export function simplifyPolylineRDP(
  points: Point2D[],
  toleranceMm: number = 0.015
): Point2D[] {
  if (points.length <= 2) return points;

  const sqTolerance = toleranceMm * toleranceMm;

  function rdpStep(pts: Point2D[], first: number, last: number, simplified: Point2D[]) {
    let maxSqDist = 0;
    let index = first;

    const p1 = pts[first];
    const p2 = pts[last];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;

    for (let i = first + 1; i < last; i++) {
      let sqDist: number;
      const p = pts[i];

      if (lenSq < 1e-12) {
        const ex = p.x - p1.x;
        const ey = p.y - p1.y;
        sqDist = ex * ex + ey * ey;
      } else {
        const t = Math.max(0, Math.min(1, ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const ex = p.x - projX;
        const ey = p.y - projY;
        sqDist = ex * ex + ey * ey;
      }

      if (sqDist > maxSqDist) {
        maxSqDist = sqDist;
        index = i;
      }
    }

    if (maxSqDist > sqTolerance) {
      rdpStep(pts, first, index, simplified);
      simplified.pop(); // Remove duplicate junction point
      rdpStep(pts, index, last, simplified);
    } else {
      simplified.push(pts[first]);
      simplified.push(pts[last]);
    }
  }

  const result: Point2D[] = [];
  rdpStep(points, 0, points.length - 1, result);

  // Deduplicate consecutive identical points
  const clean: Point2D[] = [result[0]];
  for (let i = 1; i < result.length; i++) {
    const prev = clean[clean.length - 1];
    const curr = result[i];
    if (Math.abs(prev.x - curr.x) > 1e-6 || Math.abs(prev.y - curr.y) > 1e-6) {
      clean.push(curr);
    }
  }

  return clean;
}

/**
 * Bidirectional Nearest-Neighbor TSP path optimizer.
 * Groups polylines by penId, and within each group orders paths to minimize air travel.
 * Path direction is reversed in-place when entering from the end is shorter.
 */
export function optimizeToolpath(
  polylines: Polyline[],
  preset: Pick<
    MachinePreset,
    'safeParkX' | 'safeParkY' | 'travelFeedrate' | 'drawFeedrate' | 'zFeedrate' | 'penUpZ' | 'penDownZ'
  >
): {
  optimizedPolylines: Polyline[];
  stats: OptimizationStats;
} {
  if (polylines.length === 0) {
    return {
      optimizedPolylines: [],
      stats: {
        originalTravelMm: 0,
        optimizedTravelMm: 0,
        savedMm: 0,
        savedPercent: 0,
        totalDrawMm: 0,
        estimatedTimeSeconds: 0,
      },
    };
  }

  const safePark: Point2D = { x: preset.safeParkX, y: preset.safeParkY };
  const originalTravelMm = calculateTravelDistance(polylines, safePark);
  const totalDrawMm = calculateTotalDrawDistance(polylines);

  // Group by penId
  const penGroups = new Map<string, Polyline[]>();
  for (const poly of polylines) {
    if (poly.points.length < 2) continue;
    const group = penGroups.get(poly.penId) || [];
    group.push({
      ...poly,
      points: poly.points.map((p) => ({ ...p })),
    });
    penGroups.set(poly.penId, group);
  }

  const allOptimized: Polyline[] = [];
  let currentPos = { ...safePark };

  for (const [, groupPolys] of penGroups) {
    const unvisited = [...groupPolys];
    const orderedGroup: Polyline[] = [];

    while (unvisited.length > 0) {
      let bestIdx = -1;
      let bestDist = Infinity;
      let shouldReverse = false;

      for (let i = 0; i < unvisited.length; i++) {
        const poly = unvisited[i];
        const startPt = poly.points[0];
        const endPt = poly.points[poly.points.length - 1];

        const dStart = dist(currentPos, startPt);
        const dEnd = dist(currentPos, endPt);

        if (dStart < bestDist) {
          bestDist = dStart;
          bestIdx = i;
          shouldReverse = false;
        }
        if (dEnd < bestDist) {
          bestDist = dEnd;
          bestIdx = i;
          shouldReverse = true;
        }
      }

      if (bestIdx >= 0) {
        const [chosen] = unvisited.splice(bestIdx, 1);
        if (shouldReverse) {
          chosen.points.reverse();
        }
        orderedGroup.push(chosen);
        currentPos = chosen.points[chosen.points.length - 1];
      } else {
        break;
      }
    }

    // Merge touching segments in the ordered group within 0.05mm tolerance
    const mergedGroup = mergeConsecutivePolylines(orderedGroup, 0.05);
    // Apply RDP decimation to prune collinear micro-segments (15 micron tolerance)
    const decimatedGroup = mergedGroup.map((poly) => ({
      ...poly,
      points: simplifyPolylineRDP(poly.points, 0.015),
    }));
    allOptimized.push(...decimatedGroup);
  }

  const optimizedTravelMm = calculateTravelDistance(allOptimized, safePark);
  const savedMm = Math.max(0, originalTravelMm - optimizedTravelMm);
  const savedPercent =
    originalTravelMm > 0 ? (savedMm / originalTravelMm) * 100 : 0;

  // Time estimation
  const travelSec = (optimizedTravelMm / preset.travelFeedrate) * 60;
  const drawSec = (totalDrawMm / preset.drawFeedrate) * 60;
  const zHopHeight = Math.abs(preset.penUpZ - preset.penDownZ);
  const zHopSec =
    allOptimized.length * 2 * ((zHopHeight / preset.zFeedrate) * 60);
  const estimatedTimeSeconds = Math.round(travelSec + drawSec + zHopSec);

  return {
    optimizedPolylines: allOptimized,
    stats: {
      originalTravelMm: Math.round(originalTravelMm * 10) / 10,
      optimizedTravelMm: Math.round(optimizedTravelMm * 10) / 10,
      savedMm: Math.round(savedMm * 10) / 10,
      savedPercent: Math.round(savedPercent * 10) / 10,
      totalDrawMm: Math.round(totalDrawMm * 10) / 10,
      estimatedTimeSeconds,
    },
  };
}
