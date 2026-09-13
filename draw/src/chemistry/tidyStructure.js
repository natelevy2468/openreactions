import { loadOCL } from './ocl.js';
import { buildMoleculeGraph, splitComponents } from './moleculeGraph.js';

const key = p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;

/** Re-layout connected structures individually, retaining labels and their centers. */
export async function tidyStructure(doc, selected = new Set(), bondLength = 60) {
  const OCL = await loadOCL();
  const ordinaryVertices = doc.vertices.filter(v => !v.newmanId);
  const ordinaryKeys = new Set(ordinaryVertices.map(key));
  const graph = buildMoleculeGraph({ ...doc, vertices: ordinaryVertices, segments: doc.segments.filter(b => ordinaryKeys.has(key({ x: b.x1, y: b.y1 })) && ordinaryKeys.has(key({ x: b.x2, y: b.y2 }))) });
  const positions = new Map(), stereo = new Map();
  for (const part of splitComponents(graph)) {
    if (selected.size && !part.atoms.some(a => selected.has(key(a)))) continue;
    if (part.atoms.length < 2) continue;
    const mol = new OCL.Molecule(part.atoms.length, part.bonds.length);
    part.atoms.forEach((a, i) => {
      const index = mol.addAtom(OCL.Molecule.getAtomicNoFromLabel(a.element) || 6);
      mol.setAtomMapNo(index, i + 1, false);
      mol.setAtomCharge(index, a.charge || 0);
      if (a.isotope) mol.setAtomMass(index, a.isotope);
      if (a.radical) mol.setAtomRadical(index, a.radical);
      mol.setAtomX(index, a.x); mol.setAtomY(index, -a.y);
    });
    part.bonds.forEach(b => {
      const index = mol.addBond(b.from, b.to);
      mol.setBondOrder(index, b.order);
      if (b.bondType === 'wedge') mol.setBondType(index, OCL.Molecule.cBondTypeUp);
      if (b.bondType === 'dash') mol.setBondType(index, OCL.Molecule.cBondTypeDown);
      if (b.bondType === 'ambiguous') mol.setAtomConfigurationUnknown(b.from, true);
    });
    mol.ensureHelperArrays(OCL.Molecule.cHelperCIP);
    mol.inventCoordinates();
    mol.setStereoBondsFromParity();
    const center = part.atoms.reduce((c, a) => ({ x: c.x + a.x / part.atoms.length, y: c.y + a.y / part.atoms.length }), { x: 0, y: 0 });
    let cx = 0, cy = 0, total = 0;
    for (let a = 0; a < mol.getAllAtoms(); a++) { cx += mol.getAtomX(a) / mol.getAllAtoms(); cy += mol.getAtomY(a) / mol.getAllAtoms(); }
    for (let b = 0; b < mol.getAllBonds(); b++) { const a = mol.getBondAtom(0, b), z = mol.getBondAtom(1, b); total += Math.hypot(mol.getAtomX(a) - mol.getAtomX(z), mol.getAtomY(a) - mol.getAtomY(z)); }
    const scale = bondLength / (total / mol.getAllBonds() || 1);
    const originalKey = a => key(part.atoms[mol.getAtomMapNo(a) - 1]);
    // Coordinate invention may reverse the orientation of a symmetric ring.
    // Choose the closest rigid alignment, correcting stereo wedges if reflected.
    const points = Array.from({ length: mol.getAllAtoms() }, (_, a) => ({
      a, x: (mol.getAtomX(a) - cx) * scale, y: -(mol.getAtomY(a) - cy) * scale,
      original: part.atoms[mol.getAtomMapNo(a) - 1],
    }));
    const fit = reflected => {
      let dot = 0, cross = 0;
      points.forEach(p => {const px = reflected ? -p.x : p.x, x=p.original.x-center.x,y=p.original.y-center.y;dot+=px*x+p.y*y;cross+=px*y-p.y*x;});
      const rotation=Math.atan2(cross,dot),cos=Math.cos(rotation),sin=Math.sin(rotation);
      const fitted=points.map(p=>{const x=reflected?-p.x:p.x;return {a:p.a,x:center.x+x*cos-p.y*sin,y:center.y+x*sin+p.y*cos};});
      const error=fitted.reduce((sum,p,i)=>sum+(p.x-points[i].original.x)**2+(p.y-points[i].original.y)**2,0);
      return {reflected,fitted,error};
    };
    const normal=fit(false), mirror=fit(true), best=mirror.error+1e-6<normal.error?mirror:normal;
    best.fitted.forEach(p=>positions.set(originalKey(p.a),{x:+p.x.toFixed(2),y:+p.y.toFixed(2)}));
    for (let b = 0; b < mol.getAllBonds(); b++) {
      const from = originalKey(mol.getBondAtom(0, b)), to = originalKey(mol.getBondAtom(1, b));
      const type = mol.getBondType(b);
      stereo.set([from, to].sort().join('|'), { from, to, bondType: type === OCL.Molecule.cBondTypeUp ? (best.reflected ? 'dash' : 'wedge') : type === OCL.Molecule.cBondTypeDown ? (best.reflected ? 'wedge' : 'dash') : type === OCL.Molecule.cBondTypeCross ? 'ambiguous' : null });
    }
  }
  return {
    ...doc,
    vertices: doc.vertices.map(v => ({ ...v, ...(positions.get(key(v)) || {}) })),
    segments: doc.segments.map(b => {
      let from = key({ x: b.x1, y: b.y1 }), to = key({ x: b.x2, y: b.y2 });
      const type = stereo.get([from, to].sort().join('|'));
      if (type) { from = type.from; to = type.to; }
      const a = positions.get(from), z = positions.get(to);
      return a && z ? { ...b, x1: a.x, y1: a.y, x2: z.x, y2: z.y, bondType: type ? type.bondType : b.bondType, direction: Math.atan2(z.y - a.y, z.x - a.x) } : b;
    }),
    vertexAtoms: Object.fromEntries(Object.entries(doc.vertexAtoms).map(([k, value]) => [positions.has(k) ? key(positions.get(k)) : k, value])),
    vertexBondStates: Object.fromEntries(Object.entries(doc.vertexBondStates || {}).filter(([k]) => !positions.has(k))),
    detectedRings: [],
  };
}
