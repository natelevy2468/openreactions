// vertexDetection.js
// This file handles vertex type detection based on bonding patterns

// Type definitions:
// Type A - Default type for all vertices
// Type B - Vertex with exactly 1 vertical bond
// Type C - Vertex with exactly 1 topleftfacing bond
// Type D - Vertex with exactly 1 toprightfacing bond
// Type E - Vertex with exactly 2 bonds: vertical and topleftfacing
// Type F - Vertex with exactly 2 bonds: vertical and toprightfacing
// Type G - Vertex with exactly 2 bonds: topleftfacing and toprightfacing
// Type H - Vertex with exactly 3 bonds

// Note: Each vertex now has two state variables stored directly on the vertex object:
// - vertexType: The type of the vertex (A-H)
// - isTop: Whether the vertex is at the top of a hexagon

/**
 * Determine the type for each vertex based on its bonds and properties
 * @param {Array} vertices - Array of vertex coordinates
 * @param {Array} segments - Array of bonds
 * @param {Object} vertexAtoms - Mapping of vertex coordinates to atoms
 * @param {Object} charges - Mapping of vertex coordinates to charges
 * @returns {Object} - Mapping of vertex coordinates to types
 */
export function determineVertexTypes(vertices, segments, vertexAtoms, charges = {}) {
  // Create a mapping of vertex coordinates to types
  const vertexTypes = {};

  
  // Assign each vertex a default type of "A"
  vertices.forEach(v => {
    const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
    // Initialize or maintain vertex state variables
    if (!v.hasOwnProperty('vertexType')) {
      v.vertexType = "A";
    }
    if (!v.hasOwnProperty('isTop')) {
      v.isTop = false;
    }
    vertexTypes[key] = "A";
    
    // Get connected bonds for this vertex
    const connectedBonds = getConnectedBondsForVertex(v, segments);
    
    // Helper function to determine bond type
    const getBondType = (bond) => {
      const epsilon = 0.1;
      // Calculate bond direction vectors
      const dx = bond.x2 - bond.x1;
      const dy = bond.y2 - bond.y1;
      
      // Determine bond type based on direction
      if (Math.abs(dx) < epsilon) {
        return 'vertical';
      } else if (Math.abs(dx) >= epsilon && Math.abs(dy) >= epsilon && dx * dy < 0) {
        return 'topLeftFacing';
      } else if (Math.abs(dx) >= epsilon && Math.abs(dy) >= epsilon && dx * dy > 0) {
        return 'topRightFacing';
      } else {
        return 'horizontal'; // Not used in current typing system but included for completeness
      }
    };
    
    // Check if this vertex has exactly one bond
    if (connectedBonds.length === 1) {
      const bond = connectedBonds[0];
      const bondType = getBondType(bond);
      

      
      // Assign vertex type based on single bond direction
      if (bondType === 'vertical') {
        vertexTypes[key] = "B";
        v.vertexType = "B";
      } else if (bondType === 'topLeftFacing') {
        vertexTypes[key] = "C";
        v.vertexType = "C";
      } else if (bondType === 'topRightFacing') {
        vertexTypes[key] = "D";
        v.vertexType = "D";
      }
    }
    // Check if this vertex has exactly two bonds
    else if (connectedBonds.length === 2) {
      const bondType1 = getBondType(connectedBonds[0]);
      const bondType2 = getBondType(connectedBonds[1]);
      

      
      // Check for type E: vertical + topleftfacing
      if ((bondType1 === 'vertical' && bondType2 === 'topLeftFacing') ||
          (bondType2 === 'vertical' && bondType1 === 'topLeftFacing')) {
        vertexTypes[key] = "E";
        v.vertexType = "E";
      }
      // Check for type F: vertical + toprightfacing
      else if ((bondType1 === 'vertical' && bondType2 === 'topRightFacing') ||
               (bondType2 === 'vertical' && bondType1 === 'topRightFacing')) {
        vertexTypes[key] = "F";
        v.vertexType = "F";
      }
      // Check for type G: topleftfacing + toprightfacing
      else if ((bondType1 === 'topLeftFacing' && bondType2 === 'topRightFacing') ||
               (bondType2 === 'topLeftFacing' && bondType1 === 'topRightFacing')) {
        vertexTypes[key] = "G";
        v.vertexType = "G";
      }
    }
    // Check if this vertex has exactly three bonds
    else if (connectedBonds.length === 3) {
      vertexTypes[key] = "H";
      v.vertexType = "H";
    }
    
    // Determine if this vertex is at the top of a hexagon and store as state
    v.isTop = isTopOfHex(v, segments);
  });
  
  // Log overall results
  const typeCount = {};
  Object.values(vertexTypes).forEach(type => {
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  
  return vertexTypes;
}

/**
 * Determines if a vertex is at the top of a hexagon in the grid according to these rules:
 * 1. It is the bottom vertex of a vertical bond
 * 2. It is the top vertex of a top-left facing bond
 * 3. It is the top vertex of a top-right facing bond
 * @param {Object} vertex - Vertex coordinates {x, y}
 * @param {Array} segments - Array of bonds
 * @returns {Boolean} - True if vertex is at the top of a hexagon, false otherwise
 */
export function isTopOfHex(vertex, segments) {
  // If no segments are provided, we can't determine if it's at the top of a hexagon
  if (!segments) {

    return false;
  }
  
  // Get connected bonds for this vertex
  const connectedBonds = getConnectedBondsForVertex(vertex, segments);
  
  // Only consider real bonds (not previews)
  const realBonds = connectedBonds.filter(bond => bond.bondOrder > 0);
  
  // Check each bond
  for (const bond of realBonds) {
    const epsilon = 0.1;
    const dx = bond.x2 - bond.x1;
    const dy = bond.y2 - bond.y1;
    
    // Check if it's a vertical bond (x-coordinates are approximately equal)
    if (Math.abs(dx) < epsilon) {
      // Case 1: Vertex is at the bottom of a vertical bond
      // Check if this vertex is at the bottom of the vertical bond (higher y value in canvas)
      
      // If this vertex matches the first point of the bond
      if (Math.abs(bond.x1 - vertex.x) < epsilon && Math.abs(bond.y1 - vertex.y) < epsilon) {
        // It's at the bottom if the second point is above it (lower y-value)
        if (bond.y2 < bond.y1) {

          return true;
        }
      }
      
      // If this vertex matches the second point of the bond
      if (Math.abs(bond.x2 - vertex.x) < epsilon && Math.abs(bond.y2 - vertex.y) < epsilon) {
        // It's at the bottom if the first point is above it (lower y-value)
        if (bond.y1 < bond.y2) {

          return true;
        }
      }
    }
    // Check if it's a top-left facing bond (dx and dy have opposite signs)
    else if (Math.abs(dx) >= epsilon && Math.abs(dy) >= epsilon && dx * dy < 0) {
      // Case 2: Vertex is at the top of a top-left facing bond
      // In a top-left facing bond, the top vertex is the one with the smaller y-coordinate
      
      // If this vertex matches the first point of the bond
      if (Math.abs(bond.x1 - vertex.x) < epsilon && Math.abs(bond.y1 - vertex.y) < epsilon) {
        // It's at the top if it has a smaller y-value
        if (bond.y1 < bond.y2) {

          return true;
        }
      }
      
      // If this vertex matches the second point of the bond
      if (Math.abs(bond.x2 - vertex.x) < epsilon && Math.abs(bond.y2 - vertex.y) < epsilon) {
        // It's at the top if it has a smaller y-value
        if (bond.y2 < bond.y1) {

          return true;
        }
      }
    }
    // Check if it's a top-right facing bond (dx and dy have the same sign)
    else if (Math.abs(dx) >= epsilon && Math.abs(dy) >= epsilon && dx * dy > 0) {
      // Case 3: Vertex is at the top of a top-right facing bond
      // In a top-right facing bond, the top vertex is the one with the smaller y-coordinate
      
      // If this vertex matches the first point of the bond
      if (Math.abs(bond.x1 - vertex.x) < epsilon && Math.abs(bond.y1 - vertex.y) < epsilon) {
        // It's at the top if it has a smaller y-value
        if (bond.y1 < bond.y2) {

          return true;
        }
      }
      
      // If this vertex matches the second point of the bond
      if (Math.abs(bond.x2 - vertex.x) < epsilon && Math.abs(bond.y2 - vertex.y) < epsilon) {
        // It's at the top if it has a smaller y-value
        if (bond.y2 < bond.y1) {

          return true;
        }
      }
    }
  }
  
  // None of the cases matched
  return false;
}

/**
 * Get connected bonds for a vertex
 * @param {Object} vertex - Vertex coordinates {x, y}
 * @param {Array} segments - Array of bonds
 * @returns {Array} - Array of connected bonds
 */
export function getConnectedBondsForVertex(vertex, segments) {
  const connectedBonds = [];
  const epsilon = 0.1; // Using a slightly larger epsilon for better floating-point comparison
  
  for (const segment of segments) {
    // Only consider bonds with bondOrder > 0 (actual bonds, not just potential connection lines)
    if (segment.bondOrder > 0) {
      if ((Math.abs(segment.x1 - vertex.x) < epsilon && Math.abs(segment.y1 - vertex.y) < epsilon) || 
          (Math.abs(segment.x2 - vertex.x) < epsilon && Math.abs(segment.y2 - vertex.y) < epsilon)) {
        connectedBonds.push(segment);
      }
    }
  }
  
  return connectedBonds;
}

/**
 * Draw visual indicators for vertex types
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} vertex - Vertex coordinates {x, y}
 * @param {String} type - Vertex type (A, B, C, etc.)
 * @param {Object} offset - Canvas offset {x, y}
 * @param {Array} segments - Array of bonds
 */
/**
 * Get the type of a vertex from its state or calculate it if not available
 * @param {Object} vertex - Vertex coordinates {x, y}
 * @param {Object} vertexTypes - Mapping of vertex coordinates to types
 * @param {Array} segments - Array of bonds (optional, used if type needs to be calculated)
 * @returns {String} - Vertex type (A, B, C, etc.)
 */
export function getType(vertex, vertexTypes, segments = null) {
  // If vertex has the type stored as state, use that
  if (vertex && vertex.hasOwnProperty('vertexType')) {
    return vertex.vertexType;
  }
  
  // Otherwise fallback to the lookup table
  if (vertexTypes) {
    const key = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
    return vertexTypes[key] || "A";
  }
  
  // Absolute fallback: recalculate (inefficient but works as last resort)
  // This would require segments to be provided
  return "A";
}

/**
 * Get whether a vertex is at the top of a hexagon from its state or calculate it
 * @param {Object} vertex - Vertex coordinates {x, y}
 * @param {Array} segments - Array of bonds (used only if isTop needs to be calculated)
 * @returns {Boolean} - True if vertex is at the top of a hexagon, false otherwise
 */
export function getIfTop(vertex, segments) {
  // If vertex has the isTop stored as state, use that
  if (vertex && vertex.hasOwnProperty('isTop')) {
    return vertex.isTop;
  }
  
  // Otherwise calculate it
  return isTopOfHex(vertex, segments);
}

export function drawVertexTypeIndicator(ctx, vertex, type, offset, segments) {
  const x = vertex.x + offset.x;
  const y = vertex.y + offset.y;
  
  // Use the getIfTop function to get isTop value
  const isTop = getIfTop(vertex, segments);
  
  // Set styling for type indicators
  ctx.save();
  
  // Different styles for different types
  if (type === "A") {
    ctx.fillStyle = "rgba(75, 192, 192, 0.0)";
    ctx.strokeStyle = "rgba(75, 192, 192, 0.0)";
  } else if (type === "B") {
    // Type B - vertices with exactly 1 vertical bond
    ctx.fillStyle = "rgba(255, 99, 64, 0.0)";  // More vibrant orange-red with higher opacity
    ctx.strokeStyle = "rgba(255, 99, 64, 0.0)";
  } else if (type === "C") {
    // Type C - vertices with exactly 1 topleftfacing bond
    ctx.fillStyle = "rgba(75, 192, 75, 0.0)";  // Green with higher opacity
    ctx.strokeStyle = "rgba(75, 192, 75, 0.0)";
  } else if (type === "D") {
    // Type D - vertices with exactly 1 toprightfacing bond
    ctx.fillStyle = "rgba(153, 102, 255, 0.0)";  // Purple with higher opacity
    ctx.strokeStyle = "rgba(153, 102, 255, 0.0)";
  } else if (type === "E") {
    // Type E - vertices with vertical + topleftfacing bonds
    ctx.fillStyle = "rgba(255, 205, 86, 0.0)";  // Yellow with higher opacity
    ctx.strokeStyle = "rgba(255, 205, 86, 0.0)";
  } else if (type === "F") {
    // Type F - vertices with vertical + toprightfacing bonds
    ctx.fillStyle = "rgba(54, 162, 235, 0.0)";  // Blue with higher opacity
    ctx.strokeStyle = "rgba(54, 162, 235, 0.0)";
  } else if (type === "G") {
    // Type G - vertices with topleftfacing + toprightfacing bonds
    ctx.fillStyle = "rgba(255, 99, 132, 0.0)";  // Pink with higher opacity
    ctx.strokeStyle = "rgba(255, 99, 132, 0.0)";
  } else if (type === "H") {
    // Type H - vertices with exactly 3 bonds
    ctx.fillStyle = "rgba(128, 0, 128, 0.0)";  // Dark purple with higher opacity
    ctx.strokeStyle = "rgba(128, 0, 128, 0.0)";
  } else {
    // Default style for unknown types
    ctx.fillStyle = "rgba(150, 150, 150, 0.0)";
    ctx.strokeStyle = "rgba(150, 150, 150, 0.0)";
  }
  
  ctx.lineWidth = 1.5;
  
  // Draw indicator shape based on whether the vertex is at the top of a hexagon
  // Square for top vertices, circle for bottom vertices
  const indicatorSize = 16; // Size of indicator (diameter for circle, side length for square)
  
  if (isTop) {
    // Draw square for top vertices
    ctx.beginPath();
    ctx.rect(x + 15 - indicatorSize/2, y - 15 - indicatorSize/2, indicatorSize, indicatorSize);
    ctx.fill();
    ctx.stroke();
  } else {
    // Draw circle for bottom vertices
    ctx.beginPath();
    ctx.arc(x + 15, y - 15, indicatorSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  
  // Add the type letter to the indicator
  ctx.fillStyle = "rgba(0, 0, 0, 0.0)";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(type, x + 15, y - 15);
  
  ctx.restore();
}
