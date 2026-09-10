import { buildMoleculeGraph, splitComponents } from '../chemistry/moleculeGraph.js';
const key = p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
const round = n => +n.toFixed(2);

/** Apply a geometric change without detaching atom metadata from its vertex. */
export function moveVertices(doc, positions, reflected = false) {
  return {
    ...doc,
    vertices: doc.vertices.map(v => ({ ...v, ...(positions.get(key(v)) || {}) })),
    segments: doc.segments.map(b => {
      const p = positions.get(key({ x: b.x1, y: b.y1 })), q = positions.get(key({ x: b.x2, y: b.y2 }));
      const next = { ...b, ...(p ? { x1: p.x, y1: p.y } : {}), ...(q ? { x2: q.x, y2: q.y } : {}) };
      // Reflect geometry but retain the chemical configuration.
      if (reflected && p && q) next.bondType = b.bondType === 'wedge' ? 'dash' : b.bondType === 'dash' ? 'wedge' : b.bondType;
      next.direction = Math.atan2(next.y2 - next.y1, next.x2 - next.x1);
      return next;
    }),
    vertexAtoms: Object.fromEntries(Object.entries(doc.vertexAtoms || {}).map(([k, value]) => [positions.has(k) ? key(positions.get(k)) : k, value])),
    vertexBondStates: Object.fromEntries(Object.entries(doc.vertexBondStates || {}).filter(([k]) => !positions.has(k))),
    detectedRings: [],
  };
}

export function transformSelection(doc, selected, action) {
  const points = doc.vertices.filter(v => selected.has(key(v)));
  if (!points.length) throw new Error('Select a structure first.');
  if (points.some(v => v.newmanId)) throw new Error('Use the Newman rotation control for Newman projections.');
  const center = points.reduce((c, p) => ({ x: c.x + p.x / points.length, y: c.y + p.y / points.length }), { x: 0, y: 0 });
  const reflect = action.startsWith('flip');
  const angle = (action === 'rotate-left' ? -15 : 15) * Math.PI / 180;
  const positions = new Map(points.map(p => {
    const x = p.x - center.x, y = p.y - center.y;
    const next = action === 'flip-horizontal' ? { x: -x, y } : action === 'flip-vertical' ? { x, y: -y } : { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
    return [key(p), { x: round(center.x + next.x), y: round(center.y + next.y) }];
  }));
  return moveVertices(doc, positions, reflect);
}

/** Align connected structures and straight reaction arrows as whole objects. */
export function alignReaction(doc, action) {
  if (doc.newmanInstances?.length) throw new Error('Align ordinary structures separately from Newman projections.');
  const parts = splitComponents(buildMoleculeGraph(doc));
  const objects = parts.map(part => {
    const xs = part.atoms.map(a => a.x), ys = part.atoms.map(a => a.y);
    return { atoms: part.atoms, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, width: Math.max(...xs) - Math.min(...xs) };
  });
  doc.vertices.filter(v => doc.vertexAtoms?.[key(v)]?.symbol === '+').forEach(v => {
    objects.push({ atoms: [v], x: v.x, y: v.y, width: 18 });
  });
  (doc.arrows || []).forEach((arrow, index) => {
    if (Number.isFinite(arrow.x) && Number.isFinite(arrow.y)) objects.push({ index, x: arrow.x, y: arrow.y, width: Math.abs(Math.cos(arrow.angle || 0) * (arrow.length || 80)) });
  });
  if (objects.length < 2) throw new Error('Add at least two structures or reaction arrows.');
  objects.sort((a, b) => a.x - b.x);
  const baseline = objects.reduce((sum, o) => sum + o.y, 0) / objects.length;
  const positions = new Map(), arrows = (doc.arrows || []).map(a => ({ ...a }));
  let cursor = objects[0].x - objects[0].width / 2;
  for (const object of objects) {
    const x = action === 'space' ? cursor + object.width / 2 : object.x;
    const dx = x - object.x, dy = baseline - object.y;
    if (object.atoms) object.atoms.forEach(a => positions.set(key(a), { x: round(a.x + dx), y: round(a.y + dy) }));
    else { arrows[object.index].x += dx; arrows[object.index].y += dy; }
    cursor += object.width + 90;
  }
  return { ...moveVertices(doc, positions), arrows };
}
