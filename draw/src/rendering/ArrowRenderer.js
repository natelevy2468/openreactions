/**
 * Arrow Rendering System
 * 
 * Handles rendering of reaction arrows:
 * - Forward arrows (straight right-pointing)
 * - Equilibrium arrows (double-headed)
 * - Curved arrows (for electron movement)
 */

/**
 * Renders a forward arrow (single-headed, pointing right)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} arrow - Arrow data {x, y, length, angle}
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {boolean} isPreview - Whether this is a preview (lighter color)
 */
export const renderForwardArrow = (ctx, arrow, offset, colors, isPreview = false) => {
  const centerX = arrow.x + offset.x;
  const centerY = arrow.y + offset.y;
  const length = arrow.length || 80;
  const angle = arrow.angle || 0;
  
  // Center the arrow on the given position
  const screenX = centerX - Math.cos(angle) * length / 2;
  const screenY = centerY - Math.sin(angle) * length / 2;
  
  // Calculate end point
  const endX = screenX + Math.cos(angle) * length;
  const endY = screenY + Math.sin(angle) * length;
  
  // Arrow styling
  const arrowColor = isPreview ? '#888888' : (colors.bonds || '#000000');
  const lineWidth = 2.5;
  const headLength = 14; // Bigger arrowhead (matches equilibrium)
  const headWidth = 10; // Wider arrowhead (matches equilibrium)
  
  ctx.strokeStyle = arrowColor;
  ctx.fillStyle = arrowColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw main arrow line
  ctx.beginPath();
  ctx.moveTo(screenX, screenY);
  ctx.lineTo(endX - Math.cos(angle) * headLength, endY - Math.sin(angle) * headLength);
  ctx.stroke();
  
  // Draw arrowhead
  const perpAngle = angle + Math.PI / 2;
  const headBaseX = endX - Math.cos(angle) * headLength;
  const headBaseY = endY - Math.sin(angle) * headLength;
  
  const point1X = headBaseX + Math.cos(perpAngle) * headWidth / 2;
  const point1Y = headBaseY + Math.sin(perpAngle) * headWidth / 2;
  const point2X = headBaseX - Math.cos(perpAngle) * headWidth / 2;
  const point2Y = headBaseY - Math.sin(perpAngle) * headWidth / 2;
  
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(point1X, point1Y);
  ctx.lineTo(point2X, point2Y);
  ctx.closePath();
  ctx.fill();
};

/**
 * Renders an equilibrium arrow (double-headed)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} arrow - Arrow data {x, y, length, angle}
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {boolean} isPreview - Whether this is a preview (lighter color)
 */
export const renderEquilibriumArrow = (ctx, arrow, offset, colors, isPreview = false) => {
  const centerX = arrow.x + offset.x;
  const centerY = arrow.y + offset.y;
  const length = arrow.length || 80;
  const angle = arrow.angle || 0;
  
  // Center the arrow on the given position
  const screenX = centerX - Math.cos(angle) * length / 2;
  const screenY = centerY - Math.sin(angle) * length / 2;
  
  // Calculate end point
  const endX = screenX + Math.cos(angle) * length;
  const endY = screenY + Math.sin(angle) * length;
  
  // Arrow styling
  const arrowColor = isPreview ? '#888888' : (colors.bonds || '#000000');
  const lineWidth = 2.5;
  const headLength = 14; // Bigger arrowheads
  const headWidth = 10; // Wider arrowheads
  const arrowSpacing = 3.5; // Closer spacing between the two arrows
  
  ctx.strokeStyle = arrowColor;
  ctx.fillStyle = arrowColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const perpAngle = angle + Math.PI / 2;
  
  // Draw top arrow (pointing right)
  const topOffsetX = Math.cos(perpAngle) * arrowSpacing;
  const topOffsetY = Math.sin(perpAngle) * arrowSpacing;
  
  const topStartX = screenX + topOffsetX;
  const topStartY = screenY + topOffsetY;
  const topEndX = endX + topOffsetX;
  const topEndY = endY + topOffsetY;
  
  // Top arrow line
  ctx.beginPath();
  ctx.moveTo(topStartX, topStartY);
  ctx.lineTo(topEndX - Math.cos(angle) * headLength, topEndY - Math.sin(angle) * headLength);
  ctx.stroke();
  
  // Top arrowhead - half triangle (top half only, harpoon style)
  // Move harpoon closer to center by reducing its vertical offset
  const harpoonCenterOffset = 1.3; // Move harpoon toward horizontal center
  const topHarpoonTipX = topEndX - Math.cos(perpAngle) * harpoonCenterOffset;
  const topHarpoonTipY = topEndY - Math.sin(perpAngle) * harpoonCenterOffset;
  const topHeadBaseX = topHarpoonTipX - Math.cos(angle) * headLength;
  const topHeadBaseY = topHarpoonTipY - Math.sin(angle) * headLength;
  
  ctx.beginPath();
  ctx.moveTo(topHarpoonTipX, topHarpoonTipY);
  ctx.lineTo(topHeadBaseX + Math.cos(perpAngle) * headWidth, topHeadBaseY + Math.sin(perpAngle) * headWidth);
  ctx.lineTo(topHeadBaseX, topHeadBaseY);
  ctx.closePath();
  ctx.fill();
  
  // Draw bottom arrow (pointing left)
  const bottomOffsetX = -Math.cos(perpAngle) * arrowSpacing;
  const bottomOffsetY = -Math.sin(perpAngle) * arrowSpacing;
  
  const bottomStartX = endX + bottomOffsetX;
  const bottomStartY = endY + bottomOffsetY;
  const bottomEndX = screenX + bottomOffsetX;
  const bottomEndY = screenY + bottomOffsetY;
  
  // Bottom arrow line (pointing left, so reverse direction)
  ctx.beginPath();
  ctx.moveTo(bottomStartX, bottomStartY);
  ctx.lineTo(bottomEndX + Math.cos(angle) * headLength, bottomEndY + Math.sin(angle) * headLength);
  ctx.stroke();
  
  // Bottom arrowhead (pointing left) - half triangle (bottom half only, harpoon style)
  // Move harpoon closer to center by reducing its vertical offset
  const bottomHarpoonTipX = bottomEndX + Math.cos(perpAngle) * harpoonCenterOffset;
  const bottomHarpoonTipY = bottomEndY + Math.sin(perpAngle) * harpoonCenterOffset;
  const bottomHeadBaseX = bottomHarpoonTipX + Math.cos(angle) * headLength;
  const bottomHeadBaseY = bottomHarpoonTipY + Math.sin(angle) * headLength;
  
  ctx.beginPath();
  ctx.moveTo(bottomHarpoonTipX, bottomHarpoonTipY);
  ctx.lineTo(bottomHeadBaseX - Math.cos(perpAngle) * headWidth, bottomHeadBaseY - Math.sin(perpAngle) * headWidth);
  ctx.lineTo(bottomHeadBaseX, bottomHeadBaseY);
  ctx.closePath();
  ctx.fill();
};

/**
 * Renders a curved arrow (for electron movement)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} arrow - Arrow data {x1, y1, x2, y2, curveType, direction}
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {boolean} isPreview - Whether this is a preview
 */
export const renderCurvedArrow = (ctx, arrow, offset, colors, isPreview = false) => {
  const x1 = arrow.x1 + offset.x;
  const y1 = arrow.y1 + offset.y;
  const x2 = arrow.x2 + offset.x;
  const y2 = arrow.y2 + offset.y;
  
  // Arrow styling
  const arrowColor = isPreview ? '#888888' : (colors.bonds || '#000000');
  const lineWidth = 2.5; // Thicker line
  const headLength = 14; // Longer to cover line tip
  const headWidth = 10; // Wider arrowhead
  
  // Determine curve intensity based on type
  // curve0 = shallow (large circle), curve1 = medium, curve2 = high peak
  let curveFactor = 0.5; // Default medium curve
  
  if (arrow.curveType === 'curve0') {
    curveFactor = 0.25; // Shallow curve (part of bigger circle)
  } else if (arrow.curveType === 'curve1') {
    curveFactor = 0.5; // Medium curve
  } else if (arrow.curveType === 'curve2') {
    curveFactor = 0.95; // High peak
  }
  
  // Determine curve direction (clockwise or counterclockwise)
  const isClockwise = arrow.direction === 'cw';
  const curveSign = isClockwise ? 1 : -1;
  
  // Calculate control point for quadratic curve
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular offset for control point
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  const controlX = midX + perpX * distance * curveFactor * curveSign;
  const controlY = midY + perpY * distance * curveFactor * curveSign;
  
  // Calculate arrowhead angle at the end of the curve FIRST
  // Tangent at end point of quadratic curve
  const t = 1; // At end point
  const tangentX = 2 * (1 - t) * (controlX - x1) + 2 * t * (x2 - controlX);
  const tangentY = 2 * (1 - t) * (controlY - y1) + 2 * t * (y2 - controlY);
  const tangentAngle = Math.atan2(tangentY, tangentX);
  
  // Calculate where the line should end (before the arrowhead)
  const lineEndX = x2 - Math.cos(tangentAngle) * headLength;
  const lineEndY = y2 - Math.sin(tangentAngle) * headLength;
  
  ctx.strokeStyle = arrowColor;
  ctx.fillStyle = arrowColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw curved line (stopping before arrowhead)
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(controlX, controlY, lineEndX, lineEndY);
  ctx.stroke();
  
  // Draw arrowhead at the actual end point
  const perpAngle = tangentAngle + Math.PI / 2;
  const headBaseX = x2 - Math.cos(tangentAngle) * headLength;
  const headBaseY = y2 - Math.sin(tangentAngle) * headLength;
  
  ctx.beginPath();
  ctx.moveTo(x2, y2); // Tip at actual end point
  ctx.lineTo(headBaseX + Math.cos(perpAngle) * headWidth / 2, headBaseY + Math.sin(perpAngle) * headWidth / 2);
  ctx.lineTo(headBaseX - Math.cos(perpAngle) * headWidth / 2, headBaseY - Math.sin(perpAngle) * headWidth / 2);
  ctx.closePath();
  ctx.fill();
};

/**
 * Main arrow rendering dispatcher
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} arrow - Arrow data
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {boolean} isPreview - Whether this is a preview
 */
export const renderArrow = (ctx, arrow, offset, colors, isPreview = false) => {
  if (!arrow) return;
  
  switch (arrow.type) {
    case 'forward':
      renderForwardArrow(ctx, arrow, offset, colors, isPreview);
      break;
    case 'equilibrium':
    case 'equil':
      renderEquilibriumArrow(ctx, arrow, offset, colors, isPreview);
      break;
    case 'curved':
      renderCurvedArrow(ctx, arrow, offset, colors, isPreview);
      break;
    default:
      // Unknown arrow type
      break;
  }
};

/**
 * Renders all arrows in the molecule
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} arrows - Array of arrow data
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderAllArrows = (ctx, arrows, offset, colors) => {
  arrows.forEach(arrow => {
    renderArrow(ctx, arrow, offset, colors, false);
  });
};

/**
 * Renders an arrow preview at mouse position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} mousePos - Mouse position {x, y} in world coordinates
 * @param {string} arrowType - Type of arrow ('forward', 'equilibrium', etc.)
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 */
export const renderArrowPreview = (ctx, mousePos, arrowType, offset, colors) => {
  if (!mousePos) return;
  
  const previewArrow = {
    x: mousePos.x,
    y: mousePos.y,
    type: arrowType,
    length: 80,
    angle: 0
  };
  
  renderArrow(ctx, previewArrow, offset, colors, true);
};
