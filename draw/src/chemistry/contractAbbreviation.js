import { lookupAbbreviation } from './abbreviations.js';
import { buildMoleculeGraph } from './moleculeGraph.js';
import { graphToSmiles } from './exportStructure.js';
import { loadOCL } from './ocl.js';
const key = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`;

export async function contractAbbreviation(doc, selected, label) {
  if (!lookupAbbreviation(label)) throw new Error('Choose a recognized abbreviation.');
  if (!selected.size) throw new Error('Select the fragment to contract.');
  const points = doc.vertices.filter(v => selected.has(key(v.x, v.y)));
  const crossing = doc.segments.filter(b => selected.has(key(b.x1, b.y1)) !== selected.has(key(b.x2, b.y2)));
  if (crossing.length > 1) throw new Error('An abbreviated fragment must have at most one bond to the remaining structure.');
  const bond = crossing[0];
  const position = bond ? (selected.has(key(bond.x1, bond.y1)) ? { x: bond.x1, y: bond.y1 } : { x: bond.x2, y: bond.y2 }) : points[0];
  if (!position) throw new Error('Select the fragment to contract.');
  const next = {
    ...doc,
    vertices: [...doc.vertices.filter(v => !selected.has(key(v.x, v.y))), position],
    segments: doc.segments.filter(b => !(selected.has(key(b.x1, b.y1)) && selected.has(key(b.x2, b.y2)))),
    vertexAtoms: { ...Object.fromEntries(Object.entries(doc.vertexAtoms).filter(([k]) => !selected.has(k))), [key(position.x, position.y)]: { symbol: label, charge: 0 } },
    vertexBondStates: {}, detectedRings: [],
  };
  const beforeSmiles = await graphToSmiles(buildMoleculeGraph(doc)), afterSmiles = await graphToSmiles(buildMoleculeGraph(next));
  const OCL = await loadOCL();
  if (beforeSmiles.warnings.length || afterSmiles.warnings.length || OCL.Molecule.fromSmiles(beforeSmiles.smiles).getIDCode() !== OCL.Molecule.fromSmiles(afterSmiles.smiles).getIDCode()) throw new Error('That selection does not match the abbreviation at this attachment point.');
  return next;
}
