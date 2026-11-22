import { Bitmap, potraceGetPathList, getSVGData } from 'potrace-plus';

export interface PotraceOptions {
  turdsize?: number; // Specks suppression in px (default 2)
  alphamax?: number; // Corner threshold parameter (default 1.0)
  optcurve?: boolean; // Curve optimization (default true)
  opttolerance?: number; // Curve optimization tolerance (default 0.2)
  turnpolicy?: 'black' | 'white' | 'left' | 'right' | 'minority' | 'majority';
  fillColorHex?: string; // default '#000000'
}

/**
 * Traces a 1-bit binary raster grid (1 = foreground/black, 0 = background/white)
 * into a Scalable Vector Graphics (SVG) string using Peter Selinger's Potrace algorithm.
 * Output is 100% compliant SVG with cubic Béziers, identical to PicSVG.
 */
export function traceBinaryGridToSvg(
  binary: Uint8Array,
  width: number,
  height: number,
  options: PotraceOptions = {}
): string {
  const {
    turdsize = 2,
    alphamax = 1.0,
    optcurve = true,
    opttolerance = 0.2,
    turnpolicy = 'majority',
    fillColorHex = '#000000',
  } = options;

  const bm = new Bitmap(width, height);
  // Transfer binary foreground pixels
  for (let i = 0; i < width * height; i++) {
    if (binary[i]) {
      bm.data[i] = 1;
    }
  }

  const res = potraceGetPathList(bm, {
    turdsize,
    alphamax,
    optcurve,
    opttolerance,
    turnpolicy,
    getPolygon: false,
  });

  let svgData: any = null;
  try {
    svgData = getSVGData({
      pathList: res.pathList,
      width,
      height,
      w: width,
      h: height,
      scale: 1,
      scaleAdjust: 1,
      toRelative: true,
      toShorthands: true,
      optimize: true,
    });
  } catch {
    svgData = null;
  }

  if (!svgData || !svgData.d) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
</svg>`;
  }

  // Construct standard PicSVG-format SVG markup
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet">
  <path d="${svgData.d}" fill="${fillColorHex}" fill-rule="evenodd" stroke="none" />
</svg>`;
}
