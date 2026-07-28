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

/** Must match lineEnd / head gap in renderCurvedArrow */
export const CURVED_ARROW_HEAD_LENGTH = 14;

function defaultCurvePerpDistance(arrow, distance) {
  let curveFactor = 0.5;
  if (arrow.curveType === 'curve0') curveFactor = 0.25;
  else if (arrow.curveType === 'curve1') curveFactor = 0.5;
  else if (arrow.curveType === 'curve2') curveFactor = 0.95;
  const curveSign = arrow.direction === 'cw' ? 1 : -1;
  return distance * curveFactor * curveSign;
}

/**
 * Quadratic Bezier control (world). controlOffset = perp from chord midpoint; controlAlong = along chord from midpoint (+ toward end).
 */
export function getCurvedArrowControlPointWorld(arrow) {
  const x1 = arrow.x1;
  const y1 = arrow.y1;
  const x2 = arrow.x2;
  const y2 = arrow.y2;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= 0) return { x: midX, y: midY };

  const perpX = -dy / distance;
  const perpY = dx / distance;
  const ux = dx / distance;
  const uy = dy / distance;

  const perpD =
    arrow.controlOffset !== undefined ? arrow.controlOffset : defaultCurvePerpDistance(arrow, distance);
  const alongD = arrow.controlAlong !== undefined && arrow.controlAlong !== null ? arrow.controlAlong : 0;

  return {
    x: midX + ux * alongD + perpX * perpD,
    y: midY + uy * alongD + perpY * perpD,
  };
}

/** Stored perpendicular / along-chord scalars (for relative control dragging). */
export function getCurvedArrowPerpAndAlong(arrow) {
  const x1 = arrow.x1;
  const y1 = arrow.y1;
  const x2 = arrow.x2;
  const y2 = arrow.y2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= 0) return { perp: 0, along: 0 };
  const perpD =
    arrow.controlOffset !== undefined ? arrow.controlOffset : defaultCurvePerpDistance(arrow, distance);
  const alongD = arrow.controlAlong !== undefined && arrow.controlAlong !== null ? arrow.controlAlong : 0;
  return { perp: perpD, along: alongD };
}

/**
 * Point on the visible curved stroke at t = 0.5 (world). Yellow handle position.
 */
export function getCurvedArrowMidHandleWorld(arrow) {
  const x1 = arrow.x1;
  const y1 = arrow.y1;
  const x2 = arrow.x2;
  const y2 = arrow.y2;
  const c = getCurvedArrowControlPointWorld(arrow);
  const controlX = c.x;
  const controlY = c.y;

  const tangentX = 2 * (x2 - controlX);
  const tangentY = 2 * (y2 - controlY);
  const tangentAngle = Math.atan2(tangentY, tangentX);
  const lineEndX = x2 - Math.cos(tangentAngle) * CURVED_ARROW_HEAD_LENGTH;
  const lineEndY = y2 - Math.sin(tangentAngle) * CURVED_ARROW_HEAD_LENGTH;

  const t = 0.5;
  const u = 1 - t;
  return {
    x: u * u * x1 + 2 * u * t * controlX + t * t * lineEndX,
    y: u * u * y1 + 2 * u * t * controlY + t * t * lineEndY,
  };
}

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

  const c = getCurvedArrowControlPointWorld(arrow);
  const controlX = c.x + offset.x;
  const controlY = c.y + offset.y;
  
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
 * Stroke the visible curved shaft (quadratic, stopping before arrowhead) — same path as renderCurvedArrow.
 */
export function strokeCurvedArrowShaft(ctx, arrow, offset, strokeStyle, lineWidth) {
  const x1 = arrow.x1 + offset.x;
  const y1 = arrow.y1 + offset.y;
  const x2 = arrow.x2 + offset.x;
  const y2 = arrow.y2 + offset.y;
  const c = getCurvedArrowControlPointWorld(arrow);
  const controlX = c.x + offset.x;
  const controlY = c.y + offset.y;
  const t = 1;
  const tangentX = 2 * (1 - t) * (controlX - x1) + 2 * t * (x2 - controlX);
  const tangentY = 2 * (1 - t) * (controlY - y1) + 2 * t * (y2 - controlY);
  const tangentAngle = Math.atan2(tangentY, tangentX);
  const lineEndX = x2 - Math.cos(tangentAngle) * CURVED_ARROW_HEAD_LENGTH;
  const lineEndY = y2 - Math.sin(tangentAngle) * CURVED_ARROW_HEAD_LENGTH;

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(controlX, controlY, lineEndX, lineEndY);
  ctx.stroke();
}

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

  if (!isPreview) renderArrowLabels(ctx, arrow, offset, colors);
};

/**
 * Font used for reagent/condition text over reaction arrows. Also exported so
 * the editor can size its inline <input> to match what will be drawn.
 */
export const ARROW_LABEL_FONT_PX = 15;
export const arrowLabelFont = (px = ARROW_LABEL_FONT_PX) =>
  `${px}px "Helvetica Neue", Arial, sans-serif`;

/**
 * Renders the reagents (above) and conditions (below) that sit over a straight
 * reaction arrow — the ChemDraw convention for a full reaction equation.
 * Only forward/equilibrium arrows carry labels; curved (mechanism) arrows don't.
 */
export const renderArrowLabels = (ctx, arrow, offset, colors) => {
  if (!arrow) return;
  const isStraight = arrow.type === 'forward' || arrow.type === 'equilibrium' || arrow.type === 'equil';
  if (!isStraight) return;
  if (!arrow.textAbove && !arrow.textBelow) return;

  const cx = arrow.x + offset.x;
  const cy = arrow.y + offset.y;
  const color = colors.bonds || '#000000';
  const GAP = 11; // clearance from the arrow line to the text

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = arrowLabelFont();
  ctx.textAlign = 'center';
  if (arrow.textAbove) {
    ctx.textBaseline = 'bottom';
    ctx.fillText(arrow.textAbove, cx, cy - GAP);
  }
  if (arrow.textBelow) {
    ctx.textBaseline = 'top';
    ctx.fillText(arrow.textBelow, cx, cy + GAP);
  }
  ctx.restore();
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
