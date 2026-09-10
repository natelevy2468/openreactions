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
    for (let a = 0; a < mol.getAllAtoms(); a++) positions.set(originalKey(a), { x: +(center.x + (mol.getAtomX(a) - cx) * scale).toFixed(2), y: +(center.y - (mol.getAtomY(a) - cy) * scale).toFixed(2) });
    for (let b = 0; b < mol.getAllBonds(); b++) {
      const from = originalKey(mol.getBondAtom(0, b)), to = originalKey(mol.getBondAtom(1, b));
      const type = mol.getBondType(b);
      stereo.set([from, to].sort().join('|'), { from, to, bondType: type === OCL.Molecule.cBondTypeUp ? 'wedge' : type === OCL.Molecule.cBondTypeDown ? 'dash' : type === OCL.Molecule.cBondTypeCross ? 'ambiguous' : null });
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
