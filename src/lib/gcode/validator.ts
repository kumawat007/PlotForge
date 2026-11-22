import {
  Polyline,
  MachinePreset,
  PaperPreset,
  ValidationResult,
  ValidationBounds,
  DrawableArea,
} from '@/types/plotter';

/**
 * Transforms pen coordinate to physical nozzle coordinate:
 * X_nozzle = X_pen - penOffsetX
 * Y_nozzle = Y_pen - penOffsetY
 */
export function penToNozzle(
  penX: number,
  penY: number,
  penOffsetX: number,
  penOffsetY: number
): { x: number; y: number } {
  return {
    x: penX - penOffsetX,
    y: penY - penOffsetY,
  };
}

/**
 * Validates toolpath against machine physical boundaries, active paper sheet bounds, and keep-out exclusion zones.
 */
export function validateToolpath(
  polylines: Polyline[],
  preset: MachinePreset,
  paperPreset?: PaperPreset
): ValidationResult {
  const paperErrors: string[] = [];
  const penErrors: string[] = [];
  const nozzleErrors: string[] = [];
  const keepOutErrors: string[] = [];

  const drawableArea: DrawableArea = {
    minPenX: preset.minSafeX + preset.penOffsetX,
    maxPenX: preset.maxSafeX + preset.penOffsetX,
    minPenY: preset.minSafeY + preset.penOffsetY,
    maxPenY: preset.maxSafeY + preset.penOffsetY,
  };

  const safeBedMinX = Math.max(0, preset.minSafeX + preset.penOffsetX);
  const safeBedMaxX = Math.min(preset.bedWidth, preset.maxSafeX + preset.penOffsetX);
  const safeBedMinY = Math.max(0, preset.minSafeY + preset.penOffsetY);
  const safeBedMaxY = Math.min(preset.bedDepth, preset.maxSafeY + preset.penOffsetY);

  const paperSafeCenterX = (safeBedMinX + safeBedMaxX) / 2;
  const paperSafeCenterY = (safeBedMinY + safeBedMaxY) / 2;
  const paperW = paperPreset ? paperPreset.widthMm : (safeBedMaxX - safeBedMinX);
  const paperH = paperPreset ? paperPreset.heightMm : (safeBedMaxY - safeBedMinY);
  const isFullBed = !paperPreset || paperPreset.id === 'full-bed';
  const paperBounds = isFullBed
    ? {
        minX: safeBedMinX,
        maxX: safeBedMaxX,
        minY: safeBedMinY,
        maxY: safeBedMaxY,
      }
    : {
        minX: Math.round((paperSafeCenterX - paperW / 2) * 10) / 10,
        maxX: Math.round((paperSafeCenterX + paperW / 2) * 10) / 10,
        minY: Math.round((paperSafeCenterY - paperH / 2) * 10) / 10,
        maxY: Math.round((paperSafeCenterY + paperH / 2) * 10) / 10,
      };

  if (polylines.length === 0) {
    return {
      isValid: true,
      isOutOfPaper: false,
      errors: [],
      paperErrors: [],
      bounds: {
        minPenX: 0,
        maxPenX: 0,
        minPenY: 0,
        maxPenY: 0,
        minNozzleX: -preset.penOffsetX,
        maxNozzleX: -preset.penOffsetX,
        minNozzleY: -preset.penOffsetY,
        maxNozzleY: -preset.penOffsetY,
      },
      drawableArea,
      paperBounds,
    };
  }

  let minPenX = Infinity;
  let maxPenX = -Infinity;
  let minPenY = Infinity;
  let maxPenY = -Infinity;

  let minNozzleX = Infinity;
  let maxNozzleX = -Infinity;
  let minNozzleY = Infinity;
  let maxNozzleY = -Infinity;

  let paperOutOfBoundsCount = 0;
  let outOfBoundsCount = 0;
  let penOutOfBoundsCount = 0;
  let keepOutCollisionCount = 0;

  for (const poly of polylines) {
    for (const pt of poly.points) {
      if (pt.x < minPenX) minPenX = pt.x;
      if (pt.x > maxPenX) maxPenX = pt.x;
      if (pt.y < minPenY) minPenY = pt.y;
      if (pt.y > maxPenY) maxPenY = pt.y;

      // 0. Active Paper Bounds check
      if (
        pt.x < paperBounds.minX - 0.05 ||
        pt.x > paperBounds.maxX + 0.05 ||
        pt.y < paperBounds.minY - 0.05 ||
        pt.y > paperBounds.maxY + 0.05
      ) {
        paperOutOfBoundsCount++;
        if (paperErrors.length < 5) {
          paperErrors.push(
            `Stroke point (X: ${pt.x.toFixed(1)}, Y: ${pt.y.toFixed(1)}) exceeds active paper bounds [X: ${paperBounds.minX}..${paperBounds.maxX}, Y: ${paperBounds.minY}..${paperBounds.maxY}] (${paperPreset?.name || 'Paper'})`
          );
        }
      }

      // 1. Explicit build plate boundary check for pen coordinates
      if (
        pt.x < 0 ||
        pt.x > preset.bedWidth ||
        pt.y < 0 ||
        pt.y > preset.bedDepth
      ) {
        penOutOfBoundsCount++;
        if (penErrors.length < 5) {
          penErrors.push(
            `Pen coordinate (X: ${pt.x.toFixed(2)}, Y: ${pt.y.toFixed(2)}) is outside the build plate area [0..${preset.bedWidth}, 0..${preset.bedDepth}]`
          );
        }
      }

      const nozzle = penToNozzle(pt.x, pt.y, preset.penOffsetX, preset.penOffsetY);
      if (nozzle.x < minNozzleX) minNozzleX = nozzle.x;
      if (nozzle.x > maxNozzleX) maxNozzleX = nozzle.x;
      if (nozzle.y < minNozzleY) minNozzleY = nozzle.y;
      if (nozzle.y > maxNozzleY) maxNozzleY = nozzle.y;

      // 2. Boundary check on physical toolhead (nozzle)
      if (
        nozzle.x < preset.minSafeX ||
        nozzle.x > preset.maxSafeX ||
        nozzle.y < preset.minSafeY ||
        nozzle.y > preset.maxSafeY
      ) {
        outOfBoundsCount++;
        if (nozzleErrors.length < 5) {
          nozzleErrors.push(
            `Nozzle coordinate (X: ${nozzle.x.toFixed(2)}, Y: ${nozzle.y.toFixed(2)}) from Pen (X: ${pt.x.toFixed(2)}, Y: ${pt.y.toFixed(2)}) violates safe limits [X: ${preset.minSafeX}..${preset.maxSafeX}, Y: ${preset.minSafeY}..${preset.maxSafeY}]`
          );
        }
      }

      // 3. Keep-out zone checks
      for (const zone of preset.keepOutZones) {
        if (
          nozzle.x >= zone.xMin &&
          nozzle.x <= zone.xMax &&
          nozzle.y >= zone.yMin &&
          nozzle.y <= zone.yMax
        ) {
          keepOutCollisionCount++;
          if (keepOutErrors.length < 5) {
            keepOutErrors.push(
              `Collision with keep-out zone "${zone.name}": Nozzle at (X: ${nozzle.x.toFixed(2)}, Y: ${nozzle.y.toFixed(2)}) is inside [X: ${zone.xMin}..${zone.xMax}, Y: ${zone.yMin}..${zone.yMax}]`
            );
          }
        }
      }
    }
  }

  if (paperOutOfBoundsCount > 5) {
    paperErrors.push(`... and ${paperOutOfBoundsCount - 5} more paper sheet boundary overflows.`);
  }
  if (penOutOfBoundsCount > 5) {
    penErrors.push(`... and ${penOutOfBoundsCount - 5} more pen build plate boundary violations.`);
  }
  if (outOfBoundsCount > 5) {
    nozzleErrors.push(`... and ${outOfBoundsCount - 5} more nozzle boundary violations.`);
  }
  if (keepOutCollisionCount > 5) {
    keepOutErrors.push(`... and ${keepOutCollisionCount - 5} more keep-out zone collisions.`);
  }

  const errors = [...paperErrors, ...penErrors, ...nozzleErrors, ...keepOutErrors];

  const bounds: ValidationBounds = {
    minPenX: Math.round(minPenX * 100) / 100,
    maxPenX: Math.round(maxPenX * 100) / 100,
    minPenY: Math.round(minPenY * 100) / 100,
    maxPenY: Math.round(maxPenY * 100) / 100,
    minNozzleX: Math.round(minNozzleX * 100) / 100,
    maxNozzleX: Math.round(maxNozzleX * 100) / 100,
    minNozzleY: Math.round(minNozzleY * 100) / 100,
    maxNozzleY: Math.round(maxNozzleY * 100) / 100,
  };

  return {
    isValid: errors.length === 0,
    isOutOfPaper: paperOutOfBoundsCount > 0,
    errors,
    paperErrors,
    bounds,
    drawableArea,
    paperBounds,
  };
}
