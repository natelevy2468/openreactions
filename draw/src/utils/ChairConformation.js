// Chair Conformation Utility Functions
// Handles the generation and management of chair conformation presets

/**
 * Generate chair conformation preset with proper 3D perspective in 2D
 * Creates a 6-membered ring in chair conformation with axial and equatorial bonds
 * 
 * @param {number} hexRadius - Base bond length
 * @param {function} calculateBondDirection - Function to calculate bond direction
 * @param {object} options - Optional geometry adjustments
 */
export const generateChairPreset = (hexRadius, calculateBondDirection, options = {}) => {
  // Allow manual geometry adjustments
  const config = {
    slantAngle: options.slantAngle || Math.PI / 3, // 60° default, adjustable
    widthScale: options.widthScale || 1.0,         // Horizontal scaling
    heightScale: options.heightScale || 1.0,       // Vertical scaling
    symmetryOffset: options.symmetryOffset || 0,   // For fine-tuning symmetry
    ...options
  };
  const chairVertices = [];
  const chairSegments = [];
  
  // Chair conformation geometry - designed to simulate 3D perspective in 2D
  // The chair has a characteristic shape with alternating high/low positions
  
  // Design proper chair conformation with characteristic chair shape
  // A chair should have the classic zigzag pattern: \‾\_/‾\
  
  const bondLength = hexRadius; // Base bond length
  
  // Allow manual coordinate override for perfect chair shape
  let chairPositions;
  
  if (config.manualCoordinates) {
    chairPositions = config.manualCoordinates.map(coord => ({
      x: coord.x * config.widthScale + config.symmetryOffset,
      y: coord.y * config.heightScale
    }));
  } else {
    // Mathematical approach: create chair pattern
    chairPositions = [
      // Try to create the exact pattern from reference image
      { x: -bondLength * 0.8 + config.symmetryOffset, y: bondLength * 0.3 },
      { x: bondLength * 0.8 + config.symmetryOffset, y: bondLength * 0.3 },
      { x: bondLength * 1.2 + config.symmetryOffset, y: -bondLength * 0.4 },
      { x: bondLength * 0.4 + config.symmetryOffset, y: -bondLength * 0.7 },
      { x: -bondLength * 0.4 + config.symmetryOffset, y: -bondLength * 0.7 },
      { x: -bondLength * 1.2 + config.symmetryOffset, y: -bondLength * 0.4 }
    ];
  }
  
  // Create chair ring vertices
  chairPositions.forEach((pos, index) => {
    chairVertices.push({
      x: pos.x,
      y: pos.y,
      isOffGrid: true, // Chair conformations don't align with hex grid
      chairPosition: index, // Track position for bond orientation
      chairType: 'ring' // Mark as ring vertex
    });
  });
  
  // Create the 6 ring bonds forming the chair
  const ringConnections = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]
  ];
  
  ringConnections.forEach(([startIdx, endIdx]) => {
    const startVertex = chairVertices[startIdx];
    const endVertex = chairVertices[endIdx];
    const direction = calculateBondDirection(startVertex.x, startVertex.y, endVertex.x, endVertex.y);
    
    chairSegments.push({
      vertex1Index: startIdx,
      vertex2Index: endIdx,
      x1: startVertex.x,
      y1: startVertex.y,
      x2: endVertex.x,
      y2: endVertex.y,
      bondOrder: 1,
      bondType: null,
      bondDirection: 1,
      direction: direction,
      flipSmallerLine: false
    });
  });
  
  // For now, just create the basic chair ring - no axial/equatorial bonds yet
  
  return {
    vertices: chairVertices,
    segments: chairSegments,
    arrows: []
  };
};

/**
 * Calculate axial bond position for a given chair vertex
 * Axial bonds point roughly up/down, parallel to the chair axis
 */
const calculateAxialBond = (ringVertex, ringIndex, hexRadius) => {
  // Axial bond angles depend on chair position
  // Alternating pattern: up, down, up, down, up, down
  const isUpward = ringIndex % 2 === 0;
  
  // Base axial angle (nearly vertical with slight perspective)
  const baseAngle = isUpward ? -85 * Math.PI / 180 : 85 * Math.PI / 180; // Almost vertical
  
  // Add slight perspective shift based on position
  const perspectiveShift = (ringIndex < 3 ? -5 : 5) * Math.PI / 180;
  const axialAngle = baseAngle + perspectiveShift;
  
  const bondLength = hexRadius * 0.9; // Slightly shorter for visual clarity
  
  return {
    endX: ringVertex.x + Math.cos(axialAngle) * bondLength,
    endY: ringVertex.y + Math.sin(axialAngle) * bondLength,
    type: 'axial',
    isUpward: isUpward
  };
};

/**
 * Calculate equatorial bond position for a given chair vertex  
 * Equatorial bonds point outward around the ring "equator"
 */
const calculateEquatorialBond = (ringVertex, ringIndex, hexRadius) => {
  // Equatorial bonds angle outward from the ring
  // Each position has a specific optimal angle
  const equatorialAngles = [
    -30 * Math.PI / 180,  // Position 0: down-right
    -150 * Math.PI / 180, // Position 1: down-left  
    150 * Math.PI / 180,  // Position 2: up-left
    30 * Math.PI / 180,   // Position 3: up-right
    30 * Math.PI / 180,   // Position 4: up-right
    -150 * Math.PI / 180  // Position 5: down-left
  ];
  
  const equatorialAngle = equatorialAngles[ringIndex];
  const bondLength = hexRadius * 0.9; // Slightly shorter for visual clarity
  
  return {
    endX: ringVertex.x + Math.cos(equatorialAngle) * bondLength,
    endY: ringVertex.y + Math.sin(equatorialAngle) * bondLength,
    type: 'equatorial',
    angle: equatorialAngle * 180 / Math.PI
  };
};

/**
 * Create SVG icon for chair conformation button
 */
export const createChairIcon = () => {
  const svgPath = `
    M2 8 
    L6 5 
    L10 6 
    L14 3 
    L14 5 
    L10 8 
    L6 9 
    L2 10 
    Z
    M2 8 L2 12
    M6 5 L6 1  
    M10 6 L10 10
    M14 3 L14 7
    M6 9 L6 13
    M10 8 L10 4
  `;
  
  return {
    viewBox: "0 0 16 16",
    path: svgPath,
    strokeWidth: 1.2
  };
};

/**
 * Helper function to create chair with custom adjustments
 * Use this to manually fine-tune the chair geometry
 */
export const createCustomChair = (hexRadius, calculateBondDirection, adjustments) => {
  return generateChairPreset(hexRadius, calculateBondDirection, adjustments);
};

/**
 * Predefined chair geometries for easy testing
 */
export const chairPresets = {
  // Default chair
  default: {},
  
  // Wider chair
  wide: { widthScale: 1.2 },
  
  // Narrower chair  
  narrow: { widthScale: 0.8 },
  
  // Taller chair
  tall: { heightScale: 1.3 },
  
  // Shorter chair
  short: { heightScale: 0.7 },
  
  // Different angle (closer to 45°)
  shallow: { slantAngle: Math.PI / 4 },
  
  // Steeper angle (closer to 75°)
  steep: { slantAngle: Math.PI * 5/12 },
  
  // Fine adjustments for symmetry
  adjusted: { symmetryOffset: 5, widthScale: 1.1, heightScale: 0.9 },
  
  // Manual coordinate override (use this to specify exact positions)
  manual: {
    manualCoordinates: [
      { x: -40, y: 15 },  // Vertex 0: Bottom-left
      { x: 40, y: 15 },   // Vertex 1: Bottom-right  
      { x: 60, y: -20 },  // Vertex 2: Top-right slant
      { x: 20, y: -35 },  // Vertex 3: Top-right
      { x: -20, y: -35 }, // Vertex 4: Top-left
      { x: -60, y: -20 }  // Vertex 5: Top-left slant
    ]
  }
};

/**
 * Check if a set of vertices forms a chair conformation
 * Used for ring detection and analysis
 */
export const isChairConformation = (vertices, segments) => {
  // Implementation for chair detection
  // This would analyze the geometry to determine if it matches chair pattern
  if (vertices.length < 6) return false;
  
  // Check for characteristic chair angles and bond patterns
  // This is a simplified check - could be enhanced with more sophisticated geometry analysis
  const chairVertices = vertices.filter(v => v.chairType === 'ring');
  return chairVertices.length === 6;
};