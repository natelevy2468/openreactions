/**
 * Structure import adapter (OpenChemLib)
 *
 * Parses a SMILES string into a normalized molecule graph with 2D coordinates,
 * ready to be placed on the canvas. Coordinates are scaled to the app's bond
 * length and converted to screen orientation (y grows downward), centered on
 * the origin so the caller can translate the fragment to wherever it wants.
 *
 * Kept library-specific so the rest of the app depends only on the plain graph
 * shape (mirrors exportStructure.js).
 */

import { loadOCL } from './ocl.js';

/**
 * Parse SMILES into a placeable graph.
 *
 * @param {string} smiles
 * @param {Object} [options]
 * @param {number} [options.bondLength=60] - target bond length in world units
 * @returns {Promise<{
 *   atoms: Array<{element:string, charge:number, x:number, y:number}>,
 *   bonds: Array<{from:number, to:number, order:number}>,
 *   warnings: string[]
 * }>}
 */
export const smilesToGraph = async (smiles, { bondLength = 60 } = {}) => {
  const trimmed = (smiles || '').trim();
  if (!trimmed) {
    return { atoms: [], bonds: [], warnings: ['Enter a SMILES string to import.'] };
  }

  const OCL = await loadOCL();

  let mol;
  try {
    mol = OCL.Molecule.fromSmiles(trimmed);
  } catch (e) {
    return { atoms: [], bonds: [], warnings: [`Could not parse SMILES: ${e.message || e}`] };
  }
  if (!mol || mol.getAllAtoms() === 0) {
    return { atoms: [], bonds: [], warnings: ['That SMILES parsed to an empty structure.'] };
  }

  // Generate 2D coordinates for the parsed molecule.
  mol.inventCoordinates();

  const atomCount = mol.getAllAtoms();
  const bondCount = mol.getAllBonds();

  // Determine the scale factor from OCL's arbitrary units to our bond length.
  let bondSum = 0;
  let bondN = 0;
  for (let b = 0; b < bondCount; b++) {
    const a1 = mol.getBondAtom(0, b);
    const a2 = mol.getBondAtom(1, b);
    const dx = mol.getAtomX(a1) - mol.getAtomX(a2);
    const dy = mol.getAtomY(a1) - mol.getAtomY(a2);
    bondSum += Math.hypot(dx, dy);
    bondN += 1;
  }
  const avgBond = bondN > 0 ? bondSum / bondN : 1;
  const scale = bondLength / (avgBond || 1);

  // Center the fragment on the origin (using the centroid).
  let sumX = 0;
  let sumY = 0;
  for (let a = 0; a < atomCount; a++) {
    sumX += mol.getAtomX(a);
    sumY += mol.getAtomY(a);
  }
  const centroidX = sumX / atomCount;
  const centroidY = sumY / atomCount;

  const atoms = [];
  for (let a = 0; a < atomCount; a++) {
    atoms.push({
      element: mol.getAtomLabel(a),
      charge: mol.getAtomCharge(a),
      x: (mol.getAtomX(a) - centroidX) * scale,
      // Flip Y: OCL y points up, the canvas y points down.
      y: -(mol.getAtomY(a) - centroidY) * scale,
    });
  }

  const bonds = [];
  for (let b = 0; b < bondCount; b++) {
    const order = mol.getBondOrder(b);
    bonds.push({
      from: mol.getBondAtom(0, b),
      to: mol.getBondAtom(1, b),
      order: order >= 1 && order <= 3 ? order : 1,
    });
  }

  return { atoms, bonds, warnings: [] };
};
