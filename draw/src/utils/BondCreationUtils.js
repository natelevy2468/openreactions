/**
 * Enhanced Bond and Vertex Creation Utilities
 * Provides improved single bond creation with smart vertex placement and chemical validation
 */

/**
 * Creates a new single bond between two points with proper vertex management
 * @param {Object} startPoint - Starting point {x, y}
 * @param {Object} endPoint - Ending point {x, y}
 * @param {Array} existingVertices - Current vertices array
 * @param {Array} existingSegments - Current segments array
 * @param {number} hexRadius - Standard bond length
 * @param {Function} findClosestGridVertex - Grid vertex finder function
 * @returns {Object} Result containing new vertices, segments, and validation info
 */
export const createEnhancedSingleBond = (
  startPoint, 
  endPoint, 
  existingVertices, 
  existingSegments, 
  hexRadius,
  findClosestGridVertex
) => {
  const result = {
    newVertices: [],
    newSegments: [],
    warnings: [],
    success: true
  };

  // 1. Validate bond length
  const bondLength = Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) + 
    Math.pow(endPoint.y - startPoint.y, 2)
  );
  
  if (bondLength < hexRadius * 0.3) {
    result.warnings.push('Bond too short - minimum length is 30% of standard bond');
  }
  
  if (bondLength > hexRadius * 3) {
    result.warnings.push('Bond very long - consider breaking into multiple bonds');
  }

  // 2. Check for existing vertices at start and end points
  const startVertex = findExistingVertex(startPoint, existingVertices);
  const endVertex = findExistingVertex(endPoint, existingVertices);

  // 3. Create vertices if they don't exist
  if (!startVertex) {
    const newStartVertex = createOptimalVertex(startPoint, existingVertices, findClosestGridVertex);
    result.newVertices.push(newStartVertex);
  }

  if (!endVertex) {
    const newEndVertex = createOptimalVertex(endPoint, existingVertices, findClosestGridVertex);
    result.newVertices.push(newEndVertex);
  }

  // 4. Validate chemical bonding rules
  const startVertexFinal = startVertex || result.newVertices[result.newVertices.length - (endVertex ? 1 : 2)];
  const endVertexFinal = endVertex || result.newVertices[result.newVertices.length - 1];

  const startConnections = getVertexConnections(startVertexFinal, existingSegments);
  const endConnections = getVertexConnections(endVertexFinal, existingSegments);

  // Check for oversaturation (typically max 4 bonds per carbon)
  if (startConnections.length >= 4) {
    result.warnings.push('Start vertex already has 4 bonds - may be oversaturated');
  }
  if (endConnections.length >= 4) {
    result.warnings.push('End vertex already has 4 bonds - may be oversaturated');
  }

  // 5. Check for duplicate bonds
  const duplicateBond = findDuplicateBond(startVertexFinal, endVertexFinal, existingSegments);
  if (duplicateBond) {
    result.warnings.push('Bond already exists between these vertices');
    result.success = false;
    return result;
  }

  // 6. Create the bond
  const direction = calculateBondDirection(startVertexFinal.x, startVertexFinal.y, endVertexFinal.x, endVertexFinal.y);
  
  const newBond = {
    x1: startVertexFinal.x,
    y1: startVertexFinal.y,
    x2: endVertexFinal.x,
    y2: endVertexFinal.y,
    bondOrder: 1, // Single bond
    bondType: null,
    bondDirection: 1,
    direction: direction,
    flipSmallerLine: false,
    createdAt: Date.now() // For debugging/tracking
  };

  result.newSegments.push(newBond);

  // 7. Check for potential ring formation
  const wouldFormRing = checkRingFormation(startVertexFinal, endVertexFinal, existingSegments);
  if (wouldFormRing) {
    result.warnings.push('This bond will complete a ring structure');
  }

  return result;
};

/**
 * Creates an optimal vertex at the given position, preferring grid alignment when possible
 * @param {Object} point - Position {x, y}
 * @param {Array} existingVertices - Current vertices
 * @param {Function} findClosestGridVertex - Grid vertex finder
 * @returns {Object} New vertex object
 */
export const createOptimalVertex = (point, existingVertices, findClosestGridVertex) => {
  const gridTolerance = 15; // Distance tolerance for grid snapping
  const closestGrid = findClosestGridVertex(point.x, point.y, gridTolerance);
  
  if (closestGrid && closestGrid.distance <= gridTolerance) {
    // Snap to grid if close enough
    return {
      x: closestGrid.vertex.x,
      y: closestGrid.vertex.y,
      isOffGrid: false,
      snappedToGrid: true
    };
  } else {
    // Create off-grid vertex
    return {
      x: point.x,
      y: point.y,
      isOffGrid: true,
      snappedToGrid: false
    };
  }
};

/**
 * Finds an existing vertex at the given position (within tolerance)
 * @param {Object} point - Position to check
 * @param {Array} vertices - Existing vertices
 * @param {number} tolerance - Distance tolerance (default: 5)
 * @returns {Object|null} Found vertex or null
 */
export const findExistingVertex = (point, vertices, tolerance = 5) => {
  return vertices.find(vertex => {
    const distance = Math.sqrt(
      Math.pow(vertex.x - point.x, 2) + 
      Math.pow(vertex.y - point.y, 2)
    );
    return distance <= tolerance;
  });
};

/**
 * Gets all bonds connected to a vertex
 * @param {Object} vertex - The vertex to check
 * @param {Array} segments - All segments
 * @returns {Array} Connected bond segments
 */
export const getVertexConnections = (vertex, segments) => {
  return segments.filter(segment => {
    if (segment.bondOrder === 0) return false; // Skip grid lines
    
    const distanceToStart = Math.sqrt(
      Math.pow(segment.x1 - vertex.x, 2) + 
      Math.pow(segment.y1 - vertex.y, 2)
    );
    const distanceToEnd = Math.sqrt(
      Math.pow(segment.x2 - vertex.x, 2) + 
      Math.pow(segment.y2 - vertex.y, 2)
    );
    
    return distanceToStart < 0.01 || distanceToEnd < 0.01;
  });
};

/**
 * Checks if a bond already exists between two vertices
 * @param {Object} vertex1 - First vertex
 * @param {Object} vertex2 - Second vertex  
 * @param {Array} segments - Existing segments
 * @returns {Object|null} Existing bond or null
 */
export const findDuplicateBond = (vertex1, vertex2, segments) => {
  return segments.find(segment => {
    if (segment.bondOrder === 0) return false; // Skip grid lines
    
    const v1AtStart = Math.sqrt(Math.pow(segment.x1 - vertex1.x, 2) + Math.pow(segment.y1 - vertex1.y, 2)) < 0.01;
    const v1AtEnd = Math.sqrt(Math.pow(segment.x2 - vertex1.x, 2) + Math.pow(segment.y2 - vertex1.y, 2)) < 0.01;
    const v2AtStart = Math.sqrt(Math.pow(segment.x1 - vertex2.x, 2) + Math.pow(segment.y1 - vertex2.y, 2)) < 0.01;
    const v2AtEnd = Math.sqrt(Math.pow(segment.x2 - vertex2.x, 2) + Math.pow(segment.y2 - vertex2.y, 2)) < 0.01;
    
    return (v1AtStart && v2AtEnd) || (v1AtEnd && v2AtStart);
  });
};

/**
 * Checks if adding a bond would form a ring
 * @param {Object} vertex1 - First vertex
 * @param {Object} vertex2 - Second vertex
 * @param {Array} segments - Existing segments
 * @returns {boolean} True if would form ring
 */
export const checkRingFormation = (vertex1, vertex2, segments) => {
  // Simple BFS to check if vertices are already connected by a path
  const visited = new Set();
  const queue = [vertex1];
  visited.add(`${vertex1.x.toFixed(2)},${vertex1.y.toFixed(2)}`);
  
  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = `${current.x.toFixed(2)},${current.y.toFixed(2)}`;
    
    // Find all connected vertices
    const connectedBonds = getVertexConnections(current, segments);
    
    for (const bond of connectedBonds) {
      let connectedVertex;
      
      // Determine which end of the bond is the connected vertex
      if (Math.sqrt(Math.pow(bond.x1 - current.x, 2) + Math.pow(bond.y1 - current.y, 2)) < 0.01) {
        connectedVertex = { x: bond.x2, y: bond.y2 };
      } else {
        connectedVertex = { x: bond.x1, y: bond.y1 };
      }
      
      const connectedKey = `${connectedVertex.x.toFixed(2)},${connectedVertex.y.toFixed(2)}`;
      
      // If we reached vertex2, a path exists (would form ring)
      if (Math.sqrt(Math.pow(connectedVertex.x - vertex2.x, 2) + Math.pow(connectedVertex.y - vertex2.y, 2)) < 0.01) {
        return true;
      }
      
      // Continue BFS
      if (!visited.has(connectedKey)) {
        visited.add(connectedKey);
        queue.push(connectedVertex);
      }
    }
  }
  
  return false;
};

/**
 * Calculates the direction angle between two points
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @returns {number} Angle in radians
 */
export const calculateBondDirection = (x1, y1, x2, y2) => {
  return Math.atan2(y2 - y1, x2 - x1);
};

/**
 * Generates smart bond preview suggestions from a vertex
 * @param {Object} sourceVertex - Starting vertex
 * @param {Array} existingSegments - Current segments
 * @param {number} hexRadius - Standard bond length
 * @param {number} maxPreviews - Maximum number of previews (default: 2)
 * @returns {Array} Array of bond preview objects
 */
export const generateSmartBondPreviews = (sourceVertex, existingSegments, hexRadius, maxPreviews = 2) => {
  const existingBonds = getVertexConnections(sourceVertex, existingSegments);
  const previews = [];
  
  // Don't generate previews if vertex is saturated (4+ bonds)
  if (existingBonds.length >= 4) {
    return previews;
  }
  
  // Calculate forbidden angles (existing bonds)
  const forbiddenAngles = existingBonds.map(bond => {
    if (Math.sqrt(Math.pow(bond.x1 - sourceVertex.x, 2) + Math.pow(bond.y1 - sourceVertex.y, 2)) < 0.01) {
      return Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
    } else {
      return Math.atan2(bond.y1 - bond.y2, bond.x1 - bond.x2);
    }
  });
  
  // Generate optimal angles based on existing bonds
  let suggestedAngles = [];
  
  if (existingBonds.length === 0) {
    // No existing bonds - suggest two 120° apart starting at 0°
    suggestedAngles = [0, Math.PI * 2/3];
  } else if (existingBonds.length === 1) {
    // One existing bond - suggest two 120° angles
    const existingAngle = forbiddenAngles[0];
    suggestedAngles = [
      existingAngle + Math.PI * 2/3,
      existingAngle - Math.PI * 2/3
    ];
  } else if (existingBonds.length === 2) {
    // Two existing bonds - find the angle between them and bisect
    const angle1 = forbiddenAngles[0];
    const angle2 = forbiddenAngles[1];
    const avgAngle = (angle1 + angle2) / 2;
    
    // Check which direction gives the larger gap
    let bisectorAngle;
    const diff = Math.abs(angle2 - angle1);
    if (diff > Math.PI) {
      bisectorAngle = avgAngle + Math.PI;
    } else {
      bisectorAngle = avgAngle + (diff > Math.PI * 2/3 ? 0 : Math.PI);
    }
    
    suggestedAngles = [bisectorAngle];
  } else if (existingBonds.length === 3) {
    // Three existing bonds - find the largest gap
    const sortedAngles = [...forbiddenAngles].sort((a, b) => a - b);
    const gaps = [];
    
    for (let i = 0; i < sortedAngles.length; i++) {
      const nextIndex = (i + 1) % sortedAngles.length;
      const gap = nextIndex === 0 
        ? (2 * Math.PI + sortedAngles[nextIndex] - sortedAngles[i])
        : (sortedAngles[nextIndex] - sortedAngles[i]);
      gaps.push({ gap, midAngle: sortedAngles[i] + gap / 2 });
    }
    
    // Find largest gap
    const largestGap = gaps.reduce((max, current) => current.gap > max.gap ? current : max);
    if (largestGap.gap > Math.PI / 3) { // Only suggest if gap is reasonable
      suggestedAngles = [largestGap.midAngle];
    }
  }
  
  // Create preview objects
  suggestedAngles.slice(0, maxPreviews).forEach((angle, index) => {
    const endX = sourceVertex.x + Math.cos(angle) * hexRadius;
    const endY = sourceVertex.y + Math.sin(angle) * hexRadius;
    
    previews.push({
      id: `smart-${sourceVertex.x.toFixed(2)}-${sourceVertex.y.toFixed(2)}-${index}`,
      x1: sourceVertex.x,
      y1: sourceVertex.y,
      x2: endX,
      y2: endY,
      angle: angle,
      length: hexRadius,
      isVisible: true,
      quality: 'optimal' // Mark as high-quality suggestion
    });
  });
  
  return previews;
};

/**
 * Validates a molecular structure for common chemical issues
 * @param {Array} vertices - All vertices
 * @param {Array} segments - All segments  
 * @param {Object} vertexAtoms - Atom labels
 * @returns {Object} Validation result with warnings and errors
 */
export const validateMolecularStructure = (vertices, segments, vertexAtoms) => {
  const validation = {
    errors: [],
    warnings: [],
    isValid: true
  };
  
  vertices.forEach(vertex => {
    const connections = getVertexConnections(vertex, segments);
    const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
    const atomInfo = vertexAtoms[vertexKey];
    
    // Check for oversaturation
    if (connections.length > 4) {
      validation.errors.push(`Vertex at (${vertex.x.toFixed(1)}, ${vertex.y.toFixed(1)}) has ${connections.length} bonds (max 4 typical)`);
      validation.isValid = false;
    }
    
    // Check for isolated vertices with atoms
    if (connections.length === 0 && atomInfo) {
      validation.warnings.push(`Isolated atom ${atomInfo.symbol} at (${vertex.x.toFixed(1)}, ${vertex.y.toFixed(1)})`);
    }
    
    // Check for unusual coordination for specific atoms
    if (atomInfo && atomInfo.symbol) {
      const bondCount = connections.reduce((sum, bond) => sum + bond.bondOrder, 0);
      
      if (atomInfo.symbol === 'C' && bondCount > 4) {
        validation.warnings.push(`Carbon at (${vertex.x.toFixed(1)}, ${vertex.y.toFixed(1)}) has ${bondCount} bonds (typical max 4)`);
      } else if (atomInfo.symbol === 'N' && bondCount > 3) {
        validation.warnings.push(`Nitrogen at (${vertex.x.toFixed(1)}, ${vertex.y.toFixed(1)}) has ${bondCount} bonds (typical max 3)`);
      } else if (atomInfo.symbol === 'O' && bondCount > 2) {
        validation.warnings.push(`Oxygen at (${vertex.x.toFixed(1)}, ${vertex.y.toFixed(1)}) has ${bondCount} bonds (typical max 2)`);
      }
    }
  });
  
  return validation;
};
