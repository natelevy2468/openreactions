/**
 * Enhanced Click Handlers for Improved Bond and Vertex Creation
 * Builds upon the existing click handler system with enhanced chemistry validation
 */

import { 
  createEnhancedSingleBond, 
  generateSmartBondPreviews, 
  validateMolecularStructure,
  findExistingVertex
} from '../utils/BondCreationUtils.js';

/**
 * Enhanced click handler for single bond creation with smart placement
 * @param {Object} event - Mouse event
 * @param {Object} state - Current application state
 * @param {Object} actions - Available actions
 * @returns {boolean} Whether click was handled
 */
export const handleEnhancedBondCreation = (event, state, actions) => {
  const {
    canvasRef,
    mode,
    vertices,
    segments,
    vertexAtoms,
    offset,
    hexRadius,
    bondCreationMode, // 'smart' | 'standard' | 'validation'
    showValidationWarnings
  } = state;

  const {
    setVertices,
    setSegments,
    captureState,
    findClosestGridVertex,
    setBondPreviews,
    showNotification // For showing validation messages
  } = actions;

  // Only handle in draw mode or specific bond creation modes
  if (!['draw', 'bond', 'smart-bond'].includes(mode)) {
    return false;
  }

  const canvas = canvasRef.current;
  if (!canvas) return false;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left - offset.x;
  const y = event.clientY - rect.top - offset.y;

  // Check if clicking on existing vertex to start bond creation
  const clickedVertex = findExistingVertex({ x, y }, vertices);
  
  if (clickedVertex) {
    // Generate smart bond previews for this vertex
    const smartPreviews = generateSmartBondPreviews(clickedVertex, segments, hexRadius);
    setBondPreviews(smartPreviews);
    
    // If validation mode is on, show current vertex status
    if (showValidationWarnings) {
      const validation = validateVertexConnections(clickedVertex, segments, vertexAtoms);
      if (validation.warnings.length > 0) {
        showNotification(validation.warnings.join('; '), 'warning');
      }
    }
    
    return true;
  }

  return false; // Let other handlers process
};

/**
 * Enhanced bond completion handler with validation
 * @param {Object} startVertex - Starting vertex
 * @param {Object} endPoint - End point for bond
 * @param {Object} state - Current application state  
 * @param {Object} actions - Available actions
 */
export const handleEnhancedBondCompletion = (startVertex, endPoint, state, actions) => {
  const {
    vertices,
    segments,
    vertexAtoms,
    hexRadius,
    bondCreationMode,
    showValidationWarnings
  } = state;

  const {
    setVertices,
    setSegments,
    captureState,
    findClosestGridVertex,
    showNotification,
    setBondPreviews
  } = actions;

  // Capture state before making changes
  captureState();

  // Use enhanced bond creation
  const bondResult = createEnhancedSingleBond(
    startVertex,
    endPoint,
    vertices,
    segments,
    hexRadius,
    findClosestGridVertex
  );

  if (!bondResult.success) {
    if (showValidationWarnings && bondResult.warnings.length > 0) {
      showNotification(bondResult.warnings.join('; '), 'error');
    }
    return;
  }

  // Apply changes
  if (bondResult.newVertices.length > 0) {
    setVertices(prevVertices => [...prevVertices, ...bondResult.newVertices]);
  }
  
  if (bondResult.newSegments.length > 0) {
    setSegments(prevSegments => [...prevSegments, ...bondResult.newSegments]);
  }

  // Show warnings if validation is enabled
  if (showValidationWarnings && bondResult.warnings.length > 0) {
    showNotification(bondResult.warnings.join('; '), 'warning');
  }

  // Clear bond previews
  setBondPreviews([]);

  // If smart mode, generate new previews for the newly created vertex
  if (bondCreationMode === 'smart' && bondResult.newVertices.length > 0) {
    const newVertex = bondResult.newVertices[bondResult.newVertices.length - 1];
    const smartPreviews = generateSmartBondPreviews(newVertex, [...segments, ...bondResult.newSegments], hexRadius);
    setBondPreviews(smartPreviews);
  }
};

/**
 * Validates connections for a specific vertex
 * @param {Object} vertex - Vertex to validate
 * @param {Array} segments - All segments
 * @param {Object} vertexAtoms - Atom information
 * @returns {Object} Validation result
 */
export const validateVertexConnections = (vertex, segments, vertexAtoms) => {
  const vertexKey = `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`;
  const atomInfo = vertexAtoms[vertexKey];
  
  const connections = segments.filter(segment => {
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

  const validation = { warnings: [], errors: [] };
  
  const bondCount = connections.reduce((sum, bond) => sum + bond.bondOrder, 0);
  
  // General oversaturation check
  if (connections.length > 4) {
    validation.errors.push(`Vertex has ${connections.length} bonds (unusual for most atoms)`);
  }
  
  // Atom-specific validation
  if (atomInfo && atomInfo.symbol) {
    switch (atomInfo.symbol) {
      case 'C':
        if (bondCount > 4) {
          validation.warnings.push(`Carbon has ${bondCount} total bond orders (max typically 4)`);
        }
        break;
      case 'N':
        if (bondCount > 3 && !atomInfo.charge) {
          validation.warnings.push(`Neutral nitrogen has ${bondCount} bond orders (max typically 3)`);
        }
        break;
      case 'O':
        if (bondCount > 2 && !atomInfo.charge) {
          validation.warnings.push(`Neutral oxygen has ${bondCount} bond orders (max typically 2)`);
        }
        break;
      case 'H':
        if (connections.length > 1) {
          validation.warnings.push(`Hydrogen has ${connections.length} bonds (max typically 1)`);
        }
        break;
    }
  }
  
  return validation;
};

/**
 * Toggle enhanced bond creation features
 * @param {string} feature - Feature to toggle ('smart', 'validation', 'previews')
 * @param {Object} state - Current state
 * @param {Object} actions - Available actions
 */
export const toggleBondCreationFeature = (feature, state, actions) => {
  const { setBondCreationMode, setShowValidationWarnings, setBondPreviews } = actions;
  
  switch (feature) {
    case 'smart':
      setBondCreationMode(state.bondCreationMode === 'smart' ? 'standard' : 'smart');
      break;
    case 'validation':
      setShowValidationWarnings(!state.showValidationWarnings);
      break;
    case 'clear-previews':
      setBondPreviews([]);
      break;
  }
};

/**
 * Batch validate entire molecular structure
 * @param {Object} state - Current application state
 * @param {Object} actions - Available actions
 */
export const validateEntireStructure = (state, actions) => {
  const { vertices, segments, vertexAtoms } = state;
  const { showNotification } = actions;
  
  const validation = validateMolecularStructure(vertices, segments, vertexAtoms);
  
  let message = '';
  if (validation.errors.length > 0) {
    message += `Errors: ${validation.errors.join('; ')}`;
  }
  if (validation.warnings.length > 0) {
    if (message) message += ' | ';
    message += `Warnings: ${validation.warnings.join('; ')}`;
  }
  
  if (!message) {
    message = 'Structure validation passed - no issues found!';
  }
  
  const messageType = validation.errors.length > 0 ? 'error' : 
                     validation.warnings.length > 0 ? 'warning' : 'success';
  
  showNotification(message, messageType);
  
  return validation;
};
