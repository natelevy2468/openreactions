export const CURVE_PRESETS = [
  { mode: 'curve0', label: 'Shallow CCW', factor: .25, direction: 'ccw' },
  { mode: 'curve1', label: 'Medium CCW', factor: .5, direction: 'ccw' },
  { mode: 'curve2', label: 'Deep CCW', factor: .95, direction: 'ccw' },
  { mode: 'curve3', label: 'Shallow CW', factor: .25, direction: 'cw' },
  { mode: 'curve4', label: 'Medium CW', factor: .5, direction: 'cw' },
  { mode: 'curve5', label: 'Deep CW', factor: .95, direction: 'cw' },
];
export const isCurvedArrowMode = mode => /^(fishhook-)?curve[0-5]$/.test(mode);
export function createCurvedArrow(mode, start, end) {
  const preset = CURVE_PRESETS.find(p => p.mode === mode.replace('fishhook-', ''));
  if (!preset) throw new Error('Unknown curved arrow preset');
  return { type: 'curved', x1: start.x, y1: start.y, x2: end.x, y2: end.y,
    curveType: preset.mode, direction: preset.direction, electrons: mode.startsWith('fishhook-') ? 1 : 2,
    // Explicit control keeps future preset changes from changing saved drawings.
    controlOffset: Math.hypot(end.x-start.x,end.y-start.y)*preset.factor*(preset.direction==='cw'?1:-1),
  };
}
