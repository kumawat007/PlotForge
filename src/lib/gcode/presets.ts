import { MachinePreset, PaperPreset, PenMountPreset } from '@/types/plotter';

export const BUILTIN_PRESETS: MachinePreset[] = [
  {
    id: 'bambu-a1-mini',
    name: 'Bambu Lab A1 mini',
    firmware: 'bambu',
    bedWidth: 180,
    bedDepth: 180,
    minSafeX: 0,
    maxSafeX: 180,
    minSafeY: 0,
    maxSafeY: 180,
    penOffsetX: 0,
    penOffsetY: -30, // Kumawat007 official PIP mount: pen nib is 30mm forward in front of nozzle
    penUpZ: 13.0, // 3.0mm fast Z-hop: quick clearance without pen drag
    penDownZ: 10.0, // Safe nozzle height (nozzle is 10mm above bed, pen touches paper)
    safeParkX: 10,
    safeParkY: 10,
    safeParkZ: 25.0,
    drawFeedrate: 2100, // 35 mm/s - smooth, rich ink laydown without tearing or fading
    travelFeedrate: 4500, // 75 mm/s - fast rapid air travel
    zFeedrate: 800, // 13.3 mm/s - snappy, soft pen lifts & drops
    drawAcceleration: 1000, // Soft acceleration curve
    travelAcceleration: 1500,
    pauseCommand: 'M400 U1',
    keepOutZones: [],
  },
  {
    id: 'bambu-a1',
    name: 'Bambu Lab A1',
    firmware: 'bambu',
    bedWidth: 256,
    bedDepth: 256,
    minSafeX: 0,
    maxSafeX: 256,
    minSafeY: 0,
    maxSafeY: 256,
    penOffsetX: 0,
    penOffsetY: -30, // Kumawat007 official PIP mount: pen nib is 30mm forward in front of nozzle
    penUpZ: 13.0,
    penDownZ: 10.0,
    safeParkX: 10,
    safeParkY: 10,
    safeParkZ: 25.0,
    drawFeedrate: 2400, // 40 mm/s
    travelFeedrate: 5000, // 83.3 mm/s
    zFeedrate: 900, // 15 mm/s
    drawAcceleration: 1200,
    travelAcceleration: 1800,
    pauseCommand: 'M400 U1',
    keepOutZones: [],
  },
];

export const DEFAULT_PRESET = BUILTIN_PRESETS[0];

export const DEFAULT_PEN_MOUNTS: PenMountPreset[] = [
  {
    id: 'kumawat-a1-pip',
    name: 'Kumawat007 A1 / A1 Mini PIP Mount (30mm Front Offset) ★',
    offsetX: 0,
    offsetY: -30,
    description: 'Official 1-piece print-in-place mount for Bambu Lab A1 & A1 Mini with 30mm forward nozzle offset (nib at Y - 30mm)',
  },
  {
    id: 'custom',
    name: 'Custom Mount Offset ⚙️...',
    offsetX: 0,
    offsetY: 0,
    description: 'Manually calibrated ΔX and ΔY pen offsets',
  },
];

export const DEFAULT_PAPER_PRESETS: PaperPreset[] = [
  { id: 'full-bed', name: 'Full Draw Bed (180 × 150 mm Reachable)', widthMm: 180, heightMm: 150 },
  { id: 'custom', name: 'Custom Paper Size...', widthMm: 140, heightMm: 140 },
];
