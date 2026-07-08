/**
 * Vertex merge helpers (pure)
 *
 * When a freshly placed atom lands on top of an existing one, the two vertices
 * merge into one. These pure functions perform the graph surgery — reassigning
 * bonds, removing the degenerate self-loop and any duplicate bond the merge
 * creates, and choosing the surviving atom label — independent of React state so
 * they can be unit-tested. The kept vertex keeps its exact position (Marvin/
 * ChemDraw behavior: the existing structure never shifts).
 */

const near = (a, b) => Math.abs(a - b) < 0.01;

/**
 * Reassign the removed vertex's bonds onto the kept vertex, then drop self-loops
 * and deduplicate bonds between the same pair of atoms (keeping the higher bond
 * order). Grid lines (bondOrder <= 0) pass through untouched.
 *
 * @param {Array} segments
 * @param {{x:number,y:number}} keep
 * @param {{x:number,y:number}} remove
 * @param {(x1:number,y1:number,x2:number,y2:number)=>number} calculateBondDirection
 * @returns {Array} the new segments array
 */
export const reassignAndDedupeBonds = (segments, keep, remove, calculateBondDirection) => {
  const reassigned = segments.map((segment) => {
    const s = { ...segment };
    if (near(s.x1, remove.x) && near(s.y1, remove.y)) { s.x1 = keep.x; s.y1 = keep.y; }
    if (near(s.x2, remove.x) && near(s.y2, remove.y)) { s.x2 = keep.x; s.y2 = keep.y; }
    if (s.x1 !== segment.x1 || s.y1 !== segment.y1 || s.x2 !== segment.x2 || s.y2 !== segment.y2) {
      s.direction = calculateBondDirection(s.x1, s.y1, s.x2, s.y2);
    }
    return s;
  });

  const seen = new Map();
  const result = [];
  for (const s of reassigned) {
    if (!(s.bondOrder > 0)) { result.push(s); continue; } // grid line
    if (near(s.x1, s.x2) && near(s.y1, s.y2)) continue; // self-loop
    const a = `${s.x1.toFixed(2)},${s.y1.toFixed(2)}`;
    const b = `${s.x2.toFixed(2)},${s.y2.toFixed(2)}`;
    const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
    const idx = seen.get(pairKey);
    if (idx === undefined) {
      seen.set(pairKey, result.length);
      result.push(s);
    } else if (s.bondOrder > result[idx].bondOrder) {
      result[idx] = s;
    }
  }
  return result;
};

/**
 * Choose the surviving atom label for a merged vertex: prefer a real element
 * label (non-carbon); if the kept vertex is unlabeled/carbon and the removed one
 * carries a heteroatom, keep the heteroatom.
 * @returns {Object} the new vertexAtoms map
 */
export const mergeAtomLabels = (vertexAtoms, keepKey, removeKey) => {
  const next = { ...vertexAtoms };
  const keepAtom = vertexAtoms[keepKey];
  const removeAtom = vertexAtoms[removeKey];
  const isLabeled = (a) => !!(a && a.symbol && a.symbol !== 'C');
  const merged = (!isLabeled(keepAtom) && isLabeled(removeAtom)) ? removeAtom : (keepAtom || removeAtom);
  delete next[removeKey];
  if (merged) next[keepKey] = merged;
  else delete next[keepKey];
  return next;
};
