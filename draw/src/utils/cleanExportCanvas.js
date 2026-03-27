/**
 * Renders molecule content to an offscreen canvas (no UI overlays, no previews).
 * Used for PNG export with tight crop and optional resolution scaling.
 */

import { renderDoubleBond } from '../rendering/DoubleBondRenderer.js';
import { renderAllStereochemistryBonds } from '../rendering/StereochemistryRenderer.js';
import { renderAllAtomText } from '../rendering/TextRenderer.js';
import { renderAllLonePairsAndCharges } from '../rendering/LonePairRenderer.js';
import { renderAllArrows } from '../rendering/ArrowRenderer.js';

function expandBoundsForArrow(a, add) {
  if (a.type === 'curved') {
    add(a.x1, a.y1);
    add(a.x2, a.y2);
    const midX = (a.x1 + a.x2) / 2;
    const midY = (a.y1 + a.y2) / 2;
    const dx = a.x2 - a.x1;
    const dy = a.y2 - a.y1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const co = a.controlOffset ?? 40;
    add(midX + perpX * co, midY + perpY * co);
  } else {
    add(a.x, a.y);
    add(a.x + a.length * Math.cos(a.angle), a.y + a.length * Math.sin(a.angle));
  }
}

/**
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number } | null}
 */
export function computeMoleculeBounds(vertices, segments, arrows) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const add = (x, y) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  vertices.forEach((v) => add(v.x, v.y));

  segments.forEach((s) => {
    if (s.bondOrder > 0) {
      add(s.x1, s.y1);
      add(s.x2, s.y2);
    }
  });

  arrows.forEach((a) => expandBoundsForArrow(a, add));

  const pad = 80;
  if (minX === Infinity) return null;

  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

/**
 * @param {object} options
 * @returns {{ imageUrl: string, width: number, height: number, scaleFactor: number } | null}
 */
export function renderCleanCanvasExport(options) {
  const {
    vertices,
    segments,
    vertexAtoms,
    arrows,
    detectedRings,
    colors,
    isDarkMode,
    resolution = 2,
  } = options;

  const hasBonds = segments.some((s) => s.bondOrder > 0);
  if (vertices.length === 0 && !hasBonds && arrows.length === 0) {
    return null;
  }

  const b = computeMoleculeBounds(vertices, segments, arrows);
  if (!b) return null;

  const W = b.maxX - b.minX;
  const H = b.maxY - b.minY;
  if (W <= 0 || H <= 0) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const s = resolution;
  canvas.width = Math.max(1, Math.ceil(W * s));
  canvas.height = Math.max(1, Math.ceil(H * s));

  ctx.fillStyle = colors.canvasBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(s, 0, 0, s, -b.minX * s, -b.minY * s);

  const offset = { x: 0, y: 0 };
  ctx.lineCap = 'round';

  const stereoBondIndices = renderAllStereochemistryBonds(ctx, segments, offset, colors);

  segments.forEach((segment, index) => {
    if (segment.bondOrder <= 0) return;
    if (stereoBondIndices.has(index)) return;

    if (segment.bondOrder === 1) {
      ctx.strokeStyle = colors.bonds;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(segment.x1 + offset.x, segment.y1 + offset.y);
      ctx.lineTo(segment.x2 + offset.x, segment.y2 + offset.y);
      ctx.stroke();
    } else if (segment.bondOrder === 2) {
      renderDoubleBond(ctx, segment, segments, vertices, offset, colors, detectedRings || []);
    } else if (segment.bondOrder === 3) {
      const bondAngle = Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1);
      const perpAngle = bondAngle + Math.PI / 2;
      const lineSpacing = 8.5;

      ctx.strokeStyle = colors.bonds;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(segment.x1 + offset.x, segment.y1 + offset.y);
      ctx.lineTo(segment.x2 + offset.x, segment.y2 + offset.y);
      ctx.stroke();

      const topOffsetX = Math.cos(perpAngle) * lineSpacing;
      const topOffsetY = Math.sin(perpAngle) * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(segment.x1 + topOffsetX + offset.x, segment.y1 + topOffsetY + offset.y);
      ctx.lineTo(segment.x2 + topOffsetX + offset.x, segment.y2 + topOffsetY + offset.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(segment.x1 - topOffsetX + offset.x, segment.y1 - topOffsetY + offset.y);
      ctx.lineTo(segment.x2 - topOffsetX + offset.x, segment.y2 - topOffsetY + offset.y);
      ctx.stroke();
    }
  });

  renderAllAtomText(ctx, vertices, vertexAtoms, offset, colors, isDarkMode);
  renderAllLonePairsAndCharges(ctx, vertices, segments, vertexAtoms, offset, colors);
  renderAllArrows(ctx, arrows, offset, colors);

  const imageUrl = canvas.toDataURL('image/png');
  return {
    imageUrl,
    width: canvas.width,
    height: canvas.height,
    scaleFactor: resolution,
  };
}
