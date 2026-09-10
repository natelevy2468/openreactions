import { loadOCL } from './ocl.js';
import { graphToOCLMolecule } from './exportStructure.js';
import { lookupAbbreviation } from './abbreviations.js';

export async function validateStructure(graph) {
  const OCL = await loadOCL();
  const issues = [];
  const valences = graph.atoms.map(() => 0);
  graph.bonds.forEach(b => { valences[b.from] += b.order; valences[b.to] += b.order; });
  const maximum = { H: 1, B: 3, C: 4, N: 3, O: 2, F: 1, P: 5, S: 6, Cl: 1, Br: 1, I: 1 };
  graph.atoms.forEach((atom, i) => {
    if (lookupAbbreviation(atom.element)) return;
    if (!OCL.Molecule.getAtomicNoFromLabel(atom.element)) {
      issues.push({ key: atom.key, message: `${atom.element}: custom label; chemical identity is not defined.` });
      return;
    }
    let max = maximum[atom.element];
    if (atom.element === 'N' || atom.element === 'O') max += atom.charge || 0;
    if (atom.element === 'B' && atom.charge === -1) max = 4;
    if (max !== undefined && valences[i] > max) issues.push({ key: atom.key, message: `${atom.element}: bond order total ${valences[i]} exceeds the expected valence ${max}.` });
  });
  try {
    const { molecule, warnings } = graphToOCLMolecule(OCL, graph);
    molecule.validate();
    warnings.forEach(message => issues.push({ message }));
  } catch (error) { if (!issues.length && !/unbalanced atom charge/i.test(error.message || '')) issues.push({ message: error.message || 'The structure has inconsistent chemical properties.' }); }
  return issues;
}
