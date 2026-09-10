import { loadOCL } from './ocl.js';
import { smilesToGraph } from './importStructure.js';
import { buildMoleculeGraph, splitComponents } from './moleculeGraph.js';
import { graphToOCLMolecule, graphToMolfile } from './exportStructure.js';

export async function importChemicalFile(text, filename) {
  const OCL = await loadOCL();
  const extension = filename.split('.').pop().toLowerCase();
  const molecules = [];
  let reactionBreak = null;
  if (extension === 'rxn' || text.trimStart().startsWith('$RXN')) {
    const reaction = OCL.Reaction.fromRxn(text);
    if (reaction.getCatalysts()) throw new Error('This RXN contains agent structures. Import its components as SDF to avoid losing agents.');
    for (let i = 0; i < reaction.getReactants(); i++) molecules.push(reaction.getReactant(i));
    reactionBreak = molecules.length;
    for (let i = 0; i < reaction.getProducts(); i++) molecules.push(reaction.getProduct(i));
  } else if (extension === 'sdf') {
    text.split('$$$$').forEach((record, index) => { if (record.trim()) molecules.push(OCL.Molecule.fromMolfile(index ? record.replace(/^\r?\n/, '') : record)); });
  } else if (extension === 'mol') molecules.push(OCL.Molecule.fromMolfile(text));
  else molecules.push(OCL.Molecule.fromSmiles(text.trim()));
  if (!molecules.length || molecules.some(m => !m || !m.getAllAtoms())) throw new Error('No valid structures were found in the file.');
  const atoms = [], bonds = [], arrows = [];
  let cursor = 0;
  for (let i = 0; i < molecules.length; i++) {
    if (i === reactionBreak) { arrows.push({ type: 'forward', x: cursor + 60, y: 0, length: 100, angle: 0 }); cursor += 180; }
    const graph = await smilesToGraph(molecules[i].toSmiles());
    if (!graph.atoms.length) throw new Error(graph.warnings.join(' ') || 'Could not import a structure.');
    const minX = Math.min(...graph.atoms.map(a => a.x)), maxX = Math.max(...graph.atoms.map(a => a.x));
    const base = atoms.length;
    atoms.push(...graph.atoms.map(a => ({ ...a, x: a.x - minX + cursor })));
    bonds.push(...graph.bonds.map(b => ({ ...b, from: b.from + base, to: b.to + base })));
    cursor += maxX - minX + 90;
  }
  atoms.forEach(a => { a.x -= cursor / 2; });
  arrows.forEach(a => { a.x -= cursor / 2; });
  return { atoms, bonds, arrows, warnings: [] };
}

export async function exportChemicalFile(doc, format) {
  const graph = buildMoleculeGraph(doc);
  if (!graph.atoms.length) throw new Error('Draw a structure first.');
  if (doc.newmanInstances?.length) throw new Error('Chemical file export does not support Newman projections. Use SVG or PNG for this drawing.');
  const checkedMolfile = async g => { const result = await graphToMolfile(g); if (result.warnings.length) throw new Error(result.warnings.join(' ')); return result.molfile; };
  if (format === 'mol') return checkedMolfile(graph);
  const components = splitComponents(graph);
  if (format === 'sdf') return (await Promise.all(components.map(async g => (await checkedMolfile(g)) + '\n$$$$\n'))).join('');
  const arrows = doc.arrows.filter(a => !a.doubleHead && (a.type === 'forward' || a.type === 'equilibrium'));
  if (arrows.length !== 1) throw new Error('RXN export needs one reaction arrow separating reactants and products.');
  const arrow = arrows[0], OCL = await loadOCL(), reaction = new OCL.Reaction();
  for (const part of components) {
    const center = part.atoms.reduce((p, a) => ({ x: p.x + a.x / part.atoms.length, y: p.y + a.y / part.atoms.length }), { x: 0, y: 0 });
    const projection = (center.x - arrow.x) * Math.cos(arrow.angle || 0) + (center.y - arrow.y) * Math.sin(arrow.angle || 0);
    const { molecule, warnings } = graphToOCLMolecule(OCL, part);
    if (warnings.length) throw new Error(warnings.join(' '));
    if (projection < 0) reaction.addReactant(molecule); else reaction.addProduct(molecule);
  }
  if (!reaction.getReactants() || !reaction.getProducts()) throw new Error('Place at least one structure on each side of the reaction arrow.');
  return reaction.toRxn();
}
