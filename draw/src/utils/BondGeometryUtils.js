/**
 * Bond Geometry Utilities
 * Mathematical calculations for bond positioning, angles, and spatial relationships
 */

/**
 * Calculates the optimal position for double bond lines
 * @param {Object} bond - The double bond
 * @param {Array} neighborBonds - Neighboring bonds at each vertex
 * @param {Object} ringInfo - Ring information if bond is in a ring
 * @returns {Object} Positioning information for double bond rendering
 */
export const calculateDoubleBondPosition = (bond, neighborBonds, ringInfo = null) => {
  const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  const bondLength = Math.sqrt(Math.pow(bond.x2 - bond.x1, 2) + Math.pow(bond.y2 - bond.y1, 2));
  
  // Standard offset distance between double bond lines
  const offsetDistance = 4;
  
  let offsetDirection;
  
  if (ringInfo && ringInfo.isInRing) {
    // For ring bonds, always offset toward the interior
    offsetDirection = ringInfo.interiorDirection;
  } else {
    // For non-ring bonds, calculate based on neighboring bonds
    offsetDirection = calculateNonRingOffsetDirection(bond, neighborBonds);
  }
  
  return {
    bondAngle,
    bondLength,
    offsetDirection,
    offsetDistance,
    isInRing: ringInfo ? ringInfo.isInRing : false
  };
};

/**
 * Calculates offset direction for non-ring double bonds
 * @param {Object} bond - The double bond
 * @param {Array} neighborBonds - Neighboring bonds
 * @returns {number} Offset direction angle
 */
export const calculateNonRingOffsetDirection = (bond, neighborBonds) => {
  const bondAngle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  
  // Default to perpendicular offset
  let offsetDirection = bondAngle + Math.PI / 2;
  
  if (neighborBonds.length > 0) {
    // Analyze neighbor directions to avoid collisions
    const neighborAngles = neighborBonds.map(neighbor => neighbor.angle);
    
    // Calculate which perpendicular direction is clearer
    const option1 = bondAngle + Math.PI / 2;
    const option2 = bondAngle - Math.PI / 2;
    
    const clearance1 = calculateAngularClearance(option1, neighborAngles);
    const clearance2 = calculateAngularClearance(option2, neighborAngles);
    
    offsetDirection = clearance1 > clearance2 ? option1 : option2;
  }
  
  return offsetDirection;
};

/**
 * Calculates angular clearance from neighboring bonds
 * @param {number} testAngle - Angle to test
 * @param {Array} neighborAngles - Array of neighbor bond angles
 * @returns {number} Minimum angular distance to neighbors
 */
export const calculateAngularClearance = (testAngle, neighborAngles) => {
  if (neighborAngles.length === 0) return Math.PI;
  
  let minClearance = Math.PI;
  
  for (const neighborAngle of neighborAngles) {
    let diff = Math.abs(testAngle - neighborAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    
    if (diff < minClearance) {
      minClearance = diff;
    }
  }
  
  return minClearance;
};

/**
 * Generates parallel lines for double bond rendering
 * @param {Object} bond - Original bond
 * @param {Object} position - Position information from calculateDoubleBondPosition
 * @returns {Object} Two parallel lines for rendering
 */
export const generateParallelLines = (bond, position) => {
  const { offsetDirection, offsetDistance } = position;
  
  // Calculate offset vector
  const offsetX = Math.cos(offsetDirection) * offsetDistance;
  const offsetY = Math.sin(offsetDirection) * offsetDistance;
  
  // Generate two parallel lines
  const line1 = {
    x1: bond.x1 + offsetX,
    y1: bond.y1 + offsetY,
    x2: bond.x2 + offsetX,
    y2: bond.y2 + offsetY
  };
  
  const line2 = {
    x1: bond.x1 - offsetX,
    y1: bond.y1 - offsetY,
    x2: bond.x2 - offsetX,
    y2: bond.y2 - offsetY
  };
  
  return { line1, line2 };
};

/**
 * Checks for potential collisions between double bond lines and other bonds
 * @param {Object} line1 - First parallel line
 * @param {Object} line2 - Second parallel line
 * @param {Array} otherBonds - Other bonds to check against
 * @returns {Object} Collision analysis
 */
export const checkDoubleBondCollisions = (line1, line2, otherBonds) => {
  const collisions = {
    hasCollisions: false,
    collidingBonds: [],
    severity: 'none'
  };
  
  for (const otherBond of otherBonds) {
    if (otherBond.bondOrder <= 0) continue;
    
    // Check if either line intersects with other bonds
    const line1Intersects = doLinesIntersect(line1, otherBond);
    const line2Intersects = doLinesIntersect(line2, otherBond);
    
    if (line1Intersects || line2Intersects) {
      collisions.hasCollisions = true;
      collisions.collidingBonds.push(otherBond);
    }
  }
  
  // Determine severity
  if (collisions.collidingBonds.length > 0) {
    collisions.severity = collisions.collidingBonds.length > 2 ? 'severe' : 'moderate';
  }
  
  return collisions;
};

/**
 * Checks if two line segments intersect
 * @param {Object} line1 - First line segment
 * @param {Object} line2 - Second line segment
 * @returns {boolean} Whether lines intersect
 */
export const doLinesIntersect = (line1, line2) => {
  const { x1: x1, y1: y1, x2: x2, y2: y2 } = line1;
  const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return false; // Parallel lines
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

/**
 * Optimizes double bond positioning to minimize collisions
 * @param {Object} bond - The double bond
 * @param {Object} initialPosition - Initial position calculation
 * @param {Array} allBonds - All other bonds
 * @returns {Object} Optimized position
 */
export const optimizeDoubleBondPosition = (bond, initialPosition, allBonds) => {
  const { line1, line2 } = generateParallelLines(bond, initialPosition);
  const collisions = checkDoubleBondCollisions(line1, line2, allBonds);
  
  if (!collisions.hasCollisions) {
    return initialPosition; // No optimization needed
  }
  
  // Try alternative offset directions if there are collisions
  const bondAngle = initialPosition.bondAngle;
  const alternativeDirections = [
    bondAngle + Math.PI / 2,
    bondAngle - Math.PI / 2,
    bondAngle + Math.PI / 4,
    bondAngle - Math.PI / 4,
    bondAngle + 3 * Math.PI / 4,
    bondAngle - 3 * Math.PI / 4
  ];
  
  let bestPosition = initialPosition;
  let minCollisions = collisions.collidingBonds.length;
  
  for (const direction of alternativeDirections) {
    const testPosition = { ...initialPosition, offsetDirection: direction };
    const testLines = generateParallelLines(bond, testPosition);
    const testCollisions = checkDoubleBondCollisions(testLines.line1, testLines.line2, allBonds);
    
    if (testCollisions.collidingBonds.length < minCollisions) {
      minCollisions = testCollisions.collidingBonds.length;
      bestPosition = testPosition;
      
      if (minCollisions === 0) break; // Found collision-free position
    }
  }
  
  return bestPosition;
};

/**
 * Calculates bond angle relative to a vertex
 * @param {Object} bond - The bond
 * @param {Object} vertex - Reference vertex
 * @returns {number} Angle of bond from vertex perspective
 */
export const calculateBondAngleFromVertex = (bond, vertex) => {
  const tolerance = 0.01;
  
  // Determine which end of the bond connects to the vertex
  const vertexAtStart = (
    Math.abs(bond.x1 - vertex.x) < tolerance && 
    Math.abs(bond.y1 - vertex.y) < tolerance
  );
  
  if (vertexAtStart) {
    return Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  } else {
    return Math.atan2(bond.y1 - bond.y2, bond.x1 - bond.x2);
  }
};
