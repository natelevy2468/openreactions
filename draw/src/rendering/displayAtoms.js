import { computeImplicitH } from '../utils/valence.js';
/** One label representation for the canvas, clipboard preview, and clearance. */
export function displayAtoms(segments, vertexAtoms) {
  const orders = new Map(), directions = new Map();
  segments.forEach(b => {
    if (!(b.bondOrder > 0)) return;
    const a = `${b.x1.toFixed(2)},${b.y1.toFixed(2)}`, z = `${b.x2.toFixed(2)},${b.y2.toFixed(2)}`;
    orders.set(a,(orders.get(a)||0)+b.bondOrder); orders.set(z,(orders.get(z)||0)+b.bondOrder);
    directions.set(a,(directions.get(a)||0)+b.x2-b.x1); directions.set(z,(directions.get(z)||0)+b.x1-b.x2);
  });
  return Object.fromEntries(Object.entries(vertexAtoms).map(([key,atom]) => {
    if (!atom?.symbol || atom.implicitH) return [key,atom];
    const implicitH = computeImplicitH(atom.symbol,atom.charge||0,orders.get(key)||0);
    return [key,implicitH>0?{...atom,implicitH,_flipHydrogens:(directions.get(key)||0)>.01}:atom];
  }));
}
