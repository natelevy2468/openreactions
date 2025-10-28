/**
 * Molecular Analysis Utilities
 * Advanced analysis of molecular structures for rendering and validation
 */

/**
 * Analyzes the complete molecular structure for double bond rendering
 * @param {Array} bonds - All bonds in the molecule
 * @param {Array} vertices - All vertices
 * @param {Object} vertexAtoms - Atom information
 * @returns {Object} Complete molecular analysis
 */
export const analyzeMolecularStructure = (bonds, vertices, vertexAtoms = {}) => {
  const analysis = {
    rings: [],
    doubleBonds: [],
    tripleBonds: [],
    aromaticRings: [],
    conjugatedSystems: [],
    stereocenters: [],
    molecularFormula: {},
    warnings: []
  };

  // Detect all rings
  analysis.rings = detectAllRings(bonds, vertices);
  
  // Categorize bonds by order
  analysis.doubleBonds = bonds.filter(bond => bond.bondOrder === 2);
  analysis.tripleBonds = bonds.filter(bond => bond.bondOrder === 3);
  
  // Identify aromatic rings
  analysis.aromaticRings = analysis.rings.filter(ring => 
    isRingAromatic(ring, bonds, vertexAtoms)
  );
  
  // Find conjugated systems
  analysis.conjugatedSystems = findConjugatedSystems(bonds, vertices);
  
  // Calculate molecular formula
  analysis.molecularFormula = calculateMolecularFormula(vertices, vertexAtoms, bonds);
  
  return analysis;
};

/**
 * Detects all rings in the molecular structure
 * @param {Array} bonds - All bonds
 * @param {Array} vertices - All vertices
 * @returns {Array} Array of detected rings
 */
export const detectAllRings = (bonds, vertices) => {
  const rings = [];
  const visited = new Set();
  
  // Use depth-first search to find cycles
  for (let startIndex = 0; startIndex < vertices.length; startIndex++) {
    if (visited.has(startIndex)) continue;
    
    const foundRings = findRingsFromVertex(startIndex, bonds, vertices, visited);
    rings.push(...foundRings);
  }
  
  return rings;
};

/**
 * Finds rings starting from a specific vertex using DFS
 * @param {number} startIndex - Starting vertex index
 * @param {Array} bonds - All bonds
 * @param {Array} vertices - All vertices
 * @param {Set} globalVisited - Globally visited vertices
 * @returns {Array} Rings found from this vertex
 */
export const findRingsFromVertex = (startIndex, bonds, vertices, globalVisited) => {
  const rings = [];
  const adjacency = buildAdjacencyList(bonds, vertices);
  
  // DFS to find cycles
  const dfs = (currentIndex, path, visited) => {
    if (path.length > 6) return; // Limit ring size for performance
    
    const neighbors = adjacency[currentIndex] || [];
    
    for (const neighbor of neighbors) {
      const neighborIndex = neighbor.vertexIndex;
      
      if (neighborIndex === startIndex && path.length >= 3) {
        // Found a cycle back to start
        const ringVertices = path.map(index => vertices[index]);
        const ringBonds = [];
        
        // Reconstruct ring bonds
        for (let i = 0; i < path.length; i++) {
          const nextIndex = (i + 1) % path.length;
          const bond = findBondBetweenVertices(
            vertices[path[i]], 
            vertices[path[nextIndex]], 
            bonds
          );
          if (bond) ringBonds.push(bond);
        }
        
        if (ringBonds.length === path.length) {
          rings.push({
            size: path.length,
            vertices: ringVertices,
            bonds: ringBonds,
            center: calculateRingCenter(ringVertices)
          });
        }
      } else if (!visited.has(neighborIndex) && neighborIndex !== startIndex) {
        // Continue DFS
        const newPath = [...path, currentIndex];
        const newVisited = new Set(visited);
        newVisited.add(currentIndex);
        
        dfs(neighborIndex, newPath, newVisited);
      }
    }
  };
  
  dfs(startIndex, [], new Set());
  globalVisited.add(startIndex);
  
  return rings;
};

/**
 * Builds adjacency list for graph traversal
 * @param {Array} bonds - All bonds
 * @param {Array} vertices - All vertices
 * @returns {Object} Adjacency list
 */
export const buildAdjacencyList = (bonds, vertices) => {
  const adjacency = {};
  const tolerance = 0.01;
  
  vertices.forEach((vertex, index) => {
    adjacency[index] = [];
  });
  
  bonds.forEach(bond => {
    if (bond.bondOrder <= 0) return;
    
    let startIndex = -1;
    let endIndex = -1;
    
    vertices.forEach((vertex, index) => {
      if (Math.abs(vertex.x - bond.x1) < tolerance && Math.abs(vertex.y - bond.y1) < tolerance) {
        startIndex = index;
      }
      if (Math.abs(vertex.x - bond.x2) < tolerance && Math.abs(vertex.y - bond.y2) < tolerance) {
        endIndex = index;
      }
    });
    
    if (startIndex !== -1 && endIndex !== -1) {
      adjacency[startIndex].push({ vertexIndex: endIndex, bond });
      adjacency[endIndex].push({ vertexIndex: startIndex, bond });
    }
  });
  
  return adjacency;
};

/**
 * Finds a bond between two vertices
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
 * Calculates the center point of a ring
 * @param {Array} ringVertices - Vertices forming the ring
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
 * Determines if a ring is aromatic
 * @param {Object} ring - Ring structure
 * @param {Array} bonds - All bonds
 * @param {Object} vertexAtoms - Atom information
 * @returns {boolean} Whether ring is aromatic
 */
export const isRingAromatic = (ring, bonds, vertexAtoms) => {
  // Simple heuristics for aromaticity
  if (ring.size !== 6) return false; // Only check 6-membered rings for now
  
  // Count double bonds in ring
  const doubleBondCount = ring.bonds.filter(bond => bond.bondOrder === 2).length;
  
  // Check for alternating pattern (benzene-like)
  if (doubleBondCount === 3) {
    return checkAlternatingPattern(ring.bonds);
  }
  
  return false;
};

/**
 * Checks if ring bonds follow alternating single/double pattern
 * @param {Array} ringBonds - Bonds in the ring
 * @returns {boolean} Whether pattern is alternating
 */
export const checkAlternatingPattern = (ringBonds) => {
  if (ringBonds.length !== 6) return false;
  
  // Check if double bonds are separated by single bonds
  let doubleCount = 0;
  let singleCount = 0;
  
  for (const bond of ringBonds) {
    if (bond.bondOrder === 2) doubleCount++;
    else if (bond.bondOrder === 1) singleCount++;
  }
  
  return doubleCount === 3 && singleCount === 3;
};

/**
 * Finds conjugated systems (alternating single/double bonds)
 * @param {Array} bonds - All bonds
 * @param {Array} vertices - All vertices
 * @returns {Array} Array of conjugated systems
 */
export const findConjugatedSystems = (bonds, vertices) => {
  const conjugatedSystems = [];
  const visited = new Set();
  
  // Find chains of alternating single/double bonds
  const doubleBonds = bonds.filter(bond => bond.bondOrder === 2);
  
  for (const doubleBond of doubleBonds) {
    if (visited.has(doubleBond)) continue;
    
    const system = traceConjugatedSystem(doubleBond, bonds, vertices, visited);
    if (system.bonds.length > 1) {
      conjugatedSystems.push(system);
    }
  }
  
  return conjugatedSystems;
};

/**
 * Traces a conjugated system from a starting double bond
 * @param {Object} startBond - Starting double bond
 * @param {Array} allBonds - All bonds
 * @param {Array} vertices - All vertices
 * @param {Set} visited - Visited bonds
 * @returns {Object} Conjugated system
 */
export const traceConjugatedSystem = (startBond, allBonds, vertices, visited) => {
  const system = {
    bonds: [startBond],
    vertices: [],
    isAromatic: false
  };
  
  visited.add(startBond);
  
  // This would implement the full conjugation tracing logic
  // For now, return the single bond
  return system;
};

/**
 * Calculates molecular formula from structure
 * @param {Array} vertices - All vertices
 * @param {Object} vertexAtoms - Atom labels
 * @param {Array} bonds - All bonds for hydrogen calculation
 * @returns {Object} Molecular formula object
 */
export const calculateMolecularFormula = (vertices, vertexAtoms, bonds) => {
  const formula = {};
  
  // Count explicit atoms
  Object.values(vertexAtoms).forEach(atom => {
    const element = atom.symbol || 'C'; // Default to carbon
    formula[element] = (formula[element] || 0) + 1;
  });
  
  // Count implicit carbons (vertices without explicit atoms)
  vertices.forEach(vertex => {
    const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
    if (!vertexAtoms[vertexKey]) {
      formula['C'] = (formula['C'] || 0) + 1;
    }
  });
  
  // Calculate implicit hydrogens (simplified)
  // This would need more sophisticated logic for accurate H counting
  
  return formula;
};
