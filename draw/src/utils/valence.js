/**
 * Implicit-hydrogen computation (pure)
 *
 * ChemDraw/Marvin show the implicit hydrogens on a labeled heteroatom — an
 * oxygen with one bond reads "OH", a nitrogen with one bond reads "NH2" — so a
 * structure is chemically complete at a glance. This app already knows how to
 * render an implicit-H subscript; it just never computed the count. These
 * helpers fill that gap from standard valences and the atom's bonding.
 */

// Standard neutral valence for the common main-group elements.
const STANDARD_VALENCE = {
  B: 3,
  C: 4,
  N: 3,
  O: 2,
  P: 3,
  S: 2,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
};

/**
 * How many implicit hydrogens a labeled atom should display.
 *
 * Only bare single-element labels get hydrogens (an already-spelled-out label
 * like "NH2", "OH", "R", or a custom string is left exactly as the user typed
 * it). Skeletal carbons are intentionally excluded — they are unlabeled points
 * and, like ChemDraw, never show "CH2" along a chain.
 *
 * @param {string} symbol - atom label
 * @param {number} charge - formal charge
 * @param {number} bondOrderSum - sum of bond orders at this atom (single=1,…)
 * @returns {number} implicit hydrogen count (>= 0)
 */
export const computeImplicitH = (symbol, charge = 0, bondOrderSum = 0) => {
  if (symbol === 'C') return 0; // don't spell out CH2/CH3 on skeletal-style carbons
  const base = STANDARD_VALENCE[symbol];
  if (base === undefined) return 0; // unknown / multi-character / query labels

  // Charge raises valence for the electronegative main-group elements
  // (ammonium N+ → 4, oxocarbenium O+ → 3) and lowers it the other way
  // (hydroxide O- → 1, amide N- → 2). Carbon is handled above.
  const valence = base + charge;
  const h = valence - bondOrderSum;
  return h > 0 ? h : 0;
};
