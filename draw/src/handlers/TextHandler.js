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
  const { setVertices } = actions;

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
  // Every single-character element symbol that shows up in organic/general
  // chemistry. Multi-letter symbols (Cl, Br, Na, …) still go through the text
  // input; these are the ones a hovered-vertex keypress can set instantly.
  const validElements = ['B', 'C', 'F', 'H', 'I', 'K', 'N', 'O', 'P', 'S', 'U', 'V', 'W', 'Y'];
  return validElements.includes(letter.toUpperCase());
};

/**
 * Formats atom text for display (handles subscripts, charges, etc.)
 * Automatically treats numbers in the symbol as subscripts
 * @param {Object} atomData - Atom data {symbol, charge, implicitH}
 * @returns {Object} Formatted text data for rendering with segments
 */
export const formatAtomTextForDisplay = (atomData) => {
  if (!atomData || !atomData.symbol) return null;

  const symbol = atomData.symbol;
  
  // Parse the symbol into letters and numbers
  const segments = [];
  let currentSegment = '';
  let isCurrentNumber = false;
  
  for (let i = 0; i < symbol.length; i++) {
    const char = symbol[i];
    const isNumber = /[0-9]/.test(char);
    
    // If type changed, save current segment and start new one
    if (i === 0 || isNumber !== isCurrentNumber) {
      if (currentSegment) {
        segments.push({ text: currentSegment, isNumber: isCurrentNumber });
      }
      currentSegment = char;
      isCurrentNumber = isNumber;
    } else {
      currentSegment += char;
    }
  }
  
  // Add the final segment
  if (currentSegment) {
    segments.push({ text: currentSegment, isNumber: isCurrentNumber });
  }
  
  // Check if we have any numbers that need to be subscripted
  const hasNumbers = segments.some(seg => seg.isNumber);
  
  const formatted = {
    segments: segments, // Array of {text, isNumber}
    mainText: segments.length > 0 && !segments[0].isNumber ? segments[0].text : symbol,
    subscript: '',
    superscript: '',
    hasSubscript: false,
    hasSuperscript: false,
    hasSegments: hasNumbers // Use segmented rendering if there are any numbers
  };
  
  // Append implicit hydrogens the way chemists write them: a full-size "H"
  // followed by a subscript count only when there is more than one (OH, NH2 ->
  // "NH₂"). Routing them through the segment stream keeps the H at element size
  // instead of shrinking/dropping the whole thing like a subscript.
  if (atomData.implicitH > 0) {
    segments.push({ text: 'H', isNumber: false });
    if (atomData.implicitH > 1) {
      segments.push({ text: String(atomData.implicitH), isNumber: true });
    }
    formatted.hasSegments = true;
  }

  // Note: Charges are now rendered separately as circles with symbols
  // Do not render charges as superscripts to avoid duplication

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

  // Accept any text as the symbol - don't restrict to element symbols
  // This allows custom labels, group abbreviations, etc.
  let symbolText = text;
  
  // Parse charge (+ or - at the end) and remove it from symbol
  const chargeMatch = text.match(/([+-]\d*|\d*[+-])$/);
  if (chargeMatch) {
    const chargeStr = chargeMatch[1];
    if (chargeStr === '+') result.charge = 1;
    else if (chargeStr === '-') result.charge = -1;
    else {
      const num = parseInt(chargeStr.replace(/[+-]/, ''));
      result.charge = chargeStr.includes('+') ? num : -num;
    }
    // Remove charge from symbol
    symbolText = text.substring(0, chargeMatch.index);
  }
  
  // Store the full text as symbol (numbers will be auto-subscripted during rendering)
  result.symbol = symbolText;

  return result;
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
    // Parse input (accept any text, no validation required)
    const atomData = parseAtomInput(inputText);
    
    // No automatic hydrogens - user must specify manually
    atomData.implicitH = 0;

    setVertexAtoms(prev => ({
      ...prev,
      [vertexKey]: atomData
    }));
  }

  // Close text input
  setShowAtomInput(false);
  return true;
};

