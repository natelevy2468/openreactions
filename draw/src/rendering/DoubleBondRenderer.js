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
  // Prefer a conjugated six-membered ring over a newly fused smaller ring.
  const ranked = [...detectedRings].sort((a, b) => {
    const priority = r => r.bonds?.length === 6 && r.bonds.filter(bond => bond.bondOrder === 2).length >= 3 ? 0 : 1;
    return priority(a) - priority(b) || (a.bonds?.length || 0) - (b.bonds?.length || 0);
  });
  for (const ring of ranked) {
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

// Join each offset rail to the branch on its side at an unlabeled junction.
export function joinDoubleRail(point, endpoint, other, segments) {
  const dx=other.x-endpoint.x,dy=other.y-endpoint.y,length=Math.hypot(dx,dy);
  const ux=dx/length,uy=dy/length;
  let best=null;
  for(const b of segments){
    if(b.bondOrder!==1)continue;
    let far;
    if(Math.hypot(b.x1-endpoint.x,b.y1-endpoint.y)<.01)far={x:b.x2,y:b.y2};
    else if(Math.hypot(b.x2-endpoint.x,b.y2-endpoint.y)<.01)far={x:b.x1,y:b.y1};
    else continue;
    const vx=far.x-endpoint.x,vy=far.y-endpoint.y,den=ux*vy-uy*vx;
    if(Math.abs(den)<1e-6)continue;
    const rx=endpoint.x-point.x,ry=endpoint.y-point.y;
    const t=(rx*vy-ry*vx)/den,u=(rx*uy-ry*ux)/den;
    if(u<0 || u>1 || Math.abs(t)>Math.min(15,length*.3))continue;
    if(!best || Math.abs(t)<best.distance)best={x:point.x+t*ux,y:point.y+t*uy,distance:Math.abs(t)};
  }
  return best || point;
}

/**
 * Render a double bond.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} bond - {x1,y1,x2,y2} coordinates to actually draw (may be trimmed
 *   back from a labeled atom so the line stops before the letters)
 * @param {Object} offset - canvas pan offset
 * @param {Object} colors - color scheme (uses colors.bonds)
 * @param {Object} deps
 * @param {Array} deps.detectedRings - rings for interior-offset decisions
 * @param {(vertex:{x:number,y:number})=>number} deps.countVertexBonds
 * @param {Object} [deps.geomBond] - the ORIGINAL, untrimmed bond endpoints used for
 *   all topology decisions (ring membership, interior direction, substitution
 *   counts). Defaults to `bond`. This matters when `bond` was clipped to clear an
 *   atom label: the clipped coordinates no longer match the ring's stored bond
 *   endpoints, so ring detection must run against the untrimmed geometry — otherwise
 *   a ring double bond next to a heteroatom (e.g. the O in a pyran) wrongly falls
 *   back to the symmetric two-equal-lines style.
 */
export const renderDoubleBondByCase = (ctx, bond, offset, colors, { detectedRings, countVertexBonds, geomBond, segments = [] }) => {
  ctx.strokeStyle = colors.bonds;
  ctx.lineWidth = 3;
  ctx.lineCap = bond.clipped ? 'butt' : 'round';

  const topo = geomBond || bond;
  const ring = findBondRing(topo, detectedRings);

  if (ring) {
    // Ring double bond: main line + interior shorter line toward the ring center.
    // Direction comes from the untrimmed geometry; the lines are drawn on the
    // (possibly trimmed) visible bond so they stop cleanly at any atom label.
    const dir = ringInteriorDirection(topo, ring);
    const offX = Math.cos(dir) * RING_OFFSET_DISTANCE;
    const offY = Math.sin(dir) * RING_OFFSET_DISTANCE;
    strokeLine(ctx, bond.x1, bond.y1, bond.x2, bond.y2, offset);
    const { sx, sy, ex, ey } = shorterLineEndpoints(bond);
    strokeLine(ctx, sx + offX, sy + offY, ex + offX, ey + offY, offset);
    return;
  }

  const bothEndsSubstituted =
    countVertexBonds({ x: topo.x1, y: topo.y1 }) > 1 &&
    countVertexBonds({ x: topo.x2, y: topo.y2 }) > 1;

  const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  const perpAngle = bondAngle + Math.PI / 2;

  if (!bothEndsSubstituted) {
    // Symmetric double bond: two equal parallel lines straddling the axis.
    const offX = Math.cos(perpAngle) * PARALLEL_OFFSET_DISTANCE;
    const offY = Math.sin(perpAngle) * PARALLEL_OFFSET_DISTANCE;
    for (const side of [-1,1]) {
      let start={x:bond.x1+side*offX,y:bond.y1+side*offY};
      let end={x:bond.x2+side*offX,y:bond.y2+side*offY};
      if(Math.hypot(bond.x1-topo.x1,bond.y1-topo.y1)<.01)
        start=joinDoubleRail(start,{x:topo.x1,y:topo.y1},{x:topo.x2,y:topo.y2},segments);
      if(Math.hypot(bond.x2-topo.x2,bond.y2-topo.y2)<.01)
        end=joinDoubleRail(end,{x:topo.x2,y:topo.y2},{x:topo.x1,y:topo.y1},segments);
      strokeLine(ctx,start.x,start.y,end.x,end.y,offset);
    }
    return;
  }

  // Substituted double bond: main line + shorter parallel line to one side.
  const offX = Math.cos(perpAngle) * RING_OFFSET_DISTANCE;
  const offY = Math.sin(perpAngle) * RING_OFFSET_DISTANCE;
  strokeLine(ctx, bond.x1, bond.y1, bond.x2, bond.y2, offset);
  const { sx, sy, ex, ey } = shorterLineEndpoints(bond);
  strokeLine(ctx, sx + offX, sy + offY, ex + offX, ey + offY, offset);
};
