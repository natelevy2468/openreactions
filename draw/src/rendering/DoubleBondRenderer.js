/**
 * Double Bond Rendering System
 * Handles complex double bond rendering with ring detection and neighbor analysis
 */

/**
 * Main double bond rendering function
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} bond - Bond segment to render
 * @param {Array} allBonds - All bonds in the molecule
 * @param {Array} vertices - All vertices in the molecule
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {Array} detectedRings - Pre-detected rings for optimization
 * @returns {boolean} Whether the bond was successfully rendered
 */
export const renderDoubleBond = (ctx, bond, allBonds, vertices, offset, colors, detectedRings = []) => {
  if (!ctx || !bond || bond.bondOrder !== 2) return false;

  // Analyze the bond's molecular context
  const bondAnalysis = analyzeBondContext(bond, allBonds, vertices, detectedRings);
  
  // Calculate double bond positioning
  const doubleBondGeometry = calculateDoubleBondGeometry(bond, bondAnalysis);
  
  // Render the double bond
  renderDoubleBondLines(ctx, doubleBondGeometry, offset, colors);
  
  return true;
};

/**
 * Analyzes the molecular context around a bond
 * @param {Object} bond - The bond to analyze
 * @param {Array} allBonds - All bonds in the molecule
 * @param {Array} vertices - All vertices
 * @param {Array} detectedRings - Pre-detected rings
 * @returns {Object} Analysis result with ring info, neighbors, etc.
 */
export const analyzeBondContext = (bond, allBonds, vertices, detectedRings) => {
  const analysis = {
    isInRing: false,
    ringInfo: null,
    startVertexNeighbors: [],
    endVertexNeighbors: [],
    bondDirection: null,
    interiorDirection: null
  };

  // Calculate bond direction
  analysis.bondDirection = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);

  // Find neighboring bonds for both vertices
  analysis.startVertexNeighbors = findNeighboringBonds(
    { x: bond.x1, y: bond.y1 }, 
    allBonds, 
    bond
  );
  
  analysis.endVertexNeighbors = findNeighboringBonds(
    { x: bond.x2, y: bond.y2 }, 
    allBonds, 
    bond
  );

  // Check if bond is part of any detected rings
  for (const ring of detectedRings) {
    if (isBondInRing(bond, ring)) {
      analysis.isInRing = true;
      analysis.ringInfo = ring;
      analysis.interiorDirection = calculateRingInteriorDirection(bond, ring);
      break;
    }
  }

  return analysis;
};

/**
 * Finds all bonds connected to a specific vertex (excluding the current bond)
 * @param {Object} vertex - Vertex to analyze
 * @param {Array} allBonds - All bonds
 * @param {Object} excludeBond - Bond to exclude from results
 * @returns {Array} Array of neighboring bonds
 */
export const findNeighboringBonds = (vertex, allBonds, excludeBond) => {
  const neighbors = [];
  const tolerance = 0.01;

  for (const bond of allBonds) {
    if (bond === excludeBond || bond.bondOrder <= 0) continue;

    // Check if bond connects to this vertex
    const connectsToStart = (
      Math.abs(bond.x1 - vertex.x) < tolerance && 
      Math.abs(bond.y1 - vertex.y) < tolerance
    );
    
    const connectsToEnd = (
      Math.abs(bond.x2 - vertex.x) < tolerance && 
      Math.abs(bond.y2 - vertex.y) < tolerance
    );

    if (connectsToStart || connectsToEnd) {
      neighbors.push({
        bond,
        angle: connectsToStart ? 
          Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1) :
          Math.atan2(bond.y1 - bond.y2, bond.x1 - bond.x2),
        connectsToStart
      });
    }
  }

  return neighbors;
};

/**
 * Checks if a bond is part of a detected ring
 * @param {Object} bond - Bond to check
 * @param {Object} ring - Ring structure
 * @returns {boolean} Whether bond is in the ring
 */
export const isBondInRing = (bond, ring) => {
  if (!ring.bonds) return false;
  
  const tolerance = 0.01;
  
  return ring.bonds.some(ringBond => 
    Math.abs(ringBond.x1 - bond.x1) < tolerance &&
    Math.abs(ringBond.y1 - bond.y1) < tolerance &&
    Math.abs(ringBond.x2 - bond.x2) < tolerance &&
    Math.abs(ringBond.y2 - bond.y2) < tolerance
  );
};

/**
 * Calculates the interior direction for a ring bond
 * @param {Object} bond - The bond in the ring
 * @param {Object} ring - Ring information
 * @returns {number} Angle pointing toward ring interior
 */
export const calculateRingInteriorDirection = (bond, ring) => {
  if (!ring.center) {
    // Calculate ring center if not provided
    ring.center = calculateRingCenter(ring);
  }

  // Calculate direction from bond midpoint to ring center
  const bondMidX = (bond.x1 + bond.x2) / 2;
  const bondMidY = (bond.y1 + bond.y2) / 2;
  
  return Math.atan2(
    ring.center.y - bondMidY,
    ring.center.x - bondMidX
  );
};

/**
 * Calculates the center point of a ring
 * @param {Object} ring - Ring structure with vertices
 * @returns {Object} Center point {x, y}
 */
export const calculateRingCenter = (ring) => {
  if (!ring.vertices || ring.vertices.length === 0) {
    return { x: 0, y: 0 };
  }

  const sumX = ring.vertices.reduce((sum, vertex) => sum + vertex.x, 0);
  const sumY = ring.vertices.reduce((sum, vertex) => sum + vertex.y, 0);
  
  return {
    x: sumX / ring.vertices.length,
    y: sumY / ring.vertices.length
  };
};

/**
 * Calculates double bond geometry based on context analysis
 * @param {Object} bond - The double bond
 * @param {Object} analysis - Bond context analysis
 * @returns {Object} Geometry for rendering double bond lines
 */
export const calculateDoubleBondGeometry = (bond, analysis) => {
  const bondLength = Math.sqrt(
    Math.pow(bond.x2 - bond.x1, 2) + 
    Math.pow(bond.y2 - bond.y1, 2)
  );

  // Standard offset distance for double bond lines
  const offsetDistance = 4; // pixels

  let offsetDirection;

  if (analysis.isInRing) {
    // For ring bonds, offset toward the interior
    offsetDirection = analysis.interiorDirection;
  } else {
    // For non-ring bonds, calculate offset based on neighboring bonds
    offsetDirection = calculateOptimalOffsetDirection(bond, analysis);
  }

  // Calculate perpendicular offset vector
  const offsetX = Math.cos(offsetDirection) * offsetDistance;
  const offsetY = Math.sin(offsetDirection) * offsetDistance;

  // Create two parallel lines
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

  return {
    line1,
    line2,
    offsetDirection,
    bondLength,
    isInRing: analysis.isInRing
  };
};

/**
 * Calculates optimal offset direction for non-ring double bonds
 * @param {Object} bond - The double bond
 * @param {Object} analysis - Bond context analysis
 * @returns {number} Angle for offset direction
 */
export const calculateOptimalOffsetDirection = (bond, analysis) => {
  const bondAngle = analysis.bondDirection;
  
  // Default to perpendicular offset (90° from bond direction)
  let offsetAngle = bondAngle + Math.PI / 2;

  // Analyze neighboring bonds to avoid collisions
  const allNeighbors = [...analysis.startVertexNeighbors, ...analysis.endVertexNeighbors];
  
  if (allNeighbors.length > 0) {
    // Calculate average direction of neighboring bonds
    let avgNeighborX = 0;
    let avgNeighborY = 0;
    
    for (const neighbor of allNeighbors) {
      avgNeighborX += Math.cos(neighbor.angle);
      avgNeighborY += Math.sin(neighbor.angle);
    }
    
    const avgNeighborAngle = Math.atan2(avgNeighborY, avgNeighborX);
    
    // Choose offset direction away from neighbors
    const option1 = bondAngle + Math.PI / 2;
    const option2 = bondAngle - Math.PI / 2;
    
    // Calculate which option is further from neighbors
    const diff1 = Math.abs(normalizeAngleDifference(option1 - avgNeighborAngle));
    const diff2 = Math.abs(normalizeAngleDifference(option2 - avgNeighborAngle));
    
    offsetAngle = diff1 > diff2 ? option1 : option2;
  }

  return offsetAngle;
};

/**
 * Normalizes angle difference to [-π, π] range
 * @param {number} angleDiff - Angle difference
 * @returns {number} Normalized difference
 */
export const normalizeAngleDifference = (angleDiff) => {
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  return angleDiff;
};

/**
 * Renders the actual double bond lines on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} geometry - Double bond geometry
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderDoubleBondLines = (ctx, geometry, offset, colors) => {
  ctx.strokeStyle = colors.bonds;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  // Draw first line
  ctx.beginPath();
  ctx.moveTo(geometry.line1.x1 + offset.x, geometry.line1.y1 + offset.y);
  ctx.lineTo(geometry.line1.x2 + offset.x, geometry.line1.y2 + offset.y);
  ctx.stroke();

  // Draw second line
  ctx.beginPath();
  ctx.moveTo(geometry.line2.x1 + offset.x, geometry.line2.y1 + offset.y);
  ctx.lineTo(geometry.line2.x2 + offset.x, geometry.line2.y2 + offset.y);
  ctx.stroke();
};

/**
 * Updates double bond rendering when molecular structure changes
 * @param {Array} allBonds - All bonds in the molecule
 * @param {Array} vertices - All vertices
 * @param {Array} detectedRings - Current ring detection results
 * @returns {Array} Array of bonds that need re-rendering
 */
export const updateDoubleBondRendering = (allBonds, vertices, detectedRings) => {
  const bondsToUpdate = [];

  // Find all double bonds
  const doubleBonds = allBonds.filter(bond => bond.bondOrder === 2);

  for (const doubleBond of doubleBonds) {
    // Check if this double bond's context has changed
    const needsUpdate = checkIfDoubleBondNeedsUpdate(doubleBond, allBonds, detectedRings);
    
    if (needsUpdate) {
      bondsToUpdate.push(doubleBond);
    }
  }

  return bondsToUpdate;
};

/**
 * Checks if a double bond needs re-rendering due to context changes
 * @param {Object} doubleBond - The double bond to check
 * @param {Array} allBonds - All bonds
 * @param {Array} detectedRings - Current rings
 * @returns {boolean} Whether bond needs update
 */
export const checkIfDoubleBondNeedsUpdate = (doubleBond, allBonds, detectedRings) => {
  // Always update if ring status might have changed
  // This is a simplified check - could be optimized with caching
  return true;
};

/**
 * Batch render all double bonds in a molecule
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} doubleBonds - Array of double bonds
 * @param {Array} allBonds - All bonds
 * @param {Array} vertices - All vertices
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {Array} detectedRings - Pre-detected rings
 */
export const renderAllDoubleBonds = (ctx, doubleBonds, allBonds, vertices, offset, colors, detectedRings) => {
  for (const bond of doubleBonds) {
    renderDoubleBond(ctx, bond, allBonds, vertices, offset, colors, detectedRings);
  }
};

/**
 * Creates a double bond from a single bond
 * @param {Object} singleBond - Existing single bond
 * @returns {Object} New double bond object
 */
export const createDoubleBondFromSingle = (singleBond) => {
  return {
    ...singleBond,
    bondOrder: 2,
    createdAt: Date.now(),
    needsGeometryUpdate: true
  };
};

/**
 * Validates double bond placement in molecular context
 * @param {Object} bond - Proposed double bond
 * @param {Array} allBonds - All existing bonds
 * @param {Array} vertices - All vertices
 * @returns {Object} Validation result with warnings/errors
 */
export const validateDoubleBondPlacement = (bond, allBonds, vertices) => {
  const validation = {
    isValid: true,
    warnings: [],
    errors: []
  };

  // Check for chemical validity
  const startVertex = vertices.find(v => 
    Math.abs(v.x - bond.x1) < 0.01 && Math.abs(v.y - bond.y1) < 0.01
  );
  
  const endVertex = vertices.find(v => 
    Math.abs(v.x - bond.x2) < 0.01 && Math.abs(v.y - bond.y2) < 0.01
  );

  if (startVertex && endVertex) {
    // Count total bond orders for each vertex
    const startVertexBondCount = countVertexBondOrders(startVertex, allBonds);
    const endVertexBondCount = countVertexBondOrders(endVertex, allBonds);

    // Check for oversaturation (typical carbon limit is 4)
    if (startVertexBondCount > 4) {
      validation.warnings.push('Start vertex may be oversaturated');
    }
    if (endVertexBondCount > 4) {
      validation.warnings.push('End vertex may be oversaturated');
    }
  }

  return validation;
};

/**
 * Counts total bond orders for a vertex
 * @param {Object} vertex - Vertex to analyze
 * @param {Array} allBonds - All bonds
 * @returns {number} Total bond order count
 */
export const countVertexBondOrders = (vertex, allBonds) => {
  let totalBondOrders = 0;
  const tolerance = 0.01;

  for (const bond of allBonds) {
    if (bond.bondOrder <= 0) continue;

    const connectsToVertex = (
      (Math.abs(bond.x1 - vertex.x) < tolerance && Math.abs(bond.y1 - vertex.y) < tolerance) ||
      (Math.abs(bond.x2 - vertex.x) < tolerance && Math.abs(bond.y2 - vertex.y) < tolerance)
    );

    if (connectsToVertex) {
      totalBondOrders += bond.bondOrder;
    }
  }

  return totalBondOrders;
};
