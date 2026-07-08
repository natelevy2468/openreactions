/**
 * Structure export adapter (OpenChemLib)
 *
 * Thin wrapper that turns a normalized molecule graph (see moleculeGraph.js)
 * into interchange formats using OpenChemLib. Isolating the library here means
 * the rest of the app never depends on OCL internals; we could swap in RDKit-JS
 * later by reimplementing just this file.
 */

import { loadOCL } from './ocl.js';

/**
 * Build an OpenChemLib Molecule from a normalized graph.
 * @param {any} OCL - the loaded OpenChemLib module
 * @param {{atoms:Array, bonds:Array}} graph
 * @returns {{ molecule: import('openchemlib').Molecule, warnings: string[] }}
 */
const graphToOCLMolecule = (OCL, graph) => {
  const { atoms, bonds } = graph;
  const warnings = [];
  const unknownLabels = new Set();

  const molecule = new OCL.Molecule(Math.max(atoms.length, 1), Math.max(bonds.length, 1));

  atoms.forEach((atom) => {
    const atomicNo = OCL.Molecule.getAtomicNoFromLabel(atom.element);
    const oclIndex = molecule.addAtom(atomicNo); // atomicNo 0 -> wildcard "*"
    if (!atomicNo) {
      unknownLabels.add(atom.element);
      // Preserve the user's label so it survives round-trips / Molfile output.
      if (typeof molecule.setAtomCustomLabel === 'function') {
        molecule.setAtomCustomLabel(oclIndex, atom.element);
      }
    }
    if (atom.charge) molecule.setAtomCharge(oclIndex, atom.charge);
    // Coordinates help OCL with 2D-dependent perception and future Molfile
    // export. Screen y grows downward; flip it so drawings aren't upside down.
    molecule.setAtomX(oclIndex, atom.x);
    molecule.setAtomY(oclIndex, -atom.y);
  });

  bonds.forEach((bond) => {
    // addBond returns the new bond index; its optional 3rd arg is a bond TYPE
    // flag, not the order, so set the order explicitly.
    const bondIndex = molecule.addBond(bond.from, bond.to);
    molecule.setBondOrder(bondIndex, bond.order);
  });

  if (unknownLabels.size > 0) {
    warnings.push(
      `Unrecognized atom label(s) exported as wildcard "*": ${Array.from(unknownLabels).join(', ')}.`
    );
  }

  return { molecule, warnings };
};

/**
 * Convert a molecule graph to a canonical SMILES string.
 * @param {{atoms:Array, bonds:Array, warnings?:string[]}} graph
 * @returns {Promise<{ smiles:string, warnings:string[] }>}
 */
export const graphToSmiles = async (graph) => {
  const warnings = [...(graph.warnings || [])];
  if (!graph.atoms || graph.atoms.length === 0) {
    return { smiles: '', warnings: [...warnings, 'Nothing to export: no atoms found.'] };
  }
  const OCL = await loadOCL();
  const { molecule, warnings: buildWarnings } = graphToOCLMolecule(OCL, graph);
  warnings.push(...buildWarnings);
  const smiles = molecule.toSmiles();
  return { smiles, warnings };
};

/**
 * Convert a molecule graph to a V2000 Molfile.
 * @param {{atoms:Array, bonds:Array, warnings?:string[]}} graph
 * @returns {Promise<{ molfile:string, warnings:string[] }>}
 */
export const graphToMolfile = async (graph) => {
  const warnings = [...(graph.warnings || [])];
  if (!graph.atoms || graph.atoms.length === 0) {
    return { molfile: '', warnings: [...warnings, 'Nothing to export: no atoms found.'] };
  }
  const OCL = await loadOCL();
  const { molecule, warnings: buildWarnings } = graphToOCLMolecule(OCL, graph);
  warnings.push(...buildWarnings);
  const molfile = molecule.toMolfile();
  return { molfile, warnings };
};
