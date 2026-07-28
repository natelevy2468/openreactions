/**
 * Superatom / abbreviation groups (ChemDraw/Marvin-style).
 *
 * Each entry maps a label the user can type on an atom (e.g. "Ph", "OMe", "Boc")
 * to a SMILES fragment. Convention: **atom 0 of the fragment SMILES is the
 * attachment point** — the atom that bonds to the rest of the structure. The
 * fragment is written at full valence (e.g. benzene "c1ccccc1"); when the
 * expander bonds the parent to atom 0, OpenChemLib automatically drops one
 * implicit hydrogen, yielding the correct substituent (phenyl, C6H5-).
 *
 * These are used for chemistry only (molecular formula / weight and SMILES
 * export). On the canvas the label is still drawn as the plain abbreviation, the
 * way ChemDraw shows a contracted superatom.
 */

export const ABBREVIATIONS = {
  // Alkyl
  Me: 'C',
  Et: 'CC',
  Pr: 'CCC',
  nPr: 'CCC',
  iPr: 'C(C)C',
  Bu: 'CCCC',
  nBu: 'CCCC',
  iBu: 'CC(C)C',
  sBu: 'C(C)CC',
  tBu: 'C(C)(C)C',
  Pn: 'CCCCC',
  Cy: 'C1CCCCC1', // cyclohexyl
  Vinyl: 'C=C',
  Allyl: 'CC=C',

  // Aryl / aralkyl
  Ph: 'c1ccccc1',
  Bn: 'Cc1ccccc1',
  Tol: 'c1ccc(C)cc1',
  Mes: 'c1c(C)cc(C)cc1C', // mesityl

  // Acyl
  Ac: 'C(C)=O',
  Bz: 'C(=O)c1ccccc1',
  CHO: 'C=O',
  Piv: 'C(=O)C(C)(C)C',
  Boc: 'C(=O)OC(C)(C)C',
  Cbz: 'C(=O)OCc1ccccc1',

  // Sulfonyl
  Ts: 'S(=O)(=O)c1ccc(C)cc1',
  Ms: 'S(C)(=O)=O',
  Tf: 'S(=O)(=O)C(F)(F)F',

  // Oxy
  OH: 'O',
  OMe: 'OC',
  OEt: 'OCC',
  OBn: 'OCc1ccccc1',
  OAc: 'OC(C)=O',
  OtBu: 'OC(C)(C)C',
  OTs: 'OS(=O)(=O)c1ccc(C)cc1',
  OTf: 'OS(=O)(=O)C(F)(F)F',

  // Nitrogen
  NH2: 'N',
  NHMe: 'NC',
  NMe2: 'N(C)C',
  NEt2: 'N(CC)CC',
  NO2: '[N+](=O)[O-]',
  N3: 'N=[N+]=[N-]',
  NHAc: 'NC(C)=O',
  NHBoc: 'NC(=O)OC(C)(C)C',
  NHTs: 'NS(=O)(=O)c1ccc(C)cc1',

  // Carbon-attached functional groups
  CN: 'C#N',
  CF3: 'C(F)(F)F',
  CCl3: 'C(Cl)(Cl)Cl',
  CO2H: 'C(=O)O',
  COOH: 'C(=O)O',
  CO2Me: 'C(=O)OC',
  COOMe: 'C(=O)OC',
  CO2Et: 'C(=O)OCC',
  COOEt: 'C(=O)OCC',

  // Sulfur / silicon
  SO3H: 'S(=O)(=O)O',
  SMe: 'SC',
  SEt: 'SCC',
  TMS: '[Si](C)(C)C',
  TBS: '[Si](C)(C)C(C)(C)C',
  TBDMS: '[Si](C)(C)C(C)(C)C',
};

// Case-insensitive index: lowercased label -> canonical key. Lets a user type
// "ph"/"PH"/"Ph" and still hit "Ph". The first canonical spelling wins on the
// (rare) chance two keys collide when lowercased.
const LOWER_INDEX = {};
for (const key of Object.keys(ABBREVIATIONS)) {
  const lk = key.toLowerCase();
  if (!(lk in LOWER_INDEX)) LOWER_INDEX[lk] = key;
}

/**
 * Resolve a typed label to its canonical abbreviation name (exact match first,
 * then hyphen-stripped as in "i-Pr", then case-insensitive). Returns null if the
 * label is not a known abbreviation.
 * @param {string} label
 * @returns {string|null}
 */
export const canonicalAbbreviation = (label) => {
  if (!label || typeof label !== 'string') return null;
  const raw = label.trim();
  if (!raw) return null;
  if (Object.prototype.hasOwnProperty.call(ABBREVIATIONS, raw)) return raw;
  const dehyphenated = raw.replace(/-/g, '');
  if (Object.prototype.hasOwnProperty.call(ABBREVIATIONS, dehyphenated)) return dehyphenated;
  const lk = dehyphenated.toLowerCase();
  if (lk in LOWER_INDEX) return LOWER_INDEX[lk];
  return null;
};

/**
 * Look up the SMILES fragment for a label (see canonicalAbbreviation for the
 * matching rules). Returns the fragment SMILES or null.
 * @param {string} label
 * @returns {string|null}
 */
export const lookupAbbreviation = (label) => {
  const key = canonicalAbbreviation(label);
  return key ? ABBREVIATIONS[key] : null;
};

/** True if the label is a recognized abbreviation. */
export const isAbbreviation = (label) => canonicalAbbreviation(label) !== null;

/** Sorted list of all abbreviation names (for UI / discoverability). */
export const abbreviationNames = () => Object.keys(ABBREVIATIONS);
