import { describe, it, expect } from 'vitest';
import { generateGcode, getSafePenPausePosition } from '../gcode/generator';
import { MachinePreset, Polyline } from '@/types/plotter';
import { BUILTIN_PRESETS } from '../gcode/presets';

describe('G-Code Generator & Hardware Safety', () => {
  const bambuPreset: MachinePreset = BUILTIN_PRESETS.find((p) => p.id === 'bambu-a1-mini')!;
  const grblPreset: MachinePreset = {
    id: 'grbl-test-plotter',
    name: 'GRBL Test Plotter',
    firmware: 'grbl',
    bedWidth: 300,
    bedDepth: 210,
    minSafeX: 0,
    maxSafeX: 300,
    minSafeY: 0,
    maxSafeY: 210,
    penOffsetX: 0,
    penOffsetY: 0,
    penUpZ: 5.0,
    penDownZ: 0.0,
    safeParkX: 0,
    safeParkY: 0,
    safeParkZ: 10.0,
    drawFeedrate: 2500,
    travelFeedrate: 5000,
    zFeedrate: 1500,
    pauseCommand: 'M0',
    keepOutZones: [],
  };

  it('calculates safe pen pause position keeping the pen nib over the bed plate even with negative offsets', () => {
    const offsetPreset: MachinePreset = {
      ...bambuPreset,
      penOffsetX: -18,
      penOffsetY: -26,
    };
    const pausePos = getSafePenPausePosition(offsetPreset);
    // Nozzle X should be safePenX - (-18) = 25 + 18 = 43
    // Nozzle Y should be safePenY - (-26) = 25 + 26 = 51
    expect(pausePos.nozzleX).toBeGreaterThanOrEqual(offsetPreset.minSafeX);
    expect(pausePos.nozzleX).toBeLessThanOrEqual(offsetPreset.maxSafeX);
    expect(pausePos.nozzleY).toBeGreaterThanOrEqual(offsetPreset.minSafeY);
    expect(pausePos.nozzleY).toBeLessThanOrEqual(offsetPreset.maxSafeY);

    // Derived pen nib position must be over the bed (> 0)
    const penNibX = pausePos.nozzleX + offsetPreset.penOffsetX;
    const penNibY = pausePos.nozzleY + offsetPreset.penOffsetY;
    expect(penNibX).toBeGreaterThanOrEqual(15);
    expect(penNibY).toBeGreaterThanOrEqual(15);
  });

  it('emits modal feedrate (F is emitted on first G1 of each stroke, omitted on subsequent)', () => {
    const poly: Polyline = {
      id: 'p-multi',
      penId: 'pen-1',
      points: [
        { x: 30, y: 30 },
        { x: 35, y: 35 },
        { x: 40, y: 35 },
        { x: 45, y: 40 },
      ],
    };
    const result = generateGcode([poly], bambuPreset);
    const gcodeLines = result.gcode.split('\n');

    // Find the drawing lines for this stroke
    const g1DrawMoves = gcodeLines.filter((l) => l.startsWith('G1 X'));
    expect(g1DrawMoves.length).toBe(3);

    // First G1 move must specify feedrate F
    expect(g1DrawMoves[0]).toContain(`F${bambuPreset.drawFeedrate}`);

    // Subsequent G1 moves in this stroke must NOT repeat F
    expect(g1DrawMoves[1]).not.toContain('F');
    expect(g1DrawMoves[2]).not.toContain('F');
  });

  it('suppresses duplicate consecutive Z-hop commands', () => {
    const poly1: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 30, y: 30 },
        { x: 40, y: 30 },
      ],
    };
    const poly2: Polyline = {
      id: 'p2',
      penId: 'pen-1',
      points: [
        { x: 50, y: 50 },
        { x: 60, y: 50 },
      ],
    };

    const result = generateGcode([poly1, poly2], bambuPreset);
    const lines = result.gcode.split('\n');

    // Check that there are never two consecutive lines commanding Z moves
    for (let i = 0; i < lines.length - 1; i++) {
      const isZ1 = lines[i].includes(' Z');
      const isZ2 = lines[i + 1].includes(' Z');
      if (isZ1 && isZ2) {
        // If both are Z moves, their target heights must differ
        const zVal1 = lines[i].match(/Z([0-9.-]+)/)?.[1];
        const zVal2 = lines[i + 1].match(/Z([0-9.-]+)/)?.[1];
        expect(zVal1).not.toBe(zVal2);
      }
    }
  });

  it('guards 3D-printer commands in GRBL mode and ends with M2', () => {
    const poly: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    };
    const result = generateGcode([poly], grblPreset);
    const gcode = result.gcode;

    // Must NOT contain 3D printer heater commands
    expect(gcode).not.toContain('M104');
    expect(gcode).not.toContain('M140');
    expect(gcode).not.toContain('M107');
    expect(gcode).not.toContain('M84');

    // Must end with M2
    expect(gcode).toContain('M2  ; Program end / rewind');
  });

  it('includes 3D-printer commands and M204 acceleration clamping for non-GRBL firmware', () => {
    const poly: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 30, y: 30 },
        { x: 40, y: 40 },
      ],
    };
    const result = generateGcode([poly], bambuPreset);
    const gcode = result.gcode;

    expect(gcode).toContain('M104 S0');
    expect(gcode).toContain('M140 S0');
    expect(gcode).toContain('M107');
    expect(gcode).toContain('M204 P1000 T1500');
    expect(gcode).toContain('M84 ; Disable steppers');
  });

  it('omits M204 acceleration command in GRBL mode', () => {
    const poly: Polyline = {
      id: 'p1',
      penId: 'pen-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    };
    const result = generateGcode([poly], grblPreset);
    expect(result.gcode).not.toContain('M204');
  });
});
