/**
 * Enhanced Ring Detection Utilities
 * Builds upon existing ring detection with optimizations for double bond rendering
 */

/**
 * Detects all rings in a molecular structure
 * @param {Array} bonds - All bonds in the molecule
 * @param {Array} vertices - All vertices
 * @returns {Array} Array of detected rings with enhanced metadata
 */
export const detectAllRingsEnhanced = (bonds, vertices) => {
  const rings = [];
  
  // Only consider actual bonds (not grid lines)
  const actualBonds = bonds.filter(bond => bond.bondOrder > 0);
  
  // Detect different ring sizes using comprehensive cycle detection
  rings.push(...detectRingsOfSize(3, actualBonds, vertices));
  rings.push(...detectRingsOfSize(4, actualBonds, vertices));
  rings.push(...detectRingsOfSize(5, actualBonds, vertices));
  rings.push(...detectRingsOfSize(6, actualBonds, vertices));
  rings.push(...detectRingsOfSize(7, actualBonds, vertices));
  rings.push(...detectRingsOfSize(8, actualBonds, vertices));
  
  // Remove duplicate rings and add enhanced metadata
  const uniqueRings = removeDuplicateRings(rings);
  return uniqueRings.map(ring => enhanceRingMetadata(ring, actualBonds, vertices));
};

/**
 * Detects rings of a specific size using depth-first search
 * @param {number} targetSize - Target ring size (3, 4, 5, 6, etc.)
 * @param {Array} bonds - All actual bonds (bondOrder > 0)
 * @param {Array} vertices - All vertices
 * @returns {Array} Array of detected rings of the target size
 */
export const detectRingsOfSize = (targetSize, bonds, vertices) => {
  const rings = [];
  const adjacency = buildAdjacencyList(bonds, vertices);
  
  // Early exit if not enough vertices for this ring size
  if (vertices.length < targetSize) return rings;
  
  // Try starting from each vertex - don't use global visited set
  // as it prevents finding all possible rings
  for (let startIndex = 0; startIndex < vertices.length; startIndex++) {
    // Skip vertices with no connections
    if (!adjacency[startIndex] || adjacency[startIndex].length === 0) continue;
    
    // Skip vertices with insufficient connections for this ring size
    if (adjacency[startIndex].length < 2) continue;
    
    const foundRings = findCyclesFromVertex(startIndex, targetSize, adjacency, vertices, bonds);
    rings.push(...foundRings);
  }
  
  return rings;
};

/**
 * Finds cycles of specific size starting from a vertex using DFS
 * @param {number} startIndex - Starting vertex index
 * @param {number} targetSize - Target cycle size
 * @param {Object} adjacency - Adjacency list
 * @param {Array} vertices - All vertices
 * @param {Array} bonds - All bonds
 * @returns {Array} Found cycles
 */
export const findCyclesFromVertex = (startIndex, targetSize, adjacency, vertices, bonds) => {
  const cycles = [];
  let cycleCount = 0;
  const maxCyclesPerVertex = 10; // Limit cycles per starting vertex to prevent excessive computation
  
  const dfs = (currentIndex, path, visitedInPath) => {
    // Early exit if we've found enough cycles from this vertex
    if (cycleCount >= maxCyclesPerVertex) return;
    
    // Add current vertex to path
    const newPath = [...path, currentIndex];
    const newVisited = new Set(visitedInPath);
    newVisited.add(currentIndex);
    
    // If we've reached the target size, check if we can close the cycle
    if (newPath.length === targetSize) {
      const neighbors = adjacency[currentIndex] || [];
      const canCloseToStart = neighbors.some(neighbor => neighbor.vertexIndex === startIndex);
      
      if (canCloseToStart) {
        cycleCount++;
        // Found a valid cycle
        const cycleVertices = newPath.map(index => vertices[index]);
        const cycleBonds = [];
        
        // Reconstruct the bonds forming the cycle
        for (let i = 0; i < newPath.length; i++) {
          const nextIndex = (i + 1) % newPath.length;
          const bond = findBondBetweenVertices(vertices[newPath[i]], vertices[newPath[nextIndex]], bonds);
          if (bond) cycleBonds.push(bond);
        }
        
        if (cycleBonds.length === targetSize) {
          cycles.push({
            size: targetSize,
            vertices: cycleVertices,
            bonds: cycleBonds,
            startVertex: vertices[startIndex],
            type: getRingTypeName(targetSize)
          });
        }
      }
      return;
    }
    
    // Continue searching if we haven't reached target size
    if (newPath.length < targetSize) {
      const neighbors = adjacency[currentIndex] || [];
      for (const neighbor of neighbors) {
        const neighborIndex = neighbor.vertexIndex;
        
        // Don't revisit vertices in current path (except start vertex for closing)
        if (newVisited.has(neighborIndex) && neighborIndex !== startIndex) continue;
        
        // Don't close cycle too early (need at least 3 vertices)
        if (neighborIndex === startIndex && newPath.length < 3) continue;
        
        dfs(neighborIndex, newPath, newVisited);
      }
    }
  };
  
  // Start DFS from the starting vertex
  dfs(startIndex, [], new Set());
  return cycles;
};

/**
 * Removes duplicate rings from detection results
 * @param {Array} rings - Array of detected rings
 * @returns {Array} Array with duplicates removed
 */
export const removeDuplicateRings = (rings) => {
  const unique = [];
  const seen = new Set();
  
  for (const ring of rings) {
    // Create a canonical representation of the ring using sorted vertex coordinates
    const vertexKeys = ring.vertices
      .map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`)
      .sort()
      .join('|');
    
    // Also check bond-based representation to catch rings with same vertices but different bond paths
    const bondKeys = ring.bonds
      .map(bond => {
        const x1 = bond.x1.toFixed(2);
        const y1 = bond.y1.toFixed(2);
        const x2 = bond.x2.toFixed(2);
        const y2 = bond.y2.toFixed(2);
        // Sort coordinates to ensure consistent key
        return x1 < x2 || (x1 === x2 && y1 < y2) ? `${x1},${y1}-${x2},${y2}` : `${x2},${y2}-${x1},${y1}`;
      })
      .sort()
      .join('|');
    
    const combinedKey = `${vertexKeys}:${bondKeys}`;
    
    if (!seen.has(combinedKey)) {
      seen.add(combinedKey);
      unique.push(ring);
    }
  }
  
  return unique;
};

/**
 * Gets ring type name based on size
 * @param {number} size - Ring size
 * @returns {string} Ring type name
 */
export const getRingTypeName = (size) => {
  const names = {
    3: 'triangle',
    4: 'square', 
    5: 'pentagon',
    6: 'hexagon',
    7: 'heptagon',
    8: 'octagon'
  };
  return names[size] || `${size}-membered ring`;
};

/**
 * Enhances ring metadata with information needed for double bond rendering
 * @param {Object} ring - Basic ring structure
 * @param {Array} bonds - All bonds
 * @param {Array} vertices - All vertices
 * @returns {Object} Enhanced ring with additional metadata
 */
export const enhanceRingMetadata = (ring, bonds, _vertices) => {
  const enhanced = { ...ring };
  
  // Calculate ring center using centroid of vertices
  enhanced.center = calculateRingCenter(ring.vertices);
  
  // Calculate ring area and perimeter
  enhanced.area = calculateRingArea(ring);
  enhanced.perimeter = calculateRingPerimeter(ring);
  
  // Determine if ring is aromatic (for rendering style)
  enhanced.isAromatic = determineAromaticity(ring, bonds);
  
  // Calculate interior direction for each bond in the ring
  enhanced.bondInteriorDirections = {};
  enhanced.doubleBondOffsets = {};
  
  if (ring.bonds) {
    for (const bond of ring.bonds) {
      const bondKey = getBondKey(bond);
      const interiorDirection = calculateBondInteriorDirection(bond, enhanced.center);
      
      enhanced.bondInteriorDirections[bondKey] = interiorDirection;
      
      // If this is a double bond, calculate its interior offset
      if (bond.bondOrder === 2) {
        enhanced.doubleBondOffsets[bondKey] = calculateDoubleBondInteriorOffset(bond, interiorDirection);
      }
    }
  }
  
  // Mark this ring as persistent
  enhanced.isPersistent = true;
  enhanced.detectedAt = Date.now();
  
  return enhanced;
};

/**
 * Creates a unique key for a bond
 * @param {Object} bond - Bond object
 * @returns {string} Unique bond key
 */
export const getBondKey = (bond) => {
  // Create consistent key regardless of bond direction
  const x1 = bond.x1.toFixed(2);
  const y1 = bond.y1.toFixed(2);
  const x2 = bond.x2.toFixed(2);
  const y2 = bond.y2.toFixed(2);
  
  // Sort coordinates to ensure consistent key
  if (x1 < x2 || (x1 === x2 && y1 < y2)) {
    return `${x1},${y1}-${x2},${y2}`;
  } else {
    return `${x2},${y2}-${x1},${y1}`;
  }
};

/**
 * Calculates double bond offset for interior rendering
 * @param {Object} bond - The double bond
 * @param {number} interiorDirection - Direction toward ring interior
 * @returns {Object} Offset information for double bond rendering
 */
export const calculateDoubleBondInteriorOffset = (bond, interiorDirection) => {
  const offsetDistance = 4; // Standard offset for double bonds
  
  return {
    offsetX: Math.cos(interiorDirection) * offsetDistance,
    offsetY: Math.sin(interiorDirection) * offsetDistance,
    direction: interiorDirection,
    distance: offsetDistance
  };
};

/**
 * Calculates interior direction for a specific bond in a ring
 * @param {Object} bond - The bond
 * @param {Object} ringCenter - Ring center point
 * @returns {number} Angle pointing toward ring interior
 */
export const calculateBondInteriorDirection = (bond, ringCenter) => {
  const bondMidX = (bond.x1 + bond.x2) / 2;
  const bondMidY = (bond.y1 + bond.y2) / 2;
  
  return Math.atan2(
    ringCenter.y - bondMidY,
    ringCenter.x - bondMidX
  );
};

/**
 * Builds adjacency list for efficient ring detection
 * @param {Array} bonds - All bonds
 * @param {Array} vertices - All vertices
 * @param {number} tolerance - Distance tolerance
 * @returns {Object} Adjacency list mapping
 */
export const buildAdjacencyList = (bonds, vertices, tolerance = 0.01) => {
  const adjacency = {};
  
  // Initialize adjacency list for all vertices
  vertices.forEach((vertex, index) => {
    adjacency[index] = [];
  });
  
  // Process each bond
  bonds.forEach(bond => {
    // Only consider actual bonds (not grid lines)
    if (!bond.bondOrder || bond.bondOrder <= 0) return;
    
    // Find vertex indices for this bond endpoints
    let startIndex = -1;
    let endIndex = -1;
    
    // More efficient vertex lookup
    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      
      if (startIndex === -1 && 
          Math.abs(vertex.x - bond.x1) < tolerance && 
          Math.abs(vertex.y - bond.y1) < tolerance) {
        startIndex = i;
      }
      
      if (endIndex === -1 && 
          Math.abs(vertex.x - bond.x2) < tolerance && 
          Math.abs(vertex.y - bond.y2) < tolerance) {
        endIndex = i;
      }
      
      // Early exit if both found
      if (startIndex !== -1 && endIndex !== -1) break;
    }
    
    // Add bidirectional connections if both vertices found
    if (startIndex !== -1 && endIndex !== -1 && startIndex !== endIndex) {
      adjacency[startIndex].push({ vertexIndex: endIndex, bond });
      adjacency[endIndex].push({ vertexIndex: startIndex, bond });
    }
  });
  
  return adjacency;
};

/**
 * Finds a bond between two specific vertices
 * @param {Object} vertex1 - First vertex
 * @param {Object} vertex2 - Second vertex
 * @param {Array} bonds - All bonds
 * @returns {Object|null} Found bond or null
 */
export const findBondBetweenVertices = (vertex1, vertex2, bonds) => {
  const tolerance = 0.01;
  
  return bonds.find(bond => {
    const v1AtStart = Math.abs(bond.x1 - vertex1.x) < tolerance && Math.abs(bond.y1 - vertex1.y) < tolerance;
    const v1AtEnd = Math.abs(bond.x2 - vertex1.x) < tolerance && Math.abs(bond.y2 - vertex1.y) < tolerance;
    const v2AtStart = Math.abs(bond.x1 - vertex2.x) < tolerance && Math.abs(bond.y1 - vertex2.y) < tolerance;
    const v2AtEnd = Math.abs(bond.x2 - vertex2.x) < tolerance && Math.abs(bond.y2 - vertex2.y) < tolerance;
    
    return (v1AtStart && v2AtEnd) || (v1AtEnd && v2AtStart);
  }) || null;
};

/**
 * Calculates the center (centroid) of a ring
 * @param {Array} ringVertices - Array of vertices in the ring
 * @returns {Object} Center point {x, y}
 */
export const calculateRingCenter = (ringVertices) => {
  if (!ringVertices || ringVertices.length === 0) {
    return { x: 0, y: 0 };
  }

  const sumX = ringVertices.reduce((sum, vertex) => sum + vertex.x, 0);
  const sumY = ringVertices.reduce((sum, vertex) => sum + vertex.y, 0);
  
  return {
    x: sumX / ringVertices.length,
    y: sumY / ringVertices.length
  };
};

/**
 * Calculates ring area using shoelace formula
 * @param {Object} ring - Ring structure
 * @returns {number} Ring area
 */
export const calculateRingArea = (ring) => {
  if (!ring.vertices || ring.vertices.length < 3) return 0;
  
  let area = 0;
  const vertices = ring.vertices;
  
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  
  return Math.abs(area) / 2;
};

/**
 * Calculates ring perimeter
 * @param {Object} ring - Ring structure
 * @returns {number} Ring perimeter
 */
export const calculateRingPerimeter = (ring) => {
  if (!ring.bonds) return 0;
  
  return ring.bonds.reduce((total, bond) => {
    const length = Math.sqrt(
      Math.pow(bond.x2 - bond.x1, 2) + 
      Math.pow(bond.y2 - bond.y1, 2)
    );
    return total + length;
  }, 0);
};

/**
 * Determines if a ring is aromatic (simplified heuristic)
 * @param {Object} ring - Ring structure
 * @param {Array} allBonds - All bonds
 * @returns {boolean} Whether ring appears aromatic
 */
export const determineAromaticity = (ring, _allBonds) => {
  if (!ring.bonds || ring.size !== 6) return false; // Only 6-membered rings can be aromatic in this simple check
  
  // Count double bonds in the ring
  const doubleBondCount = ring.bonds.filter(bond => bond.bondOrder === 2).length;
  
  // Simple heuristic: aromatic if it has alternating single/double bonds
  return doubleBondCount === 3;
};
