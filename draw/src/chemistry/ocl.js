/**
 * Shared OpenChemLib loader.
 *
 * OpenChemLib is ~1.4MB, so we load it lazily on first use and cache the
 * promise. Students who only draw never download it; it arrives the first time
 * they import or export a structure.
 */

let oclPromise = null;

/**
 * @returns {Promise<any>} the OpenChemLib module (default export)
 */
export const loadOCL = () => {
  if (!oclPromise) oclPromise = import('openchemlib').then((m) => m.default || m);
  return oclPromise;
};
