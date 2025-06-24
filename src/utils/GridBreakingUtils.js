/**
 * Grid Breaking Utilities
 * Handles detection of off-grid vertices and calculation of grid breaking zones
 */

/**
 * Detects vertices that don't align with the hexagonal grid
 * @param {Array} vertices - Array of vertex objects with x, y properties and isOffGrid boolean
 * @param {Function} findClosestGridVertex - Function to find closest grid vertex
 * @param {number} tolerance - Distance tolerance for grid alignment (default: 5)
 * @returns {Array} Array of off-grid vertices with additional metadata
 */
export const detectOffGridVertices = (vertices, findClosestGridVertex, tolerance = 5) => {
  const offGridVertices = [];
  
  vertices.forEach((vertex, index) => {
    // First check the isOffGrid property - this is the primary indicator
    if (vertex.isOffGrid === true) {
      // This vertex was created as off-grid (from cyclopentane, fourth bonds, text mode, etc.)
      const closestGridResult = findClosestGridVertex(vertex.x, vertex.y, tolerance);
      
      offGridVertices.push({
        ...vertex,
        originalIndex: index,
        distanceFromGrid: closestGridResult ? closestGridResult.distance : null,
        nearestGridVertex: closestGridResult ? closestGridResult.vertex : null,
        type: closestGridResult ? 'displaced' : 'isolated'
      });
    } else if (vertex.isOffGrid === undefined || vertex.isOffGrid === false) {
      // For vertices without the isOffGrid property or explicitly marked as on-grid,
      // fall back to distance-based detection for backwards compatibility
      const closestGridResult = findClosestGridVertex(vertex.x, vertex.y, tolerance);
      
      if (!closestGridResult) {
        // This vertex is not close enough to any grid vertex
        offGridVertices.push({
          ...vertex,
          originalIndex: index,
          distanceFromGrid: null, // No nearby grid vertex found
          type: 'isolated'
        });
      } else {
        // Check if vertex is exactly on grid or slightly off
        const distance = closestGridResult.distance;
        if (distance > tolerance) {
          offGridVertices.push({
            ...vertex,
            originalIndex: index,
            distanceFromGrid: distance,
            nearestGridVertex: closestGridResult.vertex,
            type: 'displaced'
          });
        }
      }
    }
  });
  
  return offGridVertices;
};

/**
 * Analyzes why a vertex is off-grid by checking its bonds
 * @param {Object} vertex - The off-grid vertex
 * @param {Array} segments - Array of all segments/bonds
 * @param {number} tolerance - Small tolerance for floating point comparison
 * @returns {Object} Analysis of the vertex's off-grid status
 */
export const analyzeOffGridReason = (vertex, segments, tolerance = 0.01) => {
  const connectedBonds = segments.filter(seg => 
    seg.bondOrder > 0 && ( // Only actual bonds, not grid lines
      (Math.abs(seg.x1 - vertex.x) < tolerance && Math.abs(seg.y1 - vertex.y) < tolerance) ||
      (Math.abs(seg.x2 - vertex.x) < tolerance && Math.abs(seg.y2 - vertex.y) < tolerance)
    )
  );

  const analysis = {
    bondCount: connectedBonds.length,
    connectedBonds: connectedBonds,
    reasons: []
  };

  // Analyze bond angles
  if (connectedBonds.length >= 2) {
    const angles = connectedBonds.map(bond => {
      // Calculate angle from this vertex to the other end of the bond
      let otherX, otherY;
      if (Math.abs(bond.x1 - vertex.x) < tolerance && Math.abs(bond.y1 - vertex.y) < tolerance) {
        otherX = bond.x2;
        otherY = bond.y2;
      } else {
        otherX = bond.x1;
        otherY = bond.y1;
      }
      
      return Math.atan2(otherY - vertex.y, otherX - vertex.x);
    });

    // Check if angles follow typical organic chemistry patterns
    const angleDifferences = [];
    for (let i = 0; i < angles.length; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        let diff = Math.abs(angles[i] - angles[j]);
        if (diff > Math.PI) diff = 2 * Math.PI - diff; // Get smaller angle
        angleDifferences.push(diff);
      }
    }

    // Check for common molecular geometries
    const hasTetrahedralAngle = angleDifferences.some(angle => 
      Math.abs(angle - Math.PI * 109.47 / 180) < 0.2 // ~109.5° ± tolerance
    );
    const hasTrigonalAngle = angleDifferences.some(angle => 
      Math.abs(angle - Math.PI * 2 / 3) < 0.2 // 120° ± tolerance
    );
    const hasLinearAngle = angleDifferences.some(angle => 
      Math.abs(angle - Math.PI) < 0.2 // 180° ± tolerance
    );

    if (hasTetrahedralAngle) {
      analysis.reasons.push('tetrahedral_geometry');
    }
    if (hasTrigonalAngle) {
      analysis.reasons.push('trigonal_geometry');
    }
    if (hasLinearAngle) {
      analysis.reasons.push('linear_geometry');
    }
  }
  
  // Check for triple bonds
  const hasTripleBond = connectedBonds.some(bond => bond.bondOrder === 3);
  if (hasTripleBond) {
    analysis.reasons.push('triple_bond');
    analysis.reasons.push('linear_geometry');
  }

  // Check for specific structural reasons
  if (connectedBonds.length === 4) {
    analysis.reasons.push('fourth_bond');
  }
  
  // Check if part of a non-hexagonal ring
  if (connectedBonds.length === 2) {
    analysis.reasons.push('potential_ring_strain');
  }

  return analysis;
};

/**
 * Calculates grid breaking zones around off-grid vertices
 * @param {Array} offGridVertices - Array of off-grid vertices from detectOffGridVertices
 * @param {number} hexRadius - Radius of hexagonal grid cells
 * @param {Object} options - Configuration options
 * @returns {Array} Array of grid breaking zone objects
 */
export const calculateGridBreakingZones = (offGridVertices, hexRadius, options = {}) => {
  const {
    suppressionRadiusMultiplier = 1.0, // How far to hide grid lines (reduced to match bond options)
    bondOptionRadiusMultiplier = 1.0,   // How far to show bond options
    overlapMergeThreshold = 0.8         // When to merge overlapping zones
  } = options;

  const zones = offGridVertices.map(vertex => {
    const analysis = vertex.analysis || {};
    
    // Adjust zone size based on the reason for being off-grid
    let suppressionMultiplier = suppressionRadiusMultiplier;
    let bondOptionMultiplier = bondOptionRadiusMultiplier;
    
    if (analysis.reasons?.includes('fourth_bond')) {
      // Fourth bonds need slightly larger suppression zones (reduced from 1.2 to 1.1)
      suppressionMultiplier *= 1.1;
      bondOptionMultiplier *= 1.1;
    }
    
    if (analysis.reasons?.includes('potential_ring_strain')) {
      // Ring strain might need more space for options
      bondOptionMultiplier *= 1.3;
    }

    return {
      center: { x: vertex.x, y: vertex.y },
      vertex: vertex,
      suppressionRadius: hexRadius * suppressionMultiplier,
      bondOptionRadius: hexRadius * bondOptionMultiplier,
      priority: calculateZonePriority(vertex, analysis),
      analysis: analysis
    };
  });

  // Merge overlapping zones if they're too close
  const mergedZones = mergeOverlappingZones(zones, overlapMergeThreshold);
  
  return mergedZones;
};

/**
 * Calculates priority for a grid breaking zone
 * Higher priority zones take precedence in overlapping situations
 * @param {Object} vertex - The off-grid vertex
 * @param {Object} analysis - Analysis from analyzeOffGridReason
 * @returns {number} Priority score (higher = more important)
 */
const calculateZonePriority = (vertex, analysis) => {
  let priority = 1;
  
  // Higher priority for vertices with more bonds
  priority += analysis.bondCount * 0.5;
  
  // Higher priority for specific chemical reasons
  if (analysis.reasons?.includes('fourth_bond')) {
    priority += 2; // Fourth bonds are very important
  }
  
  if (analysis.reasons?.includes('triple_bond')) {
    priority += 2.5; // Triple bonds require linear geometry
  }
  
  if (analysis.reasons?.includes('tetrahedral_geometry')) {
    priority += 1.5; // Tetrahedral centers need space
  }
  
  if (analysis.reasons?.includes('linear_geometry')) {
    priority += 1.5; // Linear systems need specific alignment
  }
  
  if (analysis.reasons?.includes('potential_ring_strain')) {
    priority += 1; // Strained rings need flexibility
  }
  
  return priority;
};

/**
 * Merges overlapping grid breaking zones
 * @param {Array} zones - Array of zone objects
 * @param {number} overlapThreshold - Threshold for merging (0-1)
 * @returns {Array} Array of merged zones
 */
const mergeOverlappingZones = (zones, overlapThreshold) => {
  const mergedZones = [];
  const processed = new Set();
  
  zones.forEach((zone, index) => {
    if (processed.has(index)) return;
    
    const overlappingZones = [zone];
    processed.add(index);
    
    // Find all zones that overlap with this one
    zones.forEach((otherZone, otherIndex) => {
      if (otherIndex === index || processed.has(otherIndex)) return;
      
      const distance = Math.sqrt(
        (zone.center.x - otherZone.center.x) ** 2 + 
        (zone.center.y - otherZone.center.y) ** 2
      );
      
      const combinedRadius = zone.suppressionRadius + otherZone.suppressionRadius;
      const overlapRatio = (combinedRadius - distance) / combinedRadius;
      
      if (overlapRatio > overlapThreshold) {
        overlappingZones.push(otherZone);
        processed.add(otherIndex);
      }
    });
    
    if (overlappingZones.length === 1) {
      // No overlap, keep original zone
      mergedZones.push(zone);
    } else {
      // Merge overlapping zones
      const mergedZone = mergeZones(overlappingZones);
      mergedZones.push(mergedZone);
    }
  });
  
  return mergedZones;
};

/**
 * Merges multiple zones into a single zone
 * @param {Array} zones - Array of zones to merge
 * @returns {Object} Merged zone object
 */
const mergeZones = (zones) => {
  // Calculate weighted center based on priority
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  
  zones.forEach(zone => {
    const weight = zone.priority;
    totalWeight += weight;
    weightedX += zone.center.x * weight;
    weightedY += zone.center.y * weight;
  });
  
  const center = {
    x: weightedX / totalWeight,
    y: weightedY / totalWeight
  };
  
  // Use maximum radii and highest priority
  const maxSuppressionRadius = Math.max(...zones.map(z => z.suppressionRadius));
  const maxBondOptionRadius = Math.max(...zones.map(z => z.bondOptionRadius));
  const maxPriority = Math.max(...zones.map(z => z.priority));
  
  return {
    center: center,
    vertices: zones.map(z => z.vertex), // Multiple vertices in merged zone
    suppressionRadius: maxSuppressionRadius,
    bondOptionRadius: maxBondOptionRadius,
    priority: maxPriority,
    isMerged: true,
    originalZones: zones
  };
};

/**
 * Checks if a point is within any grid breaking zone
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Array} breakingZones - Array of grid breaking zones
 * @param {string} type - Type of check ('suppression' or 'bondOption')
 * @returns {Object|null} The zone containing the point, or null if none
 */
export const isInBreakingZone = (x, y, breakingZones, type = 'suppression') => {
  for (const zone of breakingZones) {
    const radiusKey = type === 'suppression' ? 'suppressionRadius' : 'bondOptionRadius';
    const radius = zone[radiusKey];
    
    const distance = Math.sqrt(
      (x - zone.center.x) ** 2 + (y - zone.center.y) ** 2
    );
    
    if (distance <= radius) {
      return zone;
    }
  }
  
  return null;
};

/**
 * Gets all off-grid vertices with their analysis and zone information
 * @param {Array} vertices - All vertices
 * @param {Array} segments - All segments
 * @param {Function} findClosestGridVertex - Grid vertex finder function
 * @param {number} hexRadius - Hexagonal grid radius
 * @param {Object} options - Configuration options
 * @returns {Object} Complete grid breaking analysis
 */
export const analyzeGridBreaking = (vertices, segments, findClosestGridVertex, hexRadius, options = {}) => {
  // Phase 1.1: Detect off-grid vertices
  const offGridVertices = detectOffGridVertices(vertices, findClosestGridVertex, options.tolerance);
  
  // Analyze why each vertex is off-grid
  const analyzedVertices = offGridVertices.map(vertex => ({
    ...vertex,
    analysis: analyzeOffGridReason(vertex, segments)
  }));
  
  // Phase 1.2: Calculate grid breaking zones
  const breakingZones = calculateGridBreakingZones(analyzedVertices, hexRadius, options);
  
  return {
    offGridVertices: analyzedVertices,
    breakingZones: breakingZones,
    totalOffGrid: analyzedVertices.length,
    totalZones: breakingZones.length,
    gridBreakingActive: analyzedVertices.length > 0
  };
};

/**
 * Removes unused grid elements within breaking zones to create clean white space
 * @param {Array} vertices - Array of all vertices
 * @param {Array} segments - Array of all segments  
 * @param {Object} vertexAtoms - Object mapping vertex keys to atoms
 * @param {Array} breakingZones - Array of grid breaking zones
 * @returns {Object} Object with cleaned vertices and segments arrays
 */
export const removeGridElementsInBreakingZones = (vertices, segments, vertexAtoms, breakingZones) => {
  if (breakingZones.length === 0) {
    return { cleanedVertices: vertices, cleanedSegments: segments };
  }

  // Helper function to check if a vertex is used (has bonds or atoms)
  const isVertexUsed = (vertex) => {
    const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
    
    // Check if vertex has an atom assigned
    if (vertexAtoms[vertexKey]) {
      return true;
    }
    
    // Check if vertex has any actual bonds (bondOrder > 0) connected to it
    const hasRealBonds = segments.some(seg => 
      seg.bondOrder > 0 && (
        (Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) ||
        (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01)
      )
    );
    
    return hasRealBonds;
  };

  // Filter out unused vertices within breaking zones
  const cleanedVertices = vertices.filter(vertex => {
    // Keep all off-grid vertices (they are part of actual structures)
    if (vertex.isOffGrid === true) {
      return true;
    }
    
    // Check if vertex is within any breaking zone
    const inBreakingZone = isInBreakingZone(vertex.x, vertex.y, breakingZones, 'suppression');
    
    if (inBreakingZone) {
      // Only keep vertices that are actually used (have atoms or real bonds)
      return isVertexUsed(vertex);
    }
    
    // Keep all vertices outside breaking zones
    return true;
  });

  // Create a set of remaining vertex keys for efficient lookup
  const remainingVertexKeys = new Set(
    cleanedVertices.map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`)
  );

  // Filter out grid segments (bondOrder === 0) within breaking zones
  // and segments that connect to removed vertices
  const cleanedSegments = segments.filter(segment => {
    // Keep all real bonds (bondOrder > 0)
    if (segment.bondOrder > 0) {
      return true;
    }
    
    // For grid lines (bondOrder === 0), check if they should be removed
    const seg1Key = `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)}`;
    const seg2Key = `${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`;
    
    // Remove segments that connect to vertices that were removed
    if (!remainingVertexKeys.has(seg1Key) || !remainingVertexKeys.has(seg2Key)) {
      return false;
    }
    
    // Check if segment is within any breaking zone
    const segmentCenterX = (segment.x1 + segment.x2) / 2;
    const segmentCenterY = (segment.y1 + segment.y2) / 2;
    const inBreakingZone = isInBreakingZone(segmentCenterX, segmentCenterY, breakingZones, 'suppression');
    
    if (inBreakingZone) {
      // Remove grid lines within breaking zones
      return false;
    }
    
    // Keep grid lines outside breaking zones
    return true;
  });

  return {
    cleanedVertices,
    cleanedSegments
  };
};

/**
 * Generates bond previews for off-grid vertices
 * @param {Array} vertices - Array of all vertices
 * @param {Array} segments - Array of all segments
 * @param {number} hexRadius - Standard bond length
 * @returns {Array} Array of bond preview objects
 */
export const generateBondPreviews = (vertices, segments, hexRadius) => {
  const previews = [];
  
  // Only generate previews for off-grid vertices
  const offGridVertices = vertices.filter(v => v.isOffGrid === true);
  
  offGridVertices.forEach((vertex, vertexIndex) => {
    const existingBonds = getConnectedBonds(vertex, segments);
    
    // Don't generate previews if vertex already has 3 or more bonds (saturated)
    if (existingBonds.length >= 3) {
      return;
    }
    
    // Check if this vertex is part of a linear system first
    if (isVertexInLinearSystem(vertex, segments)) {
      // Generate linear preview (single 180° preview)
      const linearPreviews = generateLinearBondPreview(vertex, segments, hexRadius);
      linearPreviews.forEach(preview => {
        preview.sourceVertexIndex = vertexIndex;
        previews.push(preview);
      });
    } else {
      // Generate normal 120° previews
      const availableAngles = calculateAvailableAngles(vertex, existingBonds);
      const previewAngles = selectOptimalAngles(availableAngles, 2); // Maximum 2 previews
      
      previewAngles.forEach((angle, index) => {
        const endX = vertex.x + Math.cos(angle) * hexRadius;
        const endY = vertex.y + Math.sin(angle) * hexRadius;
        
        previews.push({
          id: `${vertex.x.toFixed(2)}-${vertex.y.toFixed(2)}-${index}`,
          x1: vertex.x,
          y1: vertex.y,
          x2: endX,
          y2: endY,
          sourceVertexKey: `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`,
          sourceVertexIndex: vertexIndex,
          angle: angle,
          length: hexRadius,
          isVisible: true
        });
      });
    }
  });
  
  return previews;
};

/**
 * Gets all bonds connected to a specific vertex
 * @param {Object} vertex - The vertex to check
 * @param {Array} segments - Array of all segments
 * @returns {Array} Array of connected bond segments
 */
const getConnectedBonds = (vertex, segments) => {
  return segments.filter(seg => 
    seg.bondOrder > 0 && ( // Only actual bonds, not grid lines
      (Math.abs(seg.x1 - vertex.x) < 0.01 && Math.abs(seg.y1 - vertex.y) < 0.01) ||
      (Math.abs(seg.x2 - vertex.x) < 0.01 && Math.abs(seg.y2 - vertex.y) < 0.01)
    )
  );
};

/**
 * Calculates optimal angles for bond previews using 120° molecular geometry
 * @param {Object} vertex - The vertex to analyze
 * @param {Array} existingBonds - Array of bonds connected to this vertex
 * @returns {Array} Array of optimal angles in radians for 120° spacing
 */
const calculateAvailableAngles = (vertex, existingBonds) => {
  // Convert existing bonds to their angles from this vertex
  const occupiedAngles = existingBonds.map(bond => {
    // Determine which end of the bond is connected to our vertex
    let otherX, otherY;
    if (Math.abs(bond.x1 - vertex.x) < 0.01 && Math.abs(bond.y1 - vertex.y) < 0.01) {
      otherX = bond.x2;
      otherY = bond.y2;
    } else {
      otherX = bond.x1;
      otherY = bond.y1;
    }
    
    // Calculate angle from vertex to the other end
    return Math.atan2(otherY - vertex.y, otherX - vertex.x);
  });

  if (occupiedAngles.length === 0) {
    // No existing bonds - place two previews 120° apart
    // Start at 0° and place second at 120°
    return [0, (120 * Math.PI) / 180];
  } else if (occupiedAngles.length === 1) {
    // One existing bond - place two previews 120° away from it
    const existingAngle = occupiedAngles[0];
    const angle1 = existingAngle + (120 * Math.PI) / 180;
    const angle2 = existingAngle - (120 * Math.PI) / 180;
    
    // Normalize angles to [0, 2π)
    const normalizeAngle = (angle) => {
      while (angle < 0) angle += 2 * Math.PI;
      while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
      return angle;
    };
    
    return [normalizeAngle(angle1), normalizeAngle(angle2)];
  } else if (occupiedAngles.length === 2) {
    // Two existing bonds - find the angle that's 120° from both
    const angle1 = occupiedAngles[0];
    const angle2 = occupiedAngles[1];
    
    // Calculate the angle between the two existing bonds
    let angleDiff = angle2 - angle1;
    if (angleDiff < 0) angleDiff += 2 * Math.PI;
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    // Find the bisector angle between the two bonds
    let bisector = (angle1 + angle2) / 2;
    if (Math.abs(angle2 - angle1) > Math.PI) {
      bisector += Math.PI; // Flip to the larger arc
    }
    
    // The optimal third bond is 120° from both, which is opposite the bisector
    let optimalAngle = bisector + Math.PI;
    
    // Normalize angle to [0, 2π)
    while (optimalAngle < 0) optimalAngle += 2 * Math.PI;
    while (optimalAngle >= 2 * Math.PI) optimalAngle -= 2 * Math.PI;
    
    return [optimalAngle];
  }
  
  // Three or more bonds - no more previews
  return [];
};

/**
 * Selects optimal angles for bond previews (now just returns the calculated angles)
 * @param {Array} availableAngles - Array of optimal angles in radians (already calculated)
 * @param {number} maxPreviews - Maximum number of previews to generate
 * @returns {Array} Array of selected optimal angles
 */
const selectOptimalAngles = (availableAngles, maxPreviews) => {
  // The calculateAvailableAngles function now returns pre-calculated optimal angles
  // with proper 120° spacing, so we just return them (up to the max limit)
  return availableAngles.slice(0, maxPreviews);
};

/**
 * Checks if a point is close to a bond preview line
 * @param {number} x - X coordinate of the point
 * @param {number} y - Y coordinate of the point  
 * @param {Object} preview - Bond preview object
 * @param {Object} offset - Canvas offset object
 * @param {number} tolerance - Click tolerance in pixels
 * @returns {boolean} True if point is on the preview line
 */
export const isPointOnBondPreview = (x, y, preview, offset, tolerance = 15) => {
  // Convert preview coordinates to screen coordinates
  const x1 = preview.x1 + offset.x;
  const y1 = preview.y1 + offset.y;
  const x2 = preview.x2 + offset.x;
  const y2 = preview.y2 + offset.y;
  
  // Calculate distance from point to line segment
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  
  if (len_sq === 0) {
    // Line segment is actually a point
    return Math.sqrt(A * A + B * B) <= tolerance;
  }
  
  let param = dot / len_sq;
  param = Math.max(0, Math.min(1, param));
  
  const projX = x1 + param * C;
  const projY = y1 + param * D;
  
  const dx = x - projX;
  const dy = y - projY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= tolerance;
};

/**
 * Checks if a vertex is part of a linear system (connected to triple bonds or aligned bonds)
 * @param {Object} vertex - The vertex to check
 * @param {Array} segments - Array of all segments
 * @returns {boolean} True if the vertex is in a linear system
 */
export const isVertexInLinearSystem = (vertex, segments) => {
  const connectedBonds = getConnectedBonds(vertex, segments);
  
  // Check if vertex is connected to any triple bonds
  const hasTripleBond = connectedBonds.some(bond => bond.bondOrder === 3);
  if (hasTripleBond) {
    return true;
  }
  
  // Check if vertex has exactly 2 bonds that are 180° apart (linear arrangement)
  if (connectedBonds.length === 2) {
    const angles = connectedBonds.map(bond => {
      // Determine which end of the bond is connected to our vertex
      let otherX, otherY;
      if (Math.abs(bond.x1 - vertex.x) < 0.01 && Math.abs(bond.y1 - vertex.y) < 0.01) {
        otherX = bond.x2;
        otherY = bond.y2;
      } else {
        otherX = bond.x1;
        otherY = bond.y1;
      }
      
      // Calculate angle from vertex to the other end
      return Math.atan2(otherY - vertex.y, otherX - vertex.x);
    });
    
    // Calculate angle difference
    let angleDiff = Math.abs(angles[0] - angles[1]);
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }
    
    // Check if angles are approximately 180° apart (linear)
    const isLinear = Math.abs(angleDiff - Math.PI) < 0.1; // ~5.7° tolerance
    return isLinear;
  }
  
  return false;
};

/**
 * Gets the linear axis direction for a vertex in a linear system
 * @param {Object} vertex - The vertex to analyze
 * @param {Array} segments - Array of all segments
 * @returns {number|null} Angle in radians of the linear axis, or null if not linear
 */
export const getLinearAxis = (vertex, segments) => {
  const connectedBonds = getConnectedBonds(vertex, segments);
  
  if (connectedBonds.length === 0) {
    return null;
  }
  
  // If connected to a triple bond, use its direction
  const tripleBond = connectedBonds.find(bond => bond.bondOrder === 3);
  if (tripleBond) {
    // Calculate angle from vertex to the other end of the triple bond
    let otherX, otherY;
    if (Math.abs(tripleBond.x1 - vertex.x) < 0.01 && Math.abs(tripleBond.y1 - vertex.y) < 0.01) {
      otherX = tripleBond.x2;
      otherY = tripleBond.y2;
    } else {
      otherX = tripleBond.x1;
      otherY = tripleBond.y1;
    }
    
    return Math.atan2(otherY - vertex.y, otherX - vertex.x);
  }
  
  // If vertex has exactly 2 bonds that are linear, return their axis
  if (connectedBonds.length === 2) {
    const angles = connectedBonds.map(bond => {
      let otherX, otherY;
      if (Math.abs(bond.x1 - vertex.x) < 0.01 && Math.abs(bond.y1 - vertex.y) < 0.01) {
        otherX = bond.x2;
        otherY = bond.y2;
      } else {
        otherX = bond.x1;
        otherY = bond.y1;
      }
      
      return Math.atan2(otherY - vertex.y, otherX - vertex.x);
    });
    
    // Check if they're linear
    let angleDiff = Math.abs(angles[0] - angles[1]);
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }
    
    if (Math.abs(angleDiff - Math.PI) < 0.1) {
      // Return the angle of the first bond (the axis direction)
      return angles[0];
    }
  }
  
  // If there's only one bond and it's part of a linear chain, use its direction
  if (connectedBonds.length === 1) {
    const bond = connectedBonds[0];
    let otherX, otherY;
    if (Math.abs(bond.x1 - vertex.x) < 0.01 && Math.abs(bond.y1 - vertex.y) < 0.01) {
      otherX = bond.x2;
      otherY = bond.y2;
    } else {
      otherX = bond.x1;
      otherY = bond.y1;
    }
    
    return Math.atan2(otherY - vertex.y, otherX - vertex.x);
  }
  
  return null;
};

/**
 * Generates bond preview for a linear vertex (single 180° preview)
 * @param {Object} vertex - The vertex to generate preview for
 * @param {Array} segments - Array of all segments
 * @param {number} hexRadius - Standard bond length
 * @returns {Array} Array containing single linear bond preview
 */
export const generateLinearBondPreview = (vertex, segments, hexRadius) => {
  const previews = [];
  const linearAxis = getLinearAxis(vertex, segments);
  
  if (linearAxis === null) {
    return previews;
  }
  
  const connectedBonds = getConnectedBonds(vertex, segments);
  
  // If vertex already has 2 or more bonds, don't show preview
  if (connectedBonds.length >= 2) {
    return previews;
  }
  
  // Calculate the 180° opposite direction
  let previewAngle;
  if (connectedBonds.length === 1) {
    // Place preview 180° from the existing bond
    previewAngle = linearAxis + Math.PI;
  } else {
    // No bonds yet, just use the linear axis direction
    previewAngle = linearAxis;
  }
  
  // Normalize angle to [0, 2π)
  while (previewAngle < 0) previewAngle += 2 * Math.PI;
  while (previewAngle >= 2 * Math.PI) previewAngle -= 2 * Math.PI;
  
  const endX = vertex.x + Math.cos(previewAngle) * hexRadius;
  const endY = vertex.y + Math.sin(previewAngle) * hexRadius;
  
  previews.push({
    id: `${vertex.x.toFixed(2)}-${vertex.y.toFixed(2)}-linear`,
    x1: vertex.x,
    y1: vertex.y,
    x2: endX,
    y2: endY,
    sourceVertexKey: `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`,
    angle: previewAngle,
    length: hexRadius,
    isVisible: true,
    isLinear: true
  });
  
  return previews;
}; 