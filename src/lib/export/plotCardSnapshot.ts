import { MachinePreset, OptimizationStats, PenSlot, Polyline } from '@/types/plotter';

/**
 * High-Resolution 1920x1080 Technical Showcase Card Generator
 * Frames the current toolpath with 2026 Light Studio telemetry and physical bed-on-paper render.
 */

export type CardThemeId = 'light-studio' | 'warm-kraft' | 'nordic-fog' | 'swiss-editorial';

export interface PlotCardSnapshotParams {
  preset: MachinePreset;
  pens: PenSlot[];
  polylines: Polyline[];
  stats: OptimizationStats;
  theme?: CardThemeId;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00m 00s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}h ${remM.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

export function generatePlotCardSnapshot(params: PlotCardSnapshotParams): string {
  const { preset, pens, polylines, stats, theme = 'light-studio' } = params;

  const width = 1920;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const themeTokens: Record<
    CardThemeId,
    {
      bg: string;
      panel: string;
      bed: string;
      paper: string;
      border: string;
      stroke: string;
      accent: string;
      text: string;
      subtext: string;
      dotColor: string;
    }
  > = {
    'light-studio': {
      bg: '#F8FAFC',
      panel: '#FFFFFF',
      bed: '#1E293B',
      paper: '#FFFFFF',
      border: '#CBD5E1',
      stroke: '#0F172A',
      accent: '#2563EB',
      text: '#0F172A',
      subtext: '#64748B',
      dotColor: 'rgba(15, 23, 42, 0.05)',
    },
    'warm-kraft': {
      bg: '#FBF9F5',
      panel: '#FFFDF9',
      bed: '#292524',
      paper: '#FFFDF7',
      border: '#E5DECE',
      stroke: '#1C1917',
      accent: '#EA580C',
      text: '#1C1917',
      subtext: '#78716C',
      dotColor: 'rgba(28, 25, 23, 0.05)',
    },
    'nordic-fog': {
      bg: '#F0FDF4',
      panel: '#FFFFFF',
      bed: '#14532D',
      paper: '#FFFFFF',
      border: '#BBF7D0',
      stroke: '#064E3B',
      accent: '#059669',
      text: '#064E3B',
      subtext: '#166534',
      dotColor: 'rgba(6, 78, 59, 0.05)',
    },
    'swiss-editorial': {
      bg: '#FFFFFF',
      panel: '#F8FAFC',
      bed: '#09090B',
      paper: '#FFFFFF',
      border: '#E4E4E7',
      stroke: '#000000',
      accent: '#DC2626',
      text: '#09090B',
      subtext: '#52525B',
      dotColor: 'rgba(9, 9, 11, 0.04)',
    },
  };

  const colors = themeTokens[theme] || themeTokens['light-studio'];

  // 1. Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle dot matrix
  ctx.fillStyle = colors.dotColor;
  for (let x = 30; x < width; x += 32) {
    for (let y = 30; y < height; y += 32) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // 2. Outer Technical Border with Corner Crosshairs
  const margin = 48;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin, margin, cardW, cardH);

  // Corner Crosshairs
  const drawCorner = (cx: number, cy: number) => {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();
  };
  drawCorner(margin, margin);
  drawCorner(margin + cardW, margin);
  drawCorner(margin, margin + cardH);
  drawCorner(margin + cardW, margin + cardH);

  // 3. Top Header Bar inside Border
  const headerY = margin + 36;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(margin + 24, headerY - 14, 8, 20);

  ctx.fillStyle = colors.text;
  ctx.font = 'bold 22px monospace';
  ctx.fillText('PLOTFORGE // 2026 HARDWARE TELEMETRY', margin + 42, headerY + 2);

  ctx.fillStyle = colors.subtext;
  ctx.font = '14px monospace';
  ctx.fillText('CAM-01 • BY @KUMAWAT007 • MAKERWORLD.COM/@KUMAWAT007', margin + 540, headerY + 1);

  ctx.textAlign = 'right';
  ctx.fillStyle = colors.subtext;
  ctx.fillText(`MACHINE: ${preset.name.toUpperCase()}`, margin + cardW - 24, headerY + 1);
  ctx.textAlign = 'left';

  // Divider under header
  ctx.strokeStyle = colors.border;
  ctx.beginPath();
  ctx.moveTo(margin + 24, headerY + 22);
  ctx.lineTo(margin + cardW - 24, headerY + 22);
  ctx.stroke();

  // 4. Center Build Plate Viewport
  const plateAreaTop = headerY + 36;
  const bottomBarHeight = 110;
  const plateAreaH = height - margin - bottomBarHeight - plateAreaTop;
  const plateAreaW = cardW - 48;
  const plateAreaLeft = margin + 24;

  // Fit bed
  const scale = Math.min((plateAreaW - 60) / preset.bedWidth, (plateAreaH - 60) / preset.bedDepth);
  const bedPixelW = preset.bedWidth * scale;
  const bedPixelH = preset.bedDepth * scale;
  const bedX = plateAreaLeft + (plateAreaW - bedPixelW) / 2;
  const bedY = plateAreaTop + (plateAreaH - bedPixelH) / 2;

  // Bed plate
  ctx.fillStyle = colors.bed;
  ctx.beginPath();
  ctx.roundRect(bedX, bedY, bedPixelW, bedPixelH, 12);
  ctx.fill();

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Paper Sheet inside Bed
  const paperMargin = 20 * scale;
  const paperPixelW = bedPixelW - paperMargin * 2;
  const paperPixelH = bedPixelH - paperMargin * 2;
  const paperX = bedX + paperMargin;
  const paperY = bedY + paperMargin;

  ctx.fillStyle = colors.paper;
  ctx.beginPath();
  ctx.roundRect(paperX, paperY, paperPixelW, paperPixelH, 6);
  ctx.fill();

  // Technical grid lines on paper
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.05)';
  ctx.lineWidth = 0.8;
  for (let x = 0; x <= preset.bedWidth; x += 10) {
    const gx = bedX + x * scale;
    if (gx >= paperX && gx <= paperX + paperPixelW) {
      ctx.beginPath();
      ctx.moveTo(gx, paperY);
      ctx.lineTo(gx, paperY + paperPixelH);
      ctx.stroke();
    }
  }
  for (let y = 0; y <= preset.bedDepth; y += 10) {
    const gy = bedY + bedPixelH - y * scale;
    if (gy >= paperY && gy <= paperY + paperPixelH) {
      ctx.beginPath();
      ctx.moveTo(paperX, gy);
      ctx.lineTo(paperX + paperPixelW, gy);
      ctx.stroke();
    }
  }

  // Draw strokes
  const penMap = new Map<string, string>();
  for (const p of pens) penMap.set(p.id, p.colorHex);

  for (const poly of polylines) {
    if (poly.points.length < 2) continue;
    const strokeColor = penMap.get(poly.penId) || colors.stroke;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const p0 = poly.points[0];
    const sx0 = bedX + p0.x * scale;
    const sy0 = bedY + bedPixelH - p0.y * scale;
    ctx.moveTo(sx0, sy0);

    for (let i = 1; i < poly.points.length; i++) {
      const pt = poly.points[i];
      const sx = bedX + pt.x * scale;
      const sy = bedY + bedPixelH - pt.y * scale;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // 5. Bottom Hardware Telemetry Rack (Division Table)
  const bottomY = height - margin - bottomBarHeight;

  ctx.fillStyle = colors.panel;
  ctx.fillRect(margin + 24, bottomY, cardW - 48, bottomBarHeight - 16);

  ctx.strokeStyle = colors.border;
  ctx.strokeRect(margin + 24, bottomY, cardW - 48, bottomBarHeight - 16);

  const drawDistanceMeters = (stats.totalDrawMm / 1000).toFixed(2);
  const airTravelSavedPercent = stats.savedPercent;
  const timeFormatted = formatDuration(stats.estimatedTimeSeconds);
  let totalVerts = 0;
  for (const p of polylines) totalVerts += p.points.length;

  const telemetryCols = [
    { label: 'PRINTER MODEL', value: preset.name.toUpperCase(), highlight: colors.accent },
    { label: 'TOTAL INK DISTANCE', value: `${drawDistanceMeters}m`, highlight: colors.text },
    { label: 'AIR TRAVEL SAVED', value: `-${airTravelSavedPercent}%`, highlight: '#10B981' },
    { label: 'EST. PLOT TIME', value: timeFormatted, highlight: colors.text },
    { label: 'PENS CONFIGURED', value: `${pens.length} SLOTS`, highlight: colors.stroke },
    { label: 'VERTICES / NODES', value: totalVerts.toLocaleString(), highlight: colors.text },
  ];

  const colW = (cardW - 48) / telemetryCols.length;
  telemetryCols.forEach((col, idx) => {
    const colX = margin + 24 + idx * colW;
    // Divider
    if (idx > 0) {
      ctx.strokeStyle = colors.border;
      ctx.beginPath();
      ctx.moveTo(colX, bottomY + 12);
      ctx.lineTo(colX, bottomY + bottomBarHeight - 28);
      ctx.stroke();
    }

    ctx.fillStyle = colors.subtext;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(col.label, colX + 16, bottomY + 30);

    ctx.fillStyle = col.highlight;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(col.value, colX + 16, bottomY + 62);
  });

  return canvas.toDataURL('image/png');
}
