import { describe, it, expect, beforeEach } from 'vitest';
import { usePlotterStore } from '@/store/usePlotterStore';
import { DEFAULT_PEN_MOUNTS, DEFAULT_PAPER_PRESETS, BUILTIN_PRESETS } from '@/lib/gcode/presets';

describe('usePlotterStore Integration & State Synchronization', () => {
  beforeEach(() => {
    // Reset to clean initial state before each test
    const store = usePlotterStore.getState();
    store.setPreset(BUILTIN_PRESETS[0]); // Bambu Lab A1 mini
    store.setMountPresetId(DEFAULT_PEN_MOUNTS[0].id); // kumawat-a1-pip (0, -30)
    store.setPaperPreset(DEFAULT_PAPER_PRESETS[0]); // Full Bed
  });

  it('initializes with Kumawat007 A1 Mini PIP Mount offsets and synchronized state', () => {
    const state = usePlotterStore.getState();
    expect(state.selectedMountPresetId).toBe('kumawat-a1-pip');
    expect(state.preset.penOffsetX).toBe(0);
    expect(state.preset.penOffsetY).toBe(-30);
  });

  it('computes non-zero optimization stats and execution time on initial load', () => {
    const state = usePlotterStore.getState();
    expect(state.elements.length).toBeGreaterThan(0);
    expect(state.polylines.length).toBeGreaterThan(0);
    expect(state.optimizationStats.totalDrawMm).toBeGreaterThan(0);
    expect(state.optimizationStats.estimatedTimeSeconds).toBeGreaterThan(0);
  });

  it('synchronizes mount selector with kinematic offsets two-ways', () => {
    const store = usePlotterStore.getState();
    // Update kinematic offsets manually to custom
    store.updatePresetKinematics({ penOffsetX: 10, penOffsetY: 10 });
    let state = usePlotterStore.getState();
    expect(state.selectedMountPresetId).toBe('custom');
    expect(state.preset.penOffsetX).toBe(10);
    expect(state.preset.penOffsetY).toBe(10);

    // Switch back to Kumawat007 PIP mount
    store.setMountPresetId('kumawat-a1-pip');
    state = usePlotterStore.getState();
    expect(state.selectedMountPresetId).toBe('kumawat-a1-pip');
    expect(state.preset.penOffsetX).toBe(0);
    expect(state.preset.penOffsetY).toBe(-30);
  });

  it('updates text element live on canvas and recalculates toolpaths with non-zero draw distance', () => {
    const store = usePlotterStore.getState();
    const textEl = store.elements.find((el) => el.type === 'text');
    expect(textEl).toBeDefined();
    if (!textEl) return;

    store.updateElement(textEl.id, { textContent: 'PLOTFORGE 2026 WORLDCLASS' });
    const state = usePlotterStore.getState();
    const updated = state.elements.find((el) => el.id === textEl.id);
    expect(updated?.textContent).toBe('PLOTFORGE 2026 WORLDCLASS');
    expect(state.optimizationStats.totalDrawMm).toBeGreaterThan(0);
  });

  it('detects when an element is moved outside the active white paper sheet and triggers isOutOfPaper', () => {
    const store = usePlotterStore.getState();
    const textEl = store.elements[0];
    expect(textEl).toBeDefined();
    if (!textEl) return;

    // Move element far to the right, outside A5 paper sheet
    store.updateElement(textEl.id, { x: 190, y: 150 });
    let state = usePlotterStore.getState();
    expect(state.validationResult.isOutOfPaper).toBe(true);
    expect(state.validationResult.isValid).toBe(false);
    expect(state.validationResult.paperErrors.length).toBeGreaterThan(0);

    // Run auto-fit
    store.autoFitAllElementsToPaper();
    state = usePlotterStore.getState();
    expect(state.validationResult.isOutOfPaper).toBe(false);
    expect(state.validationResult.isValid).toBe(true);
  });

  it('supports undo and redo for canvas element edits', () => {
    const store = usePlotterStore.getState();
    const initialCount = store.elements.length;

    // Add a new element
    store.addElement({
      id: 'test_undo_elem',
      name: 'Test Element',
      type: 'text',
      x: 50,
      y: 50,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      penId: 'pen-1',
      visible: true,
      textContent: 'Undo Test',
    });

    expect(usePlotterStore.getState().elements.length).toBe(initialCount + 1);
    expect(usePlotterStore.getState().canUndo).toBe(true);

    // Undo addition
    usePlotterStore.getState().undo();
    expect(usePlotterStore.getState().elements.length).toBe(initialCount);
    expect(usePlotterStore.getState().canRedo).toBe(true);

    // Redo addition
    usePlotterStore.getState().redo();
    expect(usePlotterStore.getState().elements.length).toBe(initialCount + 1);
  });

  it('locks element and prevents nudging or deletion while locked', () => {
    const store = usePlotterStore.getState();
    const elemId = store.elements[0].id;
    const initialX = store.elements[0].x;

    // Lock element
    store.toggleLockElement(elemId);
    expect(usePlotterStore.getState().elements.find((e) => e.id === elemId)?.locked).toBe(true);

    // Attempt nudge while locked
    store.nudgeElement(elemId, 10, 10);
    expect(usePlotterStore.getState().elements.find((e) => e.id === elemId)?.x).toBe(initialX);

    // Attempt delete while locked
    store.removeElement(elemId);
    expect(usePlotterStore.getState().elements.find((e) => e.id === elemId)).toBeDefined();

    // Unlock and verify delete works
    store.toggleLockElement(elemId);
    expect(usePlotterStore.getState().elements.find((e) => e.id === elemId)?.locked).toBe(false);
    store.removeElement(elemId);
    expect(usePlotterStore.getState().elements.find((e) => e.id === elemId)).toBeUndefined();
  });
});

