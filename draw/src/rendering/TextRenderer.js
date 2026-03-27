/**
 * Text Rendering System
 * Handles rendering of atom labels, element symbols, and chemical text on canvas
 */

import { formatAtomTextForDisplay } from '../handlers/TextHandler.js';

const MAIN_FONT_PX = 26;
const SUB_FONT_PX = 18;
/** Vertical offset (px) from main alphabetic baseline to subscript baseline */
const SUB_BASELINE_DROP = 6;
const LABEL_PAD = 3;
const IMPLICIT_H_GAP = 2;

function measureRun(ctx, fontSizePx, text) {
  ctx.font = `${fontSizePx}px Arial, sans-serif`;
  const m = ctx.measureText(text);
  const ascent = m.actualBoundingBoxAscent ?? fontSizePx * 0.72;
  const descent = m.actualBoundingBoxDescent ?? fontSizePx * 0.24;
  return { width: m.width, ascent, descent };
}

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

  const formatted = formatAtomTextForDisplay(atomData);
  if (!formatted) return;

  // Opaque fill matching the canvas so bonds behind the label do not show through (avoids gray “box” artifacts)
  const labelBg = colors.canvasBackground ?? (isDarkMode ? '#1a1a1a' : '#ffffff');
  const labelFg = isDarkMode ? (colors.atoms || colors.text || '#f0f0f0') : '#111111';

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // --- Build horizontal runs: symbol segments + optional implicit H subscript
  const runs = [];

  if (formatted.hasSegments && formatted.segments && formatted.segments.length > 0) {
    formatted.segments.forEach((segment) => {
      const fontSize = segment.isNumber ? SUB_FONT_PX : MAIN_FONT_PX;
      const m = measureRun(ctx, fontSize, segment.text);
      runs.push({
        text: segment.text,
        fontSize,
        width: m.width,
        ascent: m.ascent,
        descent: m.descent,
        isSub: segment.isNumber,
      });
    });
  } else {
    const m = measureRun(ctx, MAIN_FONT_PX, formatted.mainText);
    runs.push({
      text: formatted.mainText,
      fontSize: MAIN_FONT_PX,
      width: m.width,
      ascent: m.ascent,
      descent: m.descent,
      isSub: false,
    });
  }

  if (formatted.hasSubscript && formatted.subscript) {
    const m = measureRun(ctx, SUB_FONT_PX, formatted.subscript);
    runs.push({
      text: formatted.subscript,
      fontSize: SUB_FONT_PX,
      width: m.width,
      ascent: m.ascent,
      descent: m.descent,
      isSub: true,
      implicitGap: runs.length > 0,
    });
  }

  const totalWidth =
    runs.reduce((sum, r, i) => {
      const gap = r.implicitGap ? IMPLICIT_H_GAP : 0;
      return sum + gap + r.width;
    }, 0);

  // Vertical extent: each run uses baseline offset 0 for main, SUB_BASELINE_DROP for subscripts
  let minTop = Infinity;
  let maxBot = -Infinity;
  runs.forEach((r) => {
    const baseOff = r.isSub ? SUB_BASELINE_DROP : 0;
    minTop = Math.min(minTop, baseOff - r.ascent);
    maxBot = Math.max(maxBot, baseOff + r.descent);
  });
  if (!Number.isFinite(minTop)) {
    minTop = -MAIN_FONT_PX * 0.72;
    maxBot = MAIN_FONT_PX * 0.28;
  }

  const mainBaselineY = screenY - (minTop + maxBot) / 2;

  const leftX = screenX - totalWidth / 2;
  const boxTop = mainBaselineY + minTop - LABEL_PAD;
  const boxH = maxBot - minTop + LABEL_PAD * 2;
  const boxW = totalWidth + LABEL_PAD * 2;
  const boxLeft = leftX - LABEL_PAD;

  const cornerRadius = 4;
  ctx.fillStyle = labelBg;
  ctx.beginPath();
  ctx.roundRect(boxLeft, boxTop, boxW, boxH, cornerRadius);
  ctx.fill();

  ctx.fillStyle = labelFg;
  let cursorX = leftX;
  runs.forEach((r, i) => {
    if (r.implicitGap) cursorX += IMPLICIT_H_GAP;
    const baseline = mainBaselineY + (r.isSub ? SUB_BASELINE_DROP : 0);
    ctx.font = `${r.fontSize}px Arial, sans-serif`;
    ctx.fillText(r.text, cursorX, baseline);
    cursorX += r.width;
  });

  // Legacy superscript path (charges usually drawn elsewhere; keep for edge cases)
  if (formatted.hasSuperscript && formatted.superscript) {
    const m = measureRun(ctx, SUB_FONT_PX, formatted.superscript);
    const supX = leftX + totalWidth + 4;
    const supBaseline = mainBaselineY - 10;
    const supLeft = supX - LABEL_PAD;
    const supTop = supBaseline - m.ascent - LABEL_PAD;
    const supW = m.width + LABEL_PAD * 2;
    const supH = m.ascent + m.descent + LABEL_PAD * 2;
    ctx.fillStyle = labelBg;
    ctx.beginPath();
    ctx.roundRect(supLeft, supTop, supW, supH, 3);
    ctx.fill();
    ctx.fillStyle = labelFg;
    ctx.font = `${SUB_FONT_PX}px Arial, sans-serif`;
    ctx.fillText(formatted.superscript, supX, supBaseline);
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
  // Create vertex lookup map for O(1) access instead of O(n) find operations
  const vertexMap = new Map();
  vertices.forEach(v => {
    const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
    vertexMap.set(key, v);
  });
  
  // Render each atom text
  Object.entries(vertexAtoms).forEach(([vertexKey, atomData]) => {
    const vertex = vertexMap.get(vertexKey);
    
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

  const formatted = formatAtomTextForDisplay(atomData);
  if (!formatted) return null;

  const runs = [];
  if (formatted.hasSegments && formatted.segments && formatted.segments.length > 0) {
    formatted.segments.forEach((segment) => {
      const fontSize = segment.isNumber ? SUB_FONT_PX : MAIN_FONT_PX;
      const m = measureRun(ctx, fontSize, segment.text);
      runs.push({ width: m.width, ascent: m.ascent, descent: m.descent, isSub: segment.isNumber });
    });
  } else {
    const m = measureRun(ctx, MAIN_FONT_PX, formatted.mainText);
    runs.push({ width: m.width, ascent: m.ascent, descent: m.descent, isSub: false });
  }
  if (formatted.hasSubscript && formatted.subscript) {
    const m = measureRun(ctx, SUB_FONT_PX, formatted.subscript);
    runs.push({
      width: m.width,
      ascent: m.ascent,
      descent: m.descent,
      isSub: true,
      implicitGap: runs.length > 0,
    });
  }

  const totalWidth = runs.reduce((sum, r) => sum + (r.implicitGap ? IMPLICIT_H_GAP : 0) + r.width, 0);

  let minTop = Infinity;
  let maxBot = -Infinity;
  runs.forEach((r) => {
    const baseOff = r.isSub ? SUB_BASELINE_DROP : 0;
    minTop = Math.min(minTop, baseOff - r.ascent);
    maxBot = Math.max(maxBot, baseOff + r.descent);
  });
  if (!Number.isFinite(minTop)) {
    minTop = -MAIN_FONT_PX * 0.72;
    maxBot = MAIN_FONT_PX * 0.28;
  }

  const extraPad = 10;
  const w = totalWidth + (LABEL_PAD + extraPad) * 2;
  const h = maxBot - minTop + (LABEL_PAD + extraPad) * 2;

  return {
    x: screenX - w / 2,
    y: screenY - h / 2,
    width: w,
    height: h,
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
 * Clips a bond segment around text bounds
 * @param {Object} bond - Bond segment {x1, y1, x2, y2}
 * @param {Array} allTextBounds - Array of text bounding boxes
 * @param {Object} offset - Canvas offset
 * @returns {Array} Array of bond segments to render (may be split)
 */
export const clipBondAroundText = (bond, allTextBounds, offset) => {
  if (!allTextBounds || allTextBounds.length === 0) {
    return [bond]; // No clipping needed
  }
  
  const segments = [];
  let currentStart = { x: bond.x1, y: bond.y1 };
  let currentEnd = { x: bond.x2, y: bond.y2 };
  
  // Check if bond passes through any text bounds
  let needsClipping = false;
  for (const textBound of allTextBounds) {
    if (textBound && doesBondIntersectRect(bond, textBound, offset)) {
      needsClipping = true;
      break;
    }
  }
  
  if (!needsClipping) {
    return [bond]; // Return original bond
  }
  
  // Calculate the clipped bond segments
  const worldX1 = bond.x1 + offset.x;
  const worldY1 = bond.y1 + offset.y;
  const worldX2 = bond.x2 + offset.x;
  const worldY2 = bond.y2 + offset.y;
  
  // Find intersection points with all text bounds
  const intersections = [];
  
  for (const textBound of allTextBounds) {
    if (!textBound) continue;
    
    const intersectPoints = lineBoundingBoxIntersection(
      worldX1, worldY1, worldX2, worldY2,
      textBound.x, textBound.y, textBound.width, textBound.height
    );
    
    intersections.push(...intersectPoints);
  }
  
  if (intersections.length === 0) {
    return [bond];
  }
  
  // Sort intersections along the bond
  intersections.sort((a, b) => a.t - b.t);
  
  // Create segments between intersections
  const clippedSegments = [];
  let lastT = 0;
  
  for (let i = 0; i < intersections.length; i += 2) {
    const enterT = intersections[i].t;
    const exitT = intersections[i + 1] ? intersections[i + 1].t : 1;
    
    // Add segment before entering text
    if (enterT > lastT + 0.01) {
      clippedSegments.push({
        x1: bond.x1 + (bond.x2 - bond.x1) * lastT,
        y1: bond.y1 + (bond.y2 - bond.y1) * lastT,
        x2: bond.x1 + (bond.x2 - bond.x1) * enterT,
        y2: bond.y1 + (bond.y2 - bond.y1) * enterT,
        ...bond
      });
    }
    
    lastT = exitT;
  }
  
  // Add final segment after last intersection
  if (lastT < 0.99) {
    clippedSegments.push({
      x1: bond.x1 + (bond.x2 - bond.x1) * lastT,
      y1: bond.y1 + (bond.y2 - bond.y1) * lastT,
      x2: bond.x2,
      y2: bond.y2,
      ...bond
    });
  }
  
  return clippedSegments.length > 0 ? clippedSegments : [bond];
};

/**
 * Checks if bond intersects a rectangle
 * @param {Object} bond - Bond segment
 * @param {Object} rect - Rectangle bounds
 * @param {Object} offset - Canvas offset
 * @returns {boolean} Whether bond intersects rectangle
 */
const doesBondIntersectRect = (bond, rect, offset) => {
  const x1 = bond.x1 + offset.x;
  const y1 = bond.y1 + offset.y;
  const x2 = bond.x2 + offset.x;
  const y2 = bond.y2 + offset.y;
  
  // Check if either endpoint is inside the rect
  const p1Inside = x1 >= rect.x && x1 <= rect.x + rect.width &&
                   y1 >= rect.y && y1 <= rect.y + rect.height;
  const p2Inside = x2 >= rect.x && x2 <= rect.x + rect.width &&
                   y2 >= rect.y && y2 <= rect.y + rect.height;
  
  if (p1Inside || p2Inside) return true;
  
  // Check if line intersects any edge of the rectangle
  return lineIntersectsRect(x1, y1, x2, y2, rect);
};

/**
 * Checks if a line intersects a rectangle
 * @param {number} x1 - Line start x
 * @param {number} y1 - Line start y
 * @param {number} x2 - Line end x
 * @param {number} y2 - Line end y
 * @param {Object} rect - Rectangle bounds
 * @returns {boolean} Whether line intersects rectangle
 */
const lineIntersectsRect = (x1, y1, x2, y2, rect) => {
  // Check intersection with all four edges
  const edges = [
    { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y }, // Top
    { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height }, // Right
    { x1: rect.x, y1: rect.y + rect.height, x2: rect.x + rect.width, y2: rect.y + rect.height }, // Bottom
    { x1: rect.x, y1: rect.y, x2: rect.x, y2: rect.y + rect.height } // Left
  ];
  
  for (const edge of edges) {
    if (lineSegmentsIntersect(x1, y1, x2, y2, edge.x1, edge.y1, edge.x2, edge.y2)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Checks if two line segments intersect
 * @returns {boolean} Whether lines intersect
 */
const lineSegmentsIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.0001) return false;
  
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
};

/**
 * Calculates intersection points between a line and a bounding box
 * @returns {Array} Array of intersection points with t values (0-1 along line)
 */
const lineBoundingBoxIntersection = (x1, y1, x2, y2, rectX, rectY, rectW, rectH) => {
  const intersections = [];
  
  // Check all four edges
  const edges = [
    { x1: rectX, y1: rectY, x2: rectX + rectW, y2: rectY }, // Top
    { x1: rectX + rectW, y1: rectY, x2: rectX + rectW, y2: rectY + rectH }, // Right
    { x1: rectX, y1: rectY + rectH, x2: rectX + rectW, y2: rectY + rectH }, // Bottom
    { x1: rectX, y1: rectY, x2: rectX, y2: rectY + rectH } // Left
  ];
  
  edges.forEach(edge => {
    const denom = (edge.y2 - edge.y1) * (x2 - x1) - (edge.x2 - edge.x1) * (y2 - y1);
    if (Math.abs(denom) < 0.0001) return;
    
    const ua = ((edge.x2 - edge.x1) * (y1 - edge.y1) - (edge.y2 - edge.y1) * (x1 - edge.x1)) / denom;
    
    if (ua >= 0 && ua <= 1) {
      intersections.push({
        t: ua,
        x: x1 + ua * (x2 - x1),
        y: y1 + ua * (y2 - y1)
      });
    }
  });
  
  return intersections;
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
  ctx.font = '16px Arial, sans-serif';
  const metrics = ctx.measureText(previewText);
  const padding = 4;
  
  const bgX = screenX - metrics.width/2 - padding;
  const bgY = screenY - 8 - padding;
  const bgWidth = metrics.width + padding * 2;
  const bgHeight = 16 + padding * 2;
  
  // Draw background and border
  ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
  
  // Draw preview text with normal fill
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(previewText, screenX, screenY);
};
