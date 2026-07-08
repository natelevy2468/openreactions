/**
 * Snapping Utilities for Preset Placement
 * 
 * Handles snapping presets (like benzene) to existing molecular structures
 * for accurate alignment and attachment.
 */

/**
 * Finds the nearest vertex to snap to
 * @param {Object} mousePos - Mouse position {x, y} in world coordinates
 * @param {Array} vertices - All existing vertices
 * @param {number} snapThreshold - Distance threshold for snapping
 * @returns {Object|null} Nearest vertex or null
 */
export const findNearestSnapVertex = (mousePos, vertices, snapThreshold = 80) => {
  let nearestVertex = null;
  let minDistance = snapThreshold;
  
  vertices.forEach(vertex => {
    const distance = Math.sqrt(
      Math.pow(vertex.x - mousePos.x, 2) + 
      Math.pow(vertex.y - mousePos.y, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestVertex = vertex;
    }
  });
  
  return nearestVertex;
};

/**
 * Finds the nearest bond to snap to
 * @param {Object} mousePos - Mouse position {x, y} in world coordinates
 * @param {Array} segments - All existing bonds
 * @param {number} snapThreshold - Distance threshold for snapping
 * @returns {Object|null} Nearest bond with snap info or null
 */
export const findNearestSnapBond = (mousePos, segments, snapThreshold = 80) => {
  let nearestBond = null;
  let minDistance = snapThreshold;
  let closestPoint = null;
  
  segments.forEach(segment => {
    if (segment.bondOrder <= 0) return; // Skip grid lines
    
    // Calculate closest point on bond to mouse position
    const A = mousePos.x - segment.x1;
    const B = mousePos.y - segment.y1;
    const C = segment.x2 - segment.x1;
    const D = segment.y2 - segment.y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return; // Zero-length bond
    
    let param = dot / lenSq;
    if (param < 0) param = 0;
    else if (param > 1) param = 1;
    
    const closestX = segment.x1 + param * C;
    const closestY = segment.y1 + param * D;
    
    const distance = Math.sqrt(
      Math.pow(closestX - mousePos.x, 2) + 
      Math.pow(closestY - mousePos.y, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestBond = segment;
      closestPoint = { x: closestX, y: closestY, param };
    }
  });
  
  return nearestBond ? { 
    bond: nearestBond, 
    snapPoint: closestPoint, 
    distance: minDistance,
    mousePos: mousePos // Include original mouse position
  } : null;
};

/**
 * Calculates snap position for benzene preset
 * @param {Object} mousePos - Mouse position {x, y} in world coordinates
 * @param {Array} vertices - All existing vertices
 * @param {Array} segments - All existing bonds
 * @param {number} benzeneRadius - Radius of benzene ring
 * @returns {Object|null} Snap info or null if no snap
 */
export const calculateBenzeneSnap = (mousePos, vertices, segments, benzeneRadius) => {
  return calculateRingSnap(mousePos, vertices, segments, benzeneRadius, 6);
};

/**
 * Generalized snap calculation for any regular polygon ring
 * @param {Object} mousePos - Mouse position
 * @param {Array} vertices - All vertices
 * @param {Array} segments - All bonds
 * @param {number} ringRadius - Circumradius of the ring
 * @param {number} numSides - Number of sides (3, 4, 5, 6)
 * @returns {Object|null} Snap info or null
 */
export const calculateRingSnap = (mousePos, vertices, segments, ringRadius, numSides) => {
  const bondSnapThreshold = 80;
  const vertexSnapThreshold = 100; // Larger threshold for vertices
  
  // First priority: snap to bonds (more common)
  const nearestBondInfo = findNearestSnapBond(mousePos, segments, bondSnapThreshold);
  if (nearestBondInfo) {
    return calculateRingBondSnap(nearestBondInfo, ringRadius, numSides);
  }
  
  // Second priority: snap to vertices (only if no bond nearby, with larger tolerance)
  const nearestVertex = findNearestSnapVertex(mousePos, vertices, vertexSnapThreshold);
  if (nearestVertex) {
    return calculateRingVertexSnap(nearestVertex, mousePos, ringRadius, numSides);
  }
  
  return null;
};

/**
 * Generalized vertex snap for any ring size
 * @param {Object} targetVertex - Vertex to snap to
 * @param {Object} mousePos - Mouse position
 * @param {number} ringRadius - Ring circumradius
 * @param {number} numSides - Number of sides
 * @returns {Object} Snap info
 */
export const calculateRingVertexSnap = (targetVertex, mousePos, ringRadius, numSides) => {
  let bestCenter = null;
  let bestDistance = Infinity;
  
  // Try all possible orientations
  for (let i = 0; i < numSides; i++) {
    const angle = (numSides === 6 ? Math.PI / 6 : (numSides === 5 || numSides === 3 ? -Math.PI / 2 : Math.PI / 4)) + 
                  (i * 2 * Math.PI / numSides);
    
    const centerX = targetVertex.x - Math.cos(angle) * ringRadius;
    const centerY = targetVertex.y - Math.sin(angle) * ringRadius;
    
    const distance = Math.sqrt(
      Math.pow(centerX - mousePos.x, 2) + 
      Math.pow(centerY - mousePos.y, 2)
    );
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCenter = { x: centerX, y: centerY };
    }
  }
  
  return {
    center: bestCenter,
    type: 'vertex',
    target: targetVertex
  };
};

/**
 * Generalized bond snap for any ring size with rotation
 * @param {Object} bondSnapInfo - Bond snap info
 * @param {number} ringRadius - Ring circumradius  
 * @param {number} numSides - Number of sides
 * @returns {Object} Snap info with rotation
 */
export const calculateRingBondSnap = (bondSnapInfo, ringRadius, numSides) => {
  const bond = bondSnapInfo.bond;
  const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  const bondMidX = (bond.x1 + bond.x2) / 2;
  const bondMidY = (bond.y1 + bond.y2) / 2;
  const perpAngle = bondAngle + Math.PI / 2;
  
  // Calculate perpendicular distance from ring center to edge (apothem)
  const edgeDistance = ringRadius * Math.cos(Math.PI / numSides);
  
  // Get actual mouse position from bondSnapInfo
  // Use the original mouse position that initiated the snap check
  const mousePos = bondSnapInfo.mousePos || bondSnapInfo.snapPoint;
  
  // Vector from bond midpoint to mouse
  const toMouseX = mousePos.x - bondMidX;
  const toMouseY = mousePos.y - bondMidY;
  
  // Cross product to determine side (dot with perpendicular)
  const side = toMouseX * Math.cos(perpAngle) + toMouseY * Math.sin(perpAngle);
  
  // Position ring center on the same side as the mouse
  const centerX = bondMidX + Math.cos(perpAngle) * edgeDistance * (side > 0 ? 1 : -1);
  const centerY = bondMidY + Math.sin(perpAngle) * edgeDistance * (side > 0 ? 1 : -1);
  
  // Calculate rotation to align one ring edge with the target bond
  // The ring is positioned perpendicular to the bond at distance = apothem
  // We need ONE EDGE to be parallel and aligned with the bond
  
  // Strategy: Position ring so that the edge facing the bond is parallel to it
  // The "facing" edge is the one whose midpoint radial points toward the bond
  
  // Get the default starting angle for this ring type
  let baseVertexAngle;
  if (numSides === 6) {
    baseVertexAngle = Math.PI / 6; // 30°
  } else if (numSides === 5 || numSides === 3) {
    baseVertexAngle = -Math.PI / 2; // -90° (top)
  } else if (numSides === 4) {
    baseVertexAngle = Math.PI / 4; // 45°
  }
  
  // For an edge to face the bond and be parallel to it:
  // - Edge midpoint radial should point toward bond (perpendicular to bond)
  // - Edge itself should be parallel to bond
  
  // Edge is perpendicular to its midpoint radial
  // If radial = towardBondAngle, then edge = towardBondAngle + π/2
  // We want edge = bondAngle
  // So: towardBondAngle + π/2 = bondAngle
  // Therefore: towardBondAngle = bondAngle - π/2
  
  // But towardBondAngle is perpAngle ± π depending on side
  // We already know perpAngle = bondAngle + π/2
  // So towardBondAngle = perpAngle + π = bondAngle + π/2 + π = bondAngle - π/2 (mod 2π)
  
  // Edge midpoints in default orientation are at: base + π/n, base + 3π/n, base + 5π/n, ...
  // We want one of these to equal: bondAngle - π/2 (or bondAngle + π/2 depending on side)
  
  const targetEdgeMidpointRadial = side > 0 ? perpAngle : (perpAngle + Math.PI);
  const firstEdgeMidpointRadial = baseVertexAngle + (Math.PI / numSides);
  
  let rotationOffset = targetEdgeMidpointRadial - firstEdgeMidpointRadial;
  
  // Manual corrections for pentagon and triangle
  if (numSides === 5) {
    rotationOffset += 36 * (Math.PI / 180); // Add 72 degrees for pentagon
  } else if (numSides === 3) {
    rotationOffset += 60 * (Math.PI / 180); // Add 60 degrees for triangle
  }
  
  return {
    center: { x: centerX, y: centerY },
    type: 'bond',
    target: bond,
    snapPoint: bondSnapInfo.snapPoint,
    rotation: rotationOffset,
    isStable: true // Mark as stable to reduce jitter
  };
};
