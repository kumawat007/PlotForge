declare module 'potrace-plus' {
  export class Bitmap {
    width: number;
    height: number;
    size: number;
    data: Uint8Array | number[];
    constructor(width: number, height: number);
  }

  export interface PotraceInternalOptions {
    turdsize?: number;
    alphamax?: number;
    optcurve?: boolean;
    opttolerance?: number;
    turnpolicy?: string;
    getPolygon?: boolean;
    [key: string]: any;
  }

  export interface GetSVGDataOptions {
    pathList: any[];
    width?: number;
    height?: number;
    w?: number;
    h?: number;
    scale?: number;
    scaleAdjust?: number;
    toRelative?: boolean;
    toShorthands?: boolean;
    optimize?: boolean;
    minifyD?: number;
    decimals?: number;
    getPDF?: boolean;
    color?: string;
    fillRule?: string;
    [key: string]: any;
  }

  export interface SVGDataResult {
    d?: string;
    svg?: string;
    w?: number;
    h?: number;
    bb?: any;
    polygons?: any[];
    [key: string]: any;
  }

  export function potraceGetPathList(
    bm: Bitmap,
    options?: PotraceInternalOptions
  ): { pathList: any[] };

  export function getSVGData(options: GetSVGDataOptions): SVGDataResult;
}
