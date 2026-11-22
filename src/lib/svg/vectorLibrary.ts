export interface CuratedVector {
  desc: string;
  description?: string;
  svg: string;
}

export const CURATED_VECTORS: Record<string, CuratedVector> = {
  'Sacred Mandala': {
    desc: 'Radial symmetric geometric mandala',
    svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" stroke="#000000" fill="none"/><circle cx="50" cy="50" r="30" stroke="#000000" fill="none"/><circle cx="50" cy="50" r="15" stroke="#000000" fill="none"/><polygon points="50,5 65,35 95,50 65,65 50,95 35,65 5,50 35,35" stroke="#000000" fill="none"/><polygon points="50,20 60,40 80,50 60,60 50,80 40,60 20,50 40,40" stroke="#000000" fill="none"/><line x1="50" y1="5" x2="50" y2="95" stroke="#000000"/><line x1="5" y1="50" x2="95" y2="50" stroke="#000000"/><line x1="18" y1="18" x2="82" y2="82" stroke="#000000"/><line x1="18" y1="82" x2="82" y2="18" stroke="#000000"/></svg>',
  },
  'Archimedean Spiral': {
    desc: 'Multi-turn mathematical harmonic spiral',
    svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 50 50 A 5 5 0 0 1 55 50 A 10 10 0 0 1 45 50 A 15 15 0 0 1 60 50 A 20 20 0 0 1 40 50 A 25 25 0 0 1 65 50 A 30 30 0 0 1 35 50 A 35 35 0 0 1 70 50 A 40 40 0 0 1 30 50 A 45 45 0 0 1 75 50" stroke="#000000" fill="none"/></svg>',
  },
  'PCB Circuit Grid': {
    desc: 'Electronic trace bus with IC pinouts',
    svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="35" y="35" width="30" height="30" stroke="#000000" fill="none"/><line x1="10" y1="40" x2="35" y2="40" stroke="#000000"/><line x1="10" y1="50" x2="35" y2="50" stroke="#000000"/><line x1="10" y1="60" x2="35" y2="60" stroke="#000000"/><line x1="65" y1="40" x2="90" y2="40" stroke="#000000"/><line x1="65" y1="50" x2="90" y2="50" stroke="#000000"/><line x1="65" y1="60" x2="90" y2="60" stroke="#000000"/><line x1="40" y1="10" x2="40" y2="35" stroke="#000000"/><line x1="50" y1="10" x2="50" y2="35" stroke="#000000"/><line x1="60" y1="10" x2="60" y2="35" stroke="#000000"/><line x1="40" y1="65" x2="40" y2="90" stroke="#000000"/><line x1="50" y1="65" x2="50" y2="90" stroke="#000000"/><line x1="60" y1="65" x2="60" y2="90" stroke="#000000"/><circle cx="10" cy="40" r="2" stroke="#000000" fill="none"/><circle cx="90" cy="50" r="2" stroke="#000000" fill="none"/><circle cx="50" cy="90" r="2" stroke="#000000" fill="none"/><circle cx="50" cy="10" r="2" stroke="#000000" fill="none"/></svg>',
  },
  'Vernier Calibration': {
    desc: 'Plotter squareness & line-gap test',
    svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" stroke="#000000" fill="none"/><rect x="25" y="25" width="50" height="50" stroke="#000000" fill="none"/><line x1="10" y1="10" x2="90" y2="90" stroke="#000000"/><line x1="90" y1="10" x2="10" y2="90" stroke="#000000"/><circle cx="50" cy="50" r="35" stroke="#000000" fill="none"/><circle cx="50" cy="50" r="10" stroke="#000000" fill="none"/></svg>',
  },
  'Guilloche Wave': {
    desc: 'Banknote-style security curve pattern',
    svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 10 30 Q 30 10 50 30 T 90 30" stroke="#000000" fill="none"/><path d="M 10 40 Q 30 20 50 40 T 90 40" stroke="#000000" fill="none"/><path d="M 10 50 Q 30 30 50 50 T 90 50" stroke="#000000" fill="none"/><path d="M 10 60 Q 30 40 50 60 T 90 60" stroke="#000000" fill="none"/><path d="M 10 70 Q 30 50 50 70 T 90 70" stroke="#000000" fill="none"/></svg>',
  },
};
