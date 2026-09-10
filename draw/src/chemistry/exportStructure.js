/**
 * Structure export adapter (OpenChemLib)
 *
 * Thin wrapper that turns a normalized molecule graph (see moleculeGraph.js)
 * into interchange formats using OpenChemLib. Isolating the library here means
 * the rest of the app never depends on OCL internals; we could swap in RDKit-JS
 * later by reimplementing just this file.
 */

import { loadOCL } from './ocl.js';
import { lookupAbbreviation } from './abbreviations.js';

// Cache of parsed abbreviation fragments (SMILES -> OCL Molecule), so a structure
// with many "Ph"/"OMe" groups only parses each fragment once.
const fragmentCache = new Map();
const getFragment = (OCL, smiles) => {
  if (!fragmentCache.has(smiles)) fragmentCache.set(smiles, OCL.Molecule.fromSmiles(smiles));
  return fragmentCache.get(smiles);
};

/**
 * Build an OpenChemLib Molecule from a normalized graph.
 *
 * Atoms whose label is a recognized superatom abbreviation (Ph, OMe, Boc, …) are
 * expanded into their constituent atoms: the fragment (written at full valence)
 * is merged in and the parent's bonds are attached to fragment atom 0, so OCL
 * drops the right implicit hydrogen and the formula/SMILES come out correct.
 *
 * @param {any} OCL - the loaded OpenChemLib module
 * @param {{atoms:Array, bonds:Array}} graph
 * @returns {{ molecule: import('openchemlib').Molecule, warnings: string[] }}
 */
export const graphToOCLMolecule = (OCL, graph) => {
  const { atoms, bonds } = graph;
  const warnings = [];
  const unknownLabels = new Set();
  const expandedGroups = new Set();

  const molecule = new OCL.Molecule(Math.max(atoms.length, 1), Math.max(bonds.length, 1));

  // For each graph atom, the OCL atom index the parent bonds should attach to
  // (the atom itself, or a fragment's attachment atom when expanded).
  const attachmentIndex = new Array(atoms.length);

  atoms.forEach((atom, i) => {
    const fragmentSmiles = lookupAbbreviation(atom.element);

    if (fragmentSmiles) {
      // Expand the abbreviation: copy every fragment atom/bond into the molecule.
      const frag = getFragment(OCL, fragmentSmiles);
      const map = [];
      for (let a = 0; a < frag.getAllAtoms(); a++) {
        const idx = molecule.addAtom(frag.getAtomicNo(a));
        const fc = frag.getAtomCharge(a);
        if (fc) molecule.setAtomCharge(idx, fc);
        map[a] = idx;
      }
      for (let b = 0; b < frag.getAllBonds(); b++) {
        const bi = molecule.addBond(map[frag.getBondAtom(0, b)], map[frag.getBondAtom(1, b)]);
        molecule.setBondOrder(bi, frag.getBondOrder(b));
      }
      // Atom 0 of the fragment is the attachment point (see abbreviations.js).
      attachmentIndex[i] = map[0];
      // Any charge the user set on the superatom lands on the attachment atom.
      if (atom.charge) molecule.setAtomCharge(map[0], atom.charge);
      expandedGroups.add(atom.element);
      return;
    }

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
    if (atom.isotope) molecule.setAtomMass(oclIndex, atom.isotope);
    if (atom.radical) molecule.setAtomRadical(oclIndex, atom.radical);
    // Coordinates help OCL with 2D-dependent perception and future Molfile
    // export. Screen y grows downward; flip it so drawings aren't upside down.
    molecule.setAtomX(oclIndex, atom.x);
    molecule.setAtomY(oclIndex, -atom.y);
    attachmentIndex[i] = oclIndex;
  });

  bonds.forEach((bond) => {
    // addBond returns the new bond index; its optional 3rd arg is a bond TYPE
    // flag, not the order, so set the order explicitly.
    const bondIndex = molecule.addBond(attachmentIndex[bond.from], attachmentIndex[bond.to]);
    molecule.setBondOrder(bondIndex, bond.order);
    if (bond.bondType === 'wedge') molecule.setBondType(bondIndex, OCL.Molecule.cBondTypeUp);
    if (bond.bondType === 'dash') molecule.setBondType(bondIndex, OCL.Molecule.cBondTypeDown);
    if (bond.bondType === 'ambiguous') {
      molecule.setBondType(bondIndex, bond.order === 2 ? OCL.Molecule.cBondTypeCross : OCL.Molecule.cBondTypeSingle);
      molecule.setAtomConfigurationUnknown(attachmentIndex[bond.from], true);
    }
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
 * Compute molecular formula + weights for a molecule graph.
 * Implicit hydrogens are filled in by OpenChemLib from standard valences, so a
 * skeletal drawing reports the same formula ChemDraw/Marvin would.
 * @param {{atoms:Array, bonds:Array, warnings?:string[]}} graph
 * @returns {Promise<{ formula:string, weight:number, monoisotopic:number,
 *   atomCount:number, ringCount:number, warnings:string[] } | null>}
 */
export const graphToFormula = async (graph) => {
  const warnings = [...(graph.warnings || [])];
  if (!graph.atoms || graph.atoms.length === 0) return null;

  const OCL = await loadOCL();
  const { molecule, warnings: buildWarnings } = graphToOCLMolecule(OCL, graph);
  warnings.push(...buildWarnings);

  const mf = molecule.getMolecularFormula();
  let ringCount = 0;
  try {
    // ensureHelperArrays populates ring membership; getRingSet().getSize() is the
    // count of small rings (SSSR). Guarded because the helper set can be absent.
    molecule.ensureHelperArrays(OCL.Molecule.cHelperRings);
    const rs = molecule.getRingSet && molecule.getRingSet();
    if (rs && typeof rs.getSize === 'function') ringCount = rs.getSize();
  } catch {
    ringCount = 0;
  }

  return {
    formula: mf.formula,
    weight: mf.relativeWeight,
    monoisotopic: mf.absoluteWeight,
    // Post-expansion heavy-atom count (a "Ph" superatom counts as its 6 carbons,
    // not 1 drawn vertex). OCL doesn't add explicit H, so getAllAtoms() == heavy.
    atomCount: molecule.getAllAtoms(),
    ringCount,
    warnings,
  };
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
