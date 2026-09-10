/**
 * The saved-document shape.
 *
 * A drawing is just the geometric state the canvas renders plus the view. Ring
 * detection is deliberately NOT stored: it is derived from bonds and recomputed
 * automatically on load, so persisting it would only invite stale data.
 */

export const DOC_VERSION = 1;

export const DEFAULT_TITLE = 'Untitled drawing';

export const emptyDoc = () => ({
  version: DOC_VERSION,
  drawingStyle: { lineScale: 1, fontScale: 1 },
  vertices: [],
  segments: [],
  vertexAtoms: {},
  arrows: [],
  newmanInstances: [],
  vertexBondStates: {},
  offset: { x: 0, y: 0 },
  scale: 1,
});

/** Fills in anything missing so an old or partial payload can't crash a load. */
export const normalizeDoc = (raw) => {
  const base = emptyDoc();
  if (!raw || typeof raw !== 'object') return base;
  return {
    version: Number(raw.version) || DOC_VERSION,
    drawingStyle: { lineScale: [0.8, 1, 1.3].includes(raw.drawingStyle?.lineScale) ? raw.drawingStyle.lineScale : 1, fontScale: [0.85, 1, 1.2].includes(raw.drawingStyle?.fontScale) ? raw.drawingStyle.fontScale : 1 },
    vertices: Array.isArray(raw.vertices) ? raw.vertices : base.vertices,
    segments: Array.isArray(raw.segments) ? raw.segments : base.segments,
    vertexAtoms: raw.vertexAtoms && typeof raw.vertexAtoms === 'object' ? raw.vertexAtoms : base.vertexAtoms,
    arrows: Array.isArray(raw.arrows) ? raw.arrows : base.arrows,
    newmanInstances: Array.isArray(raw.newmanInstances) ? raw.newmanInstances : base.newmanInstances,
    vertexBondStates:
      raw.vertexBondStates && typeof raw.vertexBondStates === 'object' ? raw.vertexBondStates : base.vertexBondStates,
    offset:
      raw.offset && Number.isFinite(raw.offset.x) && Number.isFinite(raw.offset.y) ? raw.offset : base.offset,
    scale: Number.isFinite(raw.scale) && raw.scale > 0 ? raw.scale : base.scale,
  };
};

/**
 * "Nothing has been drawn yet." Used to avoid creating empty rows in the
 * database — a new drawing only becomes real once there's something in it.
 */
export const isDocEmpty = (doc) =>
  !doc ||
  ((doc.vertices?.length || 0) === 0 &&
    (doc.segments?.length || 0) === 0 &&
    (doc.arrows?.length || 0) === 0 &&
    (doc.newmanInstances?.length || 0) === 0 &&
    Object.keys(doc.vertexAtoms || {}).length === 0);

/**
 * Fingerprint of the drawn content only, ignoring pan/zoom. Autosave compares
 * these so scrolling around doesn't mark the document dirty, while any real edit
 * does.
 */
export const contentFingerprint = (doc) =>
  JSON.stringify([
    doc?.vertices || [],
    doc?.segments || [],
    doc?.vertexAtoms || {},
    doc?.arrows || [],
    doc?.newmanInstances || [],
    doc?.vertexBondStates || {},
    doc?.drawingStyle || { lineScale: 1, fontScale: 1 },
  ]);
