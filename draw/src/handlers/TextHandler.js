/**
 * Text Handling System
 * Manages all text-related functionality including atom labels, element symbols, and text input
 */

/**
 * Handles text creation via the text button (Method 1)
 * Creates a new vertex and immediately opens text input
 * @param {Object} clickPosition - Screen coordinates {x, y}
 * @param {Object} offset - Canvas offset
 * @param {Object} state - Current application state
 * @param {Object} actions - Available actions
 * @returns {boolean} Whether text creation was handled
 */
export const handleTextButtonClick = (clickPosition, offset, state, actions) => {
  const { vertices, molecularBoundaryRadius } = state;
  const { setVertices, setShowAtomInput, setAtomInputPosition, setAtomInputValue, setMenuVertexKey } = actions;

  // Convert to world coordinates
  const worldX = clickPosition.x - offset.x;
  const worldY = clickPosition.y - offset.y;

  // Check if position is within molecular boundary (allow text creation anywhere)
  // Text vertices are special - they can be created anywhere for labeling

  // Create new vertex for text
  const newVertex = { x: worldX, y: worldY, isOffGrid: true }; // Text vertices are off-grid
  setVertices(prev => [...prev, newVertex]);

  // Open text input immediately
  const vertexKey = `${worldX.toFixed(2)},${worldY.toFixed(2)}`;
  openTextInput(vertexKey, clickPosition, actions);

  return true;
};

/**
 * Handles Enter key press on hovered vertex (Method 2)
 * Opens text input for existing vertex
 * @param {Object} hoveredVertex - The vertex being hovered
 * @param {Object} mousePosition - Current mouse screen position
 * @param {Object} actions - Available actions
 * @returns {boolean} Whether text input was opened
 */
export const handleEnterKeyOnVertex = (hoveredVertex, mousePosition, actions) => {
  if (!hoveredVertex) return false;

  const vertexKey = `${hoveredVertex.x.toFixed(2)},${hoveredVertex.y.toFixed(2)}`;
  openTextInput(vertexKey, mousePosition, actions);

  return true;
};

/**
 * Handles single letter key press on hovered vertex (Method 3)
 * Immediately sets element symbol without opening text input
 * @param {string} letter - The pressed letter (O, F, N, H, etc.)
 * @param {Object} hoveredVertex - The vertex being hovered
 * @param {Object} state - Current application state
 * @param {Object} actions - Available actions
 * @returns {boolean} Whether quick element was set
 */
export const handleQuickElementKey = (letter, hoveredVertex, state, actions) => {
  if (!hoveredVertex || !isValidElementLetter(letter)) return false;

  const { vertexAtoms } = state;
  const { setVertexAtoms } = actions;

  const vertexKey = `${hoveredVertex.x.toFixed(2)},${hoveredVertex.y.toFixed(2)}`;
  
  // Set the element symbol immediately (no automatic hydrogens)
  setVertexAtoms(prev => ({
    ...prev,
    [vertexKey]: {
      symbol: letter.toUpperCase(),
      charge: 0,
      implicitH: 0 // No automatic hydrogens - user must add manually
    }
  }));

  return true;
};

/**
 * Opens the text input interface
 * @param {string} vertexKey - Key identifying the vertex
 * @param {Object} screenPosition - Screen position for input placement
 * @param {Object} actions - Available actions
 */
export const openTextInput = (vertexKey, screenPosition, actions) => {
  const { setShowAtomInput, setAtomInputPosition, setAtomInputValue, setMenuVertexKey } = actions;

  // Position the input box at the click/hover position
  // Account for toolbar offset
  const toolbarWidth = Math.min(240, window.innerWidth * 0.22);
  const toolbarHeight = 50;
  
  setAtomInputPosition({
    x: screenPosition.x + toolbarWidth,
    y: screenPosition.y + toolbarHeight
  });

  // Clear input and set vertex
  setAtomInputValue('');
  setMenuVertexKey(vertexKey);
  setShowAtomInput(true);
};

/**
 * Checks if a letter is a valid single-letter element
 * @param {string} letter - Letter to check
 * @returns {boolean} Whether it's a valid element letter
 */
export const isValidElementLetter = (letter) => {
  const validElements = ['F', 'N', 'O', 'C', 'H', 'P', 'S'];
  return validElements.includes(letter.toUpperCase());
};

/**
 * Calculates implicit hydrogen count for an element
 * @param {string} elementSymbol - Element symbol (C, N, O, etc.)
 * @param {Object} vertex - The vertex
 * @param {Object} state - Current application state
 * @returns {number} Number of implicit hydrogens
 */
export const calculateImplicitHydrogens = (elementSymbol, vertex, state) => {
  const { segments } = state;
  
  // Count bonds connected to this vertex
  const connectedBonds = segments.filter(segment => {
    if (segment.bondOrder <= 0) return false;
    
    const tolerance = 0.01;
    const connectsToVertex = (
      (Math.abs(segment.x1 - vertex.x) < tolerance && Math.abs(segment.y1 - vertex.y) < tolerance) ||
      (Math.abs(segment.x2 - vertex.x) < tolerance && Math.abs(segment.y2 - vertex.y) < tolerance)
    );
    
    return connectsToVertex;
  });

  // Calculate total bond orders
  const totalBondOrders = connectedBonds.reduce((sum, bond) => sum + bond.bondOrder, 0);

  // Calculate implicit hydrogens based on element and bonding
  switch (elementSymbol) {
    case 'C': return Math.max(0, 4 - totalBondOrders);
    case 'N': return Math.max(0, 3 - totalBondOrders);
    case 'O': return Math.max(0, 2 - totalBondOrders);
    case 'F':
    case 'Cl':
    case 'Br':
    case 'I': return Math.max(0, 1 - totalBondOrders);
    case 'H': return 0; // Hydrogen doesn't have implicit hydrogens
    default: return 0;
  }
};

/**
 * Formats atom text for display (handles subscripts, charges, etc.)
 * @param {Object} atomData - Atom data {symbol, charge, implicitH}
 * @returns {Object} Formatted text data for rendering
 */
export const formatAtomTextForDisplay = (atomData) => {
  if (!atomData || !atomData.symbol) return null;

  const formatted = {
    mainText: atomData.symbol,
    subscript: '',
    superscript: '',
    hasSubscript: false,
    hasSuperscript: false
  };

  // Only add hydrogens if explicitly specified (no automatic calculation)
  if (atomData.implicitH > 0) {
    formatted.subscript = atomData.implicitH > 1 ? `H${atomData.implicitH}` : 'H';
    formatted.hasSubscript = true;
  }

  // Add charge as superscript
  if (atomData.charge !== 0) {
    if (atomData.charge === 1) {
      formatted.superscript = '+';
    } else if (atomData.charge === -1) {
      formatted.superscript = '−';
    } else if (atomData.charge > 1) {
      formatted.superscript = `${atomData.charge}+`;
    } else {
      formatted.superscript = `${Math.abs(atomData.charge)}−`;
    }
    formatted.hasSuperscript = true;
  }

  return formatted;
};

/**
 * Parses user input text into atom data
 * @param {string} inputText - Raw user input
 * @returns {Object} Parsed atom data {symbol, charge, implicitH}
 */
export const parseAtomInput = (inputText) => {
  if (!inputText || inputText.trim() === '') return null;

  const text = inputText.trim();
  const result = {
    symbol: '',
    charge: 0,
    implicitH: 0
  };

  // Simple parsing - extract element symbol (first 1-2 letters)
  const elementMatch = text.match(/^([A-Z][a-z]?)/);
  if (elementMatch) {
    result.symbol = elementMatch[1];
  } else {
    result.symbol = text.charAt(0).toUpperCase();
  }

  // Parse charge (+ or - at the end)
  const chargeMatch = text.match(/([+-]\d*|\d*[+-])$/);
  if (chargeMatch) {
    const chargeStr = chargeMatch[1];
    if (chargeStr === '+') result.charge = 1;
    else if (chargeStr === '-') result.charge = -1;
    else {
      const num = parseInt(chargeStr.replace(/[+-]/, ''));
      result.charge = chargeStr.includes('+') ? num : -num;
    }
  }

  return result;
};

/**
 * Validates element symbol and provides suggestions
 * @param {string} symbol - Element symbol to validate
 * @returns {Object} Validation result with suggestions
 */
export const validateElementSymbol = (symbol) => {
  const commonElements = [
    'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
    'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
    'Br', 'I'
  ];

  const validation = {
    isValid: commonElements.includes(symbol),
    suggestions: [],
    warnings: []
  };

  if (!validation.isValid) {
    // Find similar elements
    validation.suggestions = commonElements.filter(element => 
      element.toLowerCase().startsWith(symbol.toLowerCase()) ||
      element.toLowerCase().includes(symbol.toLowerCase())
    ).slice(0, 3);

    if (validation.suggestions.length === 0) {
      validation.warnings.push(`Unknown element: ${symbol}`);
    }
  }

  return validation;
};

/**
 * Gets the current mouse position for text input positioning
 * @param {Object} event - Mouse event
 * @param {HTMLElement} canvas - Canvas element
 * @returns {Object} Screen position {x, y}
 */
export const getMouseScreenPosition = (event, canvas) => {
  if (!canvas) return { x: 0, y: 0 };
  
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

/**
 * Handles text input completion and validation
 * @param {string} inputText - User's input text
 * @param {string} vertexKey - Vertex key being edited
 * @param {Object} state - Current application state
 * @param {Object} actions - Available actions
 * @returns {boolean} Whether text was successfully applied
 */
export const handleTextInputComplete = (inputText, vertexKey, state, actions) => {
  const { setVertexAtoms, setShowAtomInput } = actions;

  if (!inputText || inputText.trim() === '') {
    // Empty input - remove any existing atom data
    setVertexAtoms(prev => {
      const newAtoms = { ...prev };
      delete newAtoms[vertexKey];
      return newAtoms;
    });
  } else {
    // Parse and validate input
    const atomData = parseAtomInput(inputText);
    const validation = validateElementSymbol(atomData.symbol);

    if (validation.isValid || validation.suggestions.length > 0) {
      // No automatic hydrogens - user must specify manually
      atomData.implicitH = 0;

      setVertexAtoms(prev => ({
        ...prev,
        [vertexKey]: atomData
      }));
    }
  }

  // Close text input
  setShowAtomInput(false);
  return true;
};

/**
 * Common element data for quick access
 */
export const COMMON_ELEMENTS = {
  'H': { name: 'Hydrogen', valence: 1, color: '#FFFFFF' },
  'C': { name: 'Carbon', valence: 4, color: '#000000' },
  'N': { name: 'Nitrogen', valence: 3, color: '#3050F8' },
  'O': { name: 'Oxygen', valence: 2, color: '#FF0D0D' },
  'F': { name: 'Fluorine', valence: 1, color: '#90E050' },
  'P': { name: 'Phosphorus', valence: 3, color: '#FF8000' },
  'S': { name: 'Sulfur', valence: 2, color: '#FFFF30' },
  'Cl': { name: 'Chlorine', valence: 1, color: '#1FF01F' },
  'Br': { name: 'Bromine', valence: 1, color: '#A62929' },
  'I': { name: 'Iodine', valence: 1, color: '#940094' }
};

/**
 * Gets element color for rendering
 * @param {string} elementSymbol - Element symbol
 * @returns {string} Hex color code
 */
export const getElementColor = (elementSymbol) => {
  return COMMON_ELEMENTS[elementSymbol]?.color || '#000000';
};

/**
 * Gets element valence for bonding calculations
 * @param {string} elementSymbol - Element symbol
 * @returns {number} Typical valence
 */
export const getElementValence = (elementSymbol) => {
  return COMMON_ELEMENTS[elementSymbol]?.valence || 4;
};
