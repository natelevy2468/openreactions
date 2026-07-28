/**
 * Export: crop the live drawing canvas to the bounds of drawn content (zoom-to-fit).
 * Uses pixel copy from the same buffer drawCanvas paints — identical to on-screen rendering.
 */

function expandArrowPoints(a, add) {
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
    // Straight arrows are centered on (a.x, a.y) and span ±length/2.
    const halfLen = (a.length || 80) / 2;
    const ux = Math.cos(a.angle || 0);
    const uy = Math.sin(a.angle || 0);
    add(a.x - ux * halfLen, a.y - uy * halfLen);
    add(a.x + ux * halfLen, a.y + uy * halfLen);
    // Reagent (above) / condition (below) labels sit centered over the arrow.
    // Approximate their extent so a wide label isn't cropped out of the export.
    const labelHalfW = (t) => (t ? Math.max(halfLen, (String(t).length * 8) / 2) : 0);
    if (a.textAbove) {
      const hw = labelHalfW(a.textAbove);
      add(a.x - hw, a.y - 27);
      add(a.x + hw, a.y - 27);
    }
    if (a.textBelow) {
      const hw = labelHalfW(a.textBelow);
      add(a.x - hw, a.y + 27);
      add(a.x + hw, a.y + 27);
    }
  }
}

/**
 * Bounding box of drawn content in canvas pixel coordinates (same space as drawCanvas).
 * @param {number} padding - Extra margin around geometry (labels, lone pairs)
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function computeCanvasContentBounds(
  vertices,
  segments,
  arrows,
  offset,
  canvasWidth,
  canvasHeight,
  padding = 72
) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const add = (wx, wy) => {
    const cx = wx + offset.x;
    const cy = wy + offset.y;
    minX = Math.min(minX, cx);
    minY = Math.min(minY, cy);
    maxX = Math.max(maxX, cx);
    maxY = Math.max(maxY, cy);
  };

  vertices.forEach((v) => add(v.x, v.y));

  segments.forEach((s) => {
    if (s.bondOrder > 0) {
      add(s.x1, s.y1);
      add(s.x2, s.y2);
    }
  });

  arrows.forEach((a) => expandArrowPoints(a, add));

  if (minX === Infinity || !Number.isFinite(minX)) {
    return null;
  }

  const cropLeft = Math.max(0, Math.floor(minX - padding));
  const cropTop = Math.max(0, Math.floor(minY - padding));
  const cropRight = Math.min(canvasWidth, Math.ceil(maxX + padding));
  const cropBottom = Math.min(canvasHeight, Math.ceil(maxY + padding));
  const width = Math.max(1, cropRight - cropLeft);
  const height = Math.max(1, cropBottom - cropTop);

  return { x: cropLeft, y: cropTop, width, height };
}

/**
 * Crops a region from the live canvas and encodes PNG. Pixel copy — matches on-screen drawing
 * (including double-bond styling). Scales with nearest-neighbor to avoid blurring line pairs.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ x: number, y: number, width: number, height: number }} cropRect - Canvas pixel coords
 * @param {number} [scaleFactor=2]
 */
export function exportCanvasCroppedSnapshot(canvas, cropRect, scaleFactor = 2) {
  if (!canvas?.getContext || !cropRect) return null;

  const { x, y, width, height } = cropRect;
  if (width <= 0 || height <= 0) return null;

  const cw = canvas.width;
  const ch = canvas.height;
  if (cw <= 0 || ch <= 0) return null;

  const sx = Math.max(0, Math.min(x, cw - 1));
  const sy = Math.max(0, Math.min(y, ch - 1));
  const sw = Math.min(width, cw - sx);
  const sh = Math.min(height, ch - sy);
  if (sw <= 0 || sh <= 0) return null;

  const s = Math.max(1, Math.min(4, Math.round(Number(scaleFactor) || 2)));

  const out = document.createElement('canvas');
  out.width = Math.round(sw * s);
  out.height = Math.round(sh * s);
  const ctx = out.getContext('2d');
  if (!ctx) return null;

  // Nearest-neighbor upscale: keeps bond lines sharp and identical to source pixels
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);

  return {
    imageUrl: out.toDataURL('image/png'),
    width: out.width,
    height: out.height,
    scaleFactor: s,
  };
}
