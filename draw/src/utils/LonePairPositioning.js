/**
 * Smart Positioning System for Lone Pairs and Charges
 * 
 * This system analyzes the molecular environment around each atom to determine
 * optimal positions for lone pairs and charges that avoid overlaps with bonds,
 * other atoms, and existing lone pairs/charges.
 */

/**
 * Analyzes the bonding environment around a vertex to determine available positions
 * @param {Object} vertex - The vertex to analyze
 * @param {Array} segments - All bond segments
 * @param {Object} vertexAtoms - Atom data for all vertices
 * @returns {Object} Analysis of the vertex environment
 */
export const analyzeVertexEnvironment = (vertex, segments, vertexAtoms) => {
  const connectedBonds = getConnectedBonds(vertex, segments);
  const bondAngles = connectedBonds.map(bond => getBondAngle(bond, vertex));
  
  // Sort angles for easier processing
  bondAngles.sort((a, b) => a - b);
  
  // Calculate available sectors between bonds
  const availableSectors = calculateAvailableSectors(bondAngles);
  
  // Get atom information for this vertex
  const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
  const atomData = vertexAtoms[vertexKey];
  
  return {
    vertex,
    connectedBonds,
    bondAngles,
    availableSectors,
    atomData,
    bondCount: connectedBonds.length
  };
};

/**
 * Gets all actual bonds connected to a vertex (excludes grid lines and previews)
 * @param {Object} vertex - The vertex to check
 * @param {Array} segments - All bond segments
 * @returns {Array} Connected bond segments
 */
export const getConnectedBonds = (vertex, segments) => {
  return segments.filter(segment => {
    // Only include actual bonds (bondOrder > 0), exclude grid lines and previews
    if (!segment.bondOrder || segment.bondOrder <= 0) return false;
    
    // Skip if this is a preview or suggestion (these typically don't have bondOrder set properly)
    if (segment.isPreview || segment.isSuggestion) return false;
    
    const isConnectedToStart = Math.abs(segment.x1 - vertex.x) < 0.01 && 
                              Math.abs(segment.y1 - vertex.y) < 0.01;
    const isConnectedToEnd = Math.abs(segment.x2 - vertex.x) < 0.01 && 
                            Math.abs(segment.y2 - vertex.y) < 0.01;
    
    return isConnectedToStart || isConnectedToEnd;
  });
};

/**
 * Calculates the angle of a bond from the perspective of a specific vertex
 * @param {Object} bond - The bond segment
 * @param {Object} vertex - The vertex to calculate angle from
 * @returns {number} Angle in radians (0 to 2π)
 */
export const getBondAngle = (bond, vertex) => {
  let angle;
  
  // Determine which end of the bond is at this vertex
  const isAtStart = Math.abs(bond.x1 - vertex.x) < 0.01 && 
                   Math.abs(bond.y1 - vertex.y) < 0.01;
  
  if (isAtStart) {
    // Angle from vertex to the other end
    angle = Math.atan2(bond.y2 - bond.y1, bond.x2 - bond.x1);
  } else {
    // Angle from vertex to the other end (reversed)
    angle = Math.atan2(bond.y1 - bond.y2, bond.x1 - bond.x2);
  }
  
  // Normalize to 0-2π range
  return angle < 0 ? angle + 2 * Math.PI : angle;
};

/**
 * Calculates available sectors between bonds for placing lone pairs/charges
 * @param {Array} bondAngles - Sorted array of bond angles in radians
 * @returns {Array} Available sectors with start/end angles and sizes
 */
export const calculateAvailableSectors = (bondAngles) => {
  if (bondAngles.length === 0) {
    // No bonds - entire circle is available
    return [{
      startAngle: 0,
      endAngle: 2 * Math.PI,
      size: 2 * Math.PI,
      midAngle: Math.PI
    }];
  }
  
  if (bondAngles.length === 1) {
    // One bond - opposite side is preferred
    const bondAngle = bondAngles[0];
    const oppositeAngle = (bondAngle + Math.PI) % (2 * Math.PI);
    
    return [{
      startAngle: 0,
      endAngle: 2 * Math.PI,
      size: 2 * Math.PI,
      midAngle: oppositeAngle,
      preferred: true
    }];
  }
  
  const sectors = [];
  
  // Calculate sectors between consecutive bonds
  for (let i = 0; i < bondAngles.length; i++) {
    const currentAngle = bondAngles[i];
    const nextAngle = bondAngles[(i + 1) % bondAngles.length];
    
    let sectorSize;
    let endAngle;
    
    if (i === bondAngles.length - 1) {
      // Last sector: from last bond to first bond (wrapping around)
      sectorSize = (2 * Math.PI - currentAngle) + bondAngles[0];
      endAngle = bondAngles[0];
    } else {
      // Regular sector between consecutive bonds
      sectorSize = nextAngle - currentAngle;
      endAngle = nextAngle;
    }
    
    const midAngle = i === bondAngles.length - 1 ? 
      (currentAngle + sectorSize / 2) % (2 * Math.PI) :
      currentAngle + sectorSize / 2;
    
    sectors.push({
      startAngle: currentAngle,
      endAngle: endAngle,
      size: sectorSize,
      midAngle: midAngle
    });
  }
  
  return sectors;
};

/**
 * Determines optimal positions for lone pairs around a vertex using cardinal directions
 * @param {Object} environment - Vertex environment analysis
 * @param {number} lonePairCount - Number of lone pairs to position
 * @returns {Array} Optimal positions for lone pairs
 */
export const calculateLonePairPositions = (environment, lonePairCount) => {
  if (lonePairCount === 0) return [];
  
  const { bondAngles, vertex, atomData } = environment;
  const positions = [];
  
  // Cardinal directions in radians: 0° (right), 90° (down), 180° (left), 270° (up)
  const cardinalAngles = [
    0,                    // 0° - right
    Math.PI / 2,         // 90° - down  
    Math.PI,             // 180° - left
    3 * Math.PI / 2      // 270° - up
  ];
  
  // Base distance from vertex center for lone pair dots
  const baseLonePairDistance = 22;
  
  // Calculate text width to adjust horizontal lone pair distances
  let textWidth = 0;
  if (atomData && atomData.symbol) {
    // Estimate text width (rough calculation, will be refined)
    textWidth = atomData.symbol.length * 13; // Approximate 13px per character
  }
  
  // Find which cardinal directions are occupied by bonds
  const occupiedCardinals = new Set();
  const tolerance = Math.PI / 12; // 15 degrees tolerance
  
  bondAngles.forEach(bondAngle => {
    cardinalAngles.forEach((cardinalAngle, index) => {
      let angleDiff = Math.abs(bondAngle - cardinalAngle);
      // Handle wrap-around (e.g., difference between 350° and 10°)
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      if (angleDiff < tolerance) {
        occupiedCardinals.add(index);
      }
    });
  });
  
  // Get available cardinal directions
  const availableCardinals = cardinalAngles
    .map((angle, index) => ({ angle, index }))
    .filter(({ index }) => !occupiedCardinals.has(index));
  
  // Convert total electron count to positions with dot counts
  // Each position can have 1 or 2 dots
  // Strategy: Fill positions with pairs (2 dots) first, then singles
  const positionPriority = bondAngles.length === 0 
    ? [3, 0, 1, 2] // up, right, down, left when no bonds
    : [];
  
  if (bondAngles.length === 0) {
    // Distribute dots across cardinal positions
    const dotsPerPosition = [];
    let remainingDots = lonePairCount;
    
    // First pass: try to create complete pairs (2 dots each)
    for (let i = 0; i < Math.min(4, Math.floor(lonePairCount / 2)); i++) {
      dotsPerPosition.push(2);
      remainingDots -= 2;
    }
    
    // Second pass: add remaining single dots
    while (remainingDots > 0 && dotsPerPosition.length < 4) {
      dotsPerPosition.push(1);
      remainingDots -= 1;
    }
    
    // Create positions
    for (let i = 0; i < dotsPerPosition.length; i++) {
      const cardinalIndex = positionPriority[i];
      const angle = cardinalAngles[cardinalIndex];
      
      // Adjust distance for horizontal positions based on text width
      let adjustedDistance = baseLonePairDistance;
      if (cardinalIndex === 0 || cardinalIndex === 2) {
        // Right (0°) or Left (180°) - add portion of text width (reduced factor)
        adjustedDistance = baseLonePairDistance + textWidth / 3;
      } else if (cardinalIndex === 3) {
        // Up (270°) - add a bit more distance
        adjustedDistance = baseLonePairDistance + 4;
      }
      
      const x = vertex.x + Math.cos(angle) * adjustedDistance;
      const y = vertex.y + Math.sin(angle) * adjustedDistance;
      
      positions.push({
        x: x,
        y: y,
        angle: angle,
        index: i,
        cardinal: cardinalIndex,
        dotCount: dotsPerPosition[i]
      });
    }
    return positions;
  }
  
  // With bonds present, use enhanced priority logic based on bond directions
  const priorityOrder = [];
  
  // Analyze bond directions using broad angular sectors (90° each)
  // Right sector: -45° to 45° (315° to 45°)
  // Down sector: 45° to 135°
  // Left sector: 135° to 225°
  // Up sector: 225° to 315°
  
  let hasBondFromRight = false;
  let hasBondFromLeft = false;
  let hasBondFromUp = false;
  let hasBondFromDown = false;
  
  bondAngles.forEach(angle => {
    // Normalize angle to 0-360° range for easier sector checking
    let degrees = (angle * 180 / Math.PI) % 360;
    if (degrees < 0) degrees += 360;
    
    // Check which sector this bond is in (with 90° sectors)
    if ((degrees >= 315 && degrees <= 360) || (degrees >= 0 && degrees < 45)) {
      hasBondFromRight = true;
    } else if (degrees >= 45 && degrees < 135) {
      hasBondFromDown = true;
    } else if (degrees >= 135 && degrees < 225) {
      hasBondFromLeft = true;
    } else if (degrees >= 225 && degrees < 315) {
      hasBondFromUp = true;
    }
  });
  
  // Smart priority based on bond configuration
  if (hasBondFromLeft && !hasBondFromRight) {
    // Bond(s) from left → prioritize right first
    const rightPriority = [0, 3, 1, 2]; // right, up, down, left
    rightPriority.forEach(idx => {
      if (!occupiedCardinals.has(idx) && !priorityOrder.includes(idx)) {
        priorityOrder.push(idx);
      }
    });
  } else if (hasBondFromRight && !hasBondFromLeft) {
    // Bond(s) from right → prioritize left first
    const leftPriority = [2, 3, 1, 0]; // left, up, down, right
    leftPriority.forEach(idx => {
      if (!occupiedCardinals.has(idx) && !priorityOrder.includes(idx)) {
        priorityOrder.push(idx);
      }
    });
  } else if (hasBondFromLeft && hasBondFromRight) {
    // Bonds from both left and right → prioritize vertical
    if (!hasBondFromUp && !hasBondFromDown) {
      // No vertical bonds, prefer up first
      const verticalPriority = [3, 1]; // up, down
      verticalPriority.forEach(idx => {
        if (!occupiedCardinals.has(idx) && !priorityOrder.includes(idx)) {
          priorityOrder.push(idx);
        }
      });
    } else if (hasBondFromUp && !hasBondFromDown) {
      // Bond from up, prefer down
      const verticalPriority = [1, 3]; // down, up
      verticalPriority.forEach(idx => {
        if (!occupiedCardinals.has(idx) && !priorityOrder.includes(idx)) {
          priorityOrder.push(idx);
        }
      });
    } else {
      // Default vertical priority
      const verticalPriority = [3, 1]; // up, down
      verticalPriority.forEach(idx => {
        if (!occupiedCardinals.has(idx) && !priorityOrder.includes(idx)) {
          priorityOrder.push(idx);
        }
      });
    }
  } else if (hasBondFromUp && !hasBondFromDown) {
    // Bond from top → prioritize bottom
    const downPriority = [1, 0, 2, 3]; // down, right, left, up
    downPriority.forEach(idx => {
      if (!occupiedCardinals.has(idx) && !priorityOrder.includes(idx)) {
        priorityOrder.push(idx);
      }
    });
  } else if (hasBondFromDown && !hasBondFromUp) {
    // Bond from bottom → prioritize top
    const upPriority = [3, 0, 2, 1]; // up, right, left, down
    upPriority.forEach(idx => {
      if (!occupiedCardinals.has(idx) && !priorityOrder.includes(idx)) {
        priorityOrder.push(idx);
      }
    });
  } else {
    // Default: add positions opposite to existing bonds first
    bondAngles.forEach(bondAngle => {
      const oppositeAngle = (bondAngle + Math.PI) % (2 * Math.PI);
      cardinalAngles.forEach((cardinalAngle, index) => {
        let angleDiff = Math.abs(oppositeAngle - cardinalAngle);
        if (angleDiff > Math.PI) {
          angleDiff = 2 * Math.PI - angleDiff;
        }
        
        if (angleDiff < tolerance && !occupiedCardinals.has(index)) {
          if (!priorityOrder.includes(index)) {
            priorityOrder.push(index);
          }
        }
      });
    });
  }
  
  // Add remaining available positions in standard order
  const standardOrder = [3, 0, 1, 2]; // up, right, down, left
  standardOrder.forEach(index => {
    if (!occupiedCardinals.has(index) && !priorityOrder.includes(index)) {
      priorityOrder.push(index);
    }
  });
  
  // Distribute dots across available positions (up to 8 dots total, 4 positions, 2 dots max per position)
  // Strategy: Fill each position completely (2 dots) before moving to next position
  // Click 1 → pos1: 1 dot
  // Click 2 → pos1: 2 dots (complete the pair)
  // Click 3 → pos2: 1 dot
  // Click 4 → pos2: 2 dots (complete the pair)
  // etc.
  
  const dotsPerPosition = [];
  let remainingDots = lonePairCount;
  const maxPositions = Math.min(priorityOrder.length, 4);
  
  for (let i = 0; i < maxPositions && remainingDots > 0; i++) {
    if (remainingDots >= 2) {
      // Add a complete pair (2 dots)
      dotsPerPosition.push(2);
      remainingDots -= 2;
    } else {
      // Add a single dot
      dotsPerPosition.push(1);
      remainingDots -= 1;
    }
  }
  
  // Create positions based on priority order
  for (let i = 0; i < dotsPerPosition.length; i++) {
    const cardinalIndex = priorityOrder[i];
    const angle = cardinalAngles[cardinalIndex];
    
    // Adjust distance for horizontal positions based on text width
    let adjustedDistance = baseLonePairDistance;
    if (cardinalIndex === 0 || cardinalIndex === 2) {
      // Right (0°) or Left (180°) - add portion of text width (reduced factor)
      adjustedDistance = baseLonePairDistance + textWidth / 3;
    } else if (cardinalIndex === 3) {
      // Up (270°) - add a bit more distance
      adjustedDistance = baseLonePairDistance + 4;
    }
    
    const x = vertex.x + Math.cos(angle) * adjustedDistance;
    const y = vertex.y + Math.sin(angle) * adjustedDistance;
    
    positions.push({
      x: x,
      y: y,
      angle: angle,
      index: i,
      cardinal: cardinalIndex,
      dotCount: dotsPerPosition[i]
    });
  }
  
  return positions;
};

/**
 * Determines optimal position for a charge symbol around a vertex using cardinal directions
 * @param {Object} environment - Vertex environment analysis
 * @param {number} charge - Charge value (+1, -1, etc.)
 * @param {Array} existingLonePairs - Existing lone pair positions
 * @returns {Object} Optimal position for the charge
 */
export const calculateChargePosition = (environment, charge, existingLonePairs = []) => {
  const { bondAngles, vertex } = environment;
  
  // Distance from vertex center for charge symbols
  const chargeDistance = 30; // pixels from vertex center
  
  // Cardinal directions in radians: 0° (right), 90° (down), 180° (left), 270° (up)
  const cardinalAngles = [
    0,                    // 0° - right
    Math.PI / 2,         // 90° - down  
    Math.PI,             // 180° - left
    3 * Math.PI / 2      // 270° - up
  ];
  
  const tolerance = Math.PI / 12; // 15 degrees tolerance
  
  // Find which cardinal directions are occupied by bonds
  const occupiedByBonds = new Set();
  bondAngles.forEach(bondAngle => {
    cardinalAngles.forEach((cardinalAngle, index) => {
      let angleDiff = Math.abs(bondAngle - cardinalAngle);
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      if (angleDiff < tolerance) {
        occupiedByBonds.add(index);
      }
    });
  });
  
  // Find which cardinal directions are occupied by lone pairs
  const occupiedByLonePairs = new Set();
  existingLonePairs.forEach(lonePair => {
    cardinalAngles.forEach((cardinalAngle, index) => {
      let angleDiff = Math.abs(lonePair.angle - cardinalAngle);
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      if (angleDiff < tolerance) {
        occupiedByLonePairs.add(index);
      }
    });
  });
  
  // Find available cardinal directions
  const availableCardinals = [];
  cardinalAngles.forEach((angle, index) => {
    if (!occupiedByBonds.has(index) && !occupiedByLonePairs.has(index)) {
      availableCardinals.push({ angle, index });
    }
  });
  
  // Choose the best available position
  let bestAngle;
  if (availableCardinals.length > 0) {
    // Prefer top position (270°) if available
    const topPosition = availableCardinals.find(({ index }) => index === 3);
    if (topPosition) {
      bestAngle = topPosition.angle;
    } else {
      // Otherwise use the first available
      bestAngle = availableCardinals[0].angle;
    }
  } else {
    // All cardinal directions are occupied - use diagonal positions
    // Diagonal angles: 45° (top-right), 135° (top-left), 225° (bottom-left), 315° (bottom-right)
    const diagonalAngles = [
      7 * Math.PI / 4,   // 315° - top-right (NE)
      Math.PI / 4,       // 45° - top-right (actually, let me fix this)
      3 * Math.PI / 4,   // 135° - top-left (NW)
      5 * Math.PI / 4    // 225° - bottom-left (SW)
    ];
    
    // Smart selection based on which bonds are present
    // If bond at 90° (down), prefer top diagonals (315°, 45°)
    // If bond at 270° (up), prefer bottom diagonals (135°, 225°)
    
    const hasBondDown = occupiedByBonds.has(1); // 90° - down
    const hasBondUp = occupiedByBonds.has(3);   // 270° - up
    
    if (hasBondDown) {
      // Prefer top diagonals (315° top-right or 45° top-right)
      bestAngle = 7 * Math.PI / 4; // 315° - top-right
    } else if (hasBondUp) {
      // Prefer bottom diagonals (225° bottom-left or 135° bottom-left)  
      bestAngle = 5 * Math.PI / 4; // 225° - bottom-left
    } else {
      // Default to top-right diagonal
      bestAngle = 7 * Math.PI / 4; // 315° - top-right
    }
  }
  
  const x = vertex.x + Math.cos(bestAngle) * chargeDistance;
  const y = vertex.y + Math.sin(bestAngle) * chargeDistance;
  
  return {
    x: x,
    y: y,
    angle: bestAngle,
    charge: charge
  };
};

/**
 * Main function to calculate smart positioning for lone pairs and charges
 * @param {Object} vertex - The vertex to analyze
 * @param {Array} segments - All bond segments
 * @param {Object} vertexAtoms - Atom data for all vertices
 * @param {number} lonePairCount - Number of lone pairs
 * @param {number} charge - Charge value
 * @returns {Object} Positioning data for lone pairs and charges
 */
export const calculateSmartPositioning = (vertex, segments, vertexAtoms, lonePairCount = 0, charge = 0) => {
  // Analyze the molecular environment around this vertex
  const environment = analyzeVertexEnvironment(vertex, segments, vertexAtoms);
  
  // Calculate lone pair positions
  const lonePairPositions = calculateLonePairPositions(environment, lonePairCount);
  
  // Calculate charge position (if there is a charge)
  const chargePosition = charge !== 0 ? 
    calculateChargePosition(environment, charge, lonePairPositions) : null;
  
  return {
    environment,
    lonePairPositions,
    chargePosition,
    vertex
  };
};

/**
 * Legacy function for compatibility with existing code
 * @param {Array} connectedBonds - Connected bonds
 * @param {Object} vertex - The vertex
 * @returns {Array} Priority order for lone pair positions
 */
export const getLonePairPositionOrder = (connectedBonds, vertex) => {
  // Simple implementation for now - can be enhanced later
  const bondAngles = connectedBonds.map(bond => getBondAngle(bond, vertex));
  bondAngles.sort((a, b) => a - b);
  
  // Return a simple priority order based on available space
  const availableSectors = calculateAvailableSectors(bondAngles);
  return availableSectors.map((sector, index) => ({
    angle: sector.midAngle,
    priority: availableSectors.length - index
  }));
};
