/**
 * Molecule graph builder
 *
 * Converts the app's *geometric* drawing state (vertices, segments/bonds and
 * the vertexAtoms label map) into a normalized, library-agnostic chemical
 * graph: a list of atoms and a list of bonds referencing atoms by index.
 *
 * This is the "model" layer the roadmap calls for: the canvas coordinates are
 * just one projection of this graph. Keep it free of any React or rendering
 * concerns and free of any specific cheminformatics library so it can be
 * unit-tested and reused (SMILES export, Molfile export, valence checks, ...).
 */

/**
 * Vertices and bond endpoints are matched to atoms using the SAME rounded key
 * the rest of the app uses (see getVertexKey in HexGridWithToolbar.jsx and the
 * vertexAtoms map). Keeping this identical is what lets a bond endpoint find
 * its atom label.
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
export const vertexKey = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`;

/**
 * Build a normalized chemical graph from drawing state.
 *
 * @param {Object} state
 * @param {Array<{x:number,y:number}>} state.vertices - all placed vertices
 * @param {Array<Object>} state.segments - all bonds; bondOrder 0 means a grid
 *        line and is ignored. Real bonds carry bondOrder 1/2/3 and endpoint
 *        coordinates x1,y1,x2,y2.
 * @param {Object<string,{symbol?:string,charge?:number}>} state.vertexAtoms -
 *        map of vertexKey -> atom info. A vertex with no entry is an implicit
 *        carbon.
 * @returns {{
 *   atoms: Array<{key:string, element:string, charge:number, x:number, y:number}>,
 *   bonds: Array<{from:number, to:number, order:number}>,
 *   warnings: string[]
 * }}
 */
export const buildMoleculeGraph = ({ vertices = [], segments = [], vertexAtoms = {} }) => {
  const warnings = [];

  // 1. Collect the set of atom positions from the union of explicit vertices
  //    and every real bond endpoint (defensive: a bond could reference a point
  //    that is missing from the vertices array). keyToIndex maps a rounded
  //    position key to an index into the atoms array.
  const keyToIndex = new Map();
  const atoms = [];

  const ensureAtom = (x, y) => {
    const key = vertexKey(x, y);
    if (keyToIndex.has(key)) return keyToIndex.get(key);
    const info = vertexAtoms[key] || {};
    const rawSymbol = typeof info.symbol === 'string' ? info.symbol.trim() : '';
    const atom = {
      key,
      element: rawSymbol || 'C', // an unlabeled vertex is an implicit carbon
      charge: Number.isFinite(info.charge) ? info.charge : 0,
      x,
      y,
    };
    const index = atoms.length;
    atoms.push(atom);
    keyToIndex.set(key, index);
    return index;
  };

  vertices.forEach((v) => {
    if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) ensureAtom(v.x, v.y);
  });

  // 2. Collect real bonds, mapping endpoints to atom indices. Deduplicate bonds
  //    between the same pair of atoms (keep the highest order seen).
  const bondMap = new Map(); // "a-b" (a<b) -> { from, to, order }
  segments.forEach((seg) => {
    if (!seg || !(seg.bondOrder >= 1)) return; // skip grid lines / non-bonds
    const from = ensureAtom(seg.x1, seg.y1);
    const to = ensureAtom(seg.x2, seg.y2);
    if (from === to) {
      warnings.push('Skipped a bond whose endpoints resolve to the same atom.');
      return;
    }
    const order = seg.bondOrder === 2 ? 2 : seg.bondOrder === 3 ? 3 : 1;
    const pairKey = from < to ? `${from}-${to}` : `${to}-${from}`;
    const existing = bondMap.get(pairKey);
    if (!existing || order > existing.order) {
      bondMap.set(pairKey, { from, to, order });
    }
  });

  const bonds = Array.from(bondMap.values());

  return { atoms, bonds, warnings };
};

/**
 * Split a molecule graph into connected components (distinct molecules on the
 * canvas). Useful for "copy each fragment" or reaction handling later.
 * @param {ReturnType<typeof buildMoleculeGraph>} graph
 * @returns {Array<{atoms:Array, bonds:Array}>} subgraphs with re-indexed bonds
 */
export const splitComponents = (graph) => {
  const { atoms, bonds } = graph;
  const adjacency = atoms.map(() => []);
  bonds.forEach((b, i) => {
    adjacency[b.from].push({ other: b.to, bond: i });
    adjacency[b.to].push({ other: b.from, bond: i });
  });

  const componentOf = new Array(atoms.length).fill(-1);
  const components = [];

  for (let start = 0; start < atoms.length; start++) {
    if (componentOf[start] !== -1) continue;
    const atomIndices = [];
    const stack = [start];
    componentOf[start] = components.length;
    while (stack.length) {
      const a = stack.pop();
      atomIndices.push(a);
      adjacency[a].forEach(({ other }) => {
        if (componentOf[other] === -1) {
          componentOf[other] = components.length;
          stack.push(other);
        }
      });
    }
    components.push(atomIndices);
  }

  return components.map((atomIndices) => {
    const localIndex = new Map();
    const subAtoms = atomIndices.map((globalIdx, localIdx) => {
      localIndex.set(globalIdx, localIdx);
      return atoms[globalIdx];
    });
    const subBonds = bonds
      .filter((b) => localIndex.has(b.from) && localIndex.has(b.to))
      .map((b) => ({ from: localIndex.get(b.from), to: localIndex.get(b.to), order: b.order }));
    return { atoms: subAtoms, bonds: subBonds };
  });
};
