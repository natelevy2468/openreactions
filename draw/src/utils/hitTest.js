/**
 * Hit-testing helpers (pure)
 *
 * Geometric "what is under this point" queries on the molecule graph. They take
 * world coordinates (screen minus the pan offset) and the relevant arrays, and
 * return an index / vertex / null. Kept free of component state so they can be
 * unit-tested; the component holds thin wrappers that convert screen→world.
 */

import { getCurvedArrowMidHandleWorld } from '../rendering/ArrowRenderer.js';

const ARROW_ENDPOINT_THRESHOLD = 25; // clicking an arrow endpoint / curve handle
const ARROW_CLICK_THRESHOLD = 30; // clicking anywhere along an arrow

/**
 * Nearest vertex to a world point within a threshold, or null.
 * @param {Array<{x:number,y:number}>} vertices
 * @param {number} worldX
 * @param {number} worldY
 * @param {number} threshold - max distance (px) to count as a hit
 * @returns {{x:number,y:number}|null}
 */
export const findNearestVertex = (vertices, worldX, worldY, threshold) => {
  let nearest = null;
  let minDistance = threshold;
  vertices.forEach((vertex) => {
    const distance = Math.hypot(vertex.x - worldX, vertex.y - worldY);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = vertex;
    }
  });
  return nearest;
};

/**
 * Index of the first bond within a threshold of a world point, or null.
 * Grid lines (bondOrder <= 0) and zero-length segments are skipped.
 * @param {Array} segments
 * @param {number} worldX
 * @param {number} worldY
 * @param {number} threshold
 * @returns {number|null}
 */
export const findHoveredBondIndex = (segments, worldX, worldY, threshold) => {
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.bondOrder <= 0) continue; // Skip grid lines

    // Distance from the point to the line segment.
    const A = worldX - segment.x1;
    const B = worldY - segment.y1;
    const C = segment.x2 - segment.x1;
    const D = segment.y2 - segment.y1;

    const lenSq = C * C + D * D;
    if (lenSq === 0) continue; // Zero-length segment

    let param = (A * C + B * D) / lenSq;
    if (param < 0) param = 0;
    else if (param > 1) param = 1;

    const xx = segment.x1 + param * C;
    const yy = segment.y1 + param * D;
    const distance = Math.hypot(worldX - xx, worldY - yy);

    if (distance <= threshold) return i;
  }
  return null;
};

/**
 * Which part of an arrow a world point is over: 'control'/'start'/'end'/'body'
 * for curved arrows, 'start'/'end'/'middle' for straight ones, or null.
 * @param {Array} arrows
 * @param {number} arrowIndex
 * @param {number} worldX
 * @param {number} worldY
 * @returns {string|null}
 */
export const detectArrowPart = (arrows, arrowIndex, worldX, worldY) => {
  if (arrowIndex === null || arrowIndex < 0 || arrowIndex >= arrows.length) return null;
  const arrow = arrows[arrowIndex];
  const t = ARROW_ENDPOINT_THRESHOLD;

  if (arrow.type === 'curved') {
    const handle = getCurvedArrowMidHandleWorld(arrow);
    if (handle && Math.hypot(worldX - handle.x, worldY - handle.y) <= t) return 'control';
    if (Math.hypot(worldX - arrow.x1, worldY - arrow.y1) <= t) return 'start';
    if (Math.hypot(worldX - arrow.x2, worldY - arrow.y2) <= t) return 'end';
    return 'body';
  }

  // Straight arrow.
  const endX = arrow.x + arrow.length * Math.cos(arrow.angle);
  const endY = arrow.y + arrow.length * Math.sin(arrow.angle);
  if (Math.hypot(worldX - arrow.x, worldY - arrow.y) <= t) return 'start';
  if (Math.hypot(worldX - endX, worldY - endY) <= t) return 'end';
  return 'middle';
};

/**
 * Index of the first arrow within click range of a world point, or null.
 * @param {Array} arrows
 * @param {number} worldX
 * @param {number} worldY
 * @returns {number|null}
 */
export const findHoveredArrowIndex = (arrows, worldX, worldY) => {
  const t = ARROW_CLICK_THRESHOLD;
  for (let i = 0; i < arrows.length; i++) {
    const arrow = arrows[i];

    if (arrow.type === 'curved' || (arrow.type && arrow.type.startsWith('curve'))) {
      // Endpoints first (most important for grabbing).
      if (Math.hypot(worldX - arrow.x1, worldY - arrow.y1) <= t) return i;
      if (Math.hypot(worldX - arrow.x2, worldY - arrow.y2) <= t) return i;

      const handle = getCurvedArrowMidHandleWorld(arrow);
      if (handle && Math.hypot(worldX - handle.x, worldY - handle.y) <= t) return i;

      // Approximate the curve body by its chord midpoint.
      const midX = (arrow.x1 + arrow.x2) / 2;
      const midY = (arrow.y1 + arrow.y2) / 2;
      if (Math.hypot(worldX - midX, worldY - midY) <= t * 1.5) return i;
    } else {
      // Straight arrow: distance from point to the arrow line segment.
      const endX = arrow.x + arrow.length * Math.cos(arrow.angle);
      const endY = arrow.y + arrow.length * Math.sin(arrow.angle);
      const C = endX - arrow.x;
      const D = endY - arrow.y;
      const lenSq = C * C + D * D;
      if (lenSq === 0) continue;
      let param = ((worldX - arrow.x) * C + (worldY - arrow.y) * D) / lenSq;
      if (param < 0) param = 0;
      else if (param > 1) param = 1;
      const xx = arrow.x + param * C;
      const yy = arrow.y + param * D;
      if (Math.hypot(worldX - xx, worldY - yy) <= t) return i;
    }
  }
  return null;
};
