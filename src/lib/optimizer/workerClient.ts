import { Polyline, MachinePreset, OptimizationStats } from '@/types/plotter';
import { optimizeToolpath } from './tspOptimizer';

export interface OptimizeRequest {
  polylines: Polyline[];
  preset: Pick<
    MachinePreset,
    'safeParkX' | 'safeParkY' | 'travelFeedrate' | 'drawFeedrate' | 'zFeedrate' | 'penUpZ' | 'penDownZ'
  >;
}

export interface OptimizeResponse {
  optimizedPolylines: Polyline[];
  stats: OptimizationStats;
}

/**
 * Worker script as inline string for robust Blob Web Worker instantiation
 */
const WORKER_SCRIPT = `
self.onmessage = function(e) {
  const { polylines, preset } = e.data;

  function dist(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function calculateTravel(polys, start) {
    if (polys.length === 0) return 0;
    let travel = 0;
    let cur = { x: start.x, y: start.y };
    for (let i = 0; i < polys.length; i++) {
      const p = polys[i];
      if (p.points.length === 0) continue;
      travel += dist(cur, p.points[0]);
      cur = p.points[p.points.length - 1];
    }
    travel += dist(cur, start);
    return travel;
  }

  function calculateDraw(polys) {
    let d = 0;
    for (let i = 0; i < polys.length; i++) {
      const p = polys[i];
      for (let j = 0; j < p.points.length - 1; j++) {
        d += dist(p.points[j], p.points[j+1]);
      }
    }
    return d;
  }

  const safePark = { x: preset.safeParkX, y: preset.safeParkY };
  const originalTravelMm = calculateTravel(polylines, safePark);
  const totalDrawMm = calculateDraw(polylines);

  const penGroups = new Map();
  for (let i = 0; i < polylines.length; i++) {
    const poly = polylines[i];
    if (poly.points.length < 2) continue;
    const group = penGroups.get(poly.penId) || [];
    group.push({
      id: poly.id,
      penId: poly.penId,
      sourceElementId: poly.sourceElementId,
      points: poly.points.map(pt => ({ x: pt.x, y: pt.y }))
    });
    penGroups.set(poly.penId, group);
  }

  const allOptimized = [];
  let currentPos = { x: safePark.x, y: safePark.y };

  for (const [_, groupPolys] of penGroups) {
    const unvisited = [...groupPolys];
    const orderedGroup = [];

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

    // Merge touching segments
    const merged = [];
    if (orderedGroup.length > 0) {
      let cur = orderedGroup[0];
      for (let i = 1; i < orderedGroup.length; i++) {
        const next = orderedGroup[i];
        const curEnd = cur.points[cur.points.length - 1];
        const nextStart = next.points[0];
        if (dist(curEnd, nextStart) <= 0.05) {
          cur.points.push(...next.points.slice(1));
        } else {
          merged.push(cur);
          cur = next;
        }
      }
      merged.push(cur);
    }
    allOptimized.push(...merged);
  }

  const optimizedTravelMm = calculateTravel(allOptimized, safePark);
  const savedMm = Math.max(0, originalTravelMm - optimizedTravelMm);
  const savedPercent = originalTravelMm > 0 ? (savedMm / originalTravelMm) * 100 : 0;

  const travelSec = (optimizedTravelMm / preset.travelFeedrate) * 60;
  const drawSec = (totalDrawMm / preset.drawFeedrate) * 60;
  const zHopHeight = Math.abs(preset.penUpZ - preset.penDownZ);
  const zHopSec = allOptimized.length * 2 * ((zHopHeight / preset.zFeedrate) * 60);
  const estimatedTimeSeconds = Math.round(travelSec + drawSec + zHopSec);

  self.postMessage({
    optimizedPolylines: allOptimized,
    stats: {
      originalTravelMm: Math.round(originalTravelMm * 10) / 10,
      optimizedTravelMm: Math.round(optimizedTravelMm * 10) / 10,
      savedMm: Math.round(savedMm * 10) / 10,
      savedPercent: Math.round(savedPercent * 10) / 10,
      totalDrawMm: Math.round(totalDrawMm * 10) / 10,
      estimatedTimeSeconds
    }
  });
};
`;

/**
 * Optimizes toolpath using an inline Web Worker if available, with main-thread fallback.
 */
export async function runOptimizationAsync(
  request: OptimizeRequest
): Promise<OptimizeResponse> {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      return await new Promise<OptimizeResponse>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<OptimizeResponse>) => {
          URL.revokeObjectURL(workerUrl);
          worker.terminate();
          resolve(e.data);
        };
        worker.onerror = (err) => {
          URL.revokeObjectURL(workerUrl);
          worker.terminate();
          reject(err);
        };
        worker.postMessage(request);
      });
    } catch {
      // Fall back to main thread
    }
  }

  // Fallback
  return optimizeToolpath(request.polylines, request.preset);
}
