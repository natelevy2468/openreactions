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
// Consistent vertical metrics (as a fraction of font size) so every label gets
// the SAME halo height regardless of which glyphs it contains. Using measured
// per-glyph bounding boxes made "N" / "O" / "OH" halos differ, which read as
// inconsistent padding. Width is still measured per-glyph (must be accurate).
const CAP_RATIO = 0.72; // ascent above baseline
const DESC_RATIO = 0.12; // descent below baseline

/**
 * Lay out an atom label into horizontal runs plus its overall extent, using
 * consistent vertical metrics. Shared by rendering and by clearance
 * measurement so bonds and halos always agree.
 * @returns {{formatted:Object, runs:Array, totalWidth:number, minTop:number, maxBot:number}|null}
 */
function layoutAtomLabel(ctx, atomData) {
  const formatted = formatAtomTextForDisplay(atomData);
  if (!formatted) return null;

  const runs = [];
  const pushRun = (text, fontSize, isSub, implicitGap = false) => {
    ctx.font = `${fontSize}px Arial, sans-serif`;
    const width = ctx.measureText(text).width;
    runs.push({ text, fontSize, width, isSub, implicitGap });
  };

  if (formatted.hasSegments && formatted.segments && formatted.segments.length > 0) {
    formatted.segments.forEach((segment) => {
      pushRun(segment.text, segment.isNumber ? SUB_FONT_PX : MAIN_FONT_PX, segment.isNumber);
    });
  } else {
    pushRun(formatted.mainText, MAIN_FONT_PX, false);
  }

  if (formatted.hasSubscript && formatted.subscript) {
    pushRun(formatted.subscript, SUB_FONT_PX, true, runs.length > 0);
  }

  // Label-direction flip (ChemDraw): when a heteroatom group sits to the left of
  // its bond, write it so the connecting element is nearest the bond — "NH₂"
  // becomes "H₂N". The element is the first run; move it to the end while the
  // appended hydrogens (and their subscript count) keep their order. Only done
  // for the implicit-H case (flagged upstream) so the run structure is known.
  if (atomData._flipHydrogens && runs.length >= 2 && !runs[0].isSub) {
    runs.push(runs.shift());
  }

  const totalWidth = runs.reduce((sum, r) => sum + (r.implicitGap ? IMPLICIT_H_GAP : 0) + r.width, 0);

  let minTop = Infinity;
  let maxBot = -Infinity;
  runs.forEach((r) => {
    const baseOff = r.isSub ? SUB_BASELINE_DROP : 0;
    minTop = Math.min(minTop, baseOff - r.fontSize * CAP_RATIO);
    maxBot = Math.max(maxBot, baseOff + r.fontSize * DESC_RATIO);
  });
  if (!Number.isFinite(minTop)) {
    minTop = -MAIN_FONT_PX * CAP_RATIO;
    maxBot = MAIN_FONT_PX * DESC_RATIO;
  }

  return { formatted, runs, totalWidth, minTop, maxBot };
}

/**
 * Half-width and half-height (px) of the label's halo box, centered on the
 * vertex. Used to shorten bonds so they stop cleanly at the label edge.
 * @returns {{halfW:number, halfH:number}|null}
 */
export const getAtomLabelHalfExtents = (ctx, atomData) => {
  if (!atomData || !atomData.symbol) return null;
  const layout = layoutAtomLabel(ctx, atomData);
  if (!layout) return null;
  return {
    halfW: layout.totalWidth / 2 + LABEL_PAD,
    halfH: (layout.maxBot - layout.minTop) / 2 + LABEL_PAD,
  };
};

/**
 * Renders atom text at a vertex position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} vertex - Vertex position
 * @param {Object} atomData - Atom data {symbol, charge, implicitH}
 * @param {Object} offset - Canvas offset
 * @param {Object} colors - Color scheme
 * @param {boolean} isDarkMode - Whether dark mode is active
 */
export const renderAtomText = (
  ctx,
  vertex,
  atomData,
  offset,
  colors,
  isDarkMode = false,
  newmanInstanceMap = null
) => {
  if (!atomData || !atomData.symbol) return;

  const screenX = vertex.x + offset.x;
  const screenY = vertex.y + offset.y;

  const layout = layoutAtomLabel(ctx, atomData);
  if (!layout) return;
  const { formatted, runs, totalWidth, minTop, maxBot } = layout;

  // Opaque fill matching the canvas so bonds behind the label do not show through (avoids gray “box” artifacts)
  const labelBg = colors.canvasBackground ?? (isDarkMode ? '#1a1a1a' : '#ffffff');
  const labelFg = isDarkMode ? (colors.atoms || colors.text || '#f0f0f0') : '#111111';

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let mainBaselineY = screenY - (minTop + maxBot) / 2;
  let leftX = screenX - totalWidth / 2;

  // Newman outer labels should flow away from the circle center so text does not cover the ring.
  if (
    newmanInstanceMap &&
    vertex?.newmanId &&
    (vertex?.newmanRole === 'frontOuter' || vertex?.newmanRole === 'backOuter')
  ) {
    const instance = newmanInstanceMap.get(vertex.newmanId);
    if (instance) {
      const dx = vertex.x - instance.x;
      const dy = vertex.y - instance.y;
      const horizontalDominant = Math.abs(dx) >= Math.abs(dy);
      const clearance = 8;

      if (horizontalDominant) {
        if (dx >= 0) {
          leftX = screenX + clearance; // Right side extends right.
        } else {
          leftX = screenX - totalWidth - clearance; // Left side extends left.
        }
        if (dy > 0) mainBaselineY += 4;
        if (dy < 0) mainBaselineY -= 4;
      } else {
        leftX = screenX - totalWidth / 2;
        mainBaselineY = screenY + (dy >= 0 ? 18 : -10); // Top/bottom labels move away vertically.
      }
    }
  }
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
  runs.forEach((r) => {
    if (r.implicitGap) cursorX += IMPLICIT_H_GAP;
    const baseline = mainBaselineY + (r.isSub ? SUB_BASELINE_DROP : 0);
    ctx.font = `${r.fontSize}px Arial, sans-serif`;
    ctx.fillText(r.text, cursorX, baseline);
    cursorX += r.width;
  });

  // Legacy superscript path (charges usually drawn elsewhere; keep for edge cases)
  if (formatted.hasSuperscript && formatted.superscript) {
    ctx.font = `${SUB_FONT_PX}px Arial, sans-serif`;
    const supWidth = ctx.measureText(formatted.superscript).width;
    const supAscent = SUB_FONT_PX * CAP_RATIO;
    const supDescent = SUB_FONT_PX * DESC_RATIO;
    const supX = leftX + totalWidth + 4;
    const supBaseline = mainBaselineY - 10;
    const supLeft = supX - LABEL_PAD;
    const supTop = supBaseline - supAscent - LABEL_PAD;
    const supW = supWidth + LABEL_PAD * 2;
    const supH = supAscent + supDescent + LABEL_PAD * 2;
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
export const renderAllAtomText = (
  ctx,
  vertices,
  vertexAtoms,
  offset,
  colors,
  isDarkMode = false,
  newmanInstances = []
) => {
  // Create vertex lookup map for O(1) access instead of O(n) find operations
  const vertexMap = new Map();
  const newmanInstanceMap = new Map();
  vertices.forEach(v => {
    const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
    vertexMap.set(key, v);
  });
  newmanInstances.forEach(instance => {
    newmanInstanceMap.set(instance.id, instance);
  });
  
  // Render each atom text
  Object.entries(vertexAtoms).forEach(([vertexKey, atomData]) => {
    const vertex = vertexMap.get(vertexKey);
    
    if (vertex) {
      renderAtomText(ctx, vertex, atomData, offset, colors, isDarkMode, newmanInstanceMap);
    }
  });
};

