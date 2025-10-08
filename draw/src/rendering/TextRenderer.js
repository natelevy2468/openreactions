/**
 * Text Rendering System
 * Handles rendering of atom labels, element symbols, and chemical text on canvas
 */

import { formatAtomTextForDisplay, getElementColor } from '../handlers/TextHandler.js';

/**
 * Renders atom text at a vertex position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} vertex - Vertex position
 * @param {Object} atomData - Atom data {symbol, charge, implicitH}
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {boolean} isDarkMode - Whether dark mode is active
 */
export const renderAtomText = (ctx, vertex, atomData, offset, colors, isDarkMode = false) => {
  if (!atomData || !atomData.symbol) return;

  const screenX = vertex.x + offset.x;
  const screenY = vertex.y + offset.y;

  // Format the atom text
  const formatted = formatAtomTextForDisplay(atomData);
  if (!formatted) return;

  // Set text properties
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px Arial, sans-serif'; // Increased from 24px to 26px (slightly bigger)

  // Draw white outline for visibility over bonds
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 10; // Reduced from 6 to 5 (slightly thinner outline)
  ctx.strokeText(formatted.mainText, screenX, screenY);
  
  // Draw white fill to cover holes in letters (O, P, etc.)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(formatted.mainText, screenX, screenY);
  
  // Draw black text on top
  ctx.fillStyle = '#000000';
  ctx.fillText(formatted.mainText, screenX, screenY);

  // Handle subscript (only if manually specified - no automatic hydrogens)
  if (formatted.hasSubscript) {
    ctx.font = 'bold 18px Arial, sans-serif'; // Increased from 16px to 17px (slightly bigger)
    const mainWidth = ctx.measureText(formatted.mainText).width;
    const subscriptX = screenX + mainWidth/2 + 6;
    const subscriptY = screenY + 8;
    
    // White outline for subscript
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5; // Reduced from 4 to 3.5 (slightly thinner)
    ctx.strokeText(formatted.subscript, subscriptX, subscriptY);
    
    // White fill to cover holes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(formatted.subscript, subscriptX, subscriptY);
    
    // Black subscript text on top
    ctx.fillStyle = '#000000';
    ctx.fillText(formatted.subscript, subscriptX, subscriptY);
  }

  // Handle superscript (charges)
  if (formatted.hasSuperscript) {
    ctx.font = 'bold 18px Arial, sans-serif'; // Increased from 16px to 17px (slightly bigger)
    const mainWidth = ctx.measureText(formatted.mainText).width;
    const superscriptX = screenX + mainWidth/2 + 6;
    const superscriptY = screenY - 8;
    
    // White outline for superscript
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5; // Reduced from 4 to 3.5 (slightly thinner)
    ctx.strokeText(formatted.superscript, superscriptX, superscriptY);
    
    // White fill to cover holes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(formatted.superscript, superscriptX, superscriptY);
    
    // Black superscript text on top
    ctx.fillStyle = '#000000';
    ctx.fillText(formatted.superscript, superscriptX, superscriptY);
  }
};

/**
 * Renders all atom text in the molecule
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} vertices - All vertices
 * @param {Object} vertexAtoms - Atom data mapping
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {boolean} isDarkMode - Whether dark mode is active
 */
export const renderAllAtomText = (ctx, vertices, vertexAtoms, offset, colors, isDarkMode = false) => {
  Object.entries(vertexAtoms).forEach(([vertexKey, atomData]) => {
    const [x, y] = vertexKey.split(',').map(parseFloat);
    const vertex = vertices.find(v => 
      Math.abs(v.x - x) < 0.01 && Math.abs(v.y - y) < 0.01
    );
    
    if (vertex) {
      renderAtomText(ctx, vertex, atomData, offset, colors, isDarkMode);
    }
  });
};

/**
 * Calculates text bounds for collision detection
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} vertex - Vertex position
 * @param {Object} atomData - Atom data
 * @param {Object} offset - Canvas offset
 * @returns {Object} Bounding box {x, y, width, height}
 */
export const calculateTextBounds = (ctx, vertex, atomData, offset) => {
  if (!atomData || !atomData.symbol) return null;

  const screenX = vertex.x + offset.x;
  const screenY = vertex.y + offset.y;

  // Set font to measure text
  ctx.font = 'bold 16px Arial, sans-serif';
  const mainMetrics = ctx.measureText(atomData.symbol);
  
  let totalWidth = mainMetrics.width;
  let totalHeight = 16; // Font size

  // Account for subscript and superscript
  const formatted = formatAtomTextForDisplay(atomData);
  if (formatted) {
    ctx.font = 'bold 12px Arial, sans-serif';
    
    if (formatted.hasSubscript) {
      const subscriptMetrics = ctx.measureText(formatted.subscript);
      totalWidth += subscriptMetrics.width + 8;
    }
    
    if (formatted.hasSuperscript) {
      const superscriptMetrics = ctx.measureText(formatted.superscript);
      totalWidth = Math.max(totalWidth, mainMetrics.width + superscriptMetrics.width + 8);
      totalHeight += 6; // Extra height for superscript
    }
  }

  return {
    x: screenX - totalWidth / 2,
    y: screenY - totalHeight / 2,
    width: totalWidth,
    height: totalHeight
  };
};

/**
 * Checks if a point is within atom text bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} textBounds - Text bounding box
 * @returns {boolean} Whether point is within text
 */
export const isPointInAtomText = (x, y, textBounds) => {
  if (!textBounds) return false;
  
  return (
    x >= textBounds.x &&
    x <= textBounds.x + textBounds.width &&
    y >= textBounds.y &&
    y <= textBounds.y + textBounds.height
  );
};

/**
 * Renders text input preview while user is typing
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} vertex - Vertex position
 * @param {string} previewText - Current input text
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderTextInputPreview = (ctx, vertex, previewText, offset, colors) => {
  if (!previewText) return;

  const screenX = vertex.x + offset.x;
  const screenY = vertex.y + offset.y;

  // Draw preview background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = '#007bff';
  ctx.lineWidth = 2;
  
  // Measure text for background size
  ctx.font = 'bold 16px Arial, sans-serif';
  const metrics = ctx.measureText(previewText);
  const padding = 4;
  
  const bgX = screenX - metrics.width/2 - padding;
  const bgY = screenY - 8 - padding;
  const bgWidth = metrics.width + padding * 2;
  const bgHeight = 16 + padding * 2;
  
  // Draw background and border
  ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
  
  // Draw preview text
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(previewText, screenX, screenY);
};
