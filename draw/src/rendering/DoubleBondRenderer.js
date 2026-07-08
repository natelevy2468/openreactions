/**
 * Double bond rendering
 *
 * Draws a double bond in the style the app uses:
 *  - Ring bonds get a single main line plus a shorter interior line offset
 *    toward the ring center.
 *  - Non-ring bonds where both ends carry other bonds ("single-plus-offset")
 *    get a main line plus a shorter parallel line.
 *  - Otherwise two equal parallel lines are drawn (symmetric double bond).
 *
 * These helpers are pure: everything they need (the detected rings, and a way
 * to count the bonds at a vertex) is passed in, so they hold no component state.
 */

const RING_OFFSET_DISTANCE = 11;
const PARALLEL_OFFSET_DISTANCE = 5;
const SHORTER_LINE_FRACTION = 0.77;

/**
 * Find the detected ring (if any) that contains this bond.
 * @param {Object} bond - {x1,y1,x2,y2}
 * @param {Array} detectedRings - rings with a `bonds` list and `center`
 * @returns {Object|null} the ring, or null
 */
export const findBondRing = (bond, detectedRings) => {
  const tolerance = 0.01;
  for (const ring of detectedRings) {
    if (!ring.bonds) continue;
    const bondExists = ring.bonds.some((rb) => (
      (Math.abs(rb.x1 - bond.x1) < tolerance && Math.abs(rb.y1 - bond.y1) < tolerance &&
       Math.abs(rb.x2 - bond.x2) < tolerance && Math.abs(rb.y2 - bond.y2) < tolerance) ||
      (Math.abs(rb.x1 - bond.x2) < tolerance && Math.abs(rb.y1 - bond.y2) < tolerance &&
       Math.abs(rb.x2 - bond.x1) < tolerance && Math.abs(rb.y2 - bond.y1) < tolerance)
    ));
    if (bondExists) return ring;
  }
  return null;
};

/** Angle from the bond midpoint toward the ring center. */
const ringInteriorDirection = (bond, ring) => {
  if (!ring || !ring.center) return null;
  const midX = (bond.x1 + bond.x2) / 2;
  const midY = (bond.y1 + bond.y2) / 2;
  return Math.atan2(ring.center.y - midY, ring.center.x - midX);
};

/** Shared helper: draw a straight bond line in world coords + offset. */
const strokeLine = (ctx, x1, y1, x2, y2, offset) => {
  ctx.beginPath();
  ctx.moveTo(x1 + offset.x, y1 + offset.y);
  ctx.lineTo(x2 + offset.x, y2 + offset.y);
  ctx.stroke();
};

/** Endpoints of the centered "shorter" second line of a double bond. */
const shorterLineEndpoints = (bond) => {
  const bondLength = Math.hypot(bond.x2 - bond.x1, bond.y2 - bond.y1) || 1;
  const shorter = bondLength * SHORTER_LINE_FRACTION;
  const cx = (bond.x1 + bond.x2) / 2;
  const cy = (bond.y1 + bond.y2) / 2;
  const ux = (bond.x2 - bond.x1) / bondLength;
  const uy = (bond.y2 - bond.y1) / bondLength;
  return {
    sx: cx - (ux * shorter) / 2,
    sy: cy - (uy * shorter) / 2,
    ex: cx + (ux * shorter) / 2,
    ey: cy + (uy * shorter) / 2,
  };
};

/**
 * Render a double bond.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} bond - {x1,y1,x2,y2}
 * @param {Object} offset - canvas pan offset
 * @param {Object} colors - color scheme (uses colors.bonds)
 * @param {Object} deps
 * @param {Array} deps.detectedRings - rings for interior-offset decisions
 * @param {(vertex:{x:number,y:number})=>number} deps.countVertexBonds
 */
export const renderDoubleBondByCase = (ctx, bond, offset, colors, { detectedRings, countVertexBonds }) => {
  ctx.strokeStyle = colors.bonds;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  const ring = findBondRing(bond, detectedRings);

  if (ring) {
    // Ring double bond: main line + interior shorter line toward the ring center.
    const dir = ringInteriorDirection(bond, ring);
    const offX = Math.cos(dir) * RING_OFFSET_DISTANCE;
    const offY = Math.sin(dir) * RING_OFFSET_DISTANCE;
    strokeLine(ctx, bond.x1, bond.y1, bond.x2, bond.y2, offset);
    const { sx, sy, ex, ey } = shorterLineEndpoints(bond);
    strokeLine(ctx, sx + offX, sy + offY, ex + offX, ey + offY, offset);
    return;
  }

  const bothEndsSubstituted =
    countVertexBonds({ x: bond.x1, y: bond.y1 }) > 1 &&
    countVertexBonds({ x: bond.x2, y: bond.y2 }) > 1;

  const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  const perpAngle = bondAngle + Math.PI / 2;

  if (!bothEndsSubstituted) {
    // Symmetric double bond: two equal parallel lines straddling the axis.
    const offX = Math.cos(perpAngle) * PARALLEL_OFFSET_DISTANCE;
    const offY = Math.sin(perpAngle) * PARALLEL_OFFSET_DISTANCE;
    strokeLine(ctx, bond.x1 + offX, bond.y1 + offY, bond.x2 + offX, bond.y2 + offY, offset);
    strokeLine(ctx, bond.x1 - offX, bond.y1 - offY, bond.x2 - offX, bond.y2 - offY, offset);
    return;
  }

  // Substituted double bond: main line + shorter parallel line to one side.
  const offX = Math.cos(perpAngle) * RING_OFFSET_DISTANCE;
  const offY = Math.sin(perpAngle) * RING_OFFSET_DISTANCE;
  strokeLine(ctx, bond.x1, bond.y1, bond.x2, bond.y2, offset);
  const { sx, sy, ex, ey } = shorterLineEndpoints(bond);
  strokeLine(ctx, sx + offX, sy + offY, ex + offX, ey + offY, offset);
};
