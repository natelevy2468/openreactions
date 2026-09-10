export function graphToDrawing(graph, center = { x: 0, y: 0 }) {
  const vertices = graph.atoms.map(a => ({ x: +(a.x + center.x).toFixed(2), y: +(a.y + center.y).toFixed(2) }));
  const vertexAtoms = {};
  graph.atoms.forEach((a, i) => {
    if (a.element !== 'C' || a.charge || a.isotope || a.radical) vertexAtoms[`${vertices[i].x.toFixed(2)},${vertices[i].y.toFixed(2)}`] = { symbol: a.element, charge: a.charge || 0, isotope: a.isotope || 0, radical: a.radical || 0, lonePairs: 0 };
  });
  const segments = graph.bonds.map(b => ({ x1: vertices[b.from].x, y1: vertices[b.from].y, x2: vertices[b.to].x, y2: vertices[b.to].y, bondOrder: b.order, bondType: b.bondType || null, direction: Math.atan2(vertices[b.to].y - vertices[b.from].y, vertices[b.to].x - vertices[b.from].x) }));
  return { vertices, vertexAtoms, segments };
}
