/**
 * Ring Detection Module
 * 
 * This module provides functionality to detect 6-membered rings in molecular structures
 * like benzene or cyclohexane. It runs invisibly in the background.
 * 
 * Also provides utility functions to determine the interior direction of rings
 * for proper double bond rendering.
 */

/**
 * Detects if vertices form a 6-membered ring
 * @param {Array} vertices - Array of vertex objects with x,y coordinates
 * @param {Array} segments - Array of bond segments connecting vertices
 * @param {Object} vertexAtoms - Mapping of vertices to atom symbols
 * @returns {Array} - Array of detected 6-membered rings, each containing the vertices that form the ring
 */
export const detectSixMemberedRings = (vertices, segments, vertexAtoms) => {
  // Add safety checks and error handling
  if (!vertices || vertices.length === 0 || !segments || segments.length === 0) {
    return [];
  }
  
  try {
    // Create an adjacency list representation of the graph
    const graph = buildGraphFromSegments(vertices, segments);
    
    // Find all rings of length 6
    const sixMemberedRings = findRingsOfSize(graph, 6);
    
    return sixMemberedRings;
  } catch (error) {
    console.warn('Ring detection failed:', error);
    return []; // Return empty array on error to prevent crashes
  }
};

/**
 * Builds a graph representation from segments
 * @param {Array} vertices - Array of vertex objects
 * @param {Array} segments - Array of segments with x1,y1,x2,y2 coordinates
 * @returns {Object} - Adjacency list representation of the graph
 */
const buildGraphFromSegments = (vertices, segments) => {
  // Create a map for fast vertex lookup
  const vertexMap = new Map();
  
  // Map each vertex to its string key for lookup
  vertices.forEach(vertex => {
    const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
    vertexMap.set(key, vertex);
  });
  
  // Build adjacency list
  const graph = {};
  
  // Initialize graph with all vertices
  vertices.forEach(vertex => {
    const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
    graph[key] = [];
  });
  
  // Add edges for each segment with bondOrder > 0
  segments.forEach(segment => {
    if (segment.bondOrder > 0) {
      const v1Key = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
      const v2Key = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
      
      // Add bidirectional edges (with error handling)
      if (graph[v1Key] && Array.isArray(graph[v1Key])) {
        if (!graph[v1Key].includes(v2Key)) {
          graph[v1Key].push(v2Key);
        }
      } else {
        // If vertex doesn't exist in graph, skip this edge
        console.warn(`Ring detection: Skipping edge to missing vertex: ${v1Key}`);
      }
      
      if (graph[v2Key] && Array.isArray(graph[v2Key])) {
        if (!graph[v2Key].includes(v1Key)) {
          graph[v2Key].push(v1Key);
        }
      } else {
        // If vertex doesn't exist in graph, skip this edge
        console.warn(`Ring detection: Skipping edge to missing vertex: ${v2Key}`);
      }
    }
  });
  
  return graph;
};

/**
 * Finds all rings of a specific size in the graph
 * @param {Object} graph - Adjacency list representation of the graph
 * @param {number} size - Size of the rings to find (6 for our purpose)
 * @returns {Array} - Array of detected rings
 */
const findRingsOfSize = (graph, size) => {
  const rings = [];
  const visited = new Set();
  
  // Start DFS from each vertex
  for (const startVertex in graph) {
    if (visited.has(startVertex)) continue;
    
    const path = [startVertex];
    const ringCandidates = findCyclesOfLength(graph, startVertex, startVertex, size, path, visited, new Set());
    
    rings.push(...ringCandidates);
    
    // Mark current vertex as visited
    visited.add(startVertex);
  }
  
  // Remove duplicate rings (same ring found from different starting points)
  return deduplicateRings(rings);
};

/**
 * Finds cycles of specified length using DFS
 * @param {Object} graph - Adjacency list representation
 * @param {string} startVertex - Starting vertex
 * @param {string} currentVertex - Current vertex being explored
 * @param {number} length - Desired length of the cycle
 * @param {Array} path - Current path being explored
 * @param {Set} globalVisited - Set of globally visited vertices
 * @param {Set} localVisited - Set of locally visited vertices in current path
 * @returns {Array} - Array of cycles found
 */
const findCyclesOfLength = (graph, startVertex, currentVertex, length, path, globalVisited, localVisited) => {
  // For cycle detection, we only care about paths of exactly 'length'
  if (path.length > length) return [];
  
  const foundCycles = [];
  localVisited.add(currentVertex);
  
  // Check each neighbor (with error handling for invalid graph structure)
  const neighbors = graph[currentVertex];
  if (!neighbors || !Array.isArray(neighbors)) {
    return [];
  }
  
  for (const neighbor of neighbors) {
    // Found a cycle back to the start
    if (neighbor === startVertex && path.length === length) {
      foundCycles.push([...path]);
      continue;
    }
    
    // Skip already visited vertices in current path
    if (localVisited.has(neighbor)) continue;
    
    // Skip globally visited vertices if they're not the start
    if (neighbor !== startVertex && globalVisited.has(neighbor)) continue;
    
    // Continue DFS
    path.push(neighbor);
    const newCycles = findCyclesOfLength(graph, startVertex, neighbor, length, path, globalVisited, localVisited);
    foundCycles.push(...newCycles);
    path.pop(); // Backtrack
  }
  
  localVisited.delete(currentVertex); // Backtrack
  return foundCycles;
};

/**
 * Removes duplicate rings (same set of vertices in different order)
 * @param {Array} rings - Array of detected rings
 * @returns {Array} - Deduplicated rings
 */
const deduplicateRings = (rings) => {
  const uniqueRings = [];
  const ringSignatures = new Set();
  
  for (const ring of rings) {
    // Sort the vertices to create a canonical representation
    const sortedRing = [...ring].sort();
    const signature = sortedRing.join('|');
    
    if (!ringSignatures.has(signature)) {
      ringSignatures.add(signature);
      uniqueRings.push(ring);
    }
  }
  
  return uniqueRings;
};

/**
 * Tests whether a specific 6-membered ring is aromatic (like benzene)
 * This is a simplified test based on alternating single/double bonds
 * @param {Array} ringVertices - Vertices in the ring
 * @param {Array} segments - All segments
 * @returns {boolean} - True if aromatic, false otherwise
 */
export const isRingAromatic = (ringVertices, segments) => {
  // Simplified aromaticity check: alternating single and double bonds
  let doubleBondCount = 0;
  let singleBondCount = 0;
  
  // For each pair of vertices in the ring, check bond order
  for (let i = 0; i < ringVertices.length; i++) {
    const currentVertex = ringVertices[i];
    const nextVertex = ringVertices[(i + 1) % ringVertices.length];
    
    // Find the segment connecting these vertices
    for (const segment of segments) {
      const v1Key = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
      const v2Key = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
      
      if ((v1Key === currentVertex && v2Key === nextVertex) || 
          (v1Key === nextVertex && v2Key === currentVertex)) {
        if (segment.bondOrder === 2) {
          doubleBondCount++;
        } else if (segment.bondOrder === 1) {
          singleBondCount++;
        }
        break;
      }
    }
  }
  
  // Aromatic if we have 3 double bonds and 3 single bonds in a 6-membered ring
  return doubleBondCount === 3 && singleBondCount === 3;
};

/**
 * Gets all detected rings for reporting or highlighting
 * @param {Array} vertices - All vertices
 * @param {Array} segments - All segments
 * @param {Object} vertexAtoms - Vertex to atom mapping
 * @returns {Object} - Information about detected rings
 */
/**
 * Determines if a segment is part of a ring
 * @param {Object} segment - The segment to check
 * @param {Array} rings - Array of detected rings
 * @returns {Object|null} - Ring information or null if not part of a ring
 */
export const isSegmentInRing = (segment, rings) => {
  if (!segment || !rings) return null;
  
  const segmentKey1 = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
  const segmentKey2 = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
  
  for (const ring of rings) {
    // Check if both vertices of this segment are in the ring
    const verticesInRing = ring.vertices || ring;
    
    // Find adjacent vertices in the ring
    for (let i = 0; i < verticesInRing.length; i++) {
      const currentVertex = verticesInRing[i];
      const nextVertex = verticesInRing[(i + 1) % verticesInRing.length];
      
      if ((segmentKey1 === currentVertex && segmentKey2 === nextVertex) || 
          (segmentKey1 === nextVertex && segmentKey2 === currentVertex)) {
        return {
          inRing: true,
          ringIndex: ring.id || rings.indexOf(ring),
          vertexIndices: [i, (i + 1) % verticesInRing.length],
          ring: ring
        };
      }
    }
  }
  
  return null;
};

/**
 * Determines which side of a bond is the interior of a ring
 * 
 * @param {Object} segment - The segment representing the bond
 * @param {Object} ringInfo - Information about the ring containing this segment
 * @param {Array} allRings - All detected rings
 * @returns {Object} - Direction info with isInteriorOnPositiveSide boolean
 */
/**
 * Determines if a bond is one of the three special bonds in a 6-membered ring that must have flipSmallerLine=false
 * These special bonds meet specific topological criteria based on their direction and connections
 * 
 * @param {Object} segment - The segment representing the bond
 * @param {Object} ringInfo - Information about the ring containing this segment
 * @param {Array} allSegments - All segments in the molecule
 * @returns {boolean} - True if the bond is one of the three special cases
 */
export const isSpecialRingBond = (segment, ringInfo, allSegments) => {
  if (!segment || !ringInfo || !ringInfo.inRing || !allSegments || allSegments.length === 0) {
    return false;
  }
  
  const ring = ringInfo.ring;
  const verticesInRing = ring.vertices || ring;
  
  if (!verticesInRing || verticesInRing.length !== 6) {
    return false;
  }
  
  // Get the segment's direction if not already set
  const direction = segment.direction || calculateBondDirection(segment.x1, segment.y1, segment.x2, segment.y2);
  
  // First, identify the upper and lower vertices of this bond
  let upperVertex, lowerVertex;
  
  if (direction === 'vertical') {
    upperVertex = segment.y1 < segment.y2 ? { x: segment.x1, y: segment.y1 } : { x: segment.x2, y: segment.y2 };
    lowerVertex = segment.y1 < segment.y2 ? { x: segment.x2, y: segment.y2 } : { x: segment.x1, y: segment.y1 };
  } else if (direction === 'topLeftFacing') {
    // For topLeftFacing bonds, the left vertex is typically the upper one
    const leftVertex = segment.x1 < segment.x2 ? { x: segment.x1, y: segment.y1 } : { x: segment.x2, y: segment.y2 };
    const rightVertex = segment.x1 < segment.x2 ? { x: segment.x2, y: segment.y2 } : { x: segment.x1, y: segment.y1 };
    upperVertex = leftVertex;
    lowerVertex = rightVertex;
  } else if (direction === 'topRightFacing') {
    // For topRightFacing bonds, the right vertex is typically the upper one
    const leftVertex = segment.x1 < segment.x2 ? { x: segment.x1, y: segment.y1 } : { x: segment.x2, y: segment.y2 };
    const rightVertex = segment.x1 < segment.x2 ? { x: segment.x2, y: segment.y2 } : { x: segment.x1, y: segment.y1 };
    upperVertex = rightVertex;
    lowerVertex = leftVertex;
  } else {
    // If the bond doesn't have one of these three directions, it's not a special case
    return false;
  }
  
  // Create vertex keys for comparison
  const upperVertexKey = `${upperVertex.x.toFixed(2)},${upperVertex.y.toFixed(2)}`;
  const lowerVertexKey = `${lowerVertex.x.toFixed(2)},${lowerVertex.y.toFixed(2)}`;
  
  // Get all connected bond segments for the upper and lower vertices
  const upperConnectedSegments = getConnectedBondSegments(upperVertex, allSegments, segment);
  const lowerConnectedSegments = getConnectedBondSegments(lowerVertex, allSegments, segment);
  
  // Check which of these connected segments are part of the ring
  const upperRingSegments = upperConnectedSegments.filter(seg => {
    return isSegmentInRing(seg, [ring]);
  });
  
  const lowerRingSegments = lowerConnectedSegments.filter(seg => {
    return isSegmentInRing(seg, [ring]);
  });
  
  // Now check the three special cases
  
  // Case 1: Vertical bond with specific connections
  if (direction === 'vertical') {
    const hasUpperRightFacing = upperRingSegments.some(seg => {
      const segDir = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
      return segDir === 'topRightFacing';
    });
    
    const hasLowerLeftFacing = lowerRingSegments.some(seg => {
      const segDir = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
      return segDir === 'topLeftFacing';
    });
    
    if (hasUpperRightFacing && hasLowerLeftFacing) {

      return true;
    }
  }
  
  // Case 2: TopLeftFacing bond with specific connections
  if (direction === 'topLeftFacing') {
    const hasUpperVertical = upperRingSegments.some(seg => {
      const segDir = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
      return segDir === 'vertical';
    });
    
    const hasLowerRightFacing = lowerRingSegments.some(seg => {
      const segDir = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
      return segDir === 'topRightFacing';
    });
    
    if (hasUpperVertical && hasLowerRightFacing) {

      return true;
    }
  }
  
  // Case 3: TopRightFacing bond with specific connections
  if (direction === 'topRightFacing') {
    const hasUpperVertical = upperRingSegments.some(seg => {
      const segDir = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
      return segDir === 'vertical';
    });
    
    const hasLowerLeftFacing = lowerRingSegments.some(seg => {
      const segDir = seg.direction || calculateBondDirection(seg.x1, seg.y1, seg.x2, seg.y2);
      return segDir === 'topLeftFacing';
    });
    
    if (hasUpperVertical && hasLowerLeftFacing) {

      return true;
    }
  }
  
  return false;
}

/**
 * Helper function to get bond segments connected to a vertex
 * @param {Object} vertex - The vertex to check
 * @param {Array} allSegments - All segments in the molecule
 * @param {Object} excludeSegment - The segment to exclude (the one we're checking)
 * @returns {Array} - Array of connected segments
 */
function getConnectedBondSegments(vertex, allSegments, excludeSegment) {
  return allSegments.filter(seg => {
    // Skip the segment we're checking
    if (seg === excludeSegment) return false;
    
    // Check if this segment is connected to the vertex
    return (
      (Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) ||
      (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01)
    );
  });
}

/**
 * Helper function to calculate bond direction based on coordinates
 */
function calculateBondDirection(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  if (Math.abs(dx) < 0.01) {
    return 'vertical';
  } else if (dx > 0 && dy < 0) {
    return 'topRightFacing';
  } else if (dx < 0 && dy < 0) {
    return 'topLeftFacing';
  } else {
    // Horizontal or other direction
    return 'other';
  }
}

/**
 * This legacy function is kept for backward compatibility 
 * Use isSpecialRingBond instead for more precise detection
 */
export const isBottomLeftRingBond = (segment, ringInfo) => {
  if (!segment || !ringInfo || !ringInfo.inRing) {
    return false;
  }
  
  const ring = ringInfo.ring;
  const verticesInRing = ring.vertices || ring;
  
  if (!verticesInRing || verticesInRing.length !== 6) {
    return false;
  }
  
  // Find the center of the ring
  let centerX = 0, centerY = 0;
  for (const vertexKey of verticesInRing) {
    const [x, y] = vertexKey.split(',').map(parseFloat);
    centerX += x;
    centerY += y;
  }
  centerX /= verticesInRing.length;
  centerY /= verticesInRing.length;
  
  // Check if this bond is in the bottom left quadrant from the ring center
  const midX = (segment.x1 + segment.x2) / 2;
  const midY = (segment.y1 + segment.y2) / 2;
  
  // Vector from center to bond midpoint
  const dx = midX - centerX;
  const dy = midY - centerY;
  
  // Calculate angle between vector and positive x-axis (in radians)
  let angle = Math.atan2(dy, dx);
  // Convert to degrees and ensure positive angle (0-360)
  angle = (angle * 180 / Math.PI) + 180; // 0-360 degrees
  
  // Bottom left quadrant bonds are approximately in the 180-300 degree range
  // These are the three bonds that were incorrectly oriented in the user's image
  return angle >= 180 && angle <= 300;
}

export const getRingInteriorDirection = (segment, ringInfo, allRings) => {
  if (!segment || !ringInfo || !ringInfo.inRing) {
    return { isInteriorOnPositiveSide: false, isInRing: false };
  }
  
  const ring = ringInfo.ring;
  const verticesInRing = ring.vertices || ring;
  
  if (!verticesInRing || verticesInRing.length < 3) {
    return { isInteriorOnPositiveSide: false, isInRing: true };
  }
  
  // Check if this segment is shared by two rings
  let isSharedBond = false;
  const segmentKey1 = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
  const segmentKey2 = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
  
  let ringCount = 0;
  for (const r of allRings) {
    const vInRing = r.vertices || r;
    for (let i = 0; i < vInRing.length; i++) {
      const currentVertex = vInRing[i];
      const nextVertex = vInRing[(i + 1) % vInRing.length];
      
      if ((segmentKey1 === currentVertex && segmentKey2 === nextVertex) || 
          (segmentKey1 === nextVertex && segmentKey2 === currentVertex)) {
        ringCount++;
        if (ringCount > 1) {
          isSharedBond = true;
          break;
        }
      }
    }
    if (isSharedBond) break;
  }
  
  // If shared by two rings, orientation doesn't matter per requirements
  if (isSharedBond) {
    return {
      isInteriorOnPositiveSide: false, // Default value
      isInRing: true,
      isSharedBond: true
    };
  }
  
  // Find the center of the ring
  let centerX = 0, centerY = 0;
  for (const vertexKey of verticesInRing) {
    const [x, y] = vertexKey.split(',').map(parseFloat);
    centerX += x;
    centerY += y;
  }
  centerX /= verticesInRing.length;
  centerY /= verticesInRing.length;
  
  // Calculate the perpendicular vector to the segment
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  // Normalized direction vector of the segment
  const dirX = dx / len;
  const dirY = dy / len;
  
  // Perpendicular vector (points to the right of the segment direction)
  const perpX = -dirY;
  const perpY = dirX;
  
  // Find midpoint of the segment
  const midX = (segment.x1 + segment.x2) / 2;
  const midY = (segment.y1 + segment.y2) / 2;
  
  // Vector from midpoint to ring center
  const toCenterX = centerX - midX;
  const toCenterY = centerY - midY;
  
  // Determine if perpendicular points toward or away from center
  // using dot product of perpendicular and vector to center
  const dotProduct = perpX * toCenterX + perpY * toCenterY;
  
  // If dot product is positive, the positive perpendicular side points toward the ring interior
  const isInteriorOnPositiveSide = dotProduct > 0;
  
  return {
    isInteriorOnPositiveSide,
    isInRing: true,
    isSharedBond: false
  };
};

/**
 * Detects 3-membered rings (cyclopropane)
 */
export const detectThreeMemberedRings = (vertices, segments, vertexAtoms) => {
  if (!vertices || vertices.length === 0 || !segments || segments.length === 0) {
    return [];
  }
  
  try {
    const graph = buildGraphFromSegments(vertices, segments);
    return findRingsOfSize(graph, 3);
  } catch (error) {
    console.warn('3-membered ring detection failed:', error);
    return [];
  }
};

/**
 * Detects 4-membered rings (cyclobutane)  
 */
export const detectFourMemberedRings = (vertices, segments, vertexAtoms) => {
  if (!vertices || vertices.length === 0 || !segments || segments.length === 0) {
    return [];
  }
  
  try {
    const graph = buildGraphFromSegments(vertices, segments);
    return findRingsOfSize(graph, 4);
  } catch (error) {
    console.warn('4-membered ring detection failed:', error);
    return [];
  }
};

/**
 * Detects 5-membered rings (cyclopentane)
 */
export const detectFiveMemberedRings = (vertices, segments, vertexAtoms) => {
  if (!vertices || vertices.length === 0 || !segments || segments.length === 0) {
    return [];
  }
  
  try {
    const graph = buildGraphFromSegments(vertices, segments);
    return findRingsOfSize(graph, 5);
  } catch (error) {
    console.warn('5-membered ring detection failed:', error);
    return [];
  }
};

/**
 * Enhanced ring detection that finds rings of all sizes (3, 4, 5, and 6 membered)
 */
export const detectAllRings = (vertices, segments, vertexAtoms) => {
  const allRings = [];
  
  // Detect rings of different sizes
  const threeMemberedRings = detectThreeMemberedRings(vertices, segments, vertexAtoms);
  const fourMemberedRings = detectFourMemberedRings(vertices, segments, vertexAtoms);
  const fiveMemberedRings = detectFiveMemberedRings(vertices, segments, vertexAtoms);
  const sixMemberedRings = detectSixMemberedRings(vertices, segments, vertexAtoms);
  
  // Add all rings with size information
  threeMemberedRings.forEach(ring => allRings.push({ vertices: ring, size: 3 }));
  fourMemberedRings.forEach(ring => allRings.push({ vertices: ring, size: 4 }));
  fiveMemberedRings.forEach(ring => allRings.push({ vertices: ring, size: 5 }));
  sixMemberedRings.forEach(ring => allRings.push({ vertices: ring, size: 6 }));
  
  return allRings;
};

/**
 * Enhanced aromaticity check that handles different ring sizes
 */
export const isRingAromaticEnhanced = (ringVertices, segments, ringSize) => {
  // Simplified aromaticity check based on ring size
  let doubleBondCount = 0;
  let singleBondCount = 0;
  
  // For each pair of vertices in the ring, check bond order
  for (let i = 0; i < ringVertices.length; i++) {
    const currentVertex = ringVertices[i];
    const nextVertex = ringVertices[(i + 1) % ringVertices.length];
    
    // Find the segment connecting these vertices
    for (const segment of segments) {
      const v1Key = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
      const v2Key = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
      
      if ((v1Key === currentVertex && v2Key === nextVertex) || 
          (v1Key === nextVertex && v2Key === currentVertex)) {
        if (segment.bondOrder === 2) {
          doubleBondCount++;
        } else if (segment.bondOrder === 1) {
          singleBondCount++;
        }
        break;
      }
    }
  }
  
  // Aromaticity rules by ring size:
  // 6-membered: 3 double bonds and 3 single bonds (benzene)
  // 5-membered: Not typically aromatic in simple cases (furan, pyrrole need heteroatoms)
  // 4-membered: Not aromatic (antiaromatic)
  // 3-membered: Not aromatic
  if (ringSize === 6) {
    return doubleBondCount === 3 && singleBondCount === 3;
  } else if (ringSize === 5) {
    // For 5-membered rings, aromaticity is rare without heteroatoms
    // We could implement more complex rules here if needed
    return false;
  } else {
    // 3 and 4-membered rings are not aromatic
    return false;
  }
};

export const getRingInfo = (vertices, segments, vertexAtoms) => {
  // Use enhanced detection that finds all ring sizes
  const allRings = detectAllRings(vertices, segments, vertexAtoms);
  
  return {
    totalRings: allRings.length,
    rings: allRings.map((ring, index) => ({
      id: index,
      vertices: ring.vertices,
      size: ring.size,
      isAromatic: isRingAromaticEnhanced(ring.vertices, segments, ring.size),
    })),
  };
};
